import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, ChevronRight, Clock3, Flame, MapPin, Menu, Minus, Plus, Search, ShoppingBag, Sparkles, Star, X } from 'lucide-react';
import { menuApi } from './api/menuApi';
import './App.css';

const demoItems = [
  { id: 'paneer', name: 'Wood-Smoked Malai Paneer', short_description: 'Creamy cottage cheese, cardamom and cedarwood smoke.', price: 340, discounted_price: 320, is_veg: true, is_bestseller: true, rating: 4.9, image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=900&auto=format&fit=crop&q=80' },
  { id: 'chicken', name: 'Charcoal Smoked Butter Chicken', short_description: 'Tandoor-charred chicken in a velvety smoked butter gravy.', price: 520, discounted_price: 480, is_veg: false, is_bestseller: true, rating: 5, image_url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=900&auto=format&fit=crop&q=80' },
  { id: 'biryani', name: 'Awadhi Flame Dum Biryani', short_description: 'Aged basmati, tender chicken, saffron milk and rose smoke.', price: 480, discounted_price: 440, is_veg: false, is_bestseller: true, rating: 4.9, image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=900&auto=format&fit=crop&q=80' },
  { id: 'pizza', name: 'Burnt Truffle & Wild Mushroom', short_description: 'Wild mushrooms, fior di latte and fragrant truffle cream.', price: 580, discounted_price: 520, is_veg: true, is_bestseller: true, rating: 4.9, image_url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=900&auto=format&fit=crop&q=80' },
  { id: 'burger', name: 'The Folk Beast Burger', short_description: 'Double smashed smoked mutton, cheddar and flame aioli.', price: 490, discounted_price: 450, is_veg: false, rating: 4.9, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&auto=format&fit=crop&q=80' },
  { id: 'dessert', name: 'Smoked Bourbon Chocolate Fondant', short_description: 'Molten Belgian chocolate with burnt vanilla ice cream.', price: 360, discounted_price: 320, is_veg: true, rating: 5, image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=900&auto=format&fit=crop&q=80' }
];

const categories = ['All', 'Starters', 'Signatures', 'Grills', 'Biryani', 'Pizza', 'Desserts'];
const rupees = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function App() {
  const [items, setItems] = useState(demoItems);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    menuApi.getItems({ is_bestseller: true, limit: 8 })
      .then((response) => response.items?.length && setItems(response.items))
      .catch(() => {});
  }, []);

  const visibleItems = useMemo(() => items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = activeCategory === 'All' || item.name.toLowerCase().includes(activeCategory.toLowerCase().replace('signatures', ''));
    return matchesSearch && matchesCategory;
  }), [items, search, activeCategory]);
  const cartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0);
  const subtotal = cart.reduce((sum, entry) => sum + (entry.discounted_price || entry.price) * entry.quantity, 0);

  const addToCart = (item) => setCart((current) => {
    const existing = current.find((entry) => entry.id === item.id);
    return existing ? current.map((entry) => entry.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry) : [...current, { ...item, quantity: 1 }];
  });
  const updateQuantity = (id, increment) => setCart((current) => current.flatMap((entry) => {
    if (entry.id !== id) return [entry];
    const quantity = entry.quantity + increment;
    return quantity > 0 ? [{ ...entry, quantity }] : [];
  }));
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#home" onClick={() => scrollTo('home')}><span className="brand-mark"><Flame size={20} fill="currentColor" /></span><span>folk <i>&</i> flame</span></a>
      <nav className={navOpen ? 'nav-links nav-open' : 'nav-links'}>
        <button onClick={() => scrollTo('menu')}>Menu</button><button onClick={() => scrollTo('story')}>Our story</button><button onClick={() => scrollTo('visit')}>Visit us</button>
        <button className="nav-reserve" onClick={() => scrollTo('reserve')}>Reserve a table</button>
      </nav>
      <div className="header-actions"><button className="cart-button" aria-label="Open cart" onClick={() => setCartOpen(true)}><ShoppingBag size={20} /><span>{cartCount}</span></button><button className="mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(!navOpen)}>{navOpen ? <X /> : <Menu />}</button></div>
    </header>

    <main>
      <section id="home" className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow"><Flame size={15} fill="currentColor" /> Wood-fired Indian kitchen</p>
          <h1>Gather around<br /><em>the good fire.</em></h1>
          <p className="hero-text">A modern Indian table shaped by ember, smoke, and recipes worth passing on.</p>
          <div className="hero-actions"><button className="btn btn-primary" onClick={() => scrollTo('menu')}>Explore the menu <ArrowRight size={18} /></button><button className="text-action" onClick={() => scrollTo('reserve')}>Book a table <ChevronRight size={18} /></button></div>
          <div className="hero-meta"><div><strong>4.9 <Star size={14} fill="currentColor" /></strong><span>from 2,000+ guests</span></div><div><strong>11:00–23:30</strong><span>Open every day</span></div></div>
        </div>
        <div className="hero-image-wrap"><img src="https://images.unsplash.com/photo-1547592180-85f173990554?w=1400&auto=format&fit=crop&q=88" alt="Colourful Indian dishes served at a table" /><div className="hero-note"><span className="hero-note-icon"><Sparkles size={17} /></span><p><b>Today's ember pick</b><br />Charcoal butter chicken</p></div></div>
      </section>

      <section id="menu" className="menu-section container">
        <div className="section-heading"><div><p className="eyebrow">From our hearth</p><h2>Something for every kind of hunger.</h2></div><button className="text-action desktop-only">View full menu <ArrowRight size={17} /></button></div>
        <div className="menu-toolbar"><div className="category-tabs">{categories.map((category) => <button key={category} className={activeCategory === category ? 'active' : ''} onClick={() => setActiveCategory(category)}>{category}</button>)}</div><label className="search-box"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes" /></label></div>
        <div className="menu-grid">{visibleItems.length ? visibleItems.map((item) => <article className="dish-card" key={item.id}><div className="dish-image"><img src={item.image_url} alt={item.name} /><span className={item.is_veg ? 'diet veg' : 'diet nonveg'}>{item.is_veg ? 'VEG' : 'NON-VEG'}</span>{item.is_bestseller && <span className="bestseller">Bestseller</span>}</div><div className="dish-details"><div className="dish-top"><h3>{item.name}</h3><span className="rating"><Star size={14} fill="currentColor" /> {item.rating}</span></div><p>{item.short_description}</p><div className="dish-bottom"><div><b>{rupees(item.discounted_price || item.price)}</b>{item.discounted_price && <s>{rupees(item.price)}</s>}</div><button className="add-button" onClick={() => addToCart(item)}>Add <Plus size={16} /></button></div></div></article>) : <p className="empty-menu">No dishes match that search. Try another craving.</p>}</div>
      </section>

      <section id="story" className="story-section"><div className="story-image"><img src="https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&auto=format&fit=crop&q=85" alt="Restaurant kitchen with chefs working" /></div><div className="story-copy"><p className="eyebrow">A little bit folk, a little bit flame</p><h2>Old-world warmth,<br /><em>cooked forward.</em></h2><p>We take the flavours we grew up with and give them the room to surprise you. Slow dum, live coal, bright market produce — every plate begins with respect for the ingredient.</p><button className="text-action" onClick={() => scrollTo('visit')}>Meet our kitchen <ArrowRight size={17} /></button><div className="story-stats"><div><b>12 hrs</b><span>our dal slow simmers</span></div><div><b>72 hrs</b><span>our pizza dough rests</span></div><div><b>100%</b><span>made from scratch</span></div></div></div></section>

      <section id="reserve" className="reserve-section container"><div className="reserve-panel"><div><p className="eyebrow">Make an evening of it</p><h2>Come, pull up a chair.</h2><p>Join us for long lunches, celebratory dinners, and an extra round of dessert.</p></div><form onSubmit={(e) => { e.preventDefault(); alert('Your table request is ready to confirm. We’ll be in touch shortly.'); }}><label><CalendarDays size={17} /><input type="date" required min={new Date().toISOString().slice(0, 10)} /></label><label><Clock3 size={17} /><select defaultValue=""><option value="" disabled>Choose a time</option><option>7:00 PM</option><option>7:30 PM</option><option>8:00 PM</option><option>8:30 PM</option></select></label><label><span className="guests-icon">2</span><select defaultValue="2"><option>2 guests</option><option>3 guests</option><option>4 guests</option><option>5 guests</option><option>6 guests</option></select></label><button className="btn btn-gold">Find a table <ArrowRight size={18} /></button></form></div></section>

      <section id="visit" className="visit-section container"><div><p className="eyebrow">Find the fire</p><h2>Bandra, Mumbai</h2><p>42 Waterfield Road, near the good conversations.<br />Monday–Sunday · 11:00 AM–11:30 PM</p><a className="text-action" href="https://maps.google.com" target="_blank" rel="noreferrer"><MapPin size={17} /> Get directions</a></div><div className="visit-quote"><Flame size={28} fill="currentColor" /><p>“The table is where a day turns into a memory.”</p><span>— The Folk & Flame kitchen</span></div></section>
    </main>
    <footer><a className="brand" href="#home"><span className="brand-mark"><Flame size={17} fill="currentColor" /></span><span>folk <i>&</i> flame</span></a><p>Made for gathering, since 2024.</p><div><a href="#menu">Menu</a><a href="#reserve">Reservations</a><a href="#visit">Contact</a></div></footer>

    {cartOpen && <div className="cart-overlay" onClick={() => setCartOpen(false)}><aside className="cart-drawer" onClick={(e) => e.stopPropagation()}><div className="cart-heading"><div><p className="eyebrow">Your order</p><h2>Good choices.</h2></div><button aria-label="Close cart" onClick={() => setCartOpen(false)}><X /></button></div>{cart.length ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.id}><img src={item.image_url} alt="" /><div><h3>{item.name}</h3><b>{rupees(item.discounted_price || item.price)}</b><div className="quantity"><button onClick={() => updateQuantity(item.id, -1)}><Minus size={14} /></button><span>{item.quantity}</span><button onClick={() => updateQuantity(item.id, 1)}><Plus size={14} /></button></div></div></div>)}</div><div className="cart-footer"><div><span>Subtotal</span><b>{rupees(subtotal)}</b></div><button className="btn btn-primary" onClick={() => { setCartOpen(false); alert('Checkout is ready to be connected to the payment flow.'); }}>Checkout <ArrowRight size={18} /></button></div></> : <div className="empty-cart"><ShoppingBag size={34} /><p>Your basket is waiting for something delicious.</p><button className="btn btn-secondary" onClick={() => { setCartOpen(false); scrollTo('menu'); }}>Browse menu</button></div>}</aside></div>}
  </div>;
}

export default App;
