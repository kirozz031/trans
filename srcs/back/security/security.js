"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/security.ts (backend-local)
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
async function getJwtSecretFromVault() {
    const addr = process.env.VAULT_ADDR;
    const token = process.env.VAULT_TOKEN;
    const path = process.env.VAULT_JWT_PATH || 'v1/secret/data/jwt';
    if (!addr || !token)
        return null;
    try {
        const res = await fetch(`${addr}/${path}`, { headers: { 'X-Vault-Token': token } });
        if (!res.ok)
            throw new Error('Vault error');
        const json = await res.json();
        return json?.data?.data?.secret ?? null;
    }
    catch {
        return null;
    }
}
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    await fastify.register(helmet_1.default);
    await fastify.register(rate_limit_1.default, { max: 100, timeWindow: '1 minute' });
    let jwtSecret = process.env.JWT_SECRET || '';
    if (!jwtSecret) {
        const fromVault = await getJwtSecretFromVault();
        jwtSecret = fromVault || 'dev-change-me';
    }
    await fastify.register(jwt_1.default, {
        secret: jwtSecret,
        sign: { expiresIn: '1d' },
        cookie: { cookieName: 'token' }
    });
    fastify.decorate('requireAuth', async (req, reply) => {
        try {
            // Try cookie first, then authorization header
            if (req.cookies?.token) {
                const token = req.cookies.token;
                const payload = fastify.jwt.verify(token);
                req.user = payload;
            }
            else {
                await req.jwtVerify();
            }
        }
        catch (error) {
            console.log('JWT Auth Error:', String(error));
            return reply.code(401).send({ error: 'Unauthorized' });
        }
    });
});
