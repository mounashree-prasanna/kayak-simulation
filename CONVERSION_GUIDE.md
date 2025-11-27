# Complete TypeScript to JavaScript Conversion Guide

## ✅ Completed Services

1. **Billing Service** - ✅ Fully converted
2. **User Service** - ✅ Fully converted  
3. **Listing Service Models** - ✅ Models converted (Flight, Hotel, Car)

## 🔄 Conversion Pattern (Use for Remaining Services)

### Step 1: Models (.ts → .js)

**Before (TypeScript):**
```typescript
import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IModel extends Document {
  field: string;
}

const schema = new Schema<IModel>({
  field: { type: String, required: true }
});

export const Model: Model<IModel> = mongoose.model<IModel>('Model', schema);
```

**After (JavaScript):**
```javascript
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const schema = new Schema({
  field: { type: String, required: true }
});

module.exports = mongoose.model('Model', schema);
```

### Step 2: Controllers (.ts → .js)

**Remove:**
- `import { Request, Response } from 'express'`
- Type annotations like `: Promise<void>`, `: Request`, `: Response`
- `error: any` → `error`

**Change:**
- `export const functionName` → `const functionName` then `module.exports = { functionName }`
- `export default` → `module.exports`

### Step 3: Routes (.ts → .js)

**Before:**
```typescript
import { Router } from 'express';
import { controller } from '../controllers/controller';

const router = Router();
router.get('/', controller);
export default router;
```

**After:**
```javascript
const express = require('express');
const router = express.Router();
const { controller } = require('../controllers/controller');

router.get('/', controller);
module.exports = router;
```

### Step 4: Config Files (.ts → .js)

**Before:**
```typescript
export const connectDB = async (): Promise<void> => { ... }
```

**After:**
```javascript
const connectDB = async () => { ... }
module.exports = connectDB;
```

### Step 5: Index Files (.ts → .js)

**Before:**
```typescript
import express, { Application } from 'express';
const app: Application = express();
```

**After:**
```javascript
const express = require('express');
const app = express();
```

### Step 6: Package.json Updates

**Remove:**
- All TypeScript dev dependencies (`typescript`, `@types/*`, `ts-node-dev`)
- `build` script
- Change `main` from `dist/index.js` to `src/index.js`

**Keep:**
- `nodemon` for dev
- All runtime dependencies

**Example:**
```json
{
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^7.6.3"
    // ... other deps
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
```

### Step 7: Dockerfile Updates

**Remove:**
- `RUN npm run build` step

**Keep:**
- Direct `CMD ["npm", "start"]`

## 📋 Remaining Services to Convert

### Listing Service
- [x] Models (Flight, Hotel, Car)
- [ ] Controllers (flightController, hotelController, carController)
- [ ] Routes (flightRoutes, hotelRoutes, carRoutes)
- [ ] Config (database.js)
- [ ] Index.js
- [ ] Package.json
- [ ] Dockerfile

### Booking Service
- [ ] Models (Booking.js)
- [ ] Controllers (bookingController.js)
- [ ] Routes (bookingRoutes.js)
- [ ] Utils (serviceClient.js, bookingIdGenerator.js)
- [ ] Config (database.js, kafka.js)
- [ ] Index.js
- [ ] Package.json
- [ ] Dockerfile

### Review & Logging Service
- [ ] All models (Review, PageClickLog, ListingClickLog, UserTrace, Image)
- [ ] Controllers (reviewController, loggingController)
- [ ] Routes (reviewRoutes, loggingRoutes)
- [ ] Config (database.js, kafka.js)
- [ ] Index.js
- [ ] Package.json
- [ ] Dockerfile

### Admin/Analytics Service
- [ ] Middleware (auth.js)
- [ ] Controllers (analyticsController.js)
- [ ] Routes (analyticsRoutes.js)
- [ ] Config (database.js)
- [ ] Index.js
- [ ] Package.json
- [ ] Dockerfile

### API Gateway
- [ ] Index.js
- [ ] Config (kafka.js)
- [ ] Package.json
- [ ] Dockerfile

## 🔧 Common Fixes

1. **Optional Chaining:** `address?.state` → `address && address.state`
2. **Optional Parameters:** Add null checks before accessing
3. **Error Handling:** `error: any` → `error`
4. **Type Assertions:** Remove `as string`, `as number`, etc.
5. **Const Assertions:** Remove `as const`

## Notes

- FastAPI service (agentic-recommendation-service) is already in Python, no conversion needed
- All .ts files can be deleted after conversion is verified
- Test each service after conversion to ensure it works

