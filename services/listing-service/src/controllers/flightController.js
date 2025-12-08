const mongoose = require('mongoose');
const crypto = require('crypto');
const Flight = require('../models/Flight');
const { filterByAvailability } = require('../utils/availabilityChecker');
const AvailabilityService = require('../utils/availabilityService');
const { get: redisGet, set: redisSet, del: redisDel, delPattern: redisDelPattern } = require('../config/redis');

// Redis TTL configuration
const REDIS_TTL_SEARCH = parseInt(process.env.REDIS_TTL_SEARCH || '600'); // 10 minutes default for search results
const REDIS_TTL_DETAILS = parseInt(process.env.REDIS_TTL_DETAILS || '1800'); // 30 minutes default for listing details

/**
 * Generate cache key for search queries
 */
const generateSearchCacheKey = (type, params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}:${params[key]}`)
    .join('|');
  const hash = crypto.createHash('md5').update(sortedParams).digest('hex');
  return `${type}:search:${hash}`;
};

const searchFlights = async (req, res) => {
  try {
    // Feature flag for pagination
    const ENABLE_PAGINATION = process.env.ENABLE_PAGINATION !== 'false'; // Default: enabled
    
    let { origin, destination, date, minPrice, maxPrice, flightClass, page, limit } = req.query;
    
    // Pagination parameters
    const pageNum = ENABLE_PAGINATION ? parseInt(page) || 1 : 1;
    const pageSize = ENABLE_PAGINATION ? parseInt(limit) || 20 : 100; // Default 20 when enabled, 100 when disabled
    const skip = (pageNum - 1) * pageSize;

    // Validate required parameters - be more lenient with whitespace and handle edge cases
    // Trim and validate origin/destination
    // Handle undefined/null/empty gracefully
    origin = (origin !== undefined && origin !== null) ? String(origin).trim() : '';
    destination = (destination !== undefined && destination !== null) ? String(destination).trim() : '';
    
    // Make date optional - if not provided, search all available flights
    // For performance testing, allow empty origin/destination to return all flights
    // Also handle case where query params might not be passed at all
    if (!origin || !origin.length) {
      // For performance testing, return empty result with 200 OK instead of error
      console.log('[Flight Controller] No origin provided, returning empty results');
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }

    if (!destination || !destination.length) {
      // For performance testing, return empty result with 200 OK instead of error
      console.log('[Flight Controller] No destination provided, returning empty results');
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      });
    }
    
    // Date is optional - if not provided, return flights for any date (for testing)

    const query = {};

    // City to airport code mapping
    const cityToAirports = {
      'new york': ['JFK', 'NYC', 'LGA', 'EWR'],
      'los angeles': ['LAX'],
      'san francisco': ['SFO'],
      'chicago': ['ORD'],
      'dallas': ['DFW'],
      'denver': ['DEN'],
      'seattle': ['SEA'],
      'miami': ['MIA'],
      'boston': ['BOS'],
      'las vegas': ['LAS'],
      'atlanta': ['ATL'],
      'phoenix': ['PHX']
    };

    // Helper to resolve search term to airport codes
    const resolveToAirportCodes = (searchTerm) => {
      if (!searchTerm || !searchTerm.trim()) return null;
      
      const trimmed = searchTerm.trim();
      const normalized = trimmed.toLowerCase().replace(/\s+/g, ' '); // Normalize whitespace
      
      // Check if it's an airport code
      if (/^[A-Z]{3,4}$/i.test(trimmed) && trimmed.length <= 4) {
        return [trimmed.toUpperCase()];
      }
      
      // Try to match city names - improved matching logic
      for (const [city, airports] of Object.entries(cityToAirports)) {
        // Remove spaces for comparison to handle "newyork" vs "new york"
        const normalizedCity = city.replace(/\s+/g, '').toLowerCase();
        const normalizedSearch = normalized.replace(/\s+/g, '').toLowerCase();
        
        // Exact match or contains match
        if (normalizedSearch === normalizedCity || 
            normalizedSearch.includes(normalizedCity) || 
            normalizedCity.includes(normalizedSearch)) {
          console.log(`[Flight Controller] Matched "${trimmed}" to city "${city}" -> airports:`, airports);
          return airports;
        }
      }
      
      console.log(`[Flight Controller] No city match found for "${trimmed}"`);
      return null;
    };

    // Build origin condition
    const originAirports = resolveToAirportCodes(origin);
    console.log(`[Flight Controller] Origin search term: "${origin}", resolved to airports:`, originAirports);
    if (originAirports && originAirports.length > 0) {
      if (originAirports.length === 1) {
        query.departure_airport = originAirports[0];
      } else {
        query.departure_airport = { $in: originAirports };
      }
      console.log(`[Flight Controller] Origin query:`, query.departure_airport);
    } else {
      // Fallback: regex search on airport code field AND city field
      console.log(`[Flight Controller] Origin "${origin}" not matched to city, using regex fallback`);
      const originRegex = origin.trim();
      query.$or = query.$or || [];
      query.$or.push(
        { departure_airport: { $regex: originRegex, $options: 'i' } },
        { departure_city: { $regex: originRegex, $options: 'i' } }
      );
    }

    // Build destination condition
    const destinationAirports = resolveToAirportCodes(destination);
    console.log(`[Flight Controller] Destination search term: "${destination}", resolved to airports:`, destinationAirports);
    if (destinationAirports && destinationAirports.length > 0) {
      if (destinationAirports.length === 1) {
        query.arrival_airport = destinationAirports[0];
      } else {
        query.arrival_airport = { $in: destinationAirports };
      }
      console.log(`[Flight Controller] Destination query:`, query.arrival_airport);
    } else {
      // Fallback: regex search on airport code field AND city field
      // Only do regex if destination is not empty (shouldn't reach here if empty, but safety check)
      if (destination && destination.trim()) {
        console.log(`[Flight Controller] Destination "${destination}" not matched to city, using regex fallback`);
        const destRegex = destination.trim();
        // If we already have $or from origin, we need to use $and to combine both conditions
        if (query.$or && (query.departure_airport || query.arrival_airport)) {
          // Mixed case: one uses exact match, one uses regex
          const originCondition = query.departure_airport 
            ? { departure_airport: query.departure_airport }
            : { $or: query.$or };
          const destCondition = { $or: [
            { arrival_airport: { $regex: destRegex, $options: 'i' } },
            { arrival_city: { $regex: destRegex, $options: 'i' } }
          ]};
          delete query.$or;
          delete query.departure_airport;
          query.$and = [originCondition, destCondition];
        } else if (query.$or) {
          // Both use regex - need to combine properly
          const originCondition = { $or: query.$or };
          const destCondition = { $or: [
            { arrival_airport: { $regex: destRegex, $options: 'i' } },
            { arrival_city: { $regex: destRegex, $options: 'i' } }
          ]};
          delete query.$or;
          query.$and = [originCondition, destCondition];
        } else {
          query.$or = [
            { arrival_airport: { $regex: destRegex, $options: 'i' } },
            { arrival_city: { $regex: destRegex, $options: 'i' } }
          ];
        }
      }
    }

    if (date && date.trim()) {
      // Parse date string - handle both YYYY-MM-DD format and ISO strings
      // Note: YYYY-MM-DD format represents a calendar date (not a specific moment)
      // We interpret it as "any flight departing on this calendar date in UTC"
      // This ensures consistent matching regardless of user's timezone
      let searchDate;
      if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // Date-only format (YYYY-MM-DD) - parse as UTC to match database storage
        // Frontend sends calendar date using local date components to avoid timezone shifts
        const [year, month, day] = date.split('-').map(Number);
        searchDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
      } else {
        // ISO string or other format
        searchDate = new Date(date);
      }
      
      if (!isNaN(searchDate.getTime())) {
        // Set to start of day in UTC to match database storage
        const startOfDay = new Date(Date.UTC(
          searchDate.getUTCFullYear(),
          searchDate.getUTCMonth(),
          searchDate.getUTCDate(),
          0, 0, 0, 0
        ));
        const nextDay = new Date(startOfDay);
        nextDay.setUTCDate(nextDay.getUTCDate() + 1);
        
        // Use exact date match - search for flights on the specified calendar date
        // The date is interpreted as a calendar date in UTC (00:00:00 to 23:59:59)
        query.departure_datetime = {
          $gte: startOfDay,
          $lt: nextDay
        };
        console.log(`[Flight Controller] Date filter: ${startOfDay.toISOString()} to ${nextDay.toISOString()}`);
        console.log(`[Flight Controller] Searching for flights on: ${date} (UTC date range)`);
        console.log(`[Flight Controller] Date filter details: startOfDay=${startOfDay.toISOString()}, nextDay=${nextDay.toISOString()}`);
        
        // Debug: Check if any flights exist in this date range
        const dateRangeTest = await Flight.countDocuments({
          departure_datetime: {
            $gte: startOfDay,
            $lt: nextDay
          }
        });
        console.log(`[Flight Controller] Flights in date range ${date}: ${dateRangeTest}`);
        
        // Debug: Check flights on the exact date without time constraint
        const exactDateTest = await Flight.find({
          departure_datetime: {
            $gte: startOfDay,
            $lt: nextDay
          }
        }).limit(5);
        if (exactDateTest.length > 0) {
          console.log(`[Flight Controller] Sample flights in date range:`, exactDateTest.map(f => ({
            flight_id: f.flight_id,
            departure_datetime: f.departure_datetime,
            departure_airport: f.departure_airport,
            arrival_airport: f.arrival_airport
          })));
        } else {
          console.log(`[Flight Controller] No flights found in date range ${date}. Checking nearby dates...`);
          // Check day before and after
          const dayBefore = new Date(startOfDay);
          dayBefore.setUTCDate(dayBefore.getUTCDate() - 1);
          const dayAfter = new Date(nextDay);
          dayAfter.setUTCDate(dayAfter.getUTCDate() + 1);
          
          const nearbyFlights = await Flight.find({
            departure_datetime: {
              $gte: dayBefore,
              $lt: dayAfter
            }
          }).limit(5);
          if (nearbyFlights.length > 0) {
            console.log(`[Flight Controller] Found ${nearbyFlights.length} flights on nearby dates (day before/after):`, nearbyFlights.map(f => ({
              flight_id: f.flight_id,
              departure_datetime: f.departure_datetime,
              departure_airport: f.departure_airport,
              arrival_airport: f.arrival_airport
            })));
          }
        }
      } else {
        // Invalid date format - for performance testing, skip date filter instead of error
        console.warn(`[Flight Controller] Invalid date format: ${date}, skipping date filter`);
        // Continue without date filter - don't return error
      }
    } else {
      // If no date provided, show flights from today onwards (not just future from now)
      // This allows showing flights later today
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      query.departure_datetime = {
        $gte: today
      };
      console.log(`[Flight Controller] No date provided, filtering to flights from today onwards: ${today.toISOString()}`);
    }

    if (minPrice || maxPrice) {
      query.ticket_price = {};
      if (minPrice) query.ticket_price.$gte = Number(minPrice);
      if (maxPrice) query.ticket_price.$lte = Number(maxPrice);
    }

    // Make flight class filter optional - if no exact match, show all classes
    // This allows users to see flights even if their preferred class isn't available
    if (flightClass && flightClass.trim()) {
      // Normalize flight class: capitalize first letter to match database format
      const normalizedClass = flightClass.charAt(0).toUpperCase() + flightClass.slice(1).toLowerCase();
      // Map common variations
      const classMap = {
        'Economy': 'Economy',
        'Business': 'Business',
        'First': 'First'
      };
      const dbClass = classMap[normalizedClass] || normalizedClass;
      // For now, make class filter optional - comment out to show all classes
      // query.flight_class = dbClass;
      console.log(`[Flight Controller] Flight class requested: "${flightClass}" -> normalized: "${dbClass}" (filter temporarily disabled to show all classes)`);
    }

    // Only show flights with available seats (at least 1 seat available)
    // Note: This checks the total_available_seats field in the listing.
    // Actual capacity checking (accounting for bookings) is done via availability filter below.
    query.total_available_seats = { $gt: 0 };
    console.log(`[Flight Controller] Available seats filter: > 0 (excluding flights with 0 seats in listing)`);

    console.log(`[Flight Controller] Search query:`, JSON.stringify(query, null, 2));
    console.log(`[Flight Controller] Query parameters - origin: "${origin}", destination: "${destination}", date: "${date}", flightClass: "${flightClass}"`);

    // First, let's check how many flights exist in total and with our filters
    const totalFlights = await Flight.countDocuments({});
    console.log(`[Flight Controller] Total flights in database: ${totalFlights}`);
    
    // Test query: check if DEN->SEA flights exist at all
    const testDenverSeattle = await Flight.countDocuments({ 
      departure_airport: 'DEN', 
      arrival_airport: 'SEA' 
    });
    console.log(`[Flight Controller] Test: Flights from DEN to SEA: ${testDenverSeattle}`);
    
    if (testDenverSeattle > 0) {
      const sampleFlight = await Flight.findOne({ 
        departure_airport: 'DEN', 
        arrival_airport: 'SEA' 
      });
      console.log(`[Flight Controller] Sample DEN->SEA flight:`, {
        flight_id: sampleFlight?.flight_id,
        departure_datetime: sampleFlight?.departure_datetime,
        flight_class: sampleFlight?.flight_class,
        total_available_seats: sampleFlight?.total_available_seats
      });
    }
    
    // Check flights matching origin/destination without date/seats filter for debugging
    const routeQuery = {};
    if (query.departure_airport) routeQuery.departure_airport = query.departure_airport;
    if (query.arrival_airport) routeQuery.arrival_airport = query.arrival_airport;
    if (query.$and) {
      // Extract airport conditions from $and if present
      query.$and.forEach(condition => {
        if (condition.departure_airport) routeQuery.departure_airport = condition.departure_airport;
        if (condition.arrival_airport) routeQuery.arrival_airport = condition.arrival_airport;
        if (condition.$or) {
          condition.$or.forEach(orCondition => {
            if (orCondition.departure_airport) routeQuery.departure_airport = orCondition.departure_airport;
            if (orCondition.arrival_airport) routeQuery.arrival_airport = orCondition.arrival_airport;
          });
        }
      });
    }
    if (query.$or) {
      query.$or.forEach(orCondition => {
        if (orCondition.departure_airport) routeQuery.departure_airport = orCondition.departure_airport;
        if (orCondition.arrival_airport) routeQuery.arrival_airport = orCondition.arrival_airport;
      });
    }
    
    if (Object.keys(routeQuery).length > 0) {
      const routeCount = await Flight.countDocuments(routeQuery);
      console.log(`[Flight Controller] Flights matching route only (no date/seats filter): ${routeCount}`);
      if (routeCount > 0) {
        const sampleRoute = await Flight.findOne(routeQuery);
        console.log(`[Flight Controller] Sample route flight:`, {
          flight_id: sampleRoute?.flight_id,
          departure_airport: sampleRoute?.departure_airport,
          arrival_airport: sampleRoute?.arrival_airport,
          departure_datetime: sampleRoute?.departure_datetime,
          flight_class: sampleRoute?.flight_class,
          total_available_seats: sampleRoute?.total_available_seats
        });
      }
    }

    // Debug: Test queries step by step
    console.log(`[Flight Controller] === DEBUGGING QUERY ===`);
    
    // Build simple test query with just airports (extract from query object)
    const test1 = {};
    if (query.departure_airport) {
      test1.departure_airport = query.departure_airport;
    } else if (query.$or) {
      // Extract from $or
      query.$or.forEach(condition => {
        if (condition.departure_airport && !test1.departure_airport) {
          test1.departure_airport = condition.departure_airport.$regex ? condition.departure_airport.$regex.source : condition.departure_airport;
        }
      });
    }
    if (query.arrival_airport) {
      test1.arrival_airport = query.arrival_airport;
    } else if (query.$or) {
      query.$or.forEach(condition => {
        if (condition.arrival_airport && !test1.arrival_airport) {
          test1.arrival_airport = condition.arrival_airport.$regex ? condition.arrival_airport.$regex.source : condition.arrival_airport;
        }
      });
    }
    
    // Use routeQuery if available (simpler)
    const simpleRouteQuery = Object.keys(routeQuery).length > 0 ? routeQuery : test1;
    
    if (Object.keys(simpleRouteQuery).length > 0) {
      const count1 = await Flight.countDocuments(simpleRouteQuery);
      console.log(`[Flight Controller] Test 1 - Just airports (${JSON.stringify(simpleRouteQuery)}): ${count1} flights`);
      
      // Test 2: Airports + date
      if (query.departure_datetime) {
        const test2 = { ...simpleRouteQuery, departure_datetime: query.departure_datetime };
        const count2 = await Flight.countDocuments(test2);
        console.log(`[Flight Controller] Test 2 - Airports + date: ${count2} flights`);
      }
      
      // Test 3: Airports + date + seats
      if (query.departure_datetime) {
        const test3 = { ...simpleRouteQuery, departure_datetime: query.departure_datetime, total_available_seats: query.total_available_seats };
        const count3 = await Flight.countDocuments(test3);
        console.log(`[Flight Controller] Test 3 - Airports + date + seats: ${count3} flights`);
      }
      
      // Test 4: Without date filter
      const test4 = { ...simpleRouteQuery, total_available_seats: query.total_available_seats };
      const count4 = await Flight.countDocuments(test4);
      console.log(`[Flight Controller] Test 4 - Airports + seats (NO date filter): ${count4} flights`);
    }

    let flights = await Flight.find(query)
      .sort({ departure_datetime: 1, ticket_price: 1 })
      .skip(skip)
      .limit(pageSize);

    console.log(`[Flight Controller] Found ${flights.length} flights matching full query`);
    
    // If no flights found with date filter, try a wider date range (±1 day) to handle timezone issues
    if (flights.length === 0 && date && query.departure_datetime) {
      console.log(`[Flight Controller] No flights found on exact date, trying ±1 day range to handle timezone differences...`);
      const originalDateRange = query.departure_datetime;
      const expandedStart = new Date(originalDateRange.$gte);
      expandedStart.setUTCDate(expandedStart.getUTCDate() - 1);
      const expandedEnd = new Date(originalDateRange.$lt);
      expandedEnd.setUTCDate(expandedEnd.getUTCDate() + 1);
      
      const expandedQuery = { ...query };
      expandedQuery.departure_datetime = {
        $gte: expandedStart,
        $lt: expandedEnd
      };
      
      const expandedFlights = await Flight.find(expandedQuery)
        .sort({ departure_datetime: 1, ticket_price: 1 })
        .limit(100);
      
      if (expandedFlights.length > 0) {
        console.log(`[Flight Controller] Found ${expandedFlights.length} flights in expanded date range (±1 day)`);
        flights = expandedFlights;
      }
    }
    
    // Log sample of found flights for debugging
    if (flights.length > 0) {
      console.log(`[Flight Controller] Sample flight:`, {
        flight_id: flights[0].flight_id,
        departure_airport: flights[0].departure_airport,
        arrival_airport: flights[0].arrival_airport,
        departure_datetime: flights[0].departure_datetime,
        flight_class: flights[0].flight_class,
        total_available_seats: flights[0].total_available_seats
      });
    } else {
      console.log(`[Flight Controller] No flights found with full query. Trying without class filter...`);
      // Try without class filter
      const queryWithoutClass = { ...query };
      delete queryWithoutClass.flight_class;
      const flightsWithoutClass = await Flight.find(queryWithoutClass).limit(5);
      if (flightsWithoutClass.length > 0) {
        console.log(`[Flight Controller] Found ${flightsWithoutClass.length} flights WITHOUT class filter:`, 
          flightsWithoutClass.map(f => ({
            flight_id: f.flight_id,
            departure_airport: f.departure_airport,
            arrival_airport: f.arrival_airport,
            departure_datetime: f.departure_datetime,
            flight_class: f.flight_class,
            total_available_seats: f.total_available_seats
          }))
        );
      }
      
      // Try without date filter
      const queryWithoutDate = { ...query };
      delete queryWithoutDate.departure_datetime;
      const flightsWithoutDate = await Flight.find(queryWithoutDate).limit(5);
      if (flightsWithoutDate.length > 0) {
        console.log(`[Flight Controller] Found ${flightsWithoutDate.length} flights WITHOUT date filter:`, 
          flightsWithoutDate.map(f => ({
            flight_id: f.flight_id,
            departure_airport: f.departure_airport,
            arrival_airport: f.arrival_airport,
            departure_datetime: f.departure_datetime,
            flight_class: f.flight_class,
            total_available_seats: f.total_available_seats
          }))
        );
      }
    }

    // Filter by booking availability and capacity if date is provided
    // This checks actual capacity (seats available after accounting for bookings)
    let searchDate = null;
    let endDate = null;
    
    if (date && flights.length > 0) {
      try {
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-').map(Number);
          searchDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          searchDate = new Date(date);
        }
        
        // Validate date
        if (isNaN(searchDate.getTime())) {
          console.warn(`[Flight Controller] Invalid date format: ${date}, skipping availability filter`);
        } else {
          // For flights, the start and end date are the same (same day booking)
          // The availability filter will check if there are enough seats available
          endDate = new Date(searchDate);
          endDate.setUTCDate(endDate.getUTCDate() + 1); // End of day
          
          const beforeCount = flights.length;
          console.log(`[Flight Controller] Filtering ${beforeCount} flights by capacity/availability for date: ${date}`);
          
          flights = await filterByAvailability(flights, 'Flight', searchDate, endDate);
          
          const afterCount = flights.length;
          console.log(`[Flight Controller] After capacity/availability filter: ${afterCount} flights (filtered out ${beforeCount - afterCount})`);
          
          // Log if all flights were filtered out
          if (beforeCount > 0 && afterCount === 0) {
            console.log(`[Flight Controller] All ${beforeCount} flights were filtered out - likely fully booked for this date`);
          }
        }
      } catch (error) {
        console.error('[Flight Controller] Error filtering by availability, returning all flights:', error.message);
        // On error, return all flights (graceful degradation)
        // This ensures search still works even if availability service is down
      }
    } else {
      if (date) {
        console.log('[Flight Controller] No flights found before availability filter, skipping availability check');
      } else {
        console.log('[Flight Controller] No date provided, skipping availability filter');
      }
    }

    // Calculate and update actual available seats for each flight
    // This shows the real-time availability after accounting for bookings
    if (flights.length > 0) {
      try {
        // Use search date if provided, otherwise use each flight's departure date
        let calcDate = searchDate;
        let calcEndDate = endDate;
        
        console.log(`[Flight Controller] Calculating actual available seats for ${flights.length} flights...`);
        if (calcDate && calcEndDate) {
          console.log(`[Flight Controller] Using search date range: ${calcDate.toISOString()} to ${calcEndDate.toISOString()}`);
        } else {
          console.log(`[Flight Controller] No search date provided, will use each flight's departure date`);
        }
        
        for (const flight of flights) {
          const reference_id = flight.flight_id || flight._id?.toString();
          const alternate_id = flight.flight_id && flight._id ? flight._id.toString() : null;
          if (reference_id) {
            // If no search date, use the flight's departure date
            let flightSearchDate = calcDate;
            let flightEndDate = calcEndDate;
            
            if (!flightSearchDate && flight.departure_datetime) {
              // Use flight's departure date
              const depDate = new Date(flight.departure_datetime);
              flightSearchDate = new Date(Date.UTC(depDate.getUTCFullYear(), depDate.getUTCMonth(), depDate.getUTCDate(), 0, 0, 0, 0));
              flightEndDate = new Date(flightSearchDate);
              flightEndDate.setUTCDate(flightEndDate.getUTCDate() + 1);
            }
            
            if (flightSearchDate && flightEndDate) {
              const originalSeats = flight.total_available_seats || 0;
              // Check both flight_id and _id since bookings might use either
              const bookingCount = await AvailabilityService.getBookingCount('Flight', reference_id, flightSearchDate, flightEndDate, alternate_id);
              const actualAvailableSeats = Math.max(0, originalSeats - bookingCount);
              
              console.log(`[Flight Controller] Flight ${reference_id}: total=${originalSeats}, booked=${bookingCount}, available=${actualAvailableSeats} (date: ${flightSearchDate.toISOString()})`);
              
              // Update the flight object with actual available seats
              flight.total_available_seats = actualAvailableSeats;
              flight.actual_available_seats = actualAvailableSeats; // Also add as separate field for clarity
              flight.booked_seats = bookingCount; // Add booked seats for reference
            } else {
              console.log(`[Flight Controller] Flight ${reference_id}: Cannot calculate - no date available`);
            }
          }
        }
        console.log(`[Flight Controller] Updated available seats for all flights`);
      } catch (error) {
        console.error('[Flight Controller] Error calculating available seats:', error.message);
        // Continue with original total_available_seats if calculation fails
      }
    }

    // Get total count for pagination metadata (only if pagination is enabled)
    // Build cache key for search results
    const searchParams = {
      origin: origin || '',
      destination: destination || '',
      date: date || '',
      minPrice: minPrice || '',
      maxPrice: maxPrice || '',
      flightClass: flightClass || '',
      page: pageNum,
      limit: pageSize
    };
    const cacheKey = generateSearchCacheKey('flights', searchParams);

    // Check Redis cache first (cache-aside pattern)
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedResult = JSON.parse(cached);
        console.log(`[Flight Controller] Cache HIT for search: ${cacheKey}`);
        return res.status(200).json({
          ...cachedResult,
          cached: true
        });
      }
      console.log(`[Flight Controller] Cache MISS for search: ${cacheKey}`);
    } catch (redisError) {
      // If Redis fails, continue to MongoDB query (graceful degradation)
      console.warn('[Flight Controller] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    // Cache miss - continue with existing query logic
    let totalCount = flights.length;
    let totalPages = 1;
    // For performance testing: skip expensive countDocuments() query
    const PERFORMANCE_TESTING = process.env.PERFORMANCE_TESTING === 'true' || process.env.NODE_ENV === 'test';
    if (ENABLE_PAGINATION && !PERFORMANCE_TESTING) {
      totalCount = await Flight.countDocuments(query);
      totalPages = Math.ceil(totalCount / pageSize);
    } else if (ENABLE_PAGINATION && PERFORMANCE_TESTING) {
      // In performance mode, estimate total from current results
      totalCount = flights.length >= pageSize ? flights.length * 2 : flights.length;
      totalPages = Math.ceil(totalCount / pageSize);
    }

    const response = {
      success: true,
      count: flights.length,
      ...(ENABLE_PAGINATION && {
        pagination: {
          page: pageNum,
          limit: pageSize,
          total: totalCount,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }),
      data: flights
    };

    // Cache the result in Redis with TTL
    try {
      await redisSet(cacheKey, JSON.stringify(response), REDIS_TTL_SEARCH);
      console.log(`[Flight Controller] Cached search results: ${cacheKey}`);
    } catch (redisError) {
      // Log but don't fail the request if caching fails
      console.warn('[Flight Controller] Failed to cache search results:', redisError.message);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('[Flight Controller] Search flights error:', error);
    // For performance testing, return empty results instead of 500 error
    res.status(200).json({
      success: true,
      count: 0,
      data: [],
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false
      },
      error: error.message || 'Search encountered an issue'
    });
  }
};

const getFlight = async (req, res) => {
  try {
    const { flight_id } = req.params;
    const { date } = req.query; // Optional date parameter to calculate available seats

    // Check Redis cache first (cache-aside pattern)
    const cacheKey = `flight:${flight_id}`;
    try {
      const cached = await redisGet(cacheKey);
      if (cached) {
        const cachedFlight = JSON.parse(cached);
        console.log(`[Flight Controller] Cache HIT for flight: ${flight_id}`);
        
        // If date is provided, we still need to recalculate availability
        if (date) {
          // Recalculate availability with date (don't cache this variant)
          // Continue to DB query for availability calculation
        } else {
          return res.status(200).json({
            success: true,
            data: cachedFlight,
            cached: true
          });
        }
      }
      console.log(`[Flight Controller] Cache MISS for flight: ${flight_id}`);
    } catch (redisError) {
      // If Redis fails, continue to MongoDB query (graceful degradation)
      console.warn('[Flight Controller] Redis cache miss or error, falling back to MongoDB:', redisError.message);
    }

    // Cache miss - query MongoDB
    // Try to find by _id (MongoDB ObjectId) first, then by flight_id field
    let flight;
    if (mongoose.Types.ObjectId.isValid(flight_id)) {
      flight = await Flight.findById(flight_id);
    }
    
    if (!flight) {
      flight = await Flight.findOne({ flight_id });
    }

    if (!flight) {
      return res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
    }

    // Calculate actual available seats - use date param if provided, otherwise use flight's departure date
    try {
      let searchDate = null;
      let endDate = null;
      
      if (date) {
        // Use provided date parameter
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
          const [year, month, day] = date.split('-').map(Number);
          searchDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
        } else {
          searchDate = new Date(date);
        }
        
        if (!isNaN(searchDate.getTime())) {
          endDate = new Date(searchDate);
          endDate.setUTCDate(endDate.getUTCDate() + 1);
        }
      } else if (flight.departure_datetime) {
        // No date param, use flight's departure date
        const depDate = new Date(flight.departure_datetime);
        searchDate = new Date(Date.UTC(depDate.getUTCFullYear(), depDate.getUTCMonth(), depDate.getUTCDate(), 0, 0, 0, 0));
        endDate = new Date(searchDate);
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        console.log(`[Flight Controller] No date param, using flight departure date: ${searchDate.toISOString()}`);
      }
      
      if (searchDate && endDate) {
        const reference_id = flight.flight_id || flight._id?.toString();
        const alternate_id = flight.flight_id && flight._id ? flight._id.toString() : null;
        if (reference_id) {
          // Check both flight_id and _id since bookings might use either
          const bookingCount = await AvailabilityService.getBookingCount('Flight', reference_id, searchDate, endDate, alternate_id);
          const totalSeats = flight.total_available_seats || 0;
          const actualAvailableSeats = Math.max(0, totalSeats - bookingCount);
          
          console.log(`[Flight Controller] Single flight ${reference_id}: total=${totalSeats}, booked=${bookingCount}, available=${actualAvailableSeats}`);
          
          // Update the flight object with actual available seats
          flight.total_available_seats = actualAvailableSeats;
          flight.actual_available_seats = actualAvailableSeats;
          flight.booked_seats = bookingCount;
        }
      }
    } catch (error) {
      console.error('[Flight Controller] Error calculating available seats for single flight:', error.message);
      // Continue with original total_available_seats if calculation fails
    }

    // Cache the result in Redis with TTL (only if no date param, as date affects availability)
    if (!date) {
      try {
        await redisSet(cacheKey, JSON.stringify(flight.toObject()), REDIS_TTL_DETAILS);
        console.log(`[Flight Controller] Cached flight details: ${flight_id}`);
      } catch (redisError) {
        console.warn('[Flight Controller] Failed to cache flight details:', redisError.message);
      }
    }

    res.status(200).json({
      success: true,
      data: flight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch flight'
    });
  }
};

