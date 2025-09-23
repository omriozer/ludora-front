import { render, waitFor, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { UserProvider } from '../../contexts/UserContext';

// Custom render function that wraps components with necessary providers
export function renderWithProviders(ui, options = {}) {
  const {
    initialUser = null,
    initialSettings = null,
    routerOptions = {},
    ...renderOptions
  } = options;

  // Mock UserContext value
  const mockUserContext = {
    currentUser: initialUser,
    settings: initialSettings || {
      site_name: 'Test Site',
      maintenance_mode: false,
      subscription_system_enabled: true,
      nav_workshops_visibility: 'public',
      nav_games_visibility: 'public',
      nav_files_visibility: 'public',
      nav_courses_visibility: 'public',
      nav_classrooms_visibility: 'public',
      nav_account_visibility: 'public',
      nav_content_creators_visibility: 'admins_and_creators',
    },
    loading: false,
    logout: vi.fn(),
    refetchUser: vi.fn(),
  };

  function Wrapper({ children }) {
    return (
      <BrowserRouter {...routerOptions}>
        {children}
      </BrowserRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Mock users for testing
export const mockUsers = {
  regularUser: {
    id: 'test-user-1',
    email: 'test@example.com',
    display_name: 'Test User',
    role: 'user',
    created_at: new Date().toISOString(),
  },
  adminUser: {
    id: 'admin-user-1',
    email: 'admin@example.com',
    display_name: 'Admin User',
    role: 'admin',
    created_at: new Date().toISOString(),
  },
  creatorUser: {
    id: 'creator-user-1',
    email: 'creator@example.com',
    display_name: 'Creator User',
    role: 'content_creator',
    created_at: new Date().toISOString(),
  },
};

// Mock settings for different scenarios
export const mockSettings = {
  default: {
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
  },
  maintenanceMode: {
    id: 'settings-2',
    site_name: 'לודורה',
    maintenance_mode: true,
    subscription_system_enabled: true,
    nav_workshops_visibility: 'public',
    nav_games_visibility: 'public',
    nav_files_visibility: 'public',
    nav_courses_visibility: 'public',
    nav_classrooms_visibility: 'public',
    nav_account_visibility: 'public',
    nav_content_creators_visibility: 'admins_and_creators',
  },
  restrictedNav: {
    id: 'settings-3',
    site_name: 'לודורה',
    maintenance_mode: false,
    subscription_system_enabled: true,
    nav_workshops_visibility: 'subscribers',
    nav_games_visibility: 'subscribers',
    nav_files_visibility: 'subscribers',
    nav_courses_visibility: 'subscribers',
    nav_classrooms_visibility: 'subscribers',
    nav_account_visibility: 'subscribers',
    nav_content_creators_visibility: 'admins_and_creators',
  },
};

// Mock workshops/products
export const mockWorkshops = [
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

// Mock registrations
export const mockRegistrations = [
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

// Helper functions for common test scenarios
export const testHelpers = {
  // Simulate form input
  fillInput: async (input, value) => {
    await userEvent.clear(input);
    await userEvent.type(input, value);
  },

  // Wait for async operations
  waitForLoadingToFinish: async () => {
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    });
  },

  // Check if element is visible and enabled
  expectElementToBeReady: (element) => {
    expect(element).toBeInTheDocument();
    expect(element).toBeVisible();
    if (element.tagName === 'BUTTON' || element.tagName === 'INPUT') {
      expect(element).toBeEnabled();
    }
  },

  // Mock API responses
  mockApiSuccess: (data) => ({
    ok: true,
    json: async () => data,
  }),

  mockApiError: (status, message) => ({
    ok: false,
    status,
    json: async () => ({ error: message }),
  }),
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { vi } from 'vitest';