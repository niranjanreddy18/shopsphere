# =============================================================================
# Frontend Dockerfile — multi-stage build.
#
# Stage 1 (build) compiles the Vite/React app into static HTML/CSS/JS.
# Stage 2 (runtime) serves those static files with nginx — the build
# toolchain (Node, npm, every devDependency) never ships in the final
# image, which is the difference between a ~1.5GB image and a ~40MB one.
# =============================================================================

# --- Stage 1: build ---------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app

# Copy only the manifest files first so `npm ci` is cached by Docker's
# layer cache and skipped on rebuilds that don't touch dependencies.
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Build-time API URL: Vite inlines VITE_* env vars into the JS bundle at
# build time (not read at container runtime, unlike a server-rendered
# app) — see the README's Environment Variables section for why this
# means the frontend image must be rebuilt (not just restarted) to point
# at a different backend URL.
ARG VITE_API_BASE_URL=http://localhost:8000/api/v1
ARG VITE_STRIPE_PUBLISHABLE_KEY=pk_test_placeholder
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY

RUN npm run build

# --- Stage 2: runtime (nginx) -----------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
