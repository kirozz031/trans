"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/gdpr.ts
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.default = (0, fastify_plugin_1.default)(async (fastify) => {
    // Export my data
    fastify.get('/api/me/export', { preHandler: fastify.requireAuth }, async (req) => {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
            // include your relations: matches, friends, etc.
            }
        });
        return user; // Frontend can download as JSON
    });
    // Anonymize my data (keep stats but remove identifiers)
    fastify.post('/api/me/anonymize', { preHandler: fastify.requireAuth }, async (req) => {
        const anonName = `user_${req.user.id}`;
        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                email: `${anonName}@anonymized.local`,
                displayName: anonName,
                avatarPath: null,
                anonymizedAt: new Date()
            }
        });
        return { ok: true };
    });
    // Delete my account (soft delete)
    fastify.delete('/api/me', { preHandler: fastify.requireAuth }, async (req) => {
        await prisma.user.update({
            where: { id: req.user.id },
            data: { deletedAt: new Date() }
        });
        return { ok: true };
    });
});
