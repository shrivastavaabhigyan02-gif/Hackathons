const supabase = require('../config/supabase');

const Menu = {
  async getCategories() {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async getCategoryBySlug(slug) {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('*')
      .eq('slug', slug)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  async getItems({
    category_slug = null,
    search = '',
    is_veg = null,
    is_vegan = null,
    is_gluten_free = null,
    spice_level = null,
    min_price = null,
    max_price = null,
    is_bestseller = null,
    is_chef_special = null,
    sort_by = 'recommended',
    limit = 50,
    offset = 0
  } = {}) {
    let query = supabase
      .from('menu_items')
      .select(`
        *,
        category:menu_categories(id, name, slug)
      `)
      .eq('is_available', true);

    if (category_slug && category_slug !== 'all') {
      const cat = await this.getCategoryBySlug(category_slug);
      if (cat) {
        query = query.eq('category_id', cat.id);
      }
    }

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      query = query.or(`name.ilike.${term},short_description.ilike.${term},detailed_description.ilike.${term}`);
    }

    if (is_veg !== null && is_veg !== undefined && is_veg !== '') {
      query = query.eq('is_veg', is_veg === 'true' || is_veg === true);
    }

    if (is_vegan === 'true' || is_vegan === true) {
      query = query.eq('is_vegan', true);
    }

    if (is_gluten_free === 'true' || is_gluten_free === true) {
      query = query.eq('is_gluten_free', true);
    }

    if (spice_level !== null && spice_level !== undefined && spice_level !== '') {
      query = query.eq('spicy_level', parseInt(spice_level, 10));
    }

    if (min_price) {
      query = query.gte('price', parseFloat(min_price));
    }
    if (max_price) {
      query = query.lte('price', parseFloat(max_price));
    }

    if (is_bestseller === 'true' || is_bestseller === true) {
      query = query.eq('is_bestseller', true);
    }
    if (is_chef_special === 'true' || is_chef_special === true) {
      query = query.eq('is_chef_special', true);
    }

    // Sorting
    switch (sort_by) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'rating':
        query = query.order('rating', { ascending: false });
        break;
      case 'popularity':
        query = query.order('review_count', { ascending: false });
        break;
      case 'newest':
        query = query.order('is_new', { ascending: false }).order('created_at', { ascending: false });
        break;
      case 'recommended':
      default:
        query = query.order('is_bestseller', { ascending: false }).order('rating', { ascending: false });
        break;
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getItemById(id) {
    const { data: item, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        category:menu_categories(id, name, slug)
      `)
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!item) return null;

    // Fetch customizations
    const { data: customizations } = await supabase
      .from('menu_item_customizations')
      .select(`
        id,
        title,
        type,
        min_select,
        max_select,
        is_required,
        display_order,
        options:customization_options(id, name, additional_price, is_default, calories)
      `)
      .eq('menu_item_id', item.id)
      .order('display_order', { ascending: true });

    item.customizations = customizations || [];
    return item;
  },

  async getItemBySlug(slug) {
    const { data: item, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        category:menu_categories(id, name, slug)
      `)
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    if (!item) return null;

    const { data: customizations } = await supabase
      .from('menu_item_customizations')
      .select(`
        id,
        title,
        type,
        min_select,
        max_select,
        is_required,
        display_order,
        options:customization_options(id, name, additional_price, is_default, calories)
      `)
      .eq('menu_item_id', item.id)
      .order('display_order', { ascending: true });

    item.customizations = customizations || [];
    return item;
  },

  // Admin Menu Operations
  async createItem(itemData) {
    const { data, error } = await supabase
      .from('menu_items')
      .insert([itemData])
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async updateItem(id, updates) {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async toggleAvailability(id, is_available) {
    const { data, error } = await supabase
      .from('menu_items')
      .update({ is_available, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async deleteItem(id) {
    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

module.exports = Menu;
