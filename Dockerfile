FROM node:18-alpine
WORKDIR /proxy
RUN chown -R node:node /proxy
RUN chmod -R 777 /proxy
COPY . .
RUN touch /proxy/peerIdJson.json
RUN npm ci --only=production
ARG PORT=8888
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["node", "src/index.js"]
EXPOSE 9999
USER node