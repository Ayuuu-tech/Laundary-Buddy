# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy frontend files
COPY . .

# Install serve for static file serving
RUN npm install -g serve

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

# Expose port
EXPOSE 3000

# Serve static files
CMD ["serve", "-s", ".", "-l", "3000"]
