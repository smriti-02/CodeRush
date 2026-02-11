FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 8000
CMD ["node", "-r", "dotenv/config", "src/index.js"]
