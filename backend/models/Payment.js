const supabase = require('../config/supabase');

const Payment = {
  async create({ orderId, paymentMethod, amount, currency = 'INR', transactionId = null, provider = 'razorpay_stripe_unified', status = 'pending' }) {
    const { data, error } = await supabase
      .from('payments')
      .insert([{
        order_id: orderId,
        payment_method: paymentMethod,
        transaction_id: transactionId,
        provider,
        amount,
        currency,
        status,
        raw_response: { initiated_at: new Date().toISOString(), method: paymentMethod }
      }])
      .select('*')
      .single();

    if (error) throw error;
    return data;
  },

  async getByOrderId(orderId) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async updateStatus(id, status, transactionId = null, rawResponse = null) {
    const updates = { status, updated_at: new Date().toISOString() };
    if (transactionId) updates.transaction_id = transactionId;
    if (rawResponse) updates.raw_response = rawResponse;

    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }
};

module.exports = Payment;
