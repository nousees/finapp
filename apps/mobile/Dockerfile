FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8081 19000 19001 19002

ENV CI=1

CMD ["npx", "expo", "start", "--host", "lan"]
