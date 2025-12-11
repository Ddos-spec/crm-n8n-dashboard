# Gunakan image Python yang ringan
FROM python:3.10-slim

# Set folder kerja di dalam container
WORKDIR /app

# Copy requirements.txt dari folder saat ini (karena context build sudah di dalam backend)
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh file dari folder saat ini ke container
COPY . .

# Beritahu Docker port yang dipakai
EXPOSE 8888

# Jalankan server
CMD ["python", "server.py"]