const generateBillingId = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `BILL${timestamp}${randomStr}`;
};

const generateInvoiceNumber = () => {
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `INV-${year}-${randomNum}`;
};

// Mock payment processing - in real app, integrate with payment gateway
const processPayment = async (amount, paymentMethod) => {
  // Simulate payment processing with 95% success rate
  const success = Math.random() > 0.05;
  
  if (success) {
    return { success: true };
  } else {
    return { success: false, message: 'Payment processing failed' };
  }
};

module.exports = {
  generateBillingId,
  generateInvoiceNumber,
  processPayment
};

