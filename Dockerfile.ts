# TypeScript version of Liturgical Calendar MCP Server
FROM node:22-alpine

WORKDIR /app

# Copy package files and source code first
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# Install dependencies (this will run prepare script which builds)
RUN npm ci

# Set the entrypoint
ENTRYPOINT ["node", "build/index.js"]
