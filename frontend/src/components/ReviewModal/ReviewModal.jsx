import { useState } from 'react'
import './ReviewModal.css'

const ReviewModal = ({ isOpen, onClose, onSubmit, entityType, entityName, existingReview }) => {
  const [rating, setRating] = useState(existingReview?.rating || 0)
  const [title, setTitle] = useState(existingReview?.title || '')
  const [comment, setComment] = useState(existingReview?.comment || '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (rating === 0) {
      setError('Please select a rating')
      return
    }
    if (!title.trim()) {
      setError('Please enter a review title')
      return
    }
    if (!comment.trim()) {
      setError('Please enter a review comment')
      return
    }

    setSubmitting(true)
    try {
      await onSubmit({
        rating,
        title: title.trim(),
        comment: comment.trim()
      })
      // Reset form
      setRating(0)
      setTitle('')
      setComment('')
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      setRating(0)
      setTitle('')
      setComment('')
      setError(null)
      onClose()
    }
  }

  return (
    <div className="review-modal-overlay" onClick={handleClose}>
      <div className="review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="review-modal-header">
          <h2>Write a Review</h2>
          <button className="review-modal-close" onClick={handleClose} disabled={submitting}>
            ×
          </button>
        </div>

        <div className="review-modal-body">
          <p className="review-entity-info">
            Reviewing: <strong>{entityName}</strong> ({entityType})
          </p>

          <form onSubmit={handleSubmit}>
            <div className="review-form-group">
              <label>Rating *</label>
              <div className="rating-input">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`rating-star ${star <= rating ? 'active' : ''}`}
                    onClick={() => setRating(star)}
                    disabled={submitting}
                  >
                    ⭐
                  </button>
                ))}
                <span className="rating-value">{rating > 0 ? `${rating}/5` : 'Select rating'}</span>
              </div>
            </div>

            <div className="review-form-group">
              <label htmlFor="review-title">Title *</label>
              <input
                id="review-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your review a title"
                maxLength={200}
                disabled={submitting}
                required
              />
            </div>

            <div className="review-form-group">
              <label htmlFor="review-comment">Your Review *</label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={6}
                maxLength={2000}
                disabled={submitting}
                required
              />
              <span className="char-count">{comment.length}/2000</span>
            </div>

            {error && <div className="review-error">{error}</div>}

            <div className="review-modal-actions">
              <button
                type="button"
                className="btn-cancel"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={submitting || rating === 0 || !title.trim() || !comment.trim()}
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ReviewModal

