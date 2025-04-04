FROM node:16
LABEL maintainer="pjaneiro@whitesmith.co"

WORKDIR /usr/src/app

COPY package*.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "docker-start"]
