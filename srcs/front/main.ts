export {}

const loginForm = document.getElementById('login-form') as HTMLFormElement;
const registerForm = document.getElementById('register-form') as HTMLFormElement;
const showRegisterBtn = document.getElementById('show-register') as HTMLButtonElement;
const homeSection = document.getElementById('home-section') as HTMLDivElement;
const gameSection = document.getElementById('game-section') as HTMLDivElement;
const profileSection = document.getElementById('profile-section') as HTMLDivElement;
const goGameBtn = document.getElementById('go-game') as HTMLButtonElement | null;
const backHomeBtn = document.getElementById('accueil') as HTMLButtonElement | null;
const goProfileBtn = document.getElementById('go-profile') as HTMLButtonElement | null;
const backHomeProfileBtn = document.getElementById('back-home-profile') as HTMLButtonElement | null;
const profileForm = document.getElementById('profile-form') as HTMLFormElement | null;
const profileEmail = document.getElementById('profile-email') as HTMLInputElement | null;
const profileDisplayName = document.getElementById('profile-displayName') as HTMLInputElement | null;
const profileAvatar = document.getElementById('profile-avatar') as HTMLInputElement | null;
const profileAvatarImg = document.getElementById('profile-avatar-img') as HTMLImageElement | null;
const regAvatar = document.getElementById('reg-avatar') as HTMLInputElement | null;
const searchUserInput = document.getElementById('search-user-input') as HTMLInputElement | null;
const searchUserBtn = document.getElementById('search-user-btn') as HTMLButtonElement | null;
const searchUserResult = document.getElementById('search-user-result') as HTMLDivElement | null;
const publicProfileSection = document.getElementById('public-profile-section') as HTMLDivElement | null;
const publicProfileAvatarImg = document.getElementById('public-profile-avatar-img') as HTMLImageElement | null;
const publicProfileEmail = document.getElementById('public-profile-email') as HTMLSpanElement | null;
const publicProfileDisplayName = document.getElementById('public-profile-displayName') as HTMLSpanElement | null;
const backProfileBtn = document.getElementById('back-profile-btn') as HTMLButtonElement | null;
const addFriendBtn = document.getElementById('add-friend-btn') as HTMLButtonElement | null;
const log_page = document.getElementById('c-page') as HTMLDivElement | null;
const page_acc = document.getElementById('page-accueil') as HTMLDivElement | null;
const canvas = document.getElementById('pong') as HTMLCanvasElement;
const pongpage = document.getElementById('pong-game') as HTMLDivElement | null;
const bg_blur = document.getElementById('blur-bg') as HTMLDivElement | null;
const profileHistory = document.getElementById('profile-history') as HTMLDivElement | null;
const tournamentSection = document.getElementById('tournament-section') as HTMLDivElement | null;
const pongPlayers = document.getElementById('pong-players') as HTMLDivElement | null;
const tournoisBtn = document.getElementById('tournois-button') as HTMLButtonElement | null;
const localGameBtn = document.getElementById('local-game-button') as HTMLButtonElement | null;

let pingInterval: number | undefined;

pingInterval = window.setInterval(async () => {
  try {
    await fetch('/api/ping', {
      method: 'POST',
      credentials: 'include'
    });
  } catch (error) {
    console.error('Ping failed:', error);
  }
}, 10_000);

if (tournoisBtn && tournamentSection) {
  tournoisBtn.addEventListener('click', () => {
    showView('tournament');
  });
}

