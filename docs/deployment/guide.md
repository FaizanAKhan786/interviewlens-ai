# InterviewLens AI — Production Deployment Guide

InterviewLens AI is designed for containerized deployment across modern cloud platforms (Render, Vercel, Railway, AWS ECS, or DigitalOcean).

---

## 1. Quick Docker Compose (Self-Hosted / Staging)

To boot the entire production stack (FastAPI backend, background worker, PostgreSQL 16, Redis 7, and MinIO storage):

```bash
# 1. Clone repository & configure environment
cp .env.example .env

# 2. Build and launch all services
docker compose up -d --build

# 3. Check logs
docker compose logs -f api
```

The application will be live at `http://localhost:8000`.

---

## 2. Platform-Specific Deployment

### Backend API on Render
1. Create a **Web Service** pointing to this repository.
2. Select **Docker** environment (or Python 3.12).
3. Set Build Command: `pip install -r requirements.txt`
4. Set Start Command: `uvicorn services.api.main:app --host 0.0.0.0 --port $PORT`
5. Connect a managed PostgreSQL database and managed Redis instance.
6. Configure environment variables from `.env.example`.

### Background Worker on Render
1. Create a **Background Worker** service.
2. Set Start Command: `python -m services.worker.pipeline`
3. Provide identical database, storage, and Redis credentials.

### Frontend on Vercel
The frontend client in `apps/web/` or static UI can be deployed directly to Vercel:
1. Connect repository to Vercel.
2. Set Environment Variable: `NEXT_PUBLIC_API_URL=https://your-api-service.onrender.com`
3. Deploy!
