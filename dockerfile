FROM node:22.19.0-slim
RUN apt-get update \
    && apt-get install -y openssl \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json /app/
RUN npm install
COPY prisma /app/prisma
COPY prisma.config.ts /app/
RUN npx prisma generate
COPY . /app/
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm run start:prod"]

