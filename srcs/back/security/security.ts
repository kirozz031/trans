// src/security.ts (backend-local)
import fp from 'fastify-plugin';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import fastifyJwt from '@fastify/jwt';

async function getJwtSecretFromVault(): Promise<string | null> {
  const addr = process.env.VAULT_ADDR;
  const token = process.env.VAULT_TOKEN;
  const path = process.env.VAULT_JWT_PATH || 'v1/secret/data/jwt';
  if (!addr || !token) return null;
  try {
    const res = await fetch(`${addr}/${path}`, { headers: { 'X-Vault-Token': token } });
    if (!res.ok) throw new Error('Vault error');
    const json = await res.json();
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
    sign: { expiresIn: '1d' },
    cookie: { cookieName: 'token' }
  });

  fastify.decorate('requireAuth', async (req: any, reply: any) => {
    try {
      // Try cookie first, then authorization header
      if (req.cookies?.token) {
        const token = req.cookies.token;
        const payload = fastify.jwt.verify(token);
        req.user = payload;
      } else {
        await req.jwtVerify();
      }
    } catch (error) {
      console.log('JWT Auth Error:', String(error));
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });
});
