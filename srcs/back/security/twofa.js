"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/twofa.ts (backend-local)
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const client_1 = require("@prisma/client");
const otplib_1 = require("otplib");
const qrcode_1 = __importDefault(require("qrcode"));
const prisma = new client_1.PrismaClient();
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    // Start 2FA: create secret + return QR
    fastify.post('/api/2fa/enable', {
        preHandler: fastify.requireAuth
    }, async (req, reply) => {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return reply.code(404).send({ error: 'User not found' });
        const secret = otplib_1.authenticator.generateSecret();
        const issuer = encodeURIComponent('ft_transcendence');
        const label = encodeURIComponent(user.email);
        const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`;
        await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret, is2FAEnabled: false } });
        const qrDataUrl = await qrcode_1.default.toDataURL(otpauth);
        return { qrDataUrl };
    });
    // Verify 2FA: user types the 6-digit code
    fastify.post('/api/2fa/verify', {
        preHandler: fastify.requireAuth,
        schema: { body: { type: 'object', required: ['code'], properties: { code: { type: 'string', pattern: '^[0-9]{6}$' } } } }
    }, async (req, reply) => {
        const { code } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user?.totpSecret)
            return reply.code(400).send({ error: 'No pending 2FA' });
        if (!otplib_1.authenticator.check(code, user.totpSecret)) {
            return reply.code(400).send({ error: 'Invalid code' });
        }
        await prisma.user.update({ where: { id: user.id }, data: { is2FAEnabled: true } });
        return { ok: true };
    });
    // Disable 2FA (requires a valid code)
    fastify.post('/api/2fa/disable', {
        preHandler: fastify.requireAuth,
        schema: { body: { type: 'object', required: ['code'], properties: { code: { type: 'string', pattern: '^[0-9]{6}$' } } } }
    }, async (req, reply) => {
        const { code } = req.body;
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user?.totpSecret)
            return reply.code(400).send({ error: '2FA not enabled' });
        if (!otplib_1.authenticator.check(code, user.totpSecret))
            return reply.code(400).send({ error: 'Invalid code' });
        await prisma.user.update({ where: { id: user.id }, data: { is2FAEnabled: false, totpSecret: null } });
        return { ok: true };
    });
});
