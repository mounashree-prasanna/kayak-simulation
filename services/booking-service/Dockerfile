FROM node:18-alpine

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies (production only for smaller image)
RUN npm install --only=production

# Copy source code (excluding node_modules via .dockerignore)
COPY . .

EXPOSE 3003

CMD ["npm", "start"]

