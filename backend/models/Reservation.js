const supabase = require('../config/supabase');

const Reservation = {
  // Configured daily dining time slots
  AVAILABLE_SLOTS: [
    '12:00:00', '12:30:00', '13:00:00', '13:30:00', '14:00:00',
    '19:00:00', '19:30:00', '20:00:00', '20:30:00', '21:00:00', '21:30:00', '22:00:00'
  ],

  MAX_TABLES_PER_SLOT: 8,

  async getAvailableSlots(dateStr) {
    const { data: existing, error } = await supabase
      .from('reservations')
      .select('reservation_time')
      .eq('reservation_date', dateStr)
      .neq('status', 'cancelled');

    if (error) throw error;

    const countBySlot = {};
    for (const res of existing || []) {
      const time = res.reservation_time;
      countBySlot[time] = (countBySlot[time] || 0) + 1;
    }

    return this.AVAILABLE_SLOTS.map(slot => ({
      time: slot,
      available_tables: Math.max(0, this.MAX_TABLES_PER_SLOT - (countBySlot[slot] || 0)),
      is_available: (countBySlot[slot] || 0) < this.MAX_TABLES_PER_SLOT
    }));
  },

  async create({
    userId = null,
    customerName,
    customerEmail,
    customerPhone,
    reservationDate,
    reservationTime,
    guestCount,
    seatingPreference = 'Indoor Dining',
    specialRequests = ''
  }) {
    // Check if slot has capacity
    const { data: count, error: countError } = await supabase
      .from('reservations')
      .select('id')
      .eq('reservation_date', reservationDate)
      .eq('reservation_time', reservationTime)
      .neq('status', 'cancelled');

    if (countError) throw countError;

    if (count && count.length >= this.MAX_TABLES_PER_SLOT) {
      throw new Error(`The requested time slot (${reservationTime}) is fully booked. Please select another time.`);
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert([{
        user_id: userId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        reservation_date: reservationDate,
        reservation_time: reservationTime,
        guest_count: parseInt(guestCount, 10),
        seating_preference: seatingPreference,
        special_requests: specialRequests,
        status: 'confirmed'
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async getUserReservations(userId) {
    const { data, error } = await supabase
      .from('reservations')
      .select('*')
      .eq('user_id', userId)
      .order('reservation_date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async getAllReservations({ date = null, status = null } = {}) {
    let query = supabase
      .from('reservations')
      .select('*')
      .order('reservation_date', { ascending: false })
      .order('reservation_time', { ascending: true });

    if (date) query = query.eq('reservation_date', date);
    if (status && status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async updateStatus(id, status) {
    const { data, error } = await supabase
      .from('reservations')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  }
};

module.exports = Reservation;
