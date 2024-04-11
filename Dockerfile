FROM node:18-alpine AS dependencies
WORKDIR /proxy
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --only=production
COPY . .
ARG PORT=8888
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD [ -d "node_modules" ] && npm run start || npm ci --only=production && npm run start
EXPOSE 9999
USER node