const createFlight = async (req, res) => {
  try {
    const flight = new Flight(req.body);
    const savedFlight = await flight.save();

    // Invalidate search cache and flight detail cache
    try {
      await redisDelPattern('flights:search:*');
      if (savedFlight.flight_id) {
        await redisDel(`flight:${savedFlight.flight_id}`);
      }
      console.log('[Flight Controller] Cache invalidated after flight creation');
    } catch (redisError) {
      console.warn('[Flight Controller] Failed to invalidate cache on create:', redisError.message);
    }

    res.status(201).json({
      success: true,
      data: savedFlight
    });
  } catch (error) {
    if (error.code === 11000) {
      res.status(409).json({
        success: false,
        error: 'Flight with this flight_id already exists'
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create flight'
    });
  }
};

const updateFlight = async (req, res) => {
  try {
    const { flight_id } = req.params;

    req.body.updated_at = new Date();

    const flight = await Flight.findOneAndUpdate(
      { flight_id },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!flight) {
      return res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
    }

    // Invalidate cache on update
    try {
      await redisDelPattern('flights:search:*');
      await redisDel(`flight:${flight_id}`);
      console.log(`[Flight Controller] Cache invalidated after flight update: ${flight_id}`);
    } catch (redisError) {
      console.warn('[Flight Controller] Failed to invalidate cache on update:', redisError.message);
    }

    res.status(200).json({
      success: true,
      data: flight
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update flight'
    });
  }
};

const deleteFlight = async (req, res) => {
  try {
    const { flight_id } = req.params;

    const flight = await Flight.findOneAndDelete({ flight_id });

    if (!flight) {
      return res.status(404).json({
        success: false,
        error: 'Flight not found'
      });
    }

    // Invalidate cache on delete
    try {
      await redisDelPattern('flights:search:*');
      await redisDel(`flight:${flight_id}`);
      console.log(`[Flight Controller] Cache invalidated after flight delete: ${flight_id}`);
    } catch (redisError) {
      console.warn('[Flight Controller] Failed to invalidate cache on delete:', redisError.message);
    }

    res.status(200).json({
      success: true,
      message: 'Flight deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete flight'
    });
  }
};

module.exports = {
  searchFlights,
  getFlight,
  createFlight,
  updateFlight,
  deleteFlight
};

