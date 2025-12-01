# CSV Ingestion Guide for Deals Agent

## Overview

The Deals Agent processes CSV files from Kaggle datasets to discover and tag travel deals. This guide explains how to set up and use CSV ingestion.

## Required Kaggle Datasets

Based on the project requirements, you need to download these datasets:

### 1. Hotels / Nightly Prices
- **Inside Airbnb (NYC)**: https://www.kaggle.com/datasets/dominoweir/inside-airbnb-nyc
  - Alternative: https://www.kaggle.com/datasets/ahmedmagdee/inside-airbnb
  - **Required fields**: `listing_id`, `date`, `price`, `availability`, `amenities`, `neighbourhood`

### 2. Hotel Booking Demand
- **Hotel Booking Demand**: https://www.kaggle.com/datasets/mojtaba142/hotel-booking
  - **Required fields**: Hotel details, booking dates, prices, amenities

### 3. Flight Prices
- **Flight Price Prediction (EaseMyTrip)**: https://www.kaggle.com/datasets/shubhambathwal/flight-price-prediction
  - **Flight Prices (Expedia, 2022 US routes)**: https://www.kaggle.com/datasets/dilwong/flightprices
  - **Required fields**: `origin`, `dest` (destination), `airline`, `stops`, `duration`, `price`

### 4. Airport/Routes Reference (Optional but recommended)
- **Global Airports**: https://www.kaggle.com/datasets/samvelkoch/global-airports-iata-icao-timezone-geo
- **OpenFlights**: https://www.kaggle.com/datasets/elmoallistair/airlines-airport-and-routes/

## CSV File Structure

### Expected Hotel CSV Format (Inside Airbnb)

```csv
listing_id,date,price,availability,amenities,neighbourhood,city,latitude,longitude
12345,2024-12-01,150.00,1,"wifi,breakfast,parking",Manhattan,New York,40.7128,-74.0060
```

### Expected Flight CSV Format (Flight Price Prediction)

```csv
origin,dest,airline,stops,duration,price,departure_date,arrival_date,seats_available
JFK,LAX,American Airlines,0,330,350.00,2024-12-25T16:00:00,2024-12-25T19:30:00,50
```

## Setup Instructions

### 1. Download Datasets

1. Create a Kaggle account if you don't have one
2. Install Kaggle CLI: `pip install kaggle`
3. Set up Kaggle API credentials (download `kaggle.json` from your account settings)
4. Download datasets:

```bash
# Create data directory
mkdir -p services/agentic-recommendation-service/data/csv

# Download Inside Airbnb NYC
kaggle datasets download -d dominoweir/inside-airbnb-nyc -p services/agentic-recommendation-service/data/csv

# Download Flight Price Prediction
kaggle datasets download -d shubhambathwal/flight-price-prediction -p services/agentic-recommendation-service/data/csv

# Extract ZIP files
cd services/agentic-recommendation-service/data/csv
unzip *.zip
```

### 2. Prepare CSV Files

The CSV files need to be in the correct format. You may need to:
- Rename columns to match expected field names
- Filter/transform data as needed
- Split large files into smaller chunks if needed

### 3. Place CSV Files

Place your CSV files in:
```
services/agentic-recommendation-service/data/csv/
├── hotels/
│   ├── airbnb_nyc_listings.csv
│   └── hotel_booking_demand.csv
└── flights/
    ├── flight_prices.csv
    └── flight_schedules.csv
```

### 4. Run CSV Ingestion

#### Option A: Manual Ingestion via API

```bash
# Ingest hotel CSV
curl -X POST http://localhost:8001/api/ingest/csv \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/app/data/csv/hotels/airbnb_nyc_listings.csv",
    "listing_type": "Hotel"
  }'

# Ingest flight CSV
curl -X POST http://localhost:8001/api/ingest/csv \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "/app/data/csv/flights/flight_prices.csv",
    "listing_type": "Flight"
  }'
```

#### Option B: Scheduled Worker (Recommended)

The Deals Agent worker can be configured to automatically process CSV files on a schedule.

## Data Processing Pipeline

Once CSV files are ingested, the data flows through:

1. **Feed Ingestion** → `raw_supplier_feeds` Kafka topic
2. **Normalization** → `deals.normalized` Kafka topic
3. **Deal Detector** → `deals.scored` Kafka topic
4. **Offer Tagger** → `deals.tagged` Kafka topic
5. **Persistence** → SQLite database (`deals.db`)

## Deal Detection Rules (from PDF)

### Hotels (Inside Airbnb)
- Compute `avg_30d_price` (30-day average price)
- Flag deals: `price <= 0.85 × avg_30d_price`
- Mark limited availability: `< 5` rooms available
- Add tags: Pet-friendly, Near transit, Breakfast

### Flights
- Use baseline prices from dataset
- Simulate time series (mean-reverting price + random promo dips -10% to -25%)
- Track `seats_left` scarcity
- Tag: Refundable, Avoid red-eye, etc.

## Monitoring

Check ingestion status:

```bash
# Check Kafka topics
docker exec kayak-kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic raw_supplier_feeds \
  --from-beginning \
  --max-messages 10

# Check SQLite database
docker exec kayak-agentic-recommendation-service python3 << 'EOF'
import sys
sys.path.insert(0, '/app')
from src.database_sqlite import get_session, FlightDeal, HotelDeal
with get_session() as session:
    print(f"Flight Deals: {session.query(FlightDeal).count()}")
    print(f"Hotel Deals: {session.query(HotelDeal).count()}")
EOF
```

## Troubleshooting

1. **CSV file not found**: Ensure files are in `/app/data/csv/` inside Docker container
2. **Column mismatch**: Check CSV headers match expected format
3. **Kafka connection error**: Ensure Kafka is running and accessible
4. **No deals detected**: Check deal detection rules and price thresholds

## Next Steps

1. Download datasets from Kaggle
2. Prepare CSV files in correct format
3. Place files in `data/csv/` directory
4. Run ingestion (manual or scheduled)
5. Monitor Kafka topics and SQLite database
6. Test bundle recommendations with processed deals

