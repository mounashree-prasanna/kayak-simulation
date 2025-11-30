/**
 * Availability Checker Utility
 * 
 * Uses MongoDB availability_blocks collection for fast filtering.
 * Falls back to Booking Service API if MongoDB check fails.
 */

const AvailabilityService = require('./availabilityService');
const axios = require('axios');

const BOOKING_SERVICE_URL = process.env.BOOKING_SERVICE_URL || 'http://localhost:3003';

/**
 * Check if a listing is available for the given date range
 * Uses MongoDB cache first, falls back to Booking Service API
 * @param {string} booking_type - 'Flight', 'Hotel', or 'Car'
 * @param {string} reference_id - The listing ID (flight_id, hotel_id, car_id)
 * @param {string|Date} start_date - Start date
 * @param {string|Date} end_date - End date
 * @returns {Promise<boolean>} - True if available, false if booked
 */
const checkAvailability = async (booking_type, reference_id, start_date, end_date) => {
  try {
    // First try MongoDB cache (fast)
    const startDate = start_date instanceof Date ? start_date : new Date(start_date);
    const endDate = end_date instanceof Date ? end_date : new Date(end_date);
    
    const isBlocked = await AvailabilityService.isBlocked(booking_type, reference_id, startDate, endDate);
    
    if (isBlocked) {
      return false; // Blocked in cache
    }

    // If not blocked in cache, check with booking service (for capacity - flights/hotels)
    // This ensures we respect seat/room limits
    if (booking_type === 'Flight' || booking_type === 'Hotel') {
      try {
        const response = await axios.get(`${BOOKING_SERVICE_URL}/bookings/availability`, {
          params: {
            booking_type,
            reference_id,
            start_date: startDate.toISOString(),
            end_date: endDate.toISOString()
          },
          timeout: 1000 // Fast timeout
        });

        return response.data.success && response.data.data.available;
      } catch (error) {
        // If booking service unavailable, trust MongoDB cache
        return true;
      }
    }

    // For cars, MongoDB cache is sufficient (exclusive booking)
    return true;
  } catch (error) {
    // Fallback to booking service if MongoDB fails
    try {
      const response = await axios.get(`${BOOKING_SERVICE_URL}/bookings/availability`, {
        params: {
          booking_type,
          reference_id,
          start_date: start_date instanceof Date ? start_date.toISOString() : start_date,
          end_date: end_date instanceof Date ? end_date.toISOString() : end_date
        },
        timeout: 2000
      });

      return response.data.success && response.data.data.available;
    } catch (fallbackError) {
      console.warn(`[Listing Service] Could not check availability for ${booking_type} ${reference_id}:`, fallbackError.message);
      return true; // Default to available if we can't check
    }
  }
};

/**
 * Filter listings by availability for date range
 * Uses MongoDB cache for fast filtering
 * @param {Array} listings - Array of listing objects
 * @param {string} booking_type - 'Flight', 'Hotel', or 'Car'
 * @param {string|Date} start_date - Start date
 * @param {string|Date} end_date - End date
 * @returns {Promise<Array>} - Filtered array of available listings
 */
const filterByAvailability = async (listings, booking_type, start_date, end_date) => {
  if (!start_date || !end_date) {
    // If no dates provided, return all listings (backward compatibility)
    return listings;
  }

  // If no listings, return empty array
  if (!listings || listings.length === 0) {
    return listings;
  }

  try {
    // Use MongoDB cache for fast filtering
    const filtered = await AvailabilityService.filterAvailable(listings, booking_type, start_date, end_date);
    // If filtering returns empty but we had listings, log a warning but return the filtered result
    // (this is expected if all listings are actually booked)
    return filtered;
  } catch (error) {
    // If MongoDB fails completely, return all listings (graceful degradation)
    // This ensures search still works even if availability cache is down
    console.warn('[Listing Service] Availability filtering failed, returning all listings:', error.message);
    return listings;
  }
};

module.exports = {
  checkAvailability,
  filterByAvailability
};

