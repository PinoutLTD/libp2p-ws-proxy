ARG BUILD_FROM
FROM $BUILD_FROM
WORKDIR /proxy
RUN chown -R node:node /proxy
RUN chmod -R 777 /proxy
COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev
COPY . .
ARG PORT=8888
CMD [ -d "node_modules" ] && npm run start || npm ci --only=production && npm run start
EXPOSE 9999
USER node