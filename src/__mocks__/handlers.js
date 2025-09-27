import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3003/api';

// Mock data
const mockUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  display_name: 'Test User',
  role: 'user',
  created_at: new Date().toISOString(),
};

const mockAdminUser = {
  id: 'admin-user-1',
  email: 'admin@example.com',
  display_name: 'Admin User',
  role: 'admin',
  created_at: new Date().toISOString(),
};

const mockSettings = {
  id: 'settings-1',
  site_name: 'לודורה',
  maintenance_mode: false,
  subscription_system_enabled: true,
  nav_workshops_visibility: 'public',
  nav_games_visibility: 'public',
  nav_files_visibility: 'public',
  nav_courses_visibility: 'public',
  nav_classrooms_visibility: 'public',
  nav_account_visibility: 'public',
  nav_content_creators_visibility: 'admins_and_creators',
};

const mockWorkshops = [
  {
    id: 'workshop-1',
    title: 'הדרכת React',
    description: 'למידת React מהיסודות',
    price: 150,
    product_type: 'workshop',
    is_published: true,
    scheduled_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'תכנות',
    duration_minutes: 120,
    max_participants: 20,
  },
  {
    id: 'workshop-2',
    title: 'הדרכת Vue.js',
    description: 'למידת Vue.js מהיסודות',
    price: 0,
    product_type: 'workshop',
    is_published: true,
    scheduled_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    category: 'תכנות',
    duration_minutes: 90,
    max_participants: 15,
  },
];

const mockRegistrations = [
  {
    id: 'reg-1',
    user_id: 'test-user-1',
    workshop_id: 'workshop-1',
    participant_name: 'Test User',
    participant_phone: '050-1234567',
    payment_status: 'paid',
    payment_amount: 150,
    created_at: new Date().toISOString(),
  },
];

export const handlers = [
  // Authentication endpoints
  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    if (token === 'admin-token') {
      return HttpResponse.json(mockAdminUser);
    }
    if (token === 'user-token') {
      return HttpResponse.json(mockUser);
    }
    return HttpResponse.json({ error: 'Invalid token' }, { status: 401 });
  }),

  http.post(`${API_BASE}/auth/verify`, async ({ request }) => {
    const body = await request.json();
    if (body.idToken === 'valid-firebase-token') {
      return HttpResponse.json({
        valid: true,
        user: mockUser,
        token: 'user-token',
      });
    }
    if (body.idToken === 'admin-firebase-token') {
      return HttpResponse.json({
        valid: true,
        user: mockAdminUser,
        token: 'admin-token',
      });
    }
    return HttpResponse.json({ valid: false }, { status: 401 });
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({ success: true });
  }),

  // Settings endpoint
  http.get(`${API_BASE}/entities/settings`, () => {
    return HttpResponse.json([mockSettings]);
  }),

  // Products/Workshops endpoints
  http.get(`${API_BASE}/entities/product`, ({ request }) => {
    const url = new URL(request.url);
    const productType = url.searchParams.get('product_type');
    const isPublished = url.searchParams.get('is_published');
    
    let results = mockWorkshops;
    
    if (productType === 'workshop') {
      results = results.filter(w => w.product_type === 'workshop');
    }
    if (isPublished === 'true') {
      results = results.filter(w => w.is_published === true);
    }
    
    return HttpResponse.json(results);
  }),

  http.get(`${API_BASE}/entities/product/:id`, ({ params }) => {
    const workshop = mockWorkshops.find(w => w.id === params.id);
    if (workshop) {
      return HttpResponse.json(workshop);
    }
    return HttpResponse.json({ error: 'Not found' }, { status: 404 });
  }),

  // Registrations endpoints
  http.get(`${API_BASE}/entities/registration`, ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const workshopId = url.searchParams.get('workshop_id');
    
    let results = mockRegistrations;
    
    if (userId) {
      results = results.filter(r => r.user_id === userId);
    }
    if (workshopId) {
      results = results.filter(r => r.workshop_id === workshopId);
    }
    
    return HttpResponse.json(results);
  }),

  http.post(`${API_BASE}/entities/registration`, async ({ request }) => {
    const body = await request.json();
    const newRegistration = {
      id: `reg-${Date.now()}`,
      ...body,
      payment_status: 'pending',
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newRegistration, { status: 201 });
  }),

  // Categories endpoint
  http.get(`${API_BASE}/entities/category`, () => {
    return HttpResponse.json([
      { id: 'cat-1', name: 'תכנות' },
      { id: 'cat-2', name: 'עיצוב' },
      { id: 'cat-3', name: 'שיווק' },
    ]);
  }),

  // Purchases endpoint
  http.get(`${API_BASE}/entities/purchase`, ({ request }) => {
    const url = new URL(request.url);
    const buyerUserId = url.searchParams.get('buyer_user_id');
    const paymentStatus = url.searchParams.get('payment_status');

    // Mock purchases based on query
    const mockPurchases = [];
    if (buyerUserId === 'test-user-id' && paymentStatus === 'paid') {
      mockPurchases.push({
        id: 'purchase-1',
        purchasable_id: 'workshop-1',
        purchasable_type: 'workshop',
        buyer_user_id: 'test-user-id',
        buyer: {
          id: 'test-user-id',
          email: 'test@example.com',
          full_name: 'Test User'
        },
        payment_status: 'paid',
        payment_amount: 150,
        access_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      });
    }
    
    return HttpResponse.json(mockPurchases);
  }),

  // Fallback for unhandled requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`);
    return HttpResponse.json({ error: 'Not implemented in mock' }, { status: 501 });
  }),
];