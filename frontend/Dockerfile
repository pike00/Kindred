# Stage 0, "build-stage", based on Node + pnpm, to build and compile the frontend
FROM node:22-slim AS build-stage
RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml /app/

COPY frontend/package.json /app/frontend/

# Vite build doesn't need Playwright's bundled browsers / ffmpeg (~400 MB).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN pnpm install --frozen-lockfile

COPY ./frontend /app/frontend
ARG VITE_API_URL
ARG VITE_AUTH_MODE=local
ARG VITE_CF_LOGOUT_URL=
ARG NODE_ENV=production
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_AUTH_MODE=${VITE_AUTH_MODE}
ENV VITE_CF_LOGOUT_URL=${VITE_CF_LOGOUT_URL}
ENV NODE_ENV=${NODE_ENV}

RUN pnpm --filter frontend build


# Stage 1, based on Nginx, to have only the compiled app, ready for production with Nginx
FROM nginx:1

COPY --from=build-stage /app/frontend/dist/ /usr/share/nginx/html

COPY ./frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY ./frontend/nginx-backend-not-found.conf /etc/nginx/extra-conf.d/backend-not-found.conf
