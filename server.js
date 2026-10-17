const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;
const VALID_CIRCLES = new Set(['speedy', 'turret', 'vampire', 'spider', 'piggy']);
const queue = [];
const rooms = new Map();

app.use(express.static(__dirname));
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'circle_duel.html')));

function shuffledUnique(ids) {
  const arr = [...new Set(ids)].filter(id => VALID_CIRCLES.has(id));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function removeFromQueue(socketId) {
  const idx = queue.findIndex(x => x.id === socketId);
  if (idx >= 0) queue.splice(idx, 1);
}
function finishRoom(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.players.forEach(p => {
    const s = io.sockets.sockets.get(p.id);
    if (s) { s.leave(roomId); s.data.roomId = null; s.data.side = null; }
  });
  rooms.delete(roomId);
}

io.on('connection', socket => {
  socket.data.roomId = null;
  socket.data.side = null;

  socket.on('joinQueue', payload => {
    if (socket.data.roomId) return;
    removeFromQueue(socket.id);
    const owned = shuffledUnique(Array.isArray(payload?.owned) ? payload.owned : ['speedy', 'turret']);
    if (owned.length < 2) {
      socket.emit('onlineError', { message: '온라인 매칭에는 보유한 원이 최소 2개 필요합니다.' });
      return;
    }
    const entry = { id: socket.id, username: String(payload?.username || '플레이어').slice(0, 20), owned };
    const otherIndex = queue.findIndex(x => x.id !== socket.id);
    if (otherIndex < 0) {
      queue.push(entry);
      socket.data.queued = true;
      socket.emit('queueWaiting');
      return;
    }

    const opponent = queue.splice(otherIndex, 1)[0];
    const roomId = `duel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const seed = Math.floor(Math.random() * 2147483646) + 1;
    const s1 = io.sockets.sockets.get(opponent.id);
    if (!s1) { queue.push(entry); socket.emit('queueWaiting'); return; }
    const room = {
      id: roomId,
      seed,
      players: [opponent, entry],
      picks: [null, null],
      selections: [null, null],
      started: false,
      round: 1,
      nextReady: [false, false]
    };
    rooms.set(roomId, room);
    s1.join(roomId); socket.join(roomId);
    s1.data.roomId = roomId; s1.data.side = 1; s1.data.queued = false;
    socket.data.roomId = roomId; socket.data.side = 2; socket.data.queued = false;
    s1.emit('onlineMatched', { room: roomId, side: 1, seed, opponent: entry.username });
    socket.emit('onlineMatched', { room: roomId, side: 2, seed, opponent: opponent.username });
  });

  socket.on('onlinePicks', payload => {
    const room = rooms.get(socket.data.roomId);
    if (!room || payload?.room !== room.id) return;
    const sideIndex = socket.data.side - 1;
    const player = room.players[sideIndex];
    const allowed = new Set(player.owned);
    const ids = shuffledUnique(Array.isArray(payload.ids) ? payload.ids : []).filter(id => allowed.has(id)).slice(0, 2);
    if (ids.length < 2) {
      socket.emit('onlineError', { message: '보유한 원 중 두 개를 무작위로 뽑지 못했어요. 다시 매칭해 주세요.' });
      return;
    }
    room.picks[sideIndex] = ids;
    socket.emit('onlinePickOptions', { ids });
  });

  socket.on('onlineSelect', payload => {
    const room = rooms.get(socket.data.roomId);
    if (!room || payload?.room !== room.id || room.started || (payload?.round && payload.round !== room.round)) return;
    const sideIndex = socket.data.side - 1;
    if (!room.picks[sideIndex]?.includes(payload.id)) {
      socket.emit('onlineError', { message: '선택할 수 없는 원입니다.' });
      return;
    }
    room.selections[sideIndex] = payload.id;
    socket.to(room.id).emit('onlineOpponentSelected');
    if (room.selections[0] && room.selections[1]) {
      room.started = true;
      io.to(room.id).emit('onlineStart', {
        p1: room.selections[0], p2: room.selections[1], seed: room.seed, round: room.round
      });
    }
  });

  socket.on('onlineNextReady', payload => {
    const room = rooms.get(socket.data.roomId);
    if (!room || payload?.room !== room.id || !room.started) return;
    const sideIndex = socket.data.side - 1;
    const requestedRound = Number(payload?.round);
    if (!Number.isInteger(requestedRound) || requestedRound !== room.round + 1) return;
    room.nextReady[sideIndex] = true;
    socket.emit('onlineRoundWaiting');
    if (room.nextReady[0] && room.nextReady[1]) {
      room.round = requestedRound;
      room.started = false;
      room.picks = [null, null];
      room.selections = [null, null];
      room.nextReady = [false, false];
      room.players.forEach((player, index) => {
        const playerSocket = io.sockets.sockets.get(player.id);
        if (playerSocket) {
          playerSocket.emit('onlineNextRoundPick', {
            round: room.round,
            ids: shuffledUnique(player.owned).slice(0, 2)
          });
        }
      });
    }
  });

  socket.on('cancelQueue', () => {
    removeFromQueue(socket.id);
    socket.data.queued = false;
    if (socket.data.roomId) {
      const roomId = socket.data.roomId;
      socket.to(roomId).emit('opponentLeft');
      finishRoom(roomId);
    }
  });

  socket.on('disconnect', () => {
    removeFromQueue(socket.id);
    if (socket.data.roomId) {
      const roomId = socket.data.roomId;
      socket.to(roomId).emit('opponentLeft');
      finishRoom(roomId);
    }
  });
});

server.listen(PORT, () => console.log(`Circle Duel server listening on http://localhost:${PORT}`));
