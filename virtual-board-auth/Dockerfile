FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
COPY src ./src

# Lecture slide setup: generate Prisma client in the image
RUN npx prisma generate

EXPOSE 3001
CMD ["npm", "start"]
