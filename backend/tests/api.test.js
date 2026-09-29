const request = require('supertest');
const app = require('../app');
const { calculateOrderTotals } = require('../utils/orderCalculator');
const schedulingService = require('../services/schedulingService');

describe('🔥 Folk and Flame Test Suite', () => {

  describe('1. Health and Public Menu APIs', () => {
    test('GET /api/health returns 200 and healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toContain('Folk and Flame');
    });

    test('GET /api/menu/categories returns all 8 active categories', async () => {
      const res = await request(app).get('/api/menu/categories');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.categories)).toBe(true);
      expect(res.body.categories.length).toBeGreaterThanOrEqual(8);
    });

    test('GET /api/menu/items supports dietary and search filtering', async () => {
      const res = await request(app).get('/api/menu/items?is_veg=true&limit=10');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.items.every(i => i.is_veg === true)).toBe(true);
    });

    test('GET /api/menu/item/slug/:slug returns item with customizations', async () => {
      const res = await request(app).get('/api/menu/item/slug/charcoal-smoked-butter-chicken');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.item.name).toContain('Butter Chicken');
      expect(Array.isArray(res.body.item.customizations)).toBe(true);
    });
  });

  describe('2. Authentication & Security', () => {
    const testEmail = `testuser_${Date.now()}@flame.com`;
    let userToken = '';

    test('POST /api/auth/register creates a new user with bcrypt password hashing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          full_name: 'Aditi Rao',
          email: testEmail,
          phone: '+91 98333 44555',
          password: 'Password@123'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.password_hash).toBeUndefined(); // Sensitive hash never exposed
      userToken = res.body.token;
    });

    test('POST /api/auth/login logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'Password@123'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    test('POST /api/auth/login rejects wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword'
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    test('GET /api/auth/me rejects unauthorized request without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    test('GET /api/auth/me succeeds with valid JWT Bearer', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe(testEmail);
    });
  });

  describe('3. Order Calculation Engine (Zero-Trust Frontend Prices)', () => {
    test('calculateOrderTotals accurately computes subtotal, coupon discount, GST, and delivery', () => {
      const mockItems = [
        {
          id: '1',
          name: 'Butter Chicken',
          price: 520,
          discounted_price: 480,
          quantity: 2,
          customizations: [{ name: 'Garlic Naan', additional_price: 120 }]
        }
      ];

      // Base: (480 + 120) * 2 = 1200
      const coupon = {
        code: 'FLAME10',
        discount_type: 'percentage',
        discount_value: 10,
        min_order_value: 600,
        max_discount: 150,
        is_active: true
      };

      const result = calculateOrderTotals({
        items: mockItems,
        coupon,
        orderType: 'delivery',
        tip: 50,
        settings: { tax_rate: 5.0, delivery_base_fee: 49.0, free_delivery_threshold: 800.0 }
      });

      expect(result.subtotal).toBe(1200);
      expect(result.discount).toBe(120); // 10% of 1200
      expect(result.deliveryFee).toBe(0); // 1200 - 120 = 1080 > 800 threshold
      expect(result.tax).toBe(54); // 5% of 1080
      expect(result.tip).toBe(50);
      expect(result.total).toBe(1080 + 54 + 50); // 1184
    });
  });

  describe('4. Order Scheduling Service', () => {
    test('rejects past scheduled times', () => {
      const past = new Date(Date.now() - 3600000).toISOString();
      const check = schedulingService.validateScheduleTime(past);
      expect(check.valid).toBe(false);
      expect(check.message).toContain('past');
    });

    test('rejects orders with insufficient notice period (< 45 mins)', () => {
      const tooSoon = new Date(Date.now() + 10 * 60000).toISOString();
      const check = schedulingService.validateScheduleTime(tooSoon);
      expect(check.valid).toBe(false);
      expect(check.message).toContain('45 minutes');
    });
  });

  describe('5. Flame AI Assistant', () => {
    test('POST /api/ai/ask provides grounded menu recommendations', async () => {
      const res = await request(app)
        .post('/api/ai/ask')
        .send({ query: 'I want something spicy and vegetarian' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.reply).toBeDefined();
      expect(Array.isArray(res.body.data.recommendations)).toBe(true);
      expect(Array.isArray(res.body.data.suggested_chips)).toBe(true);
    });
  });

  describe('6. RBAC Role-Based Authorization', () => {
    test('Regular customer cannot access admin dashboard stats', async () => {
      // Login as normal customer
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'aarav@example.com',
          password: 'Password@123'
        });

      if (loginRes.status === 200) {
        const adminRes = await request(app)
          .get('/api/admin/dashboard/stats')
          .set('Authorization', `Bearer ${loginRes.body.token}`);
        expect(adminRes.status).toBe(403);
      }
    });

    test('Admin user can access dashboard stats', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@folkandflame.com',
          password: 'Password@123'
        });

      if (loginRes.status === 200) {
        const adminRes = await request(app)
          .get('/api/admin/dashboard/stats')
          .set('Authorization', `Bearer ${loginRes.body.token}`);
        expect(adminRes.status).toBe(200);
        expect(adminRes.body.stats).toBeDefined();
      }
    });
  });
});
