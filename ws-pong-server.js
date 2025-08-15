const WebSocket = require('ws');
const wss = new WebSocket.Server({ 
  port: 8081,
  host: '0.0.0.0'
});

async function saveMatch(player1Id, player2Id, player1Score, player2Score, matchType = 'NORMAL') {
  try {
    const response = await fetch('http://backend:3000/api/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        player1Id,
        player2Id,
        player1Score,
        player2Score,
        matchType
      })
    });
    
    if (response.ok) {
      console.log('Match sauvegardé avec succès');
    } else {
      console.error('Erreur lors de la sauvegarde du match');
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du match:', error);
  }
}

let waiting = null;
let rooms = [];


wss.on('connection', ws => {
  ws.playernumber = null;
  ws.room = null;
  ws.userId = null;
  ws.displayName = null;

  ws.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    
    if (data.type === 'join_local') {
      const width = 800, height = 400;
      const room = {
        players: [ws],
        state: {
          ball: { x: width/2, y: height/2, vx: 4, vy: 3 },
          paddle1: { y: 150 },
          paddle2: { y: 150 },
          score1: 0,
          score2: 0
        },
        width,
        height,
        isLocal: true,
        gameEnded: false
      };
      ws.room = room;
      rooms.push(room);
      ws.send(JSON.stringify({ type: 'local_game_started' }));
      ws.send(JSON.stringify({ type: 'canvas_size', width, height }));
      startGameLoop(room);
    }
    else if (data.type === 'join') {
      ws.userId = data.userId;
      ws.displayName = data.displayName;
      if (waiting) {
        const width = 800, height = 400;
        const room = {
          players: [waiting, ws],
          state: {
            ball: { x: width/2, y: height/2, vx: 4, vy: 3 },
            paddle1: { y: 150 },
            paddle2: { y: 150 },
            score1: 0,
            score2: 0
          },
          width,
          height,
          isLocal: false,
          gameEnded: false
        };
        waiting.playernumber = 1;
        ws.playernumber = 2;
        waiting.room = room;
        ws.room = room;
        rooms.push(room);
        waiting.send(JSON.stringify({ type: 'match_found', playernumber: 1 , opponent_name: ws.displayName }));
        ws.send(JSON.stringify({ type: 'match_found', playernumber: 2, opponent_name: waiting.displayName }));
        waiting.send(JSON.stringify({ type: 'canvas_size', width, height }));
        ws.send(JSON.stringify({ type: 'canvas_size', width, height }));
        waiting = null;
        startGameLoop(room);
      } else {
        ws.username = data.displayName;
        waiting = ws;
      }
    }
    if (data.type === 'paddle_move' && ws.room) {
      if (ws.room.isLocal) {
        if (data.player === 1) ws.room.state.paddle1.y = data.y;
        if (data.player === 2) ws.room.state.paddle2.y = data.y;
      } else {
        if (ws.playernumber === 1) ws.room.state.paddle1.y = data.y;
        if (ws.playernumber === 2) ws.room.state.paddle2.y = data.y;
      }
    }
  });

  ws.on('close', () => {
    if (waiting === ws) waiting = null;
    if (ws.room) {
      // Ne pas envoyer le message "opponent_left" si la partie est déjà terminée
      if (!ws.room.gameEnded) {
        ws.room.players.forEach(p => {
          if (p !== ws && p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({ type: 'opponent_left' }));
          }
        });
      }
      rooms = rooms.filter(r => r !== ws.room);
    }
  });
});

function startGameLoop(room) {
  const width = 800, height = 400, paddleH = 80, paddleW = 10;
  let gameEnded = false;
  let matchSaved = false;
  let playing = true;

  async function loop() {
    if (gameEnded) return;

    let play = room.players;
    let s = room.state;

    if (!playing) {
      room.players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: 'game_state', state: s }));
        }
      });
      setTimeout(() => loop(), 1000/60);
      return;
    }
    
    s.ball.x += s.ball.vx;
    s.ball.y += s.ball.vy;

    if (s.ball.y < 0) {
      s.ball.y = 0;
      s.ball.vy *= -1;
    }
    if (s.ball.y > height) {
      s.ball.y = height;
      s.ball.vy *= -1;
    }

    if (
      s.ball.x < 30 + paddleW &&
      s.ball.x > 20 &&
      s.ball.y > s.paddle1.y &&
      s.ball.y < s.paddle1.y + paddleH
    ) {
      s.ball.x = 30 + paddleW;
      s.ball.vx *= -1;
      let hitPos = (s.ball.y - s.paddle1.y - paddleH/2) / (paddleH/2);
      s.ball.vy += hitPos * 2;
      s.ball.vx *= 1.05;
      s.ball.vy *= 1.05;
    }

    if (
      s.ball.x > width - 30 - paddleW &&
      s.ball.x < width - 20 &&
      s.ball.y > s.paddle2.y &&
      s.ball.y < s.paddle2.y + paddleH
    ) {
      s.ball.x = width - 30 - paddleW;
      s.ball.vx *= -1;
      let hitPos = (s.ball.y - s.paddle2.y - paddleH/2) / (paddleH/2);
      s.ball.vy += hitPos * 2;
      s.ball.vx *= 1.05;
      s.ball.vy *= 1.05;
    }

    let goal = false;
    if (s.ball.x < 0) { s.score2++; goal = true; }
    if (s.ball.x > width) { s.score1++; goal = true; }

    s.ball.vx = Math.max(-12, Math.min(12, s.ball.vx));
    s.ball.vy = Math.max(-10, Math.min(10, s.ball.vy));

    room.players.forEach(p => {
      if (p.readyState === WebSocket.OPEN) {
        p.send(JSON.stringify({ type: 'game_state', state: s }));
      }
    });

    if (goal) {
      resetBall(s, 2000);
    }

    if (s.score1 >= 5 || s.score2 >= 5) {
      gameEnded = true;
      room.gameEnded = true;

      if (room.isLocal) {
        room.players[0].send(JSON.stringify({ 
          type: 'game_over', 
          score1: s.score1, 
          score2: s.score2,
          winner: s.score1 >= 5 ? 1 : 2
        }));
      } else {
        let joueur1 = play[0];
        let joueur2 = play[1];
        
        if (joueur1.userId && joueur2.userId && !matchSaved) {
          matchSaved = true;
          await saveMatch(joueur1.userId, joueur2.userId, s.score1, s.score2, 'NORMAL');
        }

        if (s.score1 >= 5) {
          joueur1.send(JSON.stringify({ type: 'winner', score1 : s.score1, score2: s.score2, playernumber: 1}));
          joueur2.send(JSON.stringify({type: 'loser', score1: s.score1, score2: s.score2, playernumber: 2}));
        } else {
          joueur1.send(JSON.stringify({type: 'loser', score1: s.score1, score2: s.score2, playernumber: 1}));
          joueur2.send(JSON.stringify({type: 'winner', score1: s.score1, score2: s.score2, playernumber: 2}));
        }
      }
      rooms = rooms.filter(r => r !== room);
      return;
    }

    if (!gameEnded && room.players.every(p => p.readyState === WebSocket.OPEN)) {
      setTimeout(() => loop(), 1000/60);
    }
  }

  function resetBall(s, delay = 2000) {
    playing = false;
    setTimeout(() => {
      s.ball.x = width/2;
      s.ball.y = height/2;
      s.ball.vx = (Math.random() > 0.5 ? 4 : -4);
      s.ball.vy = (Math.random() > 0.5 ? 3 : -3);
      playing = true;
    }, delay);
  }
  
  loop();
}

console.log('WebSocket Pong server running on ws://0.0.0.0:8081');