function showView(view: 'login' | 'register' | 'home' | 'game' | 'profile' | 'public-profile' | 'tournament', push = true, publicUser?: any) {
  loginForm.classList.add('hidden');
  registerForm.classList.add('hidden');
  homeSection.classList.add('hidden');
  gameSection.classList.add('hidden');
  profileSection.classList.add('hidden');
  pongpage?.classList.add('hidden');
  bg_blur?.classList.add('hidden');
  publicProfileSection?.classList.add('hidden');
  tournamentSection?.classList.add('hidden');
  pongPlayers?.classList.add('hidden');

  if (page_acc) page_acc.classList.add('hidden');
  if (log_page) log_page.classList.add('hidden');
  if (view === 'login') {
    log_page?.classList.remove('hidden');
    loginForm.classList.remove('hidden');
    showRegisterBtn.classList.remove('hidden');
  } else if (view === 'register') {
    log_page?.classList.remove('hidden');
    registerForm.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
  } else if (view === 'home') {
    page_acc?.classList.remove('hidden');
    homeSection.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
    log_page?.classList.add('hidden');
    drawHomePong();
    fetch('/api/me', { credentials: 'include' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then((user) => {
        const avatarImg = document.getElementById('user-avatar') as HTMLImageElement;
        if (avatarImg) {
          const src = user?.avatar ? user.avatar : '/avatars/default.png';
          avatarImg.src = src + '?t=' + Date.now();
        }
        const displayNameSpan = document.getElementById('user-displayName') as HTMLSpanElement;
        if (displayNameSpan) {
          displayNameSpan.textContent = user?.displayName || 'Inconnu';
        }
      })
      .catch(() => {
        const displayNameSpan = document.getElementById('user-displayName') as HTMLSpanElement;
        if (displayNameSpan) displayNameSpan.textContent = 'Inconnu';
      });
    addLogoutButton();
  } else if (view === 'game') {
    let vs_player = document.getElementById('vs-player') as HTMLButtonElement | null;

    homeSection.classList.remove('hidden');
    gameSection.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
    vs_player?.addEventListener('click', () => 
    {
      canvas.classList.add('hidden');
      gameSection.classList.add('hidden');
      pongpage?.classList.remove('hidden');
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }
      // ajout d'un boutton pour commencer le matchmaking
      let blurm_bg = document.getElementById('blurm-bg') as HTMLDivElement;
      const startMatchmakingBtn = document.createElement('button');
      startMatchmakingBtn.textContent = 'Commencer le matchmaking';
      startMatchmakingBtn.classList.add(
        'bg-gray-900', 'text-white', 'px-4', 'py-2', 'rounded', 'border', 'border-gray-700', 'hover:bg-gray-800',
        'absolute', 'top-1/2', 'left-1/2', 'transform', '-translate-x-1/2', '-translate-y-1/2'
      );
      pongpage?.appendChild(startMatchmakingBtn);
      startMatchmakingBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (blurm_bg) {
          blurm_bg.classList.remove('hidden');
        }
        let ws: WebSocket;
        let playernumber: number | null = null;
        let gameState: any = null;
        let animationId: number | null = null;
        let finished: boolean = false;
        ws = new WebSocket('ws://localhost:8081');
        ws.onopen = async () => {
          const response = await fetch('/api/me', {
            credentials: 'include'
          });
          let userId = null;
          let displayName = 'Joueur';
          if (response.ok) {
            const userData = await response.json();
            userId = userData.id;
            displayName = userData.displayName || 'Joueur';
          }
          ws.send(JSON.stringify({ type: 'join', userId, displayName }));
        };
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'match_found') {
            if (blurm_bg) {
              blurm_bg.classList.add('hidden');
            }
            canvas.classList.remove('hidden');
            pongPlayers?.classList.remove('hidden');
            playernumber = data.playernumber;
            fetch('/api/me', { credentials: 'include' })
              .then(async (res) => (res.ok ? res.json() : null))
              .then((user) => {
                const avatarId = playernumber === 1 ? 'playerL-avatar' : 'playerR-avatar';
                const nameId = playernumber === 1 ? 'playerL-name' : 'playerR-name';
                const avatarElement = document.getElementById(avatarId) as HTMLImageElement;
                const nameElement = document.getElementById(nameId) as HTMLSpanElement;
                if (avatarElement && user) {
                  avatarElement.src = (user.avatar || '/avatars/default.png') + '?t=' + Date.now();
                  nameElement.textContent = user.displayName || 'Joueur';
                }
              });
            fetch(`/api/user/${encodeURIComponent(data.opponent_name)}`, { credentials: 'include' })
              .then(async (res) => (res.ok ? res.json() : null))
              .then((user) => {
                const avatarId = playernumber === 1 ? 'playerR-avatar' : 'playerL-avatar';
                const nameId = playernumber === 1 ? 'playerR-name' : 'playerL-name';
                const avatarElement = document.getElementById(avatarId) as HTMLImageElement;
                const nameElement = document.getElementById(nameId) as HTMLSpanElement;
                if (avatarElement && user) {
                  avatarElement.src = (user.avatar || '/avatars/default.png') + '?t=' + Date.now();
                  nameElement.textContent = user.displayName || 'Joueur';
                }
              });
            startPongGame();
          } else if (data.type === 'game_state') {
            gameState = data.state;
          } else if (data.type === 'opponent_left') {
            alert('Ton adversaire a quitté la partie.');
            if (animationId) cancelAnimationFrame(animationId);
            showView('home');
          }
          else if (data.type === 'loser') {
            if (finished) return;
            finished = true;
            let loserpopup = document.getElementById('loser-popup') as HTMLDivElement;
            if (loserpopup) {
              loserpopup.classList.remove('hidden');
              const loserScore = document.getElementById('loser-score') as HTMLSpanElement;
              let btnfermer = document.getElementById('fermer-loser') as HTMLButtonElement;
              if (loserScore) {
                loserScore.textContent = `${data.score1} - ${data.score2}`;
              }
              if (btnfermer) {
                btnfermer.addEventListener('click', () => {
                  loserpopup.classList.add('hidden');
                  showView('game');
                });
              }
            }
            if (animationId) cancelAnimationFrame(animationId);
            return;
          }
          else if (data.type === 'winner') {
            if (finished) return; 
            finished = true;
            let winnerpopup = document.getElementById('winner-popup') as HTMLDivElement;
            let btnfermer = document.getElementById('fermer') as HTMLButtonElement;
            if (winnerpopup) {
              winnerpopup.classList.remove('hidden');
              const winnerScore = document.getElementById('winner-score') as HTMLSpanElement;
              if (winnerScore) {
                winnerScore.textContent = `${data.score1} - ${data.score2}`;
              }
              if (btnfermer) {
                btnfermer.addEventListener('click', () => {
                  winnerpopup.classList.add('hidden');
                  showView('game');
                });
              }
            }
            if (animationId) cancelAnimationFrame(animationId);
            return;
          }
        };
        ws.onclose = () => {
          if (animationId) cancelAnimationFrame(animationId);
        };

        function startPongGame() {
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          let paddleY = 150;
          const paddleH = 80;
          const paddleW = 10;
          const height = 400;
          const width = 800;
          function draw() {
            if (!gameState || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.setLineDash([10, 10]);
            ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#fff';
            ctx.fillRect(20, gameState.paddle1.y, paddleW, paddleH);
            ctx.fillRect(canvas.width-30, gameState.paddle2.y, paddleW, paddleH);
            ctx.beginPath();
            ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, 2*Math.PI);
            ctx.fill();
            ctx.font = '18px Arial';
            ctx.fillStyle = '#fff';
            ctx.font = '32px Arial';
            ctx.fillText(gameState.score1, canvas.width/2-50, 40);
            ctx.fillText(gameState.score2, canvas.width/2+30, 40);
          }
          function gameLoop() {
            draw();
            animationId = requestAnimationFrame(gameLoop);
          }
          gameLoop();
          function onKey(e: KeyboardEvent) {
            if (!playernumber) return;
            let changed = false;
            const paddleSpeed = 18; // Vitesse augmentée des paddles
            if (playernumber === 1) {
              if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'W') { paddleY -= paddleSpeed; changed = true; }
              if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { paddleY += paddleSpeed; changed = true; }
            } else if (playernumber === 2) {
              if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'W') { paddleY -= paddleSpeed; changed = true; }
              if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { paddleY += paddleSpeed; changed = true; }
            }
            paddleY = Math.max(0, Math.min(canvas.height-paddleH, paddleY));
            if (changed) {
              ws.send(JSON.stringify({ type: 'paddle_move', y: paddleY }));
            }
          }
          window.addEventListener('keydown', onKey);
        }
      });
    });

    // Ajouter le gestionnaire pour le jeu local
    localGameBtn?.addEventListener('click', () => {
      canvas.classList.add('hidden');
      gameSection.classList.add('hidden');
      pongpage?.classList.remove('hidden');
      if (!canvas) {
        console.error('Canvas not found');
        return;
      }
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Failed to get canvas context');
        return;
      }
      
      // Bouton pour commencer le jeu local
      const startLocalGameBtn = document.createElement('button');
      startLocalGameBtn.textContent = 'Commencer le jeu local';
      startLocalGameBtn.classList.add(
        'bg-gray-900', 'text-white', 'px-4', 'py-2', 'rounded', 'border', 'border-gray-700', 'hover:bg-gray-800',
        'absolute', 'top-1/2', 'left-1/2', 'transform', '-translate-x-1/2', '-translate-y-1/2'
      );
      pongpage?.appendChild(startLocalGameBtn);
      
      startLocalGameBtn.addEventListener('click', (e) => {
        e.preventDefault();
        let ws: WebSocket;
        let gameState: any = null;
        let animationId: number | null = null;
        let finished: boolean = false;
        
        ws = new WebSocket('ws://localhost:8081');
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'join_local' }));
        };
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'local_game_started') {
            canvas.classList.remove('hidden');
            startLocalPongGame();
          } else if (data.type === 'game_state') {
            gameState = data.state;
          } else if (data.type === 'game_over') {
            if (finished) return;
            finished = true;
            alert(`Fin de partie ! Score final: ${data.score1} - ${data.score2}. Gagnant: Joueur ${data.winner}`);
            showView('game');
          }
        };

        function startLocalPongGame() {
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          let paddle1Y = 150;
          let paddle2Y = 150;
          const paddleH = 80;
          const paddleW = 10;
          const paddleSpeed = 18; // Vitesse augmentée des paddles
          const height = 400;
          const width = 800;
          
          function draw() {
            if (!gameState || !ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#222';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.setLineDash([10, 10]);
            ctx.moveTo(canvas.width/2, 0); 
            ctx.lineTo(canvas.width/2, canvas.height);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#fff';
            ctx.fillRect(20, gameState.paddle1.y, paddleW, paddleH);
            ctx.fillRect(canvas.width-30, gameState.paddle2.y, paddleW, paddleH);
            ctx.beginPath();
            ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, 2*Math.PI);
            ctx.fill();
            ctx.font = '32px Arial';
            ctx.fillText(gameState.score1, canvas.width/2-50, 40);
            ctx.fillText(gameState.score2, canvas.width/2+30, 40);
            
            // Afficher les contrôles
            ctx.font = '14px Arial';
            ctx.fillText('Joueur 1: W/S', 20, height - 20);
            ctx.fillText('Joueur 2: ↑/↓', width - 120, height - 20);
          }
          
          function gameLoop() {
            draw();
            animationId = requestAnimationFrame(gameLoop);
          }
          gameLoop();
          
          function onKey(e: KeyboardEvent) {
            let changed1 = false;
            let changed2 = false;
            
            // Contrôles pour joueur 1 (WASD)
            if (e.key === 'w' || e.key === 'W') { 
              paddle1Y -= paddleSpeed; 
              changed1 = true; 
            }
            if (e.key === 's' || e.key === 'S') { 
              paddle1Y += paddleSpeed; 
              changed1 = true; 
            }
            
            // Contrôles pour joueur 2 (flèches directionnelles)
            if (e.key === 'ArrowUp') { 
              paddle2Y -= paddleSpeed; 
              changed2 = true; 
            }
            if (e.key === 'ArrowDown') { 
              paddle2Y += paddleSpeed; 
              changed2 = true; 
            }
            
            // Limiter les paddles dans l'écran
            paddle1Y = Math.max(0, Math.min(canvas.height - paddleH, paddle1Y));
            paddle2Y = Math.max(0, Math.min(canvas.height - paddleH, paddle2Y));
            
            // Envoyer les mises à jour au serveur
            if (changed1) {
              ws.send(JSON.stringify({ type: 'paddle_move', player: 1, y: paddle1Y }));
            }
            if (changed2) {
              ws.send(JSON.stringify({ type: 'paddle_move', player: 2, y: paddle2Y }));
            }
          }
          window.addEventListener('keydown', onKey);
        }
      });
    });

  } else if (view === 'profile') {
    bg_blur?.classList.remove('hidden');
    homeSection.classList.remove('hidden');
    profileSection.classList.remove('hidden');
    showRegisterBtn.classList.add('hidden');
    fetch('/api/me', { credentials: 'include' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then(user => {
      if (profileEmail && profileDisplayName) {
        profileEmail.value = user?.email || '';
        profileDisplayName.value = user?.displayName || '';
        if (profileAvatarImg) {
          const src = user?.avatar ? user.avatar : '/avatars/default.png';
          profileAvatarImg.src = src + '?t=' + Date.now();
        }
      }
      renderFriendsList();
      renderFriendRequests();
      addLogoutButton();
      // Charger l'historique par défaut si l'onglet historique est actif
      const historyPanel = document.getElementById('profile-history-panel');
      if (historyPanel && !historyPanel.classList.contains('hidden')) {
        renderMatchHistory();
      }
      // Assurer que l'historique soit disponible même si ce n'est pas l'onglet actif
      setTimeout(() => {
        renderMatchHistory();
      }, 100);
    });
  } else if (view === 'public-profile' && publicUser) {
    homeSection.classList.remove('hidden');
    bg_blur?.classList.remove('hidden');
    if (publicProfileSection) publicProfileSection.classList.remove('hidden');
    if (publicProfileAvatarImg) publicProfileAvatarImg.src = (publicUser.avatar || '/avatars/default.png') + '?t=' + Date.now();
    if (publicProfileEmail) publicProfileEmail.textContent = publicUser.email;
    if (publicProfileDisplayName) publicProfileDisplayName.textContent = publicUser.displayName;

    // Réinitialiser les onglets du profil public
    const publicTabInfo = document.getElementById('public-profile-tab-info');
    const publicTabHistory = document.getElementById('public-profile-tab-history');
    const publicInfoPanel = document.getElementById('public-profile-info-panel');
    const publicHistoryPanel = document.getElementById('public-profile-history-panel');
    
    if (publicTabInfo && publicTabHistory && publicInfoPanel && publicHistoryPanel) {
      // Afficher l'onglet profil par défaut
      publicTabInfo.classList.add('bg-blue-600');
      publicTabHistory.classList.remove('bg-blue-600');
      publicTabHistory.classList.add('bg-gray-800');
      publicInfoPanel.classList.remove('hidden');
      publicHistoryPanel.classList.add('hidden');
    }

    let statusDot = document.getElementById('public-profile-status-dot');
    let statusText = document.getElementById('public-profile-status-text');
    if (!statusDot) {
      statusDot = document.createElement('span');
      statusDot.id = 'public-profile-status-dot';
      statusDot.style.display = 'inline-block';
      statusDot.style.width = '12px';
      statusDot.style.height = '12px';
      statusDot.style.borderRadius = '50%';
      statusDot.style.marginLeft = '8px';
      publicProfileAvatarImg?.parentElement?.insertBefore(statusDot, publicProfileAvatarImg.nextSibling);
    }
    if (!statusText) {
      statusText = document.createElement('span');
      statusText.className = 'text-white';
      statusText.id = 'public-profile-status-text';
      statusText.style.marginLeft = '6px';
      statusDot?.parentElement?.insertBefore(statusText, statusDot.nextSibling);
    }
    statusDot.style.backgroundColor = publicUser.online ? '#22c55e' : '#ef4444';
    statusText.textContent = publicUser.online ? 'en ligne' : 'hors ligne';

    // Charger les statistiques du profil public
    renderPublicProfileStats(publicUser.id);

    fetch('/api/me', { credentials: 'include' })
      .then(async (res) => (res.ok ? res.json() : null))
      .then(async me => {
        if (addFriendBtn) {
          if (me && me.displayName && publicUser.displayName && me.displayName !== publicUser.displayName) {
            // Vérifier si l'utilisateur est déjà ami
            const friendsRes = await fetch('/api/friends', { credentials: 'include' });
            if (friendsRes.ok) {
              const friends = await friendsRes.json();
              const isAlreadyFriend = friends.some((friend: any) => friend.id === publicUser.id);
              
              if (isAlreadyFriend) {
                addFriendBtn.classList.add('hidden');
                addFriendBtn.removeAttribute('data-userid');
              } else {
                addFriendBtn.classList.remove('hidden');
                addFriendBtn.setAttribute('data-userid', publicUser.id);
              }
            } else {
              addFriendBtn.classList.remove('hidden');
              addFriendBtn.setAttribute('data-userid', publicUser.id);
            }
          } else {
            addFriendBtn.classList.add('hidden');
            addFriendBtn.removeAttribute('data-userid');
          }
        }
      });
  } else {
    if (addFriendBtn) {
      addFriendBtn.classList.add('hidden');
      addFriendBtn.removeAttribute('data-userid');
    }
  }

  if (push) {
    history.pushState({ view }, '', view === 'login' ? '/' : `/${view}`);
  }

  if (view === 'login') {
    if (pingInterval) {
      clearInterval(pingInterval);
      pingInterval = undefined;
    }
    localStorage.removeItem('userId');
  } else {
    if (!pingInterval) {
      pingInterval = setInterval(async () => {
        try {
          await fetch('/api/ping', {
            method: 'POST',
            credentials: 'include'
          });
        } catch (error) {
          console.error('Ping failed:', error);
        }
      }, 10_000) as unknown as number;
    }
  }

  if (view === 'tournament') {
    homeSection.classList.remove('hidden');
    tournamentSection?.classList.remove('hidden');
    for (let i = 1; i <= 4; i++) {
      const slotDiv = document.getElementById(`slot-${i}`);
      if (slotDiv) slotDiv.textContent = `Slot ${i}`;
    }
    document.querySelectorAll('.join-tournament-btn').forEach(btn => {
      btn.removeAttribute('disabled');
      btn.textContent = 'Rejoindre';
    });
    return;
  }
}

showRegisterBtn.addEventListener('click', () => {
  showView('register');
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (document.getElementById('reg-email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('reg-password') as HTMLInputElement).value.trim();
  const displayName = (document.getElementById('reg-displayName') as HTMLInputElement).value.trim();

  if (!email || !password || !displayName) {
    alert('Veuillez remplir tous les champs.');
    return;
  }

  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName })
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any));
    alert(data.error || 'Erreur lors de la création du compte');
    return;
  }

  alert('Compte créé. Veuillez vous connecter.');
  showView('login');
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = (document.getElementById('email') as HTMLInputElement).value.trim();
  const password = (document.getElementById('password') as HTMLInputElement).value.trim();

  if (!email || !password) {
    alert('Veuillez remplir tous les champs.');
    return;
  }

  const attempt = async (otp?: string): Promise<Response> => {
    return fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, otp })
    });
  };

  let res = await attempt();

  if (res.status === 206) {
    const code = prompt('Entrez le code à 6 chiffres de votre application Authenticator :') || '';
    if (!/^[0-9]{6}$/.test(code)) {
      alert('Code invalide');
      return;
    }
    res = await attempt(code);
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({} as any));
    alert(data.error || 'Erreur de connexion');
    return;
  }

  try {
    const meRes = await fetch('/api/me', { credentials: 'include' });
    if (meRes.ok) {
      const me = await meRes.json();
      localStorage.setItem('userId', me.id);
      // Vider le cache de l'historique en forçant un rechargement
      console.log('Connexion réussie - l\'historique sera rechargé automatiquement');
    }
  } catch {}

  showView('home');
});


