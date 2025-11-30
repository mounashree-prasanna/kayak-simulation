/**
 * Availability Service
 * 
 * Manages availability blocks in MongoDB for fast search queries.
 * This is a cache that syncs with MySQL bookings (source of truth).
 */

const AvailabilityBlock = require('../models/AvailabilityBlock');

class AvailabilityService {
  /**
   * Add or update an availability block
   * Called when a booking is created or status changes
   */
  static async addBlock(bookingData) {
    try {
      const {
        booking_id,
        booking_type,
        reference_id,
        start_date,
        end_date,
        booking_status,
        user_id
      } = bookingData;

      // Only track Pending and Confirmed bookings
      if (!['Pending', 'Confirmed'].includes(booking_status)) {
        // If cancelled or failed, remove the block
        await this.removeBlock(booking_id);
        return;
      }

      const blockData = {
        listing_type: booking_type,
        reference_id,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        booking_id,
        booking_status,
        user_id,
        quantity: 1 // Default to 1, can be adjusted for multi-seat/room bookings
      };

      // Upsert: update if exists, create if not
      await AvailabilityBlock.findOneAndUpdate(
        { booking_id },
        blockData,
        { upsert: true, new: true }
      );

      console.log(`[Availability Service] Added block for ${booking_type} ${reference_id}, booking ${booking_id}`);
    } catch (error) {
      console.error('[Availability Service] Error adding block:', error.message);
      // Don't throw - availability cache is not critical
    }
  }

  /**
   * Remove an availability block
   * Called when a booking is cancelled or deleted
   */
  static async removeBlock(booking_id) {
    try {
      await AvailabilityBlock.deleteOne({ booking_id });
      console.log(`[Availability Service] Removed block for booking ${booking_id}`);
    } catch (error) {
      console.error('[Availability Service] Error removing block:', error.message);
    }
  }

  /**
   * Check if a listing has availability blocks for a date range
   * @param {string} listing_type - 'Flight', 'Hotel', or 'Car'
   * @param {string} reference_id - Listing ID
   * @param {Date} start_date - Start date
   * @param {Date} end_date - End date
   * @returns {Promise<boolean>} - True if blocked, false if available
   */
  static async isBlocked(listing_type, reference_id, start_date, end_date) {
    try {
      const count = await AvailabilityBlock.countDocuments({
        listing_type,
        reference_id,
        booking_status: { $in: ['Pending', 'Confirmed'] },
        start_date: { $lte: end_date },
        end_date: { $gte: start_date }
      });

      return count > 0;
    } catch (error) {
      console.error('[Availability Service] Error checking block:', error.message);
      return false; // Default to available if error
    }
  }

  /**
   * Get booking count for capacity checking (flights/hotels)
   * @param {string} listing_type - 'Flight' or 'Hotel'
   * @param {string} reference_id - Listing ID
   * @param {Date} start_date - Start date
   * @param {Date} end_date - End date
   * @returns {Promise<number>} - Number of bookings
   */
  static async getBookingCount(listing_type, reference_id, start_date, end_date) {
    try {
      const result = await AvailabilityBlock.aggregate([
        {
          $match: {
            listing_type,
            reference_id,
            booking_status: { $in: ['Pending', 'Confirmed'] },
            start_date: { $lte: end_date },
            end_date: { $gte: start_date }
          }
        },
        {
          $group: {
            _id: null,
            total_quantity: { $sum: '$quantity' }
          }
        }
      ]);

      return result.length > 0 ? result[0].total_quantity : 0;
    } catch (error) {
      console.error('[Availability Service] Error getting booking count:', error.message);
      return 0;
    }
  }

  /**
   * Filter listings by availability using MongoDB cache
   * Much faster than calling booking service for each listing
   */
  static async filterAvailable(listings, listing_type, start_date, end_date) {
    if (!start_date || !end_date) {
      return listings; // No date filter, return all
    }

    // If no listings, return empty array
    if (!listings || listings.length === 0) {
      return listings;
    }

    try {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      // Validate dates
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        console.warn('[Availability Service] Invalid dates provided, returning all listings');
        return listings;
      }

      // Check availability for all listings in parallel
      const availabilityChecks = await Promise.all(
        listings.map(async (listing) => {
          try {
            const reference_id = listing.flight_id || listing.hotel_id || listing.car_id || listing._id?.toString();
            if (!reference_id) {
              // If no reference_id, assume available (backward compatibility)
              return { listing, available: true };
            }

            const isBlocked = await this.isBlocked(listing_type, reference_id, startDate, endDate);
            return { listing, available: !isBlocked };
          } catch (error) {
            // If individual check fails, assume available (don't filter out)
            console.warn(`[Availability Service] Error checking availability for listing:`, error.message);
            return { listing, available: true };
          }
        })
      );

      // Return only available listings
      return availabilityChecks
        .filter(item => item.available)
        .map(item => item.listing);
    } catch (error) {
      // If entire filtering fails, return all listings (graceful degradation)
      console.error('[Availability Service] Error in filterAvailable, returning all listings:', error.message);
      return listings;
    }
  }

  /**
   * Sync availability blocks from MySQL bookings
   * Can be called periodically or on-demand to ensure consistency
   */
  static async syncFromBookings(bookings) {
    try {
      // Clear existing blocks for these bookings
      const bookingIds = bookings.map(b => b.booking_id);
      await AvailabilityBlock.deleteMany({ booking_id: { $in: bookingIds } });

      // Add blocks for active bookings
      for (const booking of bookings) {
        if (['Pending', 'Confirmed'].includes(booking.booking_status)) {
          await this.addBlock(booking);
        }
      }

      console.log(`[Availability Service] Synced ${bookings.length} bookings`);
    } catch (error) {
      console.error('[Availability Service] Error syncing bookings:', error.message);
    }
  }
}

module.exports = AvailabilityService;

