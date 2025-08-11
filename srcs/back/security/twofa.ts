// src/twofa.ts (backend-local)
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const prisma = new PrismaClient();

export default fp(async (fastify: any) => {
  // Start 2FA: create secret + return QR
  fastify.post('/api/2fa/enable', {
    preHandler: (fastify as any).requireAuth
  }, async (req: any, reply: any) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return reply.code(404).send({ error: 'User not found' });

    const secret = authenticator.generateSecret();
    const issuer = encodeURIComponent('ft_transcendence');
    const label  = encodeURIComponent(user.email);
    const otpauth = `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}`;

    await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret, is2FAEnabled: false } });
    const qrDataUrl = await QRCode.toDataURL(otpauth);
    return { qrDataUrl };
  });

  // Verify 2FA: user types the 6-digit code
  fastify.post('/api/2fa/verify', {
    preHandler: (fastify as any).requireAuth,
    schema: { body: { type: 'object', required: ['code'], properties: { code: { type: 'string', pattern: '^[0-9]{6}$' } } } }
  }, async (req: any, reply: any) => {
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.totpSecret) return reply.code(400).send({ error: 'No pending 2FA' });

    if (!authenticator.check(code, user.totpSecret)) {
      return reply.code(400).send({ error: 'Invalid code' });
    }
    await prisma.user.update({ where: { id: user.id }, data: { is2FAEnabled: true } });
    return { ok: true };
  });

  // Disable 2FA (requires a valid code)
  fastify.post('/api/2fa/disable', {
    preHandler: (fastify as any).requireAuth,
    schema: { body: { type: 'object', required: ['code'], properties: { code: { type: 'string', pattern: '^[0-9]{6}$' } } } }
  }, async (req: any, reply: any) => {
    const { code } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user?.totpSecret) return reply.code(400).send({ error: '2FA not enabled' });
    if (!authenticator.check(code, user.totpSecret)) return reply.code(400).send({ error: 'Invalid code' });

    await prisma.user.update({ where: { id: user.id }, data: { is2FAEnabled: false, totpSecret: null } });
    return { ok: true };
  });
});
