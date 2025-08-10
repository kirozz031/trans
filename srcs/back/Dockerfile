FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install --save-dev @types/bcrypt

COPY . .

# Génére le client Prisma après avoir copié le code et le schéma
RUN npx prisma generate

CMD ["npm", "run", "dev"]