# Full Stack CRM Automation Dashboard

This project is a Full-Stack CRM application built with Node.js, Express, Prisma, and React.

**🚀 Easypanel Deployment**: Project ini di-deploy menggunakan Docker di Easypanel (single VPS).

## Project Structure

- `backend/`: Node.js + Express API
- `frontend/`: React + Vite + TailwindCSS

## Prerequisites

- Node.js (v18+)
- PostgreSQL Database
- npm or yarn

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   - Check `.env` and update `DATABASE_URL` if needed.
   - Ensure `CORS_ORIGIN` matches your frontend URL.

4. Database Setup:
   ```bash
   # Generate Prisma Client
   npx prisma generate

   # Run Migrations (requires DB connection)
   npx prisma migrate dev
   ```
   *Note: If you are setting this up for the first time on a new DB, the initial migration `0_init` contains the SQL for Materialized Views and Functions.*

5. Run the Server:
   ```bash
   # Development
   npm run dev

   # Production
   npm run build
   npm start
   ```

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure Environment Variables:
   - Edit `.env` and set `REACT_APP_API_BASE_URL` to your backend URL.

4. Run the Application:
   ```bash
   # Development
   npm run dev

   # Production Build
   npm run build
   ```

## Deployment ke Easypanel

### Quick Deploy

1. **Login ke Easypanel Dashboard** di VPS kamu

2. **Create New Service**
   - Pilih "Docker Compose"
   - Upload atau paste file `docker-compose.yml` dari repo ini

3. **Set Environment Variables** di Easypanel:
   ```env
   DB_PASSWORD=your-secure-password
   JWT_SECRET=generate-with-openssl-rand-hex-64
   PUBLIC_URL=https://your-domain.easypanel.host
   CORS_ORIGIN=*
   WHATSAPP_API_URL=https://app.notif.my.id/api/v2/send-message
   WHATSAPP_API_KEY=your-api-key
   ```

4. **Deploy**
   - Klik Deploy
   - Tunggu build selesai (5-10 menit)

5. **Run Database Migrations**
   - Buka terminal di Easypanel untuk container `app`
   - Jalankan: `npx prisma migrate deploy`

6. **Setup Domain** (opsional)
   - Di Easypanel, tambahkan custom domain
   - SSL otomatis di-handle Easypanel

Selesai! Aplikasi bisa diakses di domain yang kamu set.

### Generate JWT Secret
```bash
openssl rand -hex 64
```

### Local Development

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (terminal baru)
cd frontend
npm install
npm run dev
```

## Integration & Testing

- **CORS**: Verified to accept requests from `CORS_ORIGIN`.
- **Database**: Check `/api/health` for connection status.
- **WhatsApp**: Use `/api/whatsapp/test` (mocked in this codebase) to verify integration.
