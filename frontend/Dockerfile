# Multi-stage build for React frontend
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx
RUN adduser -S frontend -u 1001 -G nginx

# Set proper permissions
RUN chown -R frontend:nginx /usr/share/nginx/html
RUN chown -R frontend:nginx /var/cache/nginx
RUN chown -R frontend:nginx /var/log/nginx
RUN chown -R frontend:nginx /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R frontend:nginx /var/run/nginx.pid

# Switch to non-root user
USER frontend

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
ENTRYPOINT ["dumb-init", "--"]
CMD ["nginx", "-g", "daemon off;"]