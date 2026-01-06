# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy application files
COPY . .

# Create uploads directory
RUN mkdir -p uploads/moa uploads/repository/evaluations uploads/repository/documentation uploads/repository/other

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]

