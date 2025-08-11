// src/gdpr.ts (backend-local)
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default fp(async (fastify: any) => {
  // Export my data
  fastify.get('/api/me/export', { preHandler: (fastify as any).requireAuth }, async (req: any) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        // include relations if needed
      }
    });
    return user;
  });

  // Anonymize my data (keep stats but remove identifiers)
  fastify.post('/api/me/anonymize', { preHandler: (fastify as any).requireAuth }, async (req: any) => {
    const anonName = `user_${req.user.id}`;
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        email: `${anonName}@anonymized.local`,
        displayName: anonName,
        avatar: null,
        anonymizedAt: new Date()
      }
    });
    return { ok: true };
  });

  // Delete my account (soft delete)
  fastify.delete('/api/me', { preHandler: (fastify as any).requireAuth }, async (req: any) => {
    await prisma.user.update({
      where: { id: req.user.id },
      data: { deletedAt: new Date() }
    });
    return { ok: true };
  });
});
