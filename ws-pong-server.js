const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8081 });

// Fonction pour sauvegarder un match dans la base de données
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
    if (data.type === 'join') {
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
          height
        };
        waiting.playernumber = 1;
        ws.playernumber = 2;
        waiting.room = room;
        ws.room = room;
        rooms.push(room);
        waiting.send(JSON.stringify({ type: 'match_found', playernumber: 1 }));
        ws.send(JSON.stringify({ type: 'match_found', playernumber: 2 }));
        waiting.send(JSON.stringify({ type: 'canvas_size', width, height }));
        ws.send(JSON.stringify({ type: 'canvas_size', width, height }));
        waiting = null;
        startGameLoop(room);
      } else {
        waiting = ws;
      }
    }
    if (data.type === 'paddle_move' && ws.room) {
      if (ws.playernumber === 1) ws.room.state.paddle1.y = data.y;
      if (ws.playernumber === 2) ws.room.state.paddle2.y = data.y;
    }
  });

  ws.on('close', () => {
    if (waiting === ws) waiting = null;
    if (ws.room) {
      ws.room.players.forEach(p => {
        if (p !== ws && p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: 'opponent_left' }));
        }
      });
      rooms = rooms.filter(r => r !== ws.room);
    }
  });
});

function startGameLoop(room) {
  const width = 800, height = 400, paddleH = 80, paddleW = 10;
  let gameEnded = false;
  let matchSaved = false;
  
  async function loop() {
    // Vérifier si le match est déjà terminé
    if (gameEnded) return;
    
    let play = room.players;
    let s = room.state;
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
    }

    if (s.ball.x < 0) { s.score2++; resetBall(s); }
    if (s.ball.x > width) { s.score1++; resetBall(s); }

    s.ball.vx = Math.max(-8, Math.min(8, s.ball.vx));
    s.ball.vy = Math.max(-6, Math.min(6, s.ball.vy));

    room.players.forEach(p => {
      if (p.readyState === WebSocket.OPEN) {
        p.send(JSON.stringify({ type: 'game_state', state: s }));
      }
    });

    // Vérifier la fin du match AVANT de programmer la prochaine itération
    if (s.score1 >= 5 || s.score2 >= 5) {
      gameEnded = true;
      let joueur1 = play[0];
      let joueur2 = play[1];
      
      // Sauvegarder le match seulement une fois
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
      rooms = rooms.filter(r => r !== room);
      return;
    }

    // Continuer la boucle seulement si le match n'est pas terminé et que tous les joueurs sont connectés
    if (!gameEnded && room.players.every(p => p.readyState === WebSocket.OPEN)) {
      setTimeout(() => loop(), 1000/60);
    }
  }
  loop();
}

function resetBall(s) {
  s.ball.x = 300;
  s.ball.y = 200;
  s.ball.vx = (Math.random() > 0.5 ? 4 : -4);
  s.ball.vy = (Math.random() > 0.5 ? 3 : -3);
}

console.log('WebSocket Pong server running on ws://localhost:8081');
