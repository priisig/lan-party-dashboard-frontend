# Build (glibc image: Vite 8 and TypeScript 7 ship native binaries)
FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# Serve
FROM nginx:1.29-alpine
# BACKEND_URL is substituted into the template by the nginx image on start.
ENV BACKEND_URL=http://backend:8080
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
