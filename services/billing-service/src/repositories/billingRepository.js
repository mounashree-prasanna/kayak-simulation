const { executeTransaction, query } = require('../config/mysql');

class BillingRepository {
  // Create a new billing record (with transaction support)
  static async create(billingData, connection = null) {
    const sql = `
      INSERT INTO billings (
        billing_id, user_id, user_ref, booking_type, booking_id, 
        booking_ref, transaction_date, total_amount_paid, payment_method, 
        transaction_status, invoice_number, invoice_details, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
      billingData.billing_id,
      billingData.user_id,
      billingData.user_ref || null,
      billingData.booking_type,
      billingData.booking_id,
      billingData.booking_ref || null,
      billingData.transaction_date || new Date(),
      billingData.total_amount_paid,
      billingData.payment_method,
      billingData.transaction_status || 'Pending',
      billingData.invoice_number,
      billingData.invoice_details ? JSON.stringify(billingData.invoice_details) : null
    ];

    if (connection) {
      // Use provided connection (for transactions)
      const [result] = await connection.execute(sql, params);
      return { insertId: result.insertId, ...billingData };
    } else {
      // Use connection pool - for INSERT, we need to use execute directly
      const [result] = await require('../config/mysql').pool.execute(sql, params);
      return { insertId: result.insertId, ...billingData };
    }
  }

  // Get billing by billing_id
  static async findByBillingId(billing_id, connection = null) {
    const sql = 'SELECT * FROM billings WHERE billing_id = ?';
    
    if (connection) {
      const [rows] = await connection.execute(sql, [billing_id]);
      return rows[0] ? this.parseBilling(rows[0]) : null;
    } else {
      const rows = await query(sql, [billing_id]);
      return rows[0] ? this.parseBilling(rows[0]) : null;
    }
  }

  // Get billing by invoice_number
  static async findByInvoiceNumber(invoice_number, connection = null) {
    const sql = 'SELECT * FROM billings WHERE invoice_number = ?';
    
    if (connection) {
      const [rows] = await connection.execute(sql, [invoice_number]);
      return rows[0] ? this.parseBilling(rows[0]) : null;
    } else {
      const rows = await query(sql, [invoice_number]);
      return rows[0] ? this.parseBilling(rows[0]) : null;
    }
  }

  // Get billings by user_id
  static async findByUserId(user_id, filters = {}, connection = null) {
    let sql = 'SELECT * FROM billings WHERE user_id = ?';
    const params = [user_id];

    if (filters.status) {
      sql += ' AND transaction_status = ?';
      params.push(filters.status);
    }

    if (filters.startDate) {
      sql += ' AND transaction_date >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      sql += ' AND transaction_date <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY transaction_date DESC LIMIT ?';
    params.push(filters.limit || 100);

    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return rows.map(row => this.parseBilling(row));
    } else {
      const rows = await query(sql, params);
      return rows.map(row => this.parseBilling(row));
    }
  }

  // Get billings by booking_id
  static async findByBookingId(booking_id, connection = null) {
    const sql = 'SELECT * FROM billings WHERE booking_id = ? ORDER BY transaction_date DESC';
    
    if (connection) {
      const [rows] = await connection.execute(sql, [booking_id]);
      return rows.map(row => this.parseBilling(row));
    } else {
      const rows = await query(sql, [booking_id]);
      return rows.map(row => this.parseBilling(row));
    }
  }

  // Update transaction status (with transaction support)
  static async updateStatus(billing_id, status, connection = null) {
    const sql = `
      UPDATE billings 
      SET transaction_status = ?, updated_at = NOW() 
      WHERE billing_id = ?
    `;

    if (connection) {
      const [result] = await connection.execute(sql, [status, billing_id]);
      return result.affectedRows > 0;
    } else {
      const [result] = await require('../config/mysql').pool.execute(sql, [status, billing_id]);
      return result.affectedRows > 0;
    }
  }

  // Update billing (full update with transaction support)
  static async update(billing_id, updateData, connection = null) {
    const sql = `
      UPDATE billings 
      SET 
        transaction_status = ?,
        total_amount_paid = ?,
        payment_method = ?,
        invoice_details = ?,
        updated_at = NOW()
      WHERE billing_id = ?
    `;

    const params = [
      updateData.transaction_status,
      updateData.total_amount_paid,
      updateData.payment_method,
      updateData.invoice_details ? JSON.stringify(updateData.invoice_details) : null,
      billing_id
    ];

    if (connection) {
      const [result] = await connection.execute(sql, params);
      return result.affectedRows > 0;
    } else {
      const [result] = await require('../config/mysql').pool.execute(sql, params);
      return result.affectedRows > 0;
    }
  }

  // Parse billing record (convert JSON fields)
  static parseBilling(row) {
    if (!row) return null;
    
    return {
      ...row,
      invoice_details: row.invoice_details ? JSON.parse(row.invoice_details) : null,
      transaction_date: row.transaction_date,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

module.exports = BillingRepository;