if (goGameBtn) {
  goGameBtn.addEventListener('click', () => {
    showView('game');
  });
}

if (backHomeBtn) {
  backHomeBtn.addEventListener('click', () => {
    showView('home');
  });
}

if (goProfileBtn) {
  goProfileBtn.addEventListener('click', () => {
    showView('profile');
  });
}

if (backHomeProfileBtn) {
  backHomeProfileBtn.addEventListener('click', () => {
    showView('home');
  });
}

if (profileForm) {
  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!profileEmail || !profileDisplayName) return;
    const email = profileEmail.value.trim();
    const displayName = profileDisplayName.value.trim();

    if (profileAvatar && profileAvatar.files && profileAvatar.files[0]) {
      if (profileAvatar.files[0].size > 50 * 1024) {
        alert('Avatar trop volumineux (max 50kb).');
        return;
      }
    }

    const res = await fetch('/api/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, displayName })
    });

    let avatarUrl: string | undefined;

    if (profileAvatar && profileAvatar.files && profileAvatar.files[0]) {
      const userRes = await fetch('/api/me', { credentials: 'include' });
      const user = await userRes.json();

      const formData = new FormData();
      formData.append('file', profileAvatar.files[0]);

      const avatarRes = await fetch('/api/me/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (avatarRes.ok) {
        const data = await avatarRes.json();
        avatarUrl = data.avatar;
      }
    }

    if (res.ok) {
      alert('Profil mis à jour !');
      if (avatarUrl && profileAvatarImg) {
        profileAvatarImg.src = avatarUrl + '?t=' + Date.now();
      }
      showView('profile', false);
    } else {
      const data = await res.json();
      alert(data.error || 'Erreur lors de la mise à jour');
    }
  });
}



