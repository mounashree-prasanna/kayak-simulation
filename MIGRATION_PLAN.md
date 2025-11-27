# Migration Plan - Clean Directory Structure

## New Structure

```
Project/
├── services/              # All microservices here
│   ├── user-service/
│   ├── listing-service/   ✅ Done
│   ├── booking-service/
│   ├── billing-service/
│   ├── review-logging-service/
│   ├── admin-analytics-service/
│   ├── api-gateway/
│   └── agentic-recommendation-service/
├── scripts/               # Test and seed scripts
├── docs/                  # Documentation
├── docker-compose.yml     # Updated paths
└── README.md

## Old Monolith Files (can be removed after migration)
├── server.js
├── config/
├── controllers/
├── models/
├── routes/
├── middleware/
```

## Migration Steps

1. ✅ Create `services/` directory
2. ✅ Convert listing-service to JS in services folder
3. Move user-service and billing-service to services/ (they're already JS)
4. Convert remaining services to JS in services folder
5. Update docker-compose.yml paths
6. Clean up old files

