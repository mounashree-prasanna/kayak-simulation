/**
 * Tracking Service
 * 
 * Handles logging of user interactions (clicks) for analytics.
 * Fails silently to avoid breaking the app if tracking service is unavailable.
 */

import api from './api'

/**
 * Log a listing click/view
 * @param {string} listingType - 'Hotel', 'Flight', or 'Car'
 * @param {string} listingId - The ID of the listing
 * @param {string} userId - Optional user ID (if logged in)
 */
export const logListingClick = async (listingType, listingId, userId = null) => {
  // Don't track if listing ID is missing
  if (!listingId || !listingType) {
    return
  }

  try {
    await api.post('/logs/listing-click', {
      user_id: userId || undefined,
      listing_type: listingType,
      listing_id: String(listingId)
    })
    // Silently succeed - we don't want to disrupt user experience
  } catch (error) {
    // Fail silently - don't break the app if tracking fails
    // Only log to console in development
    if (import.meta.env.DEV) {
      console.debug('[Tracking] Failed to log listing click:', error.message)
    }
  }
}

/**
 * Log a page click
 * @param {string} page - The page name/path
 * @param {string} elementId - Optional element ID that was clicked
 * @param {string} userId - Optional user ID (if logged in)
 */
export const logPageClick = async (page, elementId = null, userId = null) => {
  if (!page) {
    return
  }

  try {
    await api.post('/logs/click', {
      user_id: userId || undefined,
      page,
      element_id: elementId || 'unknown'
    })
  } catch (error) {
    // Fail silently
    if (import.meta.env.DEV) {
      console.debug('[Tracking] Failed to log page click:', error.message)
    }
  }
}

export default {
  logListingClick,
  logPageClick
}

