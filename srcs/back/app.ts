import '@fastify/jwt';

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import multipart from '@fastify/multipart';
import fs from 'fs';
import path from 'path';
import fastifyStatic from '@fastify/static';
// Use require to avoid TS confusion with default export typing
// eslint-disable-next-line @typescript-eslint/no-var-requires
const Fastify = require('fastify');
import fastifyCookie from '@fastify/cookie';
import fastifySession from '@fastify/session';

import securityPlugin from './security/security';
import twofaPlugin from './security/twofa';
import gdprPlugin from './security/gdpr';


declare module '@fastify/session' {
  interface SessionData {
    userId?: number;
  }
}


declare module 'fastify' {
  interface FastifyRequest {
    userId?: number;
  }
}



async function main() {
  const app = Fastify();
  const prisma = new PrismaClient();

  await app.register(securityPlugin);
  await app.register(twofaPlugin);
  await app.register(gdprPlugin);




app.register(fastifyStatic, {
  root: path.join(__dirname, 'avatars'),
  prefix: '/avatars/',
});

app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 Mo pour l'avatar (c'est beaucoup)
  }
});
app.register(fastifyCookie);
// app.register(fastifySession, {
//   secret: 'secretsecretsecretsecretsecretsecret',
//   cookie: { secure: false, httpOnly: true, sameSite: 'lax' }, // secure: true en prod HTTPS
//   saveUninitialized: false
// });

// fastify.post('/api/register', async (req, reply) => {
//   const { email, password, displayName } = req.body as any;
//   const hash = await bcrypt.hash(password, 10);
//   try {
//     const user = await prisma.user.create({
//       data: { email, password: hash, displayName }
//     });
//     reply.send({ id: user.id, email: user.email, displayName: user.displayName });
//   } catch (e) {
//     reply.status(400).send({ error: 'Email ou pseudo déjà utilisé.' });
//   }
// });


app.post('/api/register', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password', 'displayName'],
      properties: {
        email: { type: 'string', format: 'email', maxLength: 255 },
        password: { type: 'string', minLength: 8, maxLength: 128 },
        displayName: { type: 'string', minLength: 2, maxLength: 32 }
      }
    }
  }
}, async (req: any, reply: any) => {
  const { email, password, displayName } = req.body as any;
  const hash = await bcrypt.hash(password, 12);
  try {
    const user = await prisma.user.create({ data: { email, password: hash, displayName } });
    // do not auto-login, ask to login
    reply.send({ id: user.id, email: user.email, displayName: user.displayName });
  } catch (e) {
    reply.status(400).send({ error: 'Email or display name already used.' });
  }
});


// fastify.post('/api/login', async (req, reply) => {
//   const { email, password } = req.body as any;
//   const user = await prisma.user.findUnique({ where: { email } });
//   if (!user || !(await bcrypt.compare(password, user.password)))
//     return reply.status(401).send({ error: 'Email ou mot de passe invalide.' });
//   (req.session as any).userId = user.id;
//   reply.send({
//     id: user.id,
//     email: user.email,
//     displayName: user.displayName,
//     avatar: user.avatar ? user.avatar : '/avatars/default.png'
//   });
// });


app.post('/api/login', {
  schema: {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        otp: { type: 'string', pattern: '^[0-9]{6}$' }
      }
    }
  }
}, async (req: any, reply: any) => {
  const { email, password, otp } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return reply.code(401).send({ error: 'Invalid credentials' });
  }

  if (user.is2FAEnabled) {
    if (!otp) return reply.code(206).send({ need2FA: true }); // ask for OTP
    const { authenticator } = await import('otplib');
    if (!authenticator.check(otp, user.totpSecret!)) {
      return reply.code(401).send({ error: 'Invalid OTP' });
    }
  }

  const token = app.jwt.sign({ id: user.id, email: user.email });
  // Safer cookie (JS cannot read it). If you want localStorage instead, return {token}.
  reply
    .setCookie('token', token, { httpOnly: true, secure: false, sameSite: 'lax', path: '/' })
    .send({ ok: true });
});


// fastify.get('/api/me', async (req, reply) => {
//   const user = await prisma.user.findUnique({ where: { id: req.userId } });
//   if (!user) return reply.status(404).send({ error: 'Utilisateur non trouvé' });
//   reply.send({
//     email: user.email,
//     displayName: user.displayName,
//     avatar: user.avatar ? user.avatar : '/avatars/default.png'
//   });
// });


