"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/security.ts
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const rate_limit_1 = __importDefault(require("@fastify/rate-limit"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
async function getJwtSecretFromVault() {
    // Optional: VAULT_ADDR=http://vault:8200  VAULT_TOKEN=root
    const addr = process.env.VAULT_ADDR;
    const token = process.env.VAULT_TOKEN;
    const path = process.env.VAULT_JWT_PATH || 'v1/secret/data/jwt'; // KV v2 data path
    if (!addr || !token)
        return null;
    try {
        const res = await fetch(`${addr}/${path}`, { headers: { 'X-Vault-Token': token } });
        if (!res.ok)
            throw new Error('Vault error');
        const json = await res.json();
        // KV v2 layout: { data: { data: { secret: "<value>" } } }
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
        sign: { expiresIn: '1d' }
    });
    fastify.decorate('requireAuth', async (req, reply) => {
        try {
            await req.jwtVerify();
        }
        catch {
            return reply.code(401).send({ error: 'Unauthorized' });
        }
    });
});
