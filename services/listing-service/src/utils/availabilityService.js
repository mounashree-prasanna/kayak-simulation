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
        user_id,
        quantity = 1 // Default to 1 seat/room per booking
      } = bookingData;

      // Only track Pending and Confirmed bookings
      if (!['Pending', 'Confirmed'].includes(booking_status)) {
        // If cancelled or failed, remove the block
        await this.removeBlock(booking_id);
        return;
      }

      const startDateObj = new Date(start_date);
      const endDateObj = new Date(end_date);
      
      const blockData = {
        listing_type: booking_type,
        reference_id,
        start_date: startDateObj,
        end_date: endDateObj,
        booking_id,
        booking_status,
        user_id,
        quantity: Math.max(1, Number(quantity) || 1) // Ensure quantity is at least 1
      };

      // Upsert: update if exists, create if not
      const savedBlock = await AvailabilityBlock.findOneAndUpdate(
        { booking_id },
        blockData,
        { upsert: true, new: true }
      );

      console.log(`[Availability Service] Added block for ${booking_type} ${reference_id}, booking ${booking_id}`);
      console.log(`[Availability Service] Block dates: ${startDateObj.toISOString()} to ${endDateObj.toISOString()}, quantity: ${blockData.quantity}`);
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
  static async getBookingCount(listing_type, reference_id, start_date, end_date, alternate_reference_id = null) {
    try {
      // Convert dates to Date objects if they're strings
      const startDate = start_date instanceof Date ? start_date : new Date(start_date);
      const endDate = end_date instanceof Date ? end_date : new Date(end_date);
      
      // For flights, check both flight_id and _id since bookings might use either
      const referenceIds = [reference_id];
      if (alternate_reference_id && alternate_reference_id !== reference_id) {
        referenceIds.push(alternate_reference_id);
      }
      
      const result = await AvailabilityBlock.aggregate([
        {
          $match: {
            listing_type,
            reference_id: { $in: referenceIds },
            booking_status: { $in: ['Pending', 'Confirmed'] },
            start_date: { $lte: endDate },
            end_date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            total_quantity: { $sum: '$quantity' }
          }
        }
      ]);

      const count = result.length > 0 ? result[0].total_quantity : 0;
      console.log(`[Availability Service] Booking count for ${listing_type} ${reference_id}${alternate_reference_id ? ' (also checking ' + alternate_reference_id + ')' : ''} (${startDate.toISOString()} to ${endDate.toISOString()}): ${count}`);
      
      // Debug: Show matching blocks
      const matchingBlocks = await AvailabilityBlock.find({
        listing_type,
        reference_id: { $in: referenceIds },
        booking_status: { $in: ['Pending', 'Confirmed'] },
        start_date: { $lte: endDate },
        end_date: { $gte: startDate }
      });
      if (matchingBlocks.length > 0) {
        console.log(`[Availability Service] Found ${matchingBlocks.length} matching blocks:`, matchingBlocks.map(b => ({
          booking_id: b.booking_id,
          reference_id: b.reference_id,
          start_date: b.start_date,
          end_date: b.end_date,
          quantity: b.quantity
        })));
      } else {
        console.log(`[Availability Service] No matching blocks found. Searched for reference_id in: [${referenceIds.join(', ')}]`);
        // Debug: Check all blocks for this listing to see what exists
        const allBlocks = await AvailabilityBlock.find({
          listing_type,
          reference_id: { $in: referenceIds }
        });
        console.log(`[Availability Service] Total blocks for this listing (all dates): ${allBlocks.length}`);
        if (allBlocks.length > 0) {
          console.log(`[Availability Service] All blocks:`, allBlocks.map(b => ({
            booking_id: b.booking_id,
            reference_id: b.reference_id,
            start_date: b.start_date.toISOString(),
            end_date: b.end_date.toISOString(),
            status: b.booking_status,
            quantity: b.quantity
          })));
        }
      }
      
      return count;
    } catch (error) {
      console.error('[Availability Service] Error getting booking count:', error.message);
      return 0;
    }
  }

  /**
   * Check if a listing has capacity available (for flights/hotels)
   * @param {string} listing_type - 'Flight' or 'Hotel'
   * @param {Object} listing - Listing object with capacity info
   * @param {Date} start_date - Start date
   * @param {Date} end_date - End date
   * @returns {Promise<boolean>} - True if has capacity, false if full
   */
  static async hasCapacity(listing_type, listing, start_date, end_date) {
    try {
      const reference_id = listing.flight_id || listing.hotel_id || listing.car_id || listing._id?.toString();
      if (!reference_id) {
        return true; // Can't check, assume available
      }

      // Get total bookings for this date range
      const bookingCount = await this.getBookingCount(listing_type, reference_id, start_date, end_date);

      if (listing_type === 'Flight') {
        const totalSeats = listing.total_available_seats || 0;
        const availableSeats = totalSeats - bookingCount;
        return availableSeats > 0;
      } else if (listing_type === 'Hotel') {
        const totalRooms = listing.number_of_rooms || 0;
        const availableRooms = totalRooms - bookingCount;
        return availableRooms > 0;
      }

      return true; // For cars or unknown types, assume available
    } catch (error) {
      console.error('[Availability Service] Error checking capacity:', error.message);
      return true; // Default to available if error
    }
  }

  /**
   * Filter listings by availability using MongoDB cache
   * For flights/hotels: Checks capacity (seats/rooms available)
   * For cars: Checks if any booking exists (exclusive)
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

            // For flights and hotels: check capacity
            if (listing_type === 'Flight' || listing_type === 'Hotel') {
              const hasCapacity = await this.hasCapacity(listing_type, listing, startDate, endDate);
              return { listing, available: hasCapacity };
            }
            // For cars: check if blocked (exclusive booking - one booking per car per date)
            else if (listing_type === 'Car') {
              const isBlocked = await this.isBlocked(listing_type, reference_id, startDate, endDate);
              return { listing, available: !isBlocked };
            }

            // Default: assume available
            return { listing, available: true };
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

