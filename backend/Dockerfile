# Gunakan image Node.js yang ringan
FROM node:18-alpine

# Set folder kerja di dalam container
WORKDIR /app

# Copy package.json dan package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy seluruh file dari folder saat ini ke container
COPY . .

# Beritahu Docker port yang dipakai
EXPOSE 8001

# Jalankan server
CMD ["node", "server.js"]