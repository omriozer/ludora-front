// API Test Page - for testing the new API utility
import React, { useState } from 'react';
import { api, auth, handleApiError, ApiError } from '../utils/api.js';

function ApiTest() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message) => {
    setResults(prev => [...prev, { test, success, message, timestamp: new Date().toISOString() }]);
  };

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Test 1: Health check
      try {
        const health = await api.get('/health');
        addResult('Health Check', true, `Status: ${health.status}, Environment: ${health.environment}`);
      } catch (error) {
        addResult('Health Check', false, error.message);
      }

      // Test 2: Root endpoint
      try {
        const root = await api.get('/');
        addResult('Root Endpoint', true, `Message: ${root.message}`);
      } catch (error) {
        addResult('Root Endpoint', false, error.message);
      }

      // Test 3: Auth endpoint (should fail without token)
      try {
        await auth.me();
        addResult('Auth Check (no token)', false, 'Should have failed but succeeded');
      } catch (error) {
        if (error.status === 401) {
          addResult('Auth Check (no token)', true, 'Correctly failed with 401');
        } else {
          addResult('Auth Check (no token)', false, `Wrong error: ${error.message}`);
        }
      }

      // Test 4: 404 error handling
      try {
        await api.get('/non-existent');
        addResult('404 Error Handling', false, 'Should have failed but succeeded');
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) {
          addResult('404 Error Handling', true, 'Correctly caught 404 error');
        } else {
          addResult('404 Error Handling', false, `Wrong error type: ${error.constructor.name}`);
        }
      }

      // Test 5: Available routes endpoint
      try {
        const entities = await api.get('/entities/user');
        addResult('User Entity', true, `Found ${entities.length || 0} users`);
      } catch (error) {
        addResult('User Entity', false, error.message);
      }

    } catch (error) {
      addResult('Test Suite', false, `Test suite failed: ${error.message}`);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>🧪 API Utility Test Page</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={runTests}
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Running Tests...' : 'Run API Tests'}
        </button>
      </div>

      <div>
        <h2>Test Results:</h2>
        {results.length === 0 && !loading && (
          <p style={{ color: '#666' }}>Click "Run API Tests" to start testing</p>
        )}

        {results.map((result, index) => (
          <div
            key={index}
            style={{
              padding: '10px',
              margin: '5px 0',
              backgroundColor: result.success ? '#d4edda' : '#f8d7da',
              border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
              borderRadius: '4px'
            }}
          >
            <strong style={{ color: result.success ? '#155724' : '#721c24' }}>
              {result.success ? '✅' : '❌'} {result.test}
            </strong>
            <br />
            <span style={{ color: result.success ? '#155724' : '#721c24' }}>
              {result.message}
            </span>
            <br />
            <small style={{ color: '#666' }}>
              {new Date(result.timestamp).toLocaleTimeString()}
            </small>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h3>Environment Info:</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '10px' }}>
          <strong>Environment:</strong> <span>{import.meta.env.MODE}</span>
          <strong>API Base:</strong> <span>{import.meta.env.VITE_API_BASE || 'default'}</span>
          <strong>Dev Mode:</strong> <span>{import.meta.env.DEV ? 'Yes' : 'No'}</span>
          <strong>Build Mode:</strong> <span>{import.meta.env.PROD ? 'Production' : 'Development'}</span>
        </div>
      </div>
    </div>
  );
}

export default ApiTest;