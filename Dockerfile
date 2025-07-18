# Dockerfile - BACK
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Ajoute cette ligne AVANT le build final
RUN npx prisma generate

RUN npm run build

CMD ["npm", "run", "start:prod"]