# Full Stack CRM Automation Dashboard

This project is a Full-Stack CRM application built with Node.js, Express, Prisma, and React.

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

## Deployment

### Backend (Easypanel/VPS)
1. Push code to repository.
2. In Easypanel, create a new service from the repository.
3. Set the build path/context to `backend`.
4. Add all environment variables from `backend/.env`.
5. Deploy.

### Frontend (Vercel)
1. Push code to repository.
2. Import project in Vercel.
3. Set Root Directory to `frontend`.
4. Add `REACT_APP_API_BASE_URL` environment variable.
5. Deploy.

## Integration & Testing

- **CORS**: Verified to accept requests from `CORS_ORIGIN`.
- **Database**: Check `/api/health` for connection status.
- **WhatsApp**: Use `/api/whatsapp/test` (mocked in this codebase) to verify integration.
