FROM node:24-alpine
WORKDIR /proxy
RUN chown -R node:node /proxy
COPY src ./src
COPY package.json ./
COPY package-lock.json ./
RUN mkdir config
COPY config/config.template.json ./config/config.json
RUN mkdir saved_data
RUN chmod -R 777 /proxy
RUN npm ci --omit=dev
ARG PORT=8888
CMD [ -d "node_modules" ] && npm run start || npm ci --only=production && npm run start
EXPOSE 9988 9999 9977
USER node
