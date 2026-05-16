// ═══════════════════════════════════════════════════
//  Walkie-Talkie Internet — Signaling Server
//  Node.js + WebSocket  |  Deploy en Railway/Render
// ═══════════════════════════════════════════════════

const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// ── HTTP: sirve el cliente ───────────────────────
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (url === '/' || url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) { res.writeHead(500); res.end('Error'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }

  // Health check para Railway/Render
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

// ── WebSocket ────────────────────────────────────
const wss = new WebSocket.Server({ server });

// rooms: Map<roomId, Map<userId, WebSocket>>
const rooms = new Map();

function send(ws, msg) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

wss.on('connection', (ws, req) => {
  // Extraer roomId de la URL: ws://host/room/XXXX
  const match = req.url.match(/\/room\/([a-zA-Z0-9_-]+)/);
  const roomId = match ? match[1] : 'default';

  ws.roomId = roomId;
  ws.id = Math.random().toString(36).substring(2, 10);

  if (!rooms.has(roomId)) rooms.set(roomId, new Map());
  const room = rooms.get(roomId);

  room.set(ws.id, ws);

  console.log(`[+] ${roomId} | ${ws.id} conectado | sala: ${room.size}`);

  // Avisar al nuevo de quiénes están ya en la sala
  const existingPeers = Array.from(room.keys()).filter(id => id !== ws.id);
  send(ws, {
    type: 'welcome',
    id: ws.id,
    roomId,
    peers: existingPeers
  });

  // Avisar a los que ya estaban de que ha entrado alguien nuevo
  for (const [id, peer] of room.entries()) {
    if (id !== ws.id) {
      send(peer, { type: 'peer-joined', peerId: ws.id });
    }
  }

  // ── Relay de señalización ──────────────────────
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      msg.sender = ws.id;

      // Enrutamiento específico si tiene 'target'
      if (msg.target) {
        const targetWs = room.get(msg.target);
        if (targetWs) {
          send(targetWs, msg);
        }
      } else {
        // Broadcast a todos menos a mí (por si acaso)
        for (const [id, peer] of room.entries()) {
          if (id !== ws.id) {
            send(peer, msg);
          }
        }
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    room.delete(ws.id);
    console.log(`[-] ${roomId} | ${ws.id} desconectado | sala: ${room.size}`);

    // Limpiar sala vacía
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      // Avisar a los demás
      for (const [id, peer] of room.entries()) {
        send(peer, { type: 'peer-disconnected', peerId: ws.id });
      }
    }
  });

  ws.on('error', (err) => {
    console.error(`Error ${roomId}/${ws.id}:`, err.message);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎙️  Walkie-Talkie Internet — servidor en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
