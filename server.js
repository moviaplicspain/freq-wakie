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

// rooms: Map<roomId, Set<WebSocket>>
// Cada sala = 2 dispositivos (walkie-talkie)
const rooms = new Map();

function getRoomPeer(ws) {
  const room = rooms.get(ws.roomId);
  if (!room) return null;
  for (const peer of room) {
    if (peer !== ws && peer.readyState === WebSocket.OPEN) return peer;
  }
  return null;
}

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

  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  const room = rooms.get(roomId);

  // Sala llena
  if (room.size >= 2) {
    send(ws, { type: 'error', code: 'ROOM_FULL', message: 'Sala llena. Máx. 2 dispositivos.' });
    ws.close();
    return;
  }

  room.add(ws);
  const isInitiator = room.size === 1;
  ws.role = isInitiator ? 'initiator' : 'receiver';

  console.log(`[+] ${roomId} | ${ws.role} conectado | sala: ${room.size}/2`);

  send(ws, {
    type: 'welcome',
    role: ws.role,
    roomId,
    peerCount: room.size
  });

  // Cuando el segundo llega, avisar a ambos
  if (room.size === 2) {
    for (const peer of room) {
      send(peer, { type: 'peer-ready', peerCount: 2 });
    }
    console.log(`✅ ${roomId} | ambos conectados — WebRTC iniciando`);
  }

  // ── Relay de señalización ──────────────────────
  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const peer = getRoomPeer(ws);
      if (peer) {
        peer.send(JSON.stringify(msg));
      }
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });

  ws.on('close', () => {
    room.delete(ws);
    console.log(`[-] ${roomId} | ${ws.role} desconectado | sala: ${room.size}/2`);

    // Limpiar sala vacía
    if (room.size === 0) {
      rooms.delete(roomId);
    } else {
      // Avisar al que queda
      const peer = getRoomPeer(ws) || [...room][0];
      if (peer) send(peer, { type: 'peer-disconnected' });
    }
  });

  ws.on('error', (err) => {
    console.error(`Error ${roomId}/${ws.role}:`, err.message);
  });
});

server.listen(PORT, () => {
  console.log(`\n🎙️  Walkie-Talkie Internet — servidor en puerto ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);
});
