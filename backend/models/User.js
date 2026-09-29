const supabase = require('../config/supabase');
const bcrypt = require('bcryptjs');

const User = {
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async findById(id) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, role, avatar_url, preferences, created_at')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  async create({ full_name, email, phone, password, role = 'customer' }) {
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { data, error } = await supabase
      .from('profiles')
      .insert([{
        full_name,
        email: email.toLowerCase().trim(),
        phone,
        password_hash,
        role
      }])
      .select('id, full_name, email, phone, role, avatar_url, preferences, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async updateProfile(id, updates) {
    const allowed = {};
    if (updates.full_name) allowed.full_name = updates.full_name;
    if (updates.phone) allowed.phone = updates.phone;
    if (updates.avatar_url) allowed.avatar_url = updates.avatar_url;
    if (updates.preferences) allowed.preferences = updates.preferences;
    allowed.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('profiles')
      .update(allowed)
      .eq('id', id)
      .select('id, full_name, email, phone, role, avatar_url, preferences, created_at')
      .single();

    if (error) throw error;
    return data;
  },

  async comparePassword(inputPassword, storedHash) {
    if (!storedHash) return false;
    return bcrypt.compare(inputPassword, storedHash);
  },

  // Saved Addresses
  async getAddresses(userId) {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async addAddress(userId, addressData) {
    if (addressData.is_default) {
      await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
    }
    const { data, error } = await supabase
      .from('addresses')
      .insert([{ ...addressData, user_id: userId }])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async deleteAddress(userId, addressId) {
    const { error } = await supabase
      .from('addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);
    if (error) throw error;
    return true;
  }
};

module.exports = User;
