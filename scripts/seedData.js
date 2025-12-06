const fs = require('fs');
const csv = require('csv-parser');
const axios = require('axios');

// CONFIG
const BASE_URL = "http://localhost:3000/api";
const ADMIN_EMAIL = "superadmin@kayak.com";
const ADMIN_PASSWORD = "SuperAdmin123!";
const CSV_FILE = "./listings_all.csv";

let adminToken = null;

// 1. Login as admin
async function adminLogin() {
    const res = await axios.post(`${BASE_URL}/admins/login`, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
    });
    adminToken = res.data.token;
    console.log("✅ Admin login success");
}

// 2. Send POST to correct endpoint
async function createListing(row) {
    const headers = { Authorization: `Bearer ${adminToken}` };

    if (row.type === "flight") {
        return axios.post(`${BASE_URL}/flights`, {
            flight_id: row.flight_id,
            airline_name: row.airline,
            departure_airport: row.departure_airport,
            arrival_airport: row.arrival_airport,
            departure_city: row.departure_city,
            arrival_city: row.arrival_city,
            departure_datetime: row.departure_datetime,
            arrival_datetime: row.arrival_datetime,
            ticket_price: Number(row.ticket_price),
            flight_class: row.flight_class,
            total_available_seats: Number(row.total_available_seats)
        }, { headers });
    }

    if (row.type === "hotel") {
        return axios.post(`${BASE_URL}/hotels`, {
            hotel_id: row.hotel_id,
            name: row.name,
            address: {
                street: row.street,
                city: row.city,
                state: row.state,
                zip: row.zip,
                country: row.country
            },
            price_per_night: Number(row.price_per_night),
            star_rating: Number(row.star_rating),
            wifi: row.wifi === "true",
            breakfast_included: row.breakfast_included === "true",
            parking: row.parking === "true",
            pet_friendly: row.pet_friendly === "true",
            near_transit: row.near_transit === "true",
            number_of_rooms: Number(row.number_of_rooms),
            hotel_rating: Number(row.hotel_rating),
            images: [row.hotel_image1, row.hotel_image2]
        }, { headers });
    }

    if (row.type === "car") {
        return axios.post(`${BASE_URL}/cars`, {
            car_id: row.car_id,
            company: row.company,
            vehicle: {
                make: row.make,
                model: row.model,
                type: row.vehicle_type,
                year: Number(row.year)
            },
            location: {
                pickup: {
                    address: row.pickup_address,
                    city: row.pickup_city,
                    country: row.pickup_country,
                    latitude: Number(row.pickup_lat),
                    longitude: Number(row.pickup_lng)
                },
                dropoff: {
                    address: row.dropoff_address,
                    city: row.dropoff_city,
                    country: row.dropoff_country,
                    latitude: Number(row.dropoff_lat),
                    longitude: Number(row.dropoff_lng)
                }
            },
            price_per_day: Number(row.price_per_day),
            availability: {
                available: row.available === "true",
                pickup_date: row.pickup_date,
                dropoff_date: row.dropoff_date
            },
            images: [row.car_image1, row.car_image2]
        }, { headers });
    }
}

async function processCSV() {
    await adminLogin();

    console.log("🚀 Starting CSV ingest...");

    const rows = [];
    fs.createReadStream(CSV_FILE)
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", async () => {
            console.log(`📦 Loaded ${rows.length} rows. Sending to API...`);

            for (let i = 0; i < rows.length; i++) {
                try {
                    await createListing(rows[i]);
                    console.log(`✅ Inserted ${rows[i].type} (${i + 1}/${rows.length})`);
                } catch (err) {
                    console.log(`❌ Error inserting row ${i + 1}`, err.response?.data || err.message);
                }
            }

            console.log("🎉 All listings created successfully!");
        });
}

processCSV();
no