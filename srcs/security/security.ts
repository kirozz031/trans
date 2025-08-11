// src/security.ts
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';

async function getJwtSecretFromVault(): Promise<string | null> {
  // Optional: VAULT_ADDR=http://vault:8200  VAULT_TOKEN=root
  const addr = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  const path = process.env.VAULT_JWT_PATH || 'v1/secret/data/jwt'; // KV v2 data path
  if (!addr || !token) return null;

  try {
    const res = await fetch(`${addr}/${path}`, { headers: { 'X-Vault-Token': token } });
    if (!res.ok) throw new Error('Vault error');
    const json = await res.json();
    // KV v2 layout: { data: { data: { secret: "<value>" } } }
    return json?.data?.data?.secret ?? null;
  } catch {
    return null;
  }
}

export default fp(async (fastify: any) => {
  await fastify.register(helmet);
  await fastify.register(rateLimit, { max: 100, timeWindow: '1 minute' });

  let jwtSecret = process.env.JWT_SECRET || '';
  if (!jwtSecret) {
    const fromVault = await getJwtSecretFromVault();
    jwtSecret = fromVault || 'dev-change-me';
  }

  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: { expiresIn: '1d' }
  });

  fastify.decorate('requireAuth', async (req: any, reply: any) => {
    try {
      await (req as any).jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
// Module augmentation for requireAuth is declared in back/types.d.ts
