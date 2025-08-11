const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8082 });

let slots = [null, null, null, null];
let clients = [null, null, null, null];
let winners = [];

// Fonction pour sauvegarder un match dans la base de données
async function saveMatch(player1Id, player2Id, player1Score, player2Score, matchType) {
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

function broadcastSlots() {
  const data = JSON.stringify({ 
    type: 'update_slots', 
    slots: slots.map(s => s?.displayName || null),
    userIds: slots.map(s => s?.userId || null)
  });
  clients.forEach(ws => ws && ws.readyState === 1 && ws.send(data));
}

function createPongRoom(playerA, playerB, matchId) {
  const width = 800, height = 400, paddleH = 80, paddleW = 10;
  let state = {
    ball: { x: width/2, y: height/2, vx: 4, vy: 3 },
    paddle1: { y: 150 },
    paddle2: { y: 150 },
    score1: 0,
    score2: 0
  };
  let playing = false;
  let afterGoalTimeout = null;
  let gameEnded = false;
  let matchSaved = false;

  playerA.playernumber = 1;
  playerB.playernumber = 2;

  const playerASlot = clients.indexOf(playerA);
  const playerBSlot = clients.indexOf(playerB);
  const playerAName = slots[playerASlot]?.displayName || 'Joueur 1';
  const playerBName = slots[playerBSlot]?.displayName || 'Joueur 2';
  
  [playerA, playerB].forEach((ws, i) => {
    ws.send(JSON.stringify({ type: 'match_found', playernumber: i+1 }));
    ws.send(JSON.stringify({ type: 'canvas_size', width, height }));
    ws.send(JSON.stringify({ 
      type: 'player_names', 
      player1Name: playerAName, 
      player2Name: playerBName 
    }));
  });

  playerA.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    if (data.type === 'paddle_move' && playing) state.paddle1.y = data.y;
  });
  playerB.on('message', msg => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    if (data.type === 'paddle_move' && playing) state.paddle2.y = data.y;
  });

  function resetBall(delay = 2000) {
    playing = false;
    setTimeout(() => {
      state.ball.x = width/2;
      state.ball.y = height/2;
      state.ball.vx = (Math.random() > 0.5 ? 4 : -4);
      state.ball.vy = (Math.random() > 0.5 ? 3 : -3);
      playing = true;
    }, delay);
  }

  async function loop() {
    // Vérifier si le match est déjà terminé
    if (gameEnded) return;
    
    if (!playing) {
      [playerA, playerB].forEach((ws) => {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'game_state', state }));
      });
      setTimeout(() => loop(), 1000/60);
      return;
    }

    state.ball.x += state.ball.vx;
    state.ball.y += state.ball.vy;

    if (state.ball.y < 0) { state.ball.y = 0; state.ball.vy *= -1; }
    if (state.ball.y > height) { state.ball.y = height; state.ball.vy *= -1; }

    if (
      state.ball.x < 30 + paddleW &&
      state.ball.x > 20 &&
      state.ball.y > state.paddle1.y &&
      state.ball.y < state.paddle1.y + paddleH
    ) {
      state.ball.x = 30 + paddleW;
      state.ball.vx *= -1;
      let hitPos = (state.ball.y - state.paddle1.y - paddleH/2) / (paddleH/2);
      state.ball.vy += hitPos * 2;
    }
    if (
      state.ball.x > width - 30 - paddleW &&
      state.ball.x < width - 20 &&
      state.ball.y > state.paddle2.y &&
      state.ball.y < state.paddle2.y + paddleH
    ) {
      state.ball.x = width - 30 - paddleW;
      state.ball.vx *= -1;
      let hitPos = (state.ball.y - state.paddle2.y - paddleH/2) / (paddleH/2);
      state.ball.vy += hitPos * 2;
    }

    let goal = false;
    if (state.ball.x < 0) { state.score2++; goal = true; }
    if (state.ball.x > width) { state.score1++; goal = true; }

    state.ball.vx = Math.max(-8, Math.min(8, state.ball.vx));
    state.ball.vy = Math.max(-6, Math.min(6, state.ball.vy));

    [playerA, playerB].forEach((ws, i) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'game_state', state }));
      }
    });

    if (goal) {
      resetBall(2000); // 2s d'attente après un but
    }

    // Vérifier la fin du match AVANT de programmer la prochaine itération
    if (state.score1 >= 5 || state.score2 >= 5) {
      gameEnded = true;
      const playerASlot = clients.indexOf(playerA);
      const playerBSlot = clients.indexOf(playerB);
      const playerAUserId = slots[playerASlot].userId;
      const playerBUserId = slots[playerBSlot].userId;
      
      // Déterminer le type de match
      let matchType = 'TOURNAMENT_SEMI';
      if (matchId === 'final') {
        matchType = 'TOURNAMENT_FINAL';
      }
      
      // Sauvegarder le match seulement une fois
      if (!matchSaved && playerAUserId && playerBUserId) {
        matchSaved = true;
        await saveMatch(playerAUserId, playerBUserId, state.score1, state.score2, matchType);
      }
      
      if (state.score1 >= 5) {
        playerA.send(JSON.stringify({ type: 'winner', score1: state.score1, score2: state.score2, playernumber: 1 }));
        playerB.send(JSON.stringify({ type: 'loser', score1: state.score1, score2: state.score2, playernumber: 2 }));
        winners.push({ userId: slots[clients.indexOf(playerA)].userId, displayName: slots[clients.indexOf(playerA)].displayName, ws: playerA });
      } else {
        playerA.send(JSON.stringify({ type: 'loser', score1: state.score1, score2: state.score2, playernumber: 1 }));
        playerB.send(JSON.stringify({ type: 'winner', score1: state.score1, score2: state.score2, playernumber: 2 }));
        winners.push({ userId: slots[clients.indexOf(playerB)].userId, displayName: slots[clients.indexOf(playerB)].displayName, ws: playerB });
      }
      if (winners.length === 2) {
        setTimeout(() => createPongRoom(winners[0].ws, winners[1].ws, 'final'), 3000);
      }
      if (winners.length === 3) {
        const winner = winners[2];
        wss.clients.forEach(client => {
          if (client.readyState === 1) {
            client.send(JSON.stringify({ 
              type: 'tournament_winner', 
              displayName: winner.displayName 
            }));
          }
        });
        slots = [null, null, null, null];
        clients = [null, null, null, null];
        winners = [];
      }
      return;
    }

    // Continuer la boucle seulement si le match n'est pas terminé et que les joueurs sont connectés
    if (!gameEnded && playerA.readyState === 1 && playerB.readyState === 1) {
      setTimeout(() => loop(), 1000/60);
    }
  }

  // Attente de 3s avant de démarrer la partie
  setTimeout(() => {
    playing = true;
    [playerA, playerB].forEach((ws, i) => {
      if (ws.readyState === 1) {
        ws.send(JSON.stringify({ type: 'start_game', playernumber: ws.playernumber }));
      }
    });
    loop();
  }, 3000);
}

wss.on('connection', (ws) => {
  ws.on('message', (msg) => {
    let data;
    try { data = JSON.parse(msg); } catch { return; }
    if (data.type === 'join_tournament') {
      const slotIdx = parseInt(data.slot) - 1;
      if (
        slotIdx < 0 ||
        slotIdx > 3 ||
        slots[slotIdx] ||
        slots.some(s => s && s.userId === data.userId)
      ) return;
      slots[slotIdx] = { userId: data.userId, displayName: data.displayName || `Joueur ${slotIdx+1}` };
      clients[slotIdx] = ws;
      ws.slotIdx = slotIdx;
      ws.userId = data.userId;
      broadcastSlots();

      if (slots.every(Boolean)) {
        createPongRoom(clients[0], clients[1], 1);
        createPongRoom(clients[2], clients[3], 2);
      }
    }
  });
  ws.on('close', () => {
    if (typeof ws.slotIdx === 'number') {
      slots[ws.slotIdx] = null;
      clients[ws.slotIdx] = null;
      broadcastSlots();
    }
  });
});
console.log('Tournoi WebSocket server running on ws://localhost:8082');