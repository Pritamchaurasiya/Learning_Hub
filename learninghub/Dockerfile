FROM node:20-alpine AS builder

WORKDIR /app

# Build arguments for Vite compilation
ARG VITE_API_URL=/api/v1
ARG VITE_APP_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL

# Install dependencies ignoring lifecycle prepare scripts (husky)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code and build
COPY . .
RUN npm run build

# Production Image (Nginx)
FROM nginx:alpine

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Provide custom nginx config with Socket.IO, API gateway, uploads and caching rules
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose frontend port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
