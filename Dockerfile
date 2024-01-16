FROM node:18-alpine
WORKDIR /proxy
COPY . .
RUN npm install
ARG PORT=8888
ENV PORT=${PORT}
EXPOSE ${PORT}
CMD ["node", "src/index.js"]
EXPOSE 9999