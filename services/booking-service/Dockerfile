FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY services/booking-service/package*.json ./

# Install dependencies (production only for smaller image)
RUN npm install --only=production

# Copy shared folder (for redisClient)
COPY shared ./shared

# Copy source code (excluding node_modules via .dockerignore)
COPY services/booking-service/ .

EXPOSE 3003

CMD ["npm", "start"]

