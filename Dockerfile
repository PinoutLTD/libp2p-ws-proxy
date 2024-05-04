FROM node:18-alpine
WORKDIR /home/node/proxy
COPY . .
RUN touch /proxy/peerIdJson.json
RUN npm ci --only=production
ARG PORT=8888
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["node", "src/index.js"]
EXPOSE 9999
