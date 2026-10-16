const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const REVIVE_MS = 5000;   // arkadaş mavi noktada bu kadar beklerse ölen oyuncu canlanır
const TICK_MS = 100;      // sunucu herkese 10 kez/sn durum yollar
const STALE_MS = 1000;    // 1 sn'dir haber vermeyen oyuncu kurtarmış sayılmaz
const rooms = new Map();

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let u = req.url.split('?')[0];
  if (u === '/') u = '/index.html';
  const file = path.join(__dirname, u);
  if (!file.startsWith(__dirname) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end('Not found');
  }
  res.writeHead(200, {
    'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
    'Cache-Control': 'no-cache'
  });
  fs.createReadStream(file).pipe(res);
});

const wss = new WebSocketServer({ server });

function send(ws, m) { if (ws.readyState === 1) ws.send(JSON.stringify(m)); }

function broadcast(room, m) {
  const s = rooms.get(room);
  if (!s) return;
  const raw = JSON.stringify(m);
  for (const p of s.players.values()) if (p.ws.readyState === 1) p.ws.send(raw);
}

// x, y, spotX, spotY: 0-1 arası oran (her ekran boyutunda aynı yere denk gelsin diye)
function snapshot(s) {
  return [...s.players.values()].map(p => ({
    id: p.id, name: p.name || "Oyuncu", x: p.x, y: p.y, health: p.health, alive: p.alive,
    bombs: p.bombs || 0, wave: p.wave || 1, shots: p.shots || 1, score: p.score || 0,
    playing: p.playing, spotX: p.alive ? null : p.spotX, spotY: p.alive ? null : p.spotY,
    prog: p.alive ? 0 : p.prog
  }));
}

function roomInfo(s) {
  return { type: 'room', creatorId: s.creatorId, difficulty: s.difficulty, controlMode: s.controlMode, players: snapshot(s) };
}

wss.on('connection', ws => {
  let room = '';
  const id = Math.random().toString(36).slice(2, 10);

  ws.on('message', raw => {
    let m;
    try { m = JSON.parse(raw); } catch { return; }

    if (m.type === 'join') {
      room = String(m.room || '').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 8);
      if (!room) return;
      let s = rooms.get(room);
      if (!s) {
        s = { creatorId: id, difficulty: m.difficulty || 'medium', controlMode: m.controlMode || 'keyboard', players: new Map() };
        rooms.set(room, s);
      }
      s.players.set(id, {
        id, ws, name: String(m.name || "Oyuncu").slice(0,16), x: 0, y: 0, health: 100, alive: true,
        bombs: 10, wave: 1, shots: 1, score: 0, playing: false, spotX: 0, spotY: 0, prog: 0, rescue: null, last: Date.now(), guardUntil: 0
      });
      send(ws, { type: 'welcome', id, creatorId: s.creatorId });
      broadcast(room, roomInfo(s));
    }

    else if (m.type === 'settings' && room) {
      const s = rooms.get(room);
      if (!s || s.creatorId !== id) return;
      if (['easy', 'medium', 'hard', 'impossible'].includes(m.difficulty)) s.difficulty = m.difficulty;
      if (['keyboard', 'mobile'].includes(m.controlMode)) s.controlMode = m.controlMode;
      broadcast(room, roomInfo(s));
    }

    else if (m.type === 'leaveMatch' && room) {
      const s = rooms.get(room), p = s && s.players.get(id);
      if (!p) return;
      p.playing = false; p.alive = true; p.health = 100; p.prog = 0; p.rescue = null; p.last = Date.now();
      broadcast(room, roomInfo(s));
    }

    else if (m.type === 'state' && room) {
      const s = rooms.get(room), p = s && s.players.get(id);
      if (!p) return;
      const wasAlive = p.alive;
      p.x = Number(m.x) || 0;
      p.y = Number(m.y) || 0;
      p.health = Math.max(0, Number(m.health) || 0);
      p.name = String(m.name || p.name || "Oyuncu").slice(0,16);
      p.bombs = Math.max(0, Number(m.bombs) || 0);
      p.wave = Math.max(1, Number(m.wave) || 1);
      p.shots = Math.max(1, Number(m.shots) || 1);
      p.score = Math.max(0, Number(m.score) || 0);
      p.rescue = typeof m.rescue === 'string' ? m.rescue : null;
      p.last = Date.now();
      p.playing = true; // ilk durum mesajı = oyuna girdi

      let alive = !!m.alive;
      // Yeni canlandırılmış oyuncudan gelen eski "ölü" mesajını yok say
      if (!alive && Date.now() < p.guardUntil) alive = true;

      if (wasAlive && !alive) { p.spotX = p.x; p.spotY = p.y; p.prog = 0; } // öldüğü yer = mavi nokta
      if (alive) p.prog = 0;
      p.alive = alive;
    }
  });

  ws.on('close', () => {
    const s = rooms.get(room);
    if (!s) return;
    s.players.delete(id);
    if (!s.players.size) { rooms.delete(room); return; }
    if (s.creatorId === id) s.creatorId = [...s.players.keys()][0];
    broadcast(room, roomInfo(s));
  });
});

// Mavi nokta sayacı: yaşayan bir arkadaş noktanın üstündeyse sayar, ayrılırsa sıfırlar
let lastTick = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(250, now - lastTick);
  lastTick = now;
  for (const [room, s] of rooms) {
    for (const d of s.players.values()) {
      if (d.alive) { d.prog = 0; continue; }
      let rescuing = false;
      for (const o of s.players.values()) {
        if (o !== d && o.alive && o.rescue === d.id && now - o.last < STALE_MS) { rescuing = true; break; }
      }
      d.prog = rescuing ? d.prog + dt : 0;
      if (d.prog >= REVIVE_MS) {
        d.alive = true;
        d.prog = 0;
        d.health = 100;
        d.guardUntil = now + 1500;
        send(d.ws, { type: 'revive' });
      }
    }
    broadcast(room, { type: 'state', players: snapshot(s) });
  }
}, TICK_MS);

server.listen(PORT, '0.0.0.0', () => console.log(`SKY WARRIOR ONLINE listening on ${PORT}`));
