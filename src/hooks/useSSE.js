// hooks/useSSE.js
// Custom React hook for Socket.IO with SSE-compatible API for backward compatibility

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSocket } from '@/services/socketClient.js';
import { clog } from '@/services/apiClient.js';

/**
 * Connection States (backward compatible with SSE)
 */
export const SSE_CONNECTION_STATES = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
  PERMANENTLY_FAILED: 'permanently_failed'
};

/**
 * Default configuration for backward compatibility
 */
const DEFAULT_CONFIG = {
  // Basic settings for backward compatibility
  maxRetryAttempts: 15,
  initialRetryDelay: 500,
  maxRetryDelay: 20000,
  retryDelayMultiplier: 1.4,
  fastRetryThreshold: 3,

  // Connection settings
  heartbeatTimeout: 45000,
  connectionTimeout: 15000,

  // Connection quality monitoring
  connectionQualityCheck: true,
  qualityCheckInterval: 15000,
  maxMissedHeartbeats: 2,

  // Feature flags
  autoReconnect: true,
  pauseOnHidden: false,
  debugMode: false,

  // Channel management
  maxChannels: 50,

  // Error handling
  enableFallback: true,
  fallbackInterval: 5000,
  retryOnSpecificErrors: true,
  permanentFailureErrors: [401, 403, 404, 410]
};

/**
 * Socket.IO Hook with SSE-compatible API for backward compatibility
 * Uses Socket.IO internally but maintains the same interface as the original useSSE hook
 *
 * @param {Array} channels - Legacy SSE channels parameter (ignored, maintained for compatibility)
 * @param {Object} options - Configuration options
 * @returns {Object} Hook state and methods
 */
export function useSSE(channels = [], options = {}) {
  // Configuration for backward compatibility
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...options }), [
    options.debugMode,
    options.autoReconnect,
    options.maxRetryAttempts
  ]);

  // Get Socket.IO connection state and handlers
  const { connected, onLobbyUpdate } = useSocket();

  // Hook state - maintaining SSE-compatible interface
  const [connectionState, setConnectionState] = useState(SSE_CONNECTION_STATES.DISCONNECTED);
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [subscribedChannels, setSubscribedChannels] = useState([]);
  const [fallbackActive, setFallbackActive] = useState(false);

  // Connection quality monitoring state
  const [connectionQuality, setConnectionQuality] = useState('unknown');
  const [missedHeartbeats, setMissedHeartbeats] = useState(0);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState(null);

  // Event handlers registry for backward compatibility
  const eventHandlersRef = useRef(new Map());
  const isUnmountedRef = useRef(false);

  // Debug logging
  const debugLog = useCallback((message, data = null) => {
    if (config.debugMode) {
      clog(`[useSSE-SocketIO] ${message}`, data || '');
    }
  }, [config.debugMode]);


  // Map Socket.IO connection state to SSE-compatible state
  useEffect(() => {
    if (connected) {
      setConnectionState(SSE_CONNECTION_STATES.CONNECTED);
      setError(null);
      setRetryCount(0);
      setConnectionQuality('good');
      setLastHeartbeatTime(new Date());
      debugLog('Socket.IO connected');
    } else {
      setConnectionState(SSE_CONNECTION_STATES.DISCONNECTED);
      setConnectionQuality('unknown');
      debugLog('Socket.IO disconnected');
    }
  }, [connected, debugLog]);

  // Handle Socket.IO lobby updates and map them to SSE-style events
  useEffect(() => {
    if (!connected) return;

    const handleLobbyUpdate = (eventType, eventData) => {
      debugLog('Received Socket.IO event', { eventType, eventData });

      // Create SSE-compatible event object
      const sseEvent = {
        eventType,
        data: eventData,
        receivedAt: new Date(),
        id: Math.random().toString(36).slice(2, 11)
      };

      // Update last event state
      setLastEvent(sseEvent);

      // Call registered event handlers for specific event type
      if (eventHandlersRef.current.has(eventType)) {
        const handlers = eventHandlersRef.current.get(eventType);
        handlers.forEach(handler => {
          try {
            handler(sseEvent);
          } catch (handlerError) {
            debugLog('Error in event handler', handlerError);
          }
        });
      }

      // Call global event handlers
      if (eventHandlersRef.current.has('*')) {
        const globalHandlers = eventHandlersRef.current.get('*');
        globalHandlers.forEach(handler => {
          try {
            handler(sseEvent);
          } catch (handlerError) {
            debugLog('Error in global event handler', handlerError);
          }
        });
      }
    };

    // Subscribe to all Socket.IO lobby updates
    const unsubscribe = onLobbyUpdate('all', handleLobbyUpdate);

    return () => {
      unsubscribe?.();
    };
  }, [connected, onLobbyUpdate, debugLog]);

  // Simplified event handler methods for backward compatibility
  const addEventListener = useCallback((eventType, handler) => {
    if (!eventHandlersRef.current.has(eventType)) {
      eventHandlersRef.current.set(eventType, new Set());
    }
    eventHandlersRef.current.get(eventType).add(handler);

    // Return cleanup function
    return () => {
      const handlers = eventHandlersRef.current.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlersRef.current.delete(eventType);
        }
      }
    };
  }, []);

  const removeEventListener = useCallback((eventType, handler) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType);
      }
    }
  }, []);

  // Simplified connection methods for backward compatibility (no-ops since Socket.IO handles connection)
  const connect = useCallback(() => {
    debugLog('connect() called - using Socket.IO connection');
  }, [debugLog]);

  const disconnect = useCallback(() => {
    debugLog('disconnect() called - Socket.IO connection managed externally');
  }, [debugLog]);

  const reconnect = useCallback(() => {
    debugLog('reconnect() called - Socket.IO connection managed externally');
  }, [debugLog]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
    };
  }, []);

  // Return hook interface
  return {
    // Connection state
    connectionState,
    isConnected: connectionState === SSE_CONNECTION_STATES.CONNECTED,
    isConnecting: connectionState === SSE_CONNECTION_STATES.CONNECTING,
    isReconnecting: connectionState === SSE_CONNECTION_STATES.RECONNECTING,
    error,
    retryCount,
    subscribedChannels,
    fallbackActive,

    // ✅ NEW: Connection quality monitoring
    connectionQuality, // 'good', 'poor', 'unknown'
    missedHeartbeats,
    lastHeartbeatTime,

    // Latest event data
    lastEvent,

    // Connection methods
    connect,
    disconnect,
    reconnect,

    // Event handling
    addEventListener,
    removeEventListener,

    // Debug info
    debug: {
      config,
      eventHandlers: eventHandlersRef.current,
      authMethod: 'cookie-based-with-credentials',
      qualityMetrics: {
        connectionQuality,
        missedHeartbeats,
        lastHeartbeatTime
      }
    }
  };
}