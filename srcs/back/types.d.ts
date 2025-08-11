// Global type augmentations for Fastify JWT and custom instance decorations

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; email: string };
    user: { id: number; email: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuth: (req: any, reply: any) => Promise<void>;
  }
}