if (searchUserBtn && searchUserInput && searchUserResult) {
  searchUserBtn.addEventListener('click', async () => {
    const displayName = searchUserInput.value.trim();
    searchUserResult.innerHTML = '';
    if (!displayName) {
      searchUserResult.textContent = 'Veuillez entrer un pseudo.';
      return;
    }
    const res = await fetch(`/api/user/${encodeURIComponent(displayName)}`, { 
      credentials: 'include' 
    });
    if (res.ok) {
      const user = await res.json();
      searchUserResult.innerHTML = `
        <div class="flex items-center mb-2">
          <img src="${user.avatar || '/avatars/default.png'}?t=${Date.now()}" alt="Avatar" class="w-10 h-10 rounded-full mr-2">
          <span class="font-bold">${user.displayName}</span>
        </div>
        <button id="view-public-profile" class="bg-blue-500 text-white px-4 py-2 rounded w-full">Voir le profil</button>
      `;
      const viewBtn = document.getElementById('view-public-profile');
      if (viewBtn) {
        viewBtn.addEventListener('click', () => {
          showView('public-profile', true, user);
        });
      }
    } else {
      searchUserResult.textContent = 'Utilisateur non trouvé.';
    }
  });
}

if (backProfileBtn) {
  backProfileBtn.addEventListener('click', () => {
    showView('profile');
    renderFriendsList();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const deleteAvatarBtn = document.getElementById('delete-avatar');
  if (deleteAvatarBtn) {
    deleteAvatarBtn.addEventListener('click', async () => {
      await fetch('/api/me/avatar', { method: 'DELETE', credentials: 'include' });
      showView('profile', false);
    });
  }

  const tabInfo = document.getElementById('profile-tab-info');
  const tabHistory = document.getElementById('profile-tab-history');
  const infoPanel = document.getElementById('profile-info-panel');
  const historyPanel = document.getElementById('profile-history-panel');
  if (tabInfo && tabHistory && infoPanel && historyPanel) {
    tabInfo.addEventListener('click', () => {
      tabInfo.classList.add('bg-gray-700');
      tabHistory.classList.remove('bg-gray-700');
      infoPanel.classList.remove('hidden');
      historyPanel.classList.add('hidden');
    });
    tabHistory.addEventListener('click', () => {
      tabHistory.classList.add('bg-gray-700');
      tabInfo.classList.remove('bg-gray-700');
      infoPanel.classList.add('hidden');
      historyPanel.classList.remove('hidden');
      renderMatchHistory();
    });
  }

  // Gestionnaires pour les onglets du profil public
  const publicTabInfo = document.getElementById('public-profile-tab-info');
  const publicTabHistory = document.getElementById('public-profile-tab-history');
  const publicInfoPanel = document.getElementById('public-profile-info-panel');
  const publicHistoryPanel = document.getElementById('public-profile-history-panel');
  
  if (publicTabInfo && publicTabHistory && publicInfoPanel && publicHistoryPanel) {
    publicTabInfo.addEventListener('click', () => {
      publicTabInfo.classList.add('bg-blue-600');
      publicTabInfo.classList.remove('bg-gray-800');
      publicTabHistory.classList.remove('bg-blue-600');
      publicTabHistory.classList.add('bg-gray-800');
      publicInfoPanel.classList.remove('hidden');
      publicHistoryPanel.classList.add('hidden');
    });
    
    publicTabHistory.addEventListener('click', () => {
      publicTabHistory.classList.add('bg-blue-600');
      publicTabHistory.classList.remove('bg-gray-800');
      publicTabInfo.classList.remove('bg-blue-600');
      publicTabInfo.classList.add('bg-gray-800');
      publicInfoPanel.classList.add('hidden');
      publicHistoryPanel.classList.remove('hidden');
      
      // Récupérer l'ID de l'utilisateur affiché
      const displayNameElement = document.getElementById('public-profile-displayName');
      if (displayNameElement && displayNameElement.textContent) {
        // On peut récupérer l'ID depuis l'attribut data ou faire une recherche
        const addFriendButton = document.getElementById('add-friend-btn');
        const userId = addFriendButton?.getAttribute('data-userid');
        if (userId) {
          renderPublicMatchHistory(parseInt(userId));
        }
      }
    });
  }
});

async function renderMatchHistory() {
  const historyList = document.getElementById('profile-history-list');
  const statsDiv = document.getElementById('profile-stats');
  if (!historyList || !statsDiv) return;

  try {
    console.log('Fetching match history...');

    const userRes = await fetch('/api/me', { credentials: 'include' });
    if (!userRes.ok) {
      historyList.textContent = 'Erreur d\'authentification.';
      return;
    }
    const currentUser = await userRes.json();
    
    const res = await fetch('/api/matches/history', { credentials: 'include' });
    console.log('Response status:', res.status);
    console.log('Response ok:', res.ok);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.log('Error response:', errorText);
      historyList.textContent = 'Erreur lors du chargement de l\'historique.';
      return;
    }

    const matches = await res.json();
    console.log('Matches received:', matches);
    
    if (matches.length === 0) {
      historyList.textContent = 'Aucune partie jouée pour le moment.';
      statsDiv.innerHTML = '<p>Aucune statistique disponible.</p>';
      return;
    }

    historyList.innerHTML = matches.map((match: any) => {
      const isWinner = match.isWinner;
      const opponent = match.player1.id === currentUser.id ? match.player2 : match.player1;
      const userScore = match.player1.id === currentUser.id ? match.player1Score : match.player2Score;
      const opponentScore = match.player1.id === currentUser.id ? match.player2Score : match.player1Score;
      
      let matchTypeLabel = '';
      if (match.matchType === 'TOURNAMENT_SEMI') {
        matchTypeLabel = '<span class="text-yellow-400">Tournoi - Demi-finale</span>';
      } else if (match.matchType === 'TOURNAMENT_FINAL') {
        matchTypeLabel = '<span class="text-yellow-400">Tournoi - Finale</span>';
      } else {
        matchTypeLabel = '<span class="text-blue-400">Partie normale</span>';
      }

      return `
        <div class="bg-gray-800 p-3 rounded mb-2">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
              <span class="font-semibold">vs ${opponent.displayName}</span>
              <img src="${opponent.avatar || '/avatars/default.png'}" class="w-8 h-8 rounded-full mr-2" alt="Avatar">
            </div>
            <div class="text-lg font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}">
              ${isWinner ? 'VICTOIRE' : 'DÉFAITE'}
            </div>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-300">Score: ${userScore} - ${opponentScore}</span>
            <span class="text-gray-400">${new Date(match.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="mt-1">
            ${matchTypeLabel}
          </div>
        </div>
      `;
    }).join('');

    const totalMatches = matches.length;
    const wins = matches.filter((match: any) => match.isWinner).length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    
    const tournamentMatches = matches.filter((match: any) => match.matchType.startsWith('TOURNAMENT'));
    const normalMatches = matches.filter((match: any) => match.matchType === 'NORMAL');
    
    statsDiv.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-green-400 font-semibold">Victoires</h4>
          <p class="text-2xl font-bold">${wins}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-red-400 font-semibold">Défaites</h4>
          <p class="text-2xl font-bold">${losses}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-blue-400 font-semibold">Taux de victoire</h4>
          <p class="text-2xl font-bold">${winRate}%</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-yellow-400 font-semibold">Total parties</h4>
          <p class="text-2xl font-bold">${totalMatches}</p>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-purple-400 font-semibold">Parties normales</h4>
          <p class="text-xl font-bold">${normalMatches.length}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-orange-400 font-semibold">Parties de tournoi</h4>
          <p class="text-xl font-bold">${tournamentMatches.length}</p>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Erreur lors du chargement de l\'historique:', error);
    historyList.textContent = 'Erreur lors du chargement de l\'historique.';
  }
}

