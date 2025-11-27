const generateBookingId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BK${timestamp}${randomStr}`;
};

module.exports = { generateBookingId };

