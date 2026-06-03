FROM node:20-alpine

WORKDIR /app

# Cache package dependencies
COPY package*.json ./
RUN npm install

# Copy frontend code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Run development server with host configuration for external container mapping
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