app.get('/api/me', { preHandler: (app as any).requireAuth }, async (req: any) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, displayName: true, avatar: true, is2FAEnabled: true }
  });
  return user;
});


app.put('/api/me', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const { email, displayName } = req.body as any;
  try {
    const user = await prisma.user.update({
  where: { id: req.user.id },
      data: { email, displayName }
    });
    reply.send({ email: user.email, displayName: user.displayName });
  } catch (e) {
    reply.status(400).send({ error: 'Email ou pseudo déjà utilisé.' });
  }
});

app.post('/api/me/avatar', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const MAX_SIZE = 50 * 1024; // 50kb
  const parts = req.parts ? req.parts() : null;
  let userId = req.user.id;
  let filePart: any = null;

  if (parts) {
    for await (const part of parts) {
      if (part.type === 'file') {
        filePart = part;
      }
    }
  } else {
    filePart = await (req as any).file();
  }

  if (!filePart) return reply.status(400).send({ error: 'No file uploaded' });
  if (!userId) return reply.status(400).send({ error: 'No userId provided' });

  // Vérification taille du fichier
  const chunks = [];
  let totalSize = 0;
  let tooBig = false;
  for await (const chunk of filePart.file) {
    totalSize += chunk.length;
    if (totalSize > MAX_SIZE) {
      tooBig = true;
      break;
    }
    chunks.push(chunk);
  }
  if (tooBig) {
    // Vide le stream restant pour éviter le blocage
    filePart.file.resume && filePart.file.resume();
    return reply.status(413).send({ error: 'Avatar trop volumineux (max 50kb).' });
  }
  const buffer = Buffer.concat(chunks);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.avatar && user.avatar !== '/avatars/default.png') {
    const oldPath = path.join(__dirname, user.avatar);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }

  const ext = path.extname(filePart.filename || 'avatar.png');
  const fileName = `user_${userId}_${Date.now()}${ext}`;
  const filePath = path.join(__dirname, 'avatars', fileName);

  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, buffer);

  await prisma.user.update({
    where: { id: userId },
    data: { avatar: `/avatars/${fileName}` }
  });

  reply.send({ success: true, avatar: `/avatars/${fileName}` });
});

app.delete('/api/me/avatar', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => { //remettre avatar par defaut
  const userId = req.user.id;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user?.avatar && user.avatar !== '/avatars/default.png') {
    const oldPath = path.join(__dirname, user.avatar);
    if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
  }
  await prisma.user.update({
    where: { id: userId },
    data: { avatar: null }
  });
  reply.send({ success: true });
});

app.post('/api/logout', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const userId = req.user.id;
  if (userId) onlineUsers.delete(userId);
  reply
    .clearCookie('token', { path: '/' })
    .send({ success: true });
});


const onlineUsers = new Map<number, number>();

const ONLINE_TIMEOUT = 10_000; //10sec avant d'etre mis hors ligne

app.post('/api/ping', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => { //ping pour le statut en ligne
  const userId = req.user.id;
  if (userId) {
    onlineUsers.set(userId, Date.now());
    reply.send({ online: true });
  } else {
    reply.status(401).send({ error: 'Non authentifié.' });
  }
});

function isUserOnline(userId: number): boolean {
  const last = onlineUsers.get(userId);
  return !!last && Date.now() - last < ONLINE_TIMEOUT;
}

app.get('/api/user/:displayName', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => { //recherche avec pseudo
  const { displayName } = req.params as { displayName: string };
  const user = await prisma.user.findUnique({ where: { displayName } });
  if (!user) return reply.status(404).send({ error: 'Utilisateur non trouvé' });
  reply.send({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    avatar: user.avatar ? user.avatar : '/avatars/default.png',
    online: isUserOnline(user.id)
  });
});

app.get('/api/friends', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const userId = req.user.id;
  if (!userId) return reply.status(401).send({ error: 'Non authentifié.' });
  const friends = await prisma.friend.findMany({
    where: { userId, status: 'ACCEPTED' },
    include: { friend: { select: { id: true, displayName: true, avatar: true, email: true } } },
  });
  reply.send(friends.map((f: any) => ({
    ...f.friend,
    online: isUserOnline(f.friend.id)
  })));
});

app.get('/api/friends/requests', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const userId = req.user.id;
  if (!userId) return reply.status(401).send({ error: 'Non authentifié.' });
  const requests = await prisma.friend.findMany({
    where: { friendId: userId, status: 'PENDING' },
    include: { user: { select: { id: true, displayName: true, avatar: true, email: true } } },
  });
  reply.send(requests.map((r: any) => ({
    id: r.user.id,
    displayName: r.user.displayName,
    avatar: r.user.avatar,
    email: r.user.email,
    online: isUserOnline(r.user.id),
    friendRequestId: r.id
  })));
});