async function renderPublicProfileStats(userId: number) {
  const statsDiv = document.getElementById('public-profile-stats');
  if (!statsDiv) return;

  try {
    const res = await fetch(`/api/matches/history/${userId}`, { credentials: 'include' });
    
    if (!res.ok) {
      statsDiv.textContent = 'Impossible de charger les statistiques.';
      return;
    }

    const matches = await res.json();
    
    if (matches.length === 0) {
      statsDiv.textContent = 'Aucune partie jouée pour le moment.';
      return;
    }

    const totalMatches = matches.length;
    const wins = matches.filter((match: any) => match.isWinner).length;
    const losses = totalMatches - wins;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;
    
    const tournamentMatches = matches.filter((match: any) => match.matchType.startsWith('TOURNAMENT'));
    const normalMatches = matches.filter((match: any) => match.matchType === 'NORMAL');
    
    statsDiv.innerHTML = `
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-green-400 font-semibold">Victoires</h4>
          <p class="text-2xl font-bold">${wins}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-red-400 font-semibold">Défaites</h4>
          <p class="text-2xl font-bold">${losses}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-blue-400 font-semibold">Taux de victoire</h4>
          <p class="text-2xl font-bold">${winRate}%</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-yellow-400 font-semibold">Total parties</h4>
          <p class="text-2xl font-bold">${totalMatches}</p>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 gap-4">
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-purple-400 font-semibold">Parties normales</h4>
          <p class="text-xl font-bold">${normalMatches.length}</p>
        </div>
        <div class="bg-gray-800 p-3 rounded">
          <h4 class="text-orange-400 font-semibold">Parties de tournoi</h4>
          <p class="text-xl font-bold">${tournamentMatches.length}</p>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Erreur lors du chargement des statistiques:', error);
    statsDiv.textContent = 'Erreur lors du chargement des statistiques.';
  }
}

async function renderPublicMatchHistory(userId: number) {
  const historyList = document.getElementById('public-profile-history-list');
  if (!historyList) return;

  try {
    const res = await fetch(`/api/matches/history/${userId}`, { credentials: 'include' });
    
    if (!res.ok) {
      if (res.status === 403) {
        historyList.textContent = 'Vous devez être ami avec cet utilisateur pour voir son historique.';
      } else {
        historyList.textContent = 'Erreur lors du chargement de l\'historique.';
      }
      return;
    }

    const matches = await res.json();
    
    if (matches.length === 0) {
      historyList.textContent = 'Aucune partie jouée pour le moment.';
      return;
    }

    historyList.innerHTML = matches.map((match: any) => {
      const isWinner = match.isWinner;
      const opponent = match.player1.id === userId ? match.player2 : match.player1;
      const userScore = match.player1.id === userId ? match.player1Score : match.player2Score;
      const opponentScore = match.player1.id === userId ? match.player2Score : match.player1Score;
      
      let matchTypeLabel = '';
      if (match.matchType === 'TOURNAMENT_SEMI') {
        matchTypeLabel = '<span class="text-yellow-400">Tournoi - Demi-finale</span>';
      } else if (match.matchType === 'TOURNAMENT_FINAL') {
        matchTypeLabel = '<span class="text-yellow-400">Tournoi - Finale</span>';
      } else {
        matchTypeLabel = '<span class="text-blue-400">Partie normale</span>';
      }

      return `
        <div class="bg-gray-800 p-3 rounded mb-2">
          <div class="flex justify-between items-center mb-2">
            <div class="flex items-center">
              <img src="${opponent.avatar || '/avatars/default.png'}" class="w-8 h-8 rounded-full mr-2" alt="Avatar">
              <span class="font-semibold">vs ${opponent.displayName}</span>
            </div>
            <div class="text-lg font-bold ${isWinner ? 'text-green-400' : 'text-red-400'}">
              ${isWinner ? 'VICTOIRE' : 'DÉFAITE'}
            </div>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-gray-300">Score: ${userScore} - ${opponentScore}</span>
            <span class="text-gray-400">${new Date(match.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="mt-1">
            ${matchTypeLabel}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Erreur lors du chargement de l\'historique:', error);
    historyList.textContent = 'Erreur lors du chargement de l\'historique.';
  }
}

if (tournamentSection) {
  tournamentSection.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains('join-tournament-btn')) {
      const slot = target.dataset.slot;
      target.textContent = 'En attente...';
      target.setAttribute('disabled', 'true');
      
      const ws = new WebSocket('ws://localhost:8082');
      let gameWs: WebSocket | null = null;
      let playernumber: number | null = null;
      let gameState: any = null;
      let animationId: number | null = null;
      let finished: boolean = false;
      let waitingStart = false;
      let player1Name = 'Joueur 1';
      let player2Name = 'Joueur 2';

      ws.onopen = async () => {
        const response = await fetch('/api/me', { credentials: 'include' });
        let userId = null;
        let displayName = 'Joueur';
        if (response.ok) {
          const userData = await response.json();
          userId = userData.id;
          displayName = userData.displayName || 'Joueur';
        }
        ws.send(JSON.stringify({ type: 'join_tournament', slot, userId, displayName }));
      };
      ws.onmessage = async (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'update_slots') {
          const userRes = await fetch('/api/me', { credentials: 'include' });
          let currentUserId = null;
          if (userRes.ok) {
            const userData = await userRes.json();
            currentUserId = userData.id;
          }
          
          const userIds = data.userIds || [];
          const userAlreadyJoined = currentUserId ? userIds.includes(currentUserId.toString()) : false;
          
          for (let i = 1; i <= 4; i++) {
            const slotDiv = document.getElementById(`slot-${i}`);
            const joinBtn = document.querySelector(`[data-slot="${i}"]`) as HTMLButtonElement;
            
            if (slotDiv && joinBtn) {
              if (data.slots[i-1]) {
                slotDiv.textContent = data.slots[i-1];
                joinBtn.style.display = 'none';
              } else {
                slotDiv.textContent = `Slot ${i}`;
                if (!userAlreadyJoined) {
                  joinBtn.style.display = 'block';
                  joinBtn.textContent = 'Rejoindre';
                  joinBtn.removeAttribute('disabled');
                } else {
                  joinBtn.style.display = 'none';
                }
              }
            }
          }
        }
        if (data.type === 'match_found') {
          waitingStart = true;
          pongpage?.classList.remove('hidden');
          tournamentSection.classList.add('hidden');
        }
        if (data.type === 'player_names') {
          player1Name = data.player1Name;
          player2Name = data.player2Name;
        }
        if (data.type === 'start_game') {
          showView('game');
          pongpage?.classList.remove('hidden');
          bg_blur?.classList.add('hidden');
          canvas.classList.remove('hidden');
          playernumber = data.playernumber || 1;
          startPongGame();
        }
        if (data.type === 'game_state') {
          gameState = data.state;
        }
        if (data.type === 'loser') {
          if (finished) return;
          finished = true;
          let loserpopup = document.getElementById('loser-popup') as HTMLDivElement;
          if (loserpopup) {
            loserpopup.classList.remove('hidden');
            const loserScore = document.getElementById('loser-score') as HTMLSpanElement;
            let btnfermer = document.getElementById('fermer-loser') as HTMLButtonElement;
            if (loserScore) {
              loserScore.textContent = `${data.score1} - ${data.score2}`;
            }
            if (btnfermer) {
              btnfermer.addEventListener('click', () => {
                loserpopup.classList.add('hidden');
                showView('game');
              });
            }
          }
          if (animationId) cancelAnimationFrame(animationId);
          return;
        }
        if (data.type === 'winner') {
          if (finished) return;
          finished = true;
          let winnerpopup = document.getElementById('winner-popup') as HTMLDivElement;
          let btnfermer = document.getElementById('fermer') as HTMLButtonElement;
          if (winnerpopup) {
            winnerpopup.classList.remove('hidden');
            const winnerScore = document.getElementById('winner-score') as HTMLSpanElement;
            if (winnerScore) {
              winnerScore.textContent = `${data.score1} - ${data.score2}`;
            }
            if (btnfermer) {
              btnfermer.addEventListener('click', () => {
                winnerpopup.classList.add('hidden');
                showView('game');
              });
            }
          }
          if (animationId) cancelAnimationFrame(animationId);
          return;
        }
        if (data.type === 'tournament_winner') {
          alert(`Le gagnant du tournoi est : ${data.displayName}`);
          showView('home');
        }
      };
      ws.onclose = () => {
        target.textContent = 'Rejoindre';
        target.removeAttribute('disabled');
      };

      function startPongGame() {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        let paddleY = 150;
        const paddleH = 80;
        const paddleW = 10;
        const height = 400;
        const width = 800;
        function draw() {
          if (!gameState || !ctx) return;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#222';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#fff';
          ctx.beginPath();
          ctx.setLineDash([10, 10]);
          ctx.moveTo(canvas.width/2, 0); ctx.lineTo(canvas.width/2, canvas.height);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.fillStyle = '#fff';
          ctx.fillRect(20, gameState.paddle1.y, paddleW, paddleH);
          ctx.fillRect(canvas.width-30, gameState.paddle2.y, paddleW, paddleH);
          ctx.beginPath();
          ctx.arc(gameState.ball.x, gameState.ball.y, 10, 0, 2*Math.PI);
          ctx.fill();
          ctx.font = '18px Arial';
          ctx.fillStyle = '#fff';
          ctx.fillText(player1Name, 20, 20);
          ctx.fillText(player2Name, canvas.width - ctx.measureText(player2Name).width - 30, 20);
          ctx.font = '32px Arial';
          ctx.fillText(gameState.score1, canvas.width/2-50, 40);
          ctx.fillText(gameState.score2, canvas.width/2+30, 40);
        }
        function gameLoop() {
          draw();
          animationId = requestAnimationFrame(gameLoop);
        }
        gameLoop();
        function onKey(e: KeyboardEvent) {
          if (!playernumber) return;
          let changed = false;
          if (playernumber === 1) {
            if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'Z') { paddleY -= 10; changed = true; }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { paddleY += 10; changed = true; }
          } else if (playernumber === 2) {
            if (e.key === 'ArrowUp' || e.key === 'z' || e.key === 'Z') { paddleY -= 10; changed = true; }
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') { paddleY += 10; changed = true; }
          }
          paddleY = Math.max(0, Math.min(canvas.height-paddleH, paddleY));
          if (changed) {
            ws.send(JSON.stringify({ type: 'paddle_move', y: paddleY }));
          }
        }
        window.addEventListener('keydown', onKey);
      }
    }
    if (target.id === 'close-tournament-btn') {
      tournamentSection.classList.add('hidden');
      showView('home');
    }
  });
}

