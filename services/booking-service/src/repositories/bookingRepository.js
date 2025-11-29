const { executeTransaction, query } = require('../config/mysql');

class BookingRepository {
  static async create(bookingData, connection = null) {
    const sql = `
      INSERT INTO bookings (
        booking_id, user_id, user_ref, booking_type, reference_id, 
        reference_ref, start_date, end_date, booking_status, total_price, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;
    
    const params = [
      bookingData.booking_id,
      bookingData.user_id,
      bookingData.user_ref || null,
      bookingData.booking_type,
      bookingData.reference_id,
      bookingData.reference_ref || null,
      bookingData.start_date,
      bookingData.end_date,
      bookingData.booking_status || 'Pending',
      bookingData.total_price
    ];

    if (connection) {
      const [result] = await connection.execute(sql, params);
      return { insertId: result.insertId, ...bookingData };
    } else {
      const [result] = await require('../config/mysql').pool.execute(sql, params);
      return { insertId: result.insertId, ...bookingData };
    }
  }

  // Get booking by booking_id
  static async findByBookingId(booking_id, connection = null) {
    const sql = 'SELECT * FROM bookings WHERE booking_id = ?';
    
    if (connection) {
      const [rows] = await connection.execute(sql, [booking_id]);
      return rows[0] || null;
    } else {
      const rows = await query(sql, [booking_id]);
      return rows[0] || null;
    }
  }

  // Get bookings by user_id with optional filters
  static async findByUserId(user_id, filters = {}, connection = null) {
    let sql = 'SELECT * FROM bookings WHERE user_id = ?';
    const params = [user_id];

    if (filters.type) {
      sql += ' AND booking_type = ?';
      params.push(filters.type);
    }

    if (filters.status) {
      sql += ' AND booking_status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY created_at DESC';
    const limit = filters.limit ? parseInt(filters.limit, 10) : 100;
    sql += ` LIMIT ${limit}`;

    if (connection) {
      const [rows] = await connection.execute(sql, params);
      return rows;
    } else {
      const rows = await query(sql, params);
      return rows;
    }
  }

  // Update booking status (with transaction support)
  static async updateStatus(booking_id, status, connection = null) {
    const sql = `
      UPDATE bookings 
      SET booking_status = ?, updated_at = NOW() 
      WHERE booking_id = ?
    `;

    if (connection) {
      const [result] = await connection.execute(sql, [status, booking_id]);
      return result.affectedRows > 0;
    } else {
      const [result] = await require('../config/mysql').pool.execute(sql, [status, booking_id]);
      return result.affectedRows > 0;
    }
  }

  // Update booking (full update with transaction support)
  static async update(booking_id, updateData, connection = null) {
    const sql = `
      UPDATE bookings 
      SET 
        booking_status = ?,
        total_price = ?,
        start_date = ?,
        end_date = ?,
        updated_at = NOW()
      WHERE booking_id = ?
    `;

    const params = [
      updateData.booking_status,
      updateData.total_price,
      updateData.start_date,
      updateData.end_date,
      booking_id
    ];

    if (connection) {
      const [result] = await connection.execute(sql, params);
      return result.affectedRows > 0;
    } else {
      const [result] = await require('../config/mysql').pool.execute(sql, params);
      return result.affectedRows > 0;
    }
  }

  // Delete booking (with transaction support)
  static async delete(booking_id, connection = null) {
    const sql = 'DELETE FROM bookings WHERE booking_id = ?';

    if (connection) {
      const [result] = await connection.execute(sql, [booking_id]);
      return result.affectedRows > 0;
    } else {
      const [result] = await require('../config/mysql').pool.execute(sql, [booking_id]);
      return result.affectedRows > 0;
    }
  }
}

module.exports = BookingRepository;

