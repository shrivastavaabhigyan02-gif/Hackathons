const Menu = require('../models/Menu');

/**
 * Flame AI Food Assistant Service
 * Strictly grounded in Folk & Flame's live menu database.
 * Never invents dishes, fake prices, or false allergen claims.
 */

const aiService = {
  async processQuery({ query, userPreferences = {}, history = [] }) {
    const rawQuery = String(query || '').toLowerCase().trim();

    // 1. Fetch available menu items from database
    const allItems = await Menu.getItems({ limit: 100 });

    let matchedItems = [];
    let responseText = '';
    let categoryFound = null;

    // Detect Budget constraint: e.g. "under 300", "under ₹500", "below 400", "budget"
    const budgetMatch = rawQuery.match(/(?:under|below|less than|within|budget of)\s*(?:₹|rs\.?|inr)?\s*(\d+)/i);
    const maxBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : null;

    // Detect Dietary preferences
    const wantsVeg = rawQuery.includes('veg') && !rawQuery.includes('non-veg') && !rawQuery.includes('non veg');
    const wantsNonVeg = rawQuery.includes('non-veg') || rawQuery.includes('non veg') || rawQuery.includes('chicken') || rawQuery.includes('mutton') || rawQuery.includes('meat') || rawQuery.includes('prawns') || rawQuery.includes('fish');
    const wantsVegan = rawQuery.includes('vegan');
    const wantsGlutenFree = rawQuery.includes('gluten-free') || rawQuery.includes('gluten free');

    // Detect Spice preference
    const wantsSpicy = rawQuery.includes('spicy') || rawQuery.includes('hot') || rawQuery.includes('chili') || rawQuery.includes('chilli') || rawQuery.includes('fiery') || rawQuery.includes('angaar');
    const wantsMild = rawQuery.includes('mild') || rawQuery.includes('not spicy') || rawQuery.includes('sweet') || rawQuery.includes('light');

    // Detect Meal Type or Occasion
    const isFamily = rawQuery.includes('family') || rawQuery.includes('group') || rawQuery.includes('feast') || rawQuery.includes('sharing');
    const isKids = rawQuery.includes('kid') || rawQuery.includes('child');
    const isDessert = rawQuery.includes('dessert') || rawQuery.includes('sweet') || rawQuery.includes('chocolate') || rawQuery.includes('cake');
    const isDrink = rawQuery.includes('drink') || rawQuery.includes('beverage') || rawQuery.includes('cocktail') || rawQuery.includes('mocktail') || rawQuery.includes('brew');
    const isBestseller = rawQuery.includes('bestseller') || rawQuery.includes('popular') || rawQuery.includes('special') || rawQuery.includes('famous') || rawQuery.includes('recommend');
    const isLightDinner = rawQuery.includes('light') || rawQuery.includes('healthy') || rawQuery.includes('salad');
    const isHighProtein = rawQuery.includes('protein') || rawQuery.includes('gym') || rawQuery.includes('workout');

    // Filter items from DB
    const filterItems = (strictSpice = true) => {
      return allItems.filter(item => {
        const itemPrice = Number(item.discounted_price || item.price);

        // Budget filter
        if (maxBudget && itemPrice > maxBudget) return false;

        // Dietary filter
        if (wantsVeg && !item.is_veg) return false;
        if (wantsNonVeg && item.is_veg) return false;
        if (wantsVegan && !item.is_vegan) return false;
        if (wantsGlutenFree && !item.is_gluten_free) return false;

        // Spice level
        if (wantsSpicy && strictSpice && item.spicy_level < 2) return false;
        if (wantsSpicy && !strictSpice && item.spicy_level < 1) return false;
        if (wantsMild && item.spicy_level > 1) return false;

        // Category specific filter
        if (isDessert && !item.category?.slug?.includes('dessert')) return false;
        if (isDrink && !item.category?.slug?.includes('beverage')) return false;

        return true;
      });
    };

    matchedItems = filterItems(true);
    if (matchedItems.length === 0 && wantsSpicy) {
      matchedItems = filterItems(false); // relax spice threshold to level 1+
    }


    // Score and rank matched items based on keywords
    matchedItems.sort((a, b) => {
      let scoreA = 0;
      let scoreB = 0;

      if (isBestseller) {
        if (a.is_bestseller) scoreA += 5;
        if (b.is_bestseller) scoreB += 5;
        if (a.is_chef_special) scoreA += 3;
        if (b.is_chef_special) scoreB += 3;
      }
      if (isHighProtein) {
        if (!a.is_veg || a.name.includes('Paneer') || a.name.includes('Salmon')) scoreA += 4;
        if (!b.is_veg || b.name.includes('Paneer') || b.name.includes('Salmon')) scoreB += 4;
      }

      // Keyword match with query in name/description
      const queryWords = rawQuery.split(/\s+/).filter(w => w.length > 3);
      for (const word of queryWords) {
        if (a.name.toLowerCase().includes(word)) scoreA += 6;
        if (b.name.toLowerCase().includes(word)) scoreB += 6;
        if (a.short_description.toLowerCase().includes(word)) scoreA += 2;
        if (b.short_description.toLowerCase().includes(word)) scoreB += 2;
      }

      return (scoreB + Number(b.rating)) - (scoreA + Number(a.rating));
    });

    // Take top 3 recommendations
    const recommendations = matchedItems.slice(0, 3).map(item => ({
      id: item.id,
      name: item.name,
      slug: item.slug,
      price: item.price,
      discounted_price: item.discounted_price,
      is_veg: item.is_veg,
      spicy_level: item.spicy_level,
      rating: item.rating,
      image_url: item.image_url,
      short_description: item.short_description,
      calories: item.calories
    }));

    // Craft conversational, brand-appropriate response
    if (recommendations.length > 0) {
      if (maxBudget && wantsSpicy && wantsVeg) {
        responseText = `Here are fiery vegetarian creations from our charcoal hearth under ₹${maxBudget}:`;
      } else if (maxBudget && wantsSpicy) {
        responseText = `Craving heat on a budget? Here are sizzling flame-grilled favorites under ₹${maxBudget}:`;
      } else if (maxBudget) {
        responseText = `I found wonderful artisan dishes crafted within your budget of ₹${maxBudget}:`;
      } else if (isHighProtein) {
        responseText = `For a high-protein feast, here are nutrient-dense wood-fired favorites with wholesome cuts and premium ingredients:`;
      } else if (isLightDinner) {
        responseText = `For an exquisite, satisfying yet light dinner, our chefs recommend these delicate flame creations:`;
      } else if (isFamily) {
        responseText = `Gathering with loved ones? Here are generous sharing platters and handi biryanis perfect for the whole table:`;
      } else if (isDessert) {
        responseText = `End your meal on a golden note with our signature flame-torched and smoke-infused desserts:`;
      } else if (isBestseller) {
        responseText = `Our most celebrated showstoppers! These are the dishes our patrons order time and again:`;
      } else {
        responseText = `Based on what you're craving, here are ${recommendations.length} handcrafted dishes straight from our flame kitchen:`;
      }
    } else {
      responseText = `I couldn't find an exact dish matching all those criteria right now, but our chefs craft a wide variety of grills, dum biryanis, and sourdough pizzas. Would you like to explore our bestsellers or filter by starters?`;
    }

    // Allergen note if query mentioned allergies
    let allergyNote = null;
    if (rawQuery.includes('allergy') || rawQuery.includes('allergic') || rawQuery.includes('nut') || rawQuery.includes('dairy') || rawQuery.includes('onion') || rawQuery.includes('garlic')) {
      allergyNote = '⚠️ Food Safety Note: While our kitchen records allergens, dishes are prepared in an active wood-fired environment. Please let your server or order instructions know of severe allergies!';
    }

    return {
      reply: responseText,
      recommendations,
      allergy_note: allergyNote,
      suggested_chips: [
        '🌶️ Something spicy under ₹400',
        '🥗 Pure Veg Specials',
        '⭐ What is your #1 bestseller?',
        '🍗 High Protein Meals',
        '🍨 Torched Desserts'
      ]
    };
  }
};

module.exports = aiService;
