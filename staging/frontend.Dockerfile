FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/olympiad-frontend/package*.json ./
RUN npm ci
COPY frontend/olympiad-frontend/ ./
ARG REACT_APP_API_URL=http://localhost:8001
ENV REACT_APP_API_URL=$REACT_APP_API_URL
RUN npm run build
FROM nginx:1.27-alpine
COPY staging/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
