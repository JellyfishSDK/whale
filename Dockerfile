FROM node:16-alpine3.13

# add curl for docker healthcheck capability
RUN apk --no-cache add curl

WORKDIR /app

COPY LICENSE ./
COPY package.json ./
COPY package-lock.json ./

RUN npm ci

COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY src ./src
COPY packages ./packages

RUN npm run build

ENV NODE_ENV=production
CMD ["node", "dist/src/main"]
