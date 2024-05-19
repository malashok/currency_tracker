FROM ubuntu:latest
LABEL authors="natal"

ENTRYPOINT ["top", "-b"]

FROM node:18

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]