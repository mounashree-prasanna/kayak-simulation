FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching (including package-lock.json)
COPY package*.json ./

# Install ALL dependencies (including dev dependencies needed for build)
# Using npm ci since we have package-lock.json (faster and more reliable)
RUN npm ci

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