async function renderFriendsList() {
  const container = document.getElementById('friends-list');
  if (!container) return;
  container.innerHTML = 'Chargement...';
  const res = await fetch('/api/friends', { credentials: 'include' });
  if (!res.ok) {
    container.innerHTML = 'Erreur lors du chargement des amis.';
    return;
  }
  const friends = await res.json();
  if (!friends.length) {
    container.innerHTML = '<div>Aucun ami pour le moment.</div>';
    return;
  }
  container.innerHTML = friends.map((f: any) => `
    <div class="flex items-center mb-2 friend-item" data-id="${f.id}" style="cursor:pointer;">
      <img src="${f.avatar || '/avatars/default.png'}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
      <span>${f.displayName}</span>
      <button class="ml-auto text-red-500 remove-friend-btn" data-id="${f.id}">Retirer</button>
    </div>
  `).join('');

  container.querySelectorAll('.remove-friend-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (e.target as HTMLElement).getAttribute('data-id');
      if (id) {
        await fetch(`/api/friends/${id}`, { method: 'DELETE', credentials: 'include' });
        renderFriendsList();
      }
    });
  });

  container.querySelectorAll('.friend-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      const id = (item as HTMLElement).getAttribute('data-id');
      if (id) {
        const friend = friends.find((f: any) => f.id == id);
        if (friend && friend.displayName) {
          const res = await fetch(`/api/user/${encodeURIComponent(friend.displayName)}`, { 
            credentials: 'include' 
          });
          if (res.ok) {
            const user = await res.json();
            showView('public-profile', true, user);
          }
        }
      }
    });
  });
}

