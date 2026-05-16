# 🎙️ FREQ — Walkie-Talkie por Internet

Walkie-talkie push-to-talk entre dos móviles **desde cualquier red**, sin necesidad de estar en el mismo WiFi. Funciona en Chrome para Android.

---

## Cómo funciona

```
Móvil A  ←──── WebRTC P2P (internet) ────→  Móvil B
    ↓                                            ↓
    └──── Signaling server (Railway/Render) ─────┘
          (solo intercambia metadatos, no audio)

Si P2P no es posible (4G vs WiFi):
Móvil A  ←──── TURN Server (relay) ────→  Móvil B
```

- El servidor solo coordina la conexión inicial.
- El audio viaja directo entre los móviles (P2P) cuando es posible.
- Si están en redes muy restrictivas, usa un TURN server gratuito como relay.

---

## Despliegue en Railway (recomendado)

### Opción A: Desde GitHub (más fácil)

1. Sube esta carpeta a un repositorio GitHub
2. Ve a [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Selecciona el repositorio
4. Railway detecta el `package.json` y despliega automáticamente
5. Ve a Settings → Networking → Generate Domain
6. ¡Listo! Abre la URL en ambos móviles

### Opción B: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
railway domain
```

---

## Despliegue en Render (alternativa gratuita)

1. Ve a [render.com](https://render.com) → New Web Service
2. Conecta tu repositorio de GitHub
3. Configura:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free
4. Haz clic en Create Web Service
5. Espera el deploy (~2 min) y copia la URL `.onrender.com`

> ⚠️ **Nota Render free tier**: Los servicios gratuitos de Render "duermen" tras 15 min de inactividad. El primero en conectarse puede tardar ~30s en despertar el servidor.

---

## Uso en los móviles

1. Ambos abren la URL del servidor en **Chrome para Android**
2. Uno crea un canal (botón "Crear canal nuevo") → obtiene un código de 6 letras
3. Comparte el enlace o el código con la otra persona
4. El segundo introduce el código → ambos se conectan
5. Mantén pulsado el botón 🎙️ para hablar, suelta para escuchar

---

## Arquitectura de canales

Cada canal (room) admite exactamente 2 personas. Puedes tener múltiples canales simultáneos con distintos códigos.

```
Canal ALPHA: Móvil A ↔ Móvil B
Canal BRAVO: Móvil C ↔ Móvil D
Canal DELTA: Móvil E ↔ ...esperando
```

---

## STUN y TURN

La app usa por defecto:
- **STUN**: Google (gratuito, ilimitado) — para P2P directo
- **TURN**: Open Relay Project / metered.ca (20 GB/mes gratis) — para relay cuando P2P falla

Si necesitas más capacidad TURN o privacidad:
1. Regístrate en [metered.ca](https://metered.ca) (gratis)
2. Obtén tus credenciales
3. Reemplaza en `index.html` el bloque `ICE_CONFIG` con tus credenciales

---

## Archivos

```
freq-walkie-talkie/
├── server.js      → Servidor Node.js (signaling + HTTP)
├── index.html     → App cliente completa
├── package.json   → Dependencias
└── README.md      → Este archivo
```

---

## Variables de entorno

| Variable | Valor por defecto | Descripción |
|----------|-------------------|-------------|
| `PORT`   | `3000`            | Puerto del servidor (Railway/Render lo asignan automáticamente) |