app.post('/api/friends/:id', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const userId = req.user.id;
  const friendId = parseInt((req.params as any).id, 10);
  if (!userId || !friendId) return reply.status(400).send({ error: 'Paramètres invalides.' });
  if (userId === friendId) return reply.status(400).send({ error: 'Impossible de s\'ajouter soi-même.' });

  const existing = await prisma.friend.findFirst({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    }
  });
  if (existing) {
    if (existing.status === 'ACCEPTED')
      return reply.status(400).send({ error: 'Déjà amis.' });
    if (existing.userId === userId)
      return reply.status(400).send({ error: 'Demande déjà envoyée.' });
    else
      return reply.status(400).send({ error: 'Cet utilisateur vous a déjà envoyé une demande.' });
  }

  await prisma.friend.create({
    data: { userId, friendId, status: 'PENDING' }
  });
  reply.send({ success: true });
});

app.post('/api/friends/:id/accept', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const userId = req.user.id;
  const requestId = parseInt((req.params as any).id, 10);
  if (!userId || !requestId) return reply.status(400).send({ error: 'Paramètres invalides.' });

  const friendRequest = await prisma.friend.findUnique({ where: { id: requestId } });
  if (!friendRequest || friendRequest.friendId !== userId || friendRequest.status !== 'PENDING')
    return reply.status(404).send({ error: 'Demande non trouvée.' });

  await prisma.friend.update({
    where: { id: requestId },
    data: { status: 'ACCEPTED' }
  });

  await prisma.friend.create({
    data: { userId: userId, friendId: friendRequest.userId, status: 'ACCEPTED' }
  });

  reply.send({ success: true });
});

app.delete('/api/friends/:id', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const userId = req.user.id;
  const friendId = parseInt((req.params as any).id, 10);
  if (!userId || !friendId) return reply.status(400).send({ error: 'Paramètres invalides.' });

  await prisma.friend.deleteMany({
    where: {
      OR: [
        { userId, friendId },
        { userId: friendId, friendId: userId }
      ]
    }
  });
  reply.send({ success: true });
});

// Endpoint pour sauvegarder un match
app.post('/api/matches', async (req: any, reply: any) => {
  const { player1Id, player2Id, player1Score, player2Score, matchType } = req.body as any;
  
  if (!player1Id || !player2Id || player1Score === undefined || player2Score === undefined) {
    return reply.status(400).send({ error: 'Données manquantes' });
  }

  const winnerId = player1Score > player2Score ? parseInt(player1Id) : parseInt(player2Id);

  try {
    const match = await prisma.match.create({
      data: {
        player1Id: parseInt(player1Id),
        player2Id: parseInt(player2Id),
        player1Score: parseInt(player1Score),
        player2Score: parseInt(player2Score),
        winnerId,
        matchType: matchType || 'NORMAL'
      }
    });
    reply.send({ success: true, matchId: match.id });
  } catch (error) {
    console.error('Erreur lors de la création du match:', error);
    reply.status(500).send({ error: 'Erreur serveur' });
  }
});

// Endpoint pour récupérer l'historique des matches d'un utilisateur
app.get('/api/matches/history', { preHandler: (app as any).requireAuth }, async (req: any, reply: any) => {
  const userId = req.user.id;
  if (!userId) {
    return reply.status(401).send({ error: 'Non authentifié' });
  }

  try {
    const matches = await prisma.match.findMany({
      where: {
        OR: [
          { player1Id: userId },
          { player2Id: userId }
        ]
      },
      include: {
        player1: {
          select: { id: true, displayName: true, avatar: true }
        },
        player2: {
          select: { id: true, displayName: true, avatar: true }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

  const formattedMatches = matches.map((match: any) => ({
      id: match.id,
      player1: match.player1,
      player2: match.player2,
      player1Score: match.player1Score,
      player2Score: match.player2Score,
      winnerId: match.winnerId,
      matchType: match.matchType,
      createdAt: match.createdAt,
      isWinner: match.winnerId === userId
    }));

    reply.send(formattedMatches);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique:', error);
    reply.status(500).send({ error: 'Erreur serveur' });
  }
});

app.listen({ port: 3000, host: '0.0.0.0' }, (err: any, address: any) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server listening at ${address}`);
});

};


main();