async function enable2FA() {
  const r = await fetch('/api/2fa/enable', { method: 'POST', credentials: 'include' });
  if (!r.ok) return alert('Failed to start 2FA');
  const { qrDataUrl } = await r.json();
  (document.getElementById('twofa-qr') as HTMLImageElement).src = qrDataUrl;
}

async function verify2FA(code: string) {
  const r = await fetch('/api/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ code })
  });
  if (!r.ok) return alert('Invalid code');
  alert('2FA enabled!');
}

async function exportMe() {
  const r = await fetch('/api/me/export', { credentials: 'include' });
  const data = await r.json();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'my-data.json';
  a.click();
}

async function anonymizeMe() {
  const r = await fetch('/api/me/anonymize', { method: 'POST', credentials: 'include' });
  alert(r.ok ? 'Anonymized' : 'Failed');
}

async function deleteMe() {
  if (!confirm('Are you sure? This will delete your account.')) return;
  const r = await fetch('/api/me', { method: 'DELETE', credentials: 'include' });
  alert(r.ok ? 'Deleted' : 'Failed');
}



async function renderFriendRequests() {
  const container = document.getElementById('friend-requests-list');
  if (!container) return;
  container.innerHTML = 'Chargement...';
  const res = await fetch('/api/friends/requests', { credentials: 'include' });
  if (!res.ok) {
    container.innerHTML = 'Erreur lors du chargement des demandes.';
    return;
  }
  const requests = await res.json();
  if (!requests.length) {
    container.innerHTML = '<div>Aucune demande en attente.</div>';
    return;
  }
  container.innerHTML = requests.map((u: any) => `
  <div class="flex items-center mb-2">
    <img src="${u.avatar || '/avatars/default.png'}" alt="Avatar" class="w-8 h-8 rounded-full mr-2">
    <span>${u.displayName}</span>
    <button class="ml-auto bg-green-500 text-white px-2 py-1 rounded accept-friend-btn" data-id="${u.friendRequestId}">Accepter</button>
  </div>
`).join('');
  container.querySelectorAll('.accept-friend-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = (e.target as HTMLElement).getAttribute('data-id');
      if (id) {
        await fetch(`/api/friends/${id}/accept`, { method: 'POST', credentials: 'include' });
        renderFriendRequests();
        renderFriendsList();
      }
    });
  });
}

