# Dockerfile - BACK
FROM node:20.13.1-slim

WORKDIR /app

# Étape 1 : copier les dépendances
COPY package.json package-lock.json ./

RUN npm ci

# Étape 2 : copier le reste du code
COPY . .

RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main"]