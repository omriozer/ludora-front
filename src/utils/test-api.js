// Test script for the new API utility
import { api, auth, handleApiError, ApiError } from './api.js';

async function testApiUtility() {
  console.log('🧪 Testing API Utility...');

  try {
    // Test 1: Health check endpoint
    console.log('\n1️⃣ Testing health endpoint...');
    const healthResponse = await api.get('/health');
    console.log('✅ Health check:', healthResponse.status === 'healthy' ? 'PASS' : 'FAIL');

    // Test 2: Test unauthenticated endpoint (should work)
    console.log('\n2️⃣ Testing unauthenticated endpoint...');
    try {
      const response = await api.get('/');
      console.log('✅ Root endpoint:', response.message ? 'PASS' : 'FAIL');
    } catch (error) {
      console.log('❌ Root endpoint: FAIL -', error.message);
    }

    // Test 3: Test authenticated endpoint (should fail without token)
    console.log('\n3️⃣ Testing authenticated endpoint without token...');
    try {
      await auth.me();
      console.log('❌ Auth endpoint without token: FAIL - Should have failed');
    } catch (error) {
      if (error.status === 401) {
        console.log('✅ Auth endpoint without token: PASS - Correctly failed with 401');
      } else {
        console.log('❌ Auth endpoint without token: FAIL - Wrong error:', error.message);
      }
    }

    // Test 4: Test error handling
    console.log('\n4️⃣ Testing error handling...');
    try {
      await api.get('/non-existent-endpoint');
      console.log('❌ Error handling: FAIL - Should have failed');
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        console.log('✅ Error handling: PASS - Correctly caught 404 error');
      } else {
        console.log('❌ Error handling: FAIL - Wrong error type or status:', error);
      }
    }

    // Test 5: Test error message formatting
    console.log('\n5️⃣ Testing error message formatting...');
    const testError = new ApiError('Test error message', 400, [
      { field: 'email', message: 'Email is required' }
    ]);
    const errorMessage = handleApiError(testError);
    console.log('✅ Error formatting:', errorMessage.includes('Test error message') ? 'PASS' : 'FAIL');

    console.log('\n🎉 API utility tests completed!');

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }
}

// Export for use in dev tools
if (typeof window !== 'undefined') {
  window.testApiUtility = testApiUtility;
}

export default testApiUtility;