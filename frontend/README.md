# Kayak Frontend

A modern React frontend for the Kayak travel booking platform, built with Vite and styled to match the KAYAK website design.

## Features

- **Flight Search & Booking**: Search for flights, view details, and book tickets
- **Hotel Search & Booking**: Find hotels with filters, view details, and make reservations
- **Car Rental**: Search and book car rentals
- **User Authentication**: Sign up, sign in, and manage account
- **Booking Management**: View, manage, and cancel bookings
- **Responsive Design**: Works on desktop, tablet, and mobile devices

## Tech Stack

- React 18
- React Router DOM
- Vite
- Axios
- date-fns
- react-datepicker

## Getting Started

### Prerequisites

- Node.js 16+ and npm

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Project Structure

```
frontend/
├── src/
│   ├── components/       # Reusable components
│   │   └── Layout/       # Layout components
│   ├── contexts/         # React contexts (Auth)
│   ├── pages/            # Page components
│   ├── services/         # API services
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## API Integration

The frontend connects to the backend API gateway at `http://localhost:3000/api`. The Vite dev server is configured to proxy API requests.

## Environment Variables

Create a `.env` file if needed:

```
VITE_API_URL=http://localhost:3000/api
```

## Features Overview

### Home Page
- Search tabs for Flights, Hotels, and Cars
- Date pickers for travel dates
- Passenger/guest selection
- Quick access to all search features

### Search Results
- Sortable results (price, rating, duration)
- Filters for hotels (rating, amenities, price)
- Detailed result cards with key information
- Direct links to detail pages

### Detail Pages
- Comprehensive information about flights/hotels/cars
- Booking summary sidebar
- Direct booking button
- Back navigation

### Booking Flow
- Form-based booking process
- Passenger/guest information collection
- Booking summary
- Confirmation and redirect to booking details

### User Dashboard
- Quick access to all features
- Account information
- Navigation cards

### My Bookings
- List of all bookings
- Filter by status (all, confirmed, pending, cancelled)
- Booking details and cancellation
- Status badges

## Styling

The frontend uses custom CSS with a design inspired by KAYAK:
- Orange accent color (#ff5722) for primary actions
- Purple gradient for hero sections
- Clean, modern card-based layouts
- Responsive grid systems
- Smooth transitions and hover effects

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- Make sure the backend API gateway is running on port 3000
- Authentication tokens are stored in localStorage
- The app redirects to login when authentication is required

