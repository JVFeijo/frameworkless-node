FROM node:18

EXPOSE 8080

COPY . /app

WORKDIR /app

RUN ["mkdir", "files", "files/activities"]

RUN ["npm", "i"]

CMD ["npm", "run", "start"]