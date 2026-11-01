# Stage 1: Build Flutter Web
FROM ghcr.io/cirruslabs/flutter:3.13.0 AS build-env

WORKDIR /app
COPY . .

# Enable web support (just into case) and build
RUN flutter config --enable-web
RUN flutter pub get
# Build with CanvasKit for performance
RUN flutter build web --release --web-renderer canvaskit --dart-define=API_URL=/api/v1/

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy Nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build artifacts
COPY --from=build-env /app/build/web /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
