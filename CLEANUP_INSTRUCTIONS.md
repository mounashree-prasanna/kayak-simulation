# Cleanup Instructions

## ✅ Completed

1. All services converted from TypeScript to JavaScript
2. All services organized in `services/` folder
3. `docker-compose.yml` updated with new paths

## 📋 Final Steps

### 1. Move agentic-recommendation-service

The FastAPI service is still in the root. Move it:
```bash
# Windows PowerShell
Move-Item -Path "agentic-recommendation-service" -Destination "services\"

# Linux/Mac
mv agentic-recommendation-service services/
```

### 2. Optional: Remove Old Files

After verifying everything works, you can remove:

#### Old service directories (if they exist in root):
- `user-service/` (old TypeScript version)
- `listing-service/` (old TypeScript version)
- `booking-service/` (old TypeScript version)
- `billing-service/` (old TypeScript version)
- `review-logging-service/` (old TypeScript version)
- `admin-analytics-service/` (old TypeScript version)
- `api-gateway/` (old TypeScript version)

#### TypeScript config files:
- `shared/types.ts`
- `shared/constants.ts`
- Any `tsconfig.json` files in old service directories

#### Old monolith files (if not needed):
- `server.js`
- `config/database.js`
- `controllers/`
- `models/` (root level)
- `routes/` (root level)
- `middleware/` (root level)

## 🧪 Testing

Before cleanup, test everything:

```bash
docker-compose down
docker-compose up --build
```

Verify all services start correctly and health checks pass:
- http://localhost:3000/health (API Gateway)
- http://localhost:3001/health (User Service)
- http://localhost:3002/health (Listing Service)
- http://localhost:3003/health (Booking Service)
- http://localhost:3004/health (Billing Service)
- http://localhost:3005/health (Review/Logging Service)
- http://localhost:3006/health (Admin Analytics)
- http://localhost:8000/docs (FastAPI Recommendation Service)

## 📁 Final Clean Structure

```
Project/
├── services/                    # All microservices
│   ├── user-service/
│   ├── listing-service/
│   ├── booking-service/
│   ├── billing-service/
│   ├── review-logging-service/
│   ├── admin-analytics-service/
│   ├── api-gateway/
│   └── agentic-recommendation-service/  # Move this
├── scripts/                     # Test harness
├── docs/                        # Documentation
├── docker-compose.yml
└── README.md
```