if (publicProfileSection) {
  publicProfileSection.addEventListener('click', async (e) => {
    const target = e.target as HTMLElement;
    if (target && target.id === 'add-friend-btn' && target.dataset.userid) {
      const res = await fetch(`/api/friends/${target.dataset.userid}`, { 
        method: 'POST', 
        credentials: 'include' 
      });
      if (res.ok) {
        alert('Ami ajouté !');
        // Cacher le bouton après ajout réussi
        target.classList.add('hidden');
        target.removeAttribute('data-userid');
        if (!profileSection.classList.contains('hidden')) {
          renderFriendsList();
        }
      } else {
        const data = await res.json();
        alert(data.error || 'Erreur lors de l\'ajout');
      }
    }
  });
}

function addLogoutButton() {
  if (!document.getElementById('logout-btn')) {
    const btn = document.getElementById('logout-btn');
    if (!btn) {
      return
    }
    if (homeSection) homeSection.appendChild(btn);
    if (profileSection) profileSection.appendChild(btn.cloneNode(true));
  }

  document.querySelectorAll('#logout-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      // Nettoyer le localStorage et les éventuels caches
      localStorage.clear();
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
      showView('login');
    });
  });
}

window.addEventListener('popstate', (event) => {
  const view = event.state?.view || 'login';
  showView(view, false);
});

if (location.pathname === '/register') showView('register', false);
else if (location.pathname === '/home') showView('home', false);
else if (location.pathname === '/game') showView('game', false);
else if (location.pathname === '/profile') showView('profile', false);
else showView('login', false);

const userId = localStorage.getItem('userId');
await fetch('/api/me', { method: 'GET', credentials: 'include' });

const canvashome = document.getElementById("home-canvas") as HTMLCanvasElement;
const canHome = canvashome?.getContext("2d");
if (!canHome) {
    throw new Error("Impossible de récupérer le contexte du canvas");
}

function drawHomePong() 
{
    if (!canHome) return;
    canHome.clearRect(0, 0, canvashome.width, canvashome.height);
    canHome.save();
    canHome.strokeStyle = "white";
    canHome.setLineDash([10, 10]);
    canHome.beginPath();
    canHome.moveTo(canvashome.width / 2, 0);
    canHome.lineTo(canvashome.width / 2, canvashome.height);
    canHome.stroke();
    canHome.setLineDash([]);
    canHome.restore();

    canHome.fillStyle = "white";
    canHome.fillRect(20, 80, 10, 60);
    canHome.fillRect(canvashome.width - 30, 10, 10, 60);

    canHome.beginPath();
    canHome.arc(100, 100, 6, 0, Math.PI * 2);
    canHome.fillStyle = "white";
    canHome.fill();
}
