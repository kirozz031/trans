"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const multipart_1 = __importDefault(require("@fastify/multipart"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const static_1 = __importDefault(require("@fastify/static"));
const fastify_1 = __importDefault(require("fastify"));
const fastify = (0, fastify_1.default)();
const prisma = new client_1.PrismaClient();
fastify.register(static_1.default, {
    root: path_1.default.join(__dirname, 'avatars'),
    prefix: '/avatars/',
});
fastify.register(multipart_1.default);
// Middleware d'authentification fictif (à remplacer par vrai auth)
fastify.addHook('preHandler', async (req, reply) => {
    if (req.body?.userId)
        req.userId = req.body.userId;
    else if (req.headers['x-user-id'])
        req.userId = parseInt(req.headers['x-user-id'], 10);
    else
        req.userId = 1;
});
fastify.post('/api/register', async (req, reply) => {
    const { email, password, displayName } = req.body;
    const hash = await bcrypt_1.default.hash(password, 10);
    try {
        const user = await prisma.user.create({
            data: { email, password: hash, displayName }
        });
        reply.send({ id: user.id, email: user.email, displayName: user.displayName });
    }
    catch (e) {
        reply.status(400).send({ error: 'Email ou pseudo déjà utilisé.' });
    }
});
fastify.post('/api/login', async (req, reply) => {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user)
        return reply.status(401).send({ error: 'Email invalide.' });
    if (!(await bcrypt_1.default.compare(password, user.password)))
        return reply.status(401).send({ error: 'Mot de passe invalide.' });
    reply.send({
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar ? user.avatar : '/avatars/default.png'
    });
});
fastify.get('/api/me', async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user)
        return reply.status(404).send({ error: 'Utilisateur non trouvé' });
    reply.send({
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar ? user.avatar : '/avatars/default.png'
    });
});
fastify.put('/api/me', async (req, reply) => {
    const { email, displayName } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.userId },
            data: { email, displayName }
        });
        reply.send({ email: user.email, displayName: user.displayName });
    }
    catch (e) {
        reply.status(400).send({ error: 'Email ou pseudo déjà utilisé.' });
    }
});
fastify.post('/api/me/avatar', async (req, reply) => {
    const parts = req.parts ? req.parts() : null;
    let userId = req.userId;
    let filePart = null;
    if (parts) {
        for await (const part of parts) {
            if (part.type === 'file') {
                filePart = part;
            }
            else if (part.type === 'field' && part.fieldname === 'userId') {
                userId = parseInt(part.value, 10);
            }
        }
    }
    else {
        filePart = await req.file();
    }
    if (!filePart)
        return reply.status(400).send({ error: 'No file uploaded' });
    if (!userId)
        return reply.status(400).send({ error: 'No userId provided' });
    // Supprimer l'ancien avatar custom si présent
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.avatar && user.avatar !== '/avatars/default.png') {
        const oldPath = path_1.default.join(__dirname, user.avatar);
        if (fs_1.default.existsSync(oldPath))
            fs_1.default.unlinkSync(oldPath);
    }
    // Nouveau nom unique
    const ext = path_1.default.extname(filePart.filename || 'avatar.png');
    const fileName = `user_${userId}_${Date.now()}${ext}`;
    const filePath = path_1.default.join(__dirname, 'avatars', fileName);
    await fs_1.default.promises.mkdir(path_1.default.dirname(filePath), { recursive: true });
    const ws = fs_1.default.createWriteStream(filePath);
    await filePart.file.pipe(ws);
    await prisma.user.update({
        where: { id: userId },
        data: { avatar: `/avatars/${fileName}` }
    });
    reply.send({ success: true, avatar: `/avatars/${fileName}` });
});
// Endpoint pour remettre l'avatar par défaut
fastify.delete('/api/me/avatar', async (req, reply) => {
    const userId = req.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.avatar && user.avatar !== '/avatars/default.png') {
        const oldPath = path_1.default.join(__dirname, user.avatar);
        if (fs_1.default.existsSync(oldPath))
            fs_1.default.unlinkSync(oldPath);
    }
    await prisma.user.update({
        where: { id: userId },
        data: { avatar: null }
    });
    reply.send({ success: true });
});
// // Exemple pour fetch('/api/me')
// const userId = localStorage.getItem('userId');
// const res = await fetch('/api/me', {
//   method: 'POST',
//   headers: { 'Content-Type': 'application/json' },
//   body: JSON.stringify({ userId })
// });
fastify.listen({ port: 3000, host: '0.0.0.0' }, (err, address) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(`Server listening at ${address}`);
});
