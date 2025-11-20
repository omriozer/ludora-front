// hooks/useSSE.js
// Custom React hook for Server-Sent Events (SSE) with advanced reconnection logic

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getApiBase } from '@/utils/api.js';
import { apiRequest } from '@/services/apiClient.js';

/**
 * SSE Connection States
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
 * Default configuration for SSE connections
 */
const DEFAULT_CONFIG = {
  // Reconnection settings
  maxRetryAttempts: 15,         // ✅ IMPROVED: More retry attempts for better reliability
  initialRetryDelay: 500,       // ✅ IMPROVED: Faster initial retry (500ms instead of 1s)
  maxRetryDelay: 20000,         // ✅ IMPROVED: Reduced max delay (20s instead of 30s)
  retryDelayMultiplier: 1.4,    // ✅ IMPROVED: Slightly more aggressive backoff
  fastRetryThreshold: 3,        // ✅ NEW: Use faster retries for first 3 attempts

  // Connection health settings
  heartbeatTimeout: 45000,      // ✅ IMPROVED: Reduced from 60s to 45s (server sends every 30s)
  connectionTimeout: 12000,     // ✅ IMPROVED: Much faster connection timeout (12s instead of 60s)

  // ✅ NEW: Connection quality monitoring
  connectionQualityCheck: true, // Enable connection quality monitoring
  qualityCheckInterval: 15000,  // Check connection quality every 15 seconds
  maxMissedHeartbeats: 2,       // Trigger reconnection after 2 missed heartbeats

  // Feature flags
  autoReconnect: true,
  pauseOnHidden: false,         // Disable in development (too aggressive with dev tools open)
  debugMode: false,             // Debug mode for development only

  // Channel management
  maxChannels: 50,              // Prevent subscription abuse

  // Error handling
  enableFallback: true,         // Enable fallback to polling if needed
  fallbackInterval: 5000,       // 5 seconds polling interval

  // ✅ NEW: Enhanced error handling
  retryOnSpecificErrors: true,  // Retry on specific network errors
  permanentFailureErrors: [     // Don't retry on these HTTP status codes
    401, 403, 404, 410          // Authentication, authorization, not found, gone
  ]
};

/**
 * Advanced SSE Hook with reconnection, error handling, and channel management
 *
 * @param {Array<string>} channels - Array of channels to subscribe to
 * @param {Object} options - Configuration options
 * @returns {Object} Hook state and methods
 */
export function useSSE(channels = [], options = {}) {
  // Recalculate config only for essential changes - avoid dynamic sessionContext properties
  const config = useMemo(() => ({ ...DEFAULT_CONFIG, ...options }), [
    options.debugMode,
    options.autoReconnect,
    options.maxRetryAttempts,
    options.sessionContext?.gameId
    // Note: Removed dynamic sessionContext properties to prevent unnecessary reconnections
    // lobbyId, sessionId, etc. are sent as URL params but don't require config recalculation
  ]);

  // Hook state
  const [connectionState, setConnectionState] = useState(SSE_CONNECTION_STATES.DISCONNECTED);
  const [lastEvent, setLastEvent] = useState(null);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [subscribedChannels, setSubscribedChannels] = useState([]);
  const [fallbackActive, setFallbackActive] = useState(false);

  // ✅ NEW: Connection quality monitoring state
  const [connectionQuality, setConnectionQuality] = useState('unknown'); // 'good', 'poor', 'unknown'
  const [missedHeartbeats, setMissedHeartbeats] = useState(0);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState(null);

  // Refs for managing connection and timers
  const eventSourceRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const heartbeatTimeoutRef = useRef(null);
  const connectionTimeoutRef = useRef(null);
  const fallbackIntervalRef = useRef(null);
  const qualityCheckIntervalRef = useRef(null); // ✅ NEW: Connection quality monitoring timer
  const isUnmountedRef = useRef(false);
  const currentRetryDelayRef = useRef(config.initialRetryDelay);
  const isConnectingRef = useRef(false); // Prevent multiple concurrent connection attempts

  // Event handlers registry
  const eventHandlersRef = useRef(new Map());

  // Ref to store scheduleReconnect function for heartbeat timeout
  const scheduleReconnectRef = useRef(null);

  // Debug logging
  const debugLog = useCallback((message, data = null) => {
    if (config.debugMode) {
      console.log(`[SSE] ${message}`, data || '');
    }
  }, [config.debugMode]);


  // Clear all timers
  const clearTimers = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }
    // ✅ NEW: Clear connection quality monitoring timer
    if (qualityCheckIntervalRef.current) {
      clearInterval(qualityCheckIntervalRef.current);
      qualityCheckIntervalRef.current = null;
    }
  }, []);

  // Reset heartbeat timer with connection quality monitoring
  const resetHeartbeat = useCallback(() => {
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }

    // ✅ IMPROVED: Update heartbeat tracking and connection quality
    const now = new Date();
    setLastHeartbeatTime(now);
    setMissedHeartbeats(0); // Reset missed heartbeats on successful heartbeat
    setConnectionQuality('good'); // Mark connection as good when heartbeat received

    // Read current config to avoid dependency issues
    const currentConfig = configRef.current;
    heartbeatTimeoutRef.current = setTimeout(() => {
      debugLog('Heartbeat timeout - connection appears dead');

      // ✅ IMPROVED: Track missed heartbeats for quality monitoring
      setMissedHeartbeats(prev => {
        const newCount = prev + 1;

        // Update connection quality based on missed heartbeats
        if (newCount >= currentConfig.maxMissedHeartbeats) {
          setConnectionQuality('poor');
          debugLog(`Connection quality poor: ${newCount} missed heartbeats`);
        } else {
          setConnectionQuality('poor');
          debugLog(`Connection quality degrading: ${newCount} missed heartbeats`);
        }

        return newCount;
      });

      const latestConfig = configRef.current;
      if (latestConfig.autoReconnect && !isUnmountedRef.current && !isConnectingRef.current) {
        // Force a reconnection by calling connect directly to avoid hoisting issues
        setConnectionState(SSE_CONNECTION_STATES.ERROR);
        setError(new Error(`Connection lost - missed ${latestConfig.maxMissedHeartbeats} heartbeats`));
        // Schedule reconnection instead of calling reconnect directly
        scheduleReconnectRef.current?.();
      }
    }, currentConfig.heartbeatTimeout);
  }, [debugLog]); // Remove reconnect dependency to avoid hoisting issues

  // Build SSE URL with channels and session context (cookies handle authentication)
  // Use ref to avoid recreating connect function when config changes
  const configRef = useRef(config);
  configRef.current = config;

  const buildSSEUrl = useCallback(() => {
    // Read current config to avoid dependency issues
    const currentConfig = configRef.current;

    let baseUrl;

    if (import.meta.env.DEV) {
      // Development: Use direct connection to bypass Vite proxy SSE buffering issues
      // Use same port detection logic as api.js for consistency
      const port = import.meta.env.VITE_API_PORT || '3003';
      baseUrl = `http://localhost:${port}/api/sse/events`;
      debugLog('Development: Using direct API connection to bypass Vite proxy', baseUrl);
      debugLog('Development: Using port from VITE_API_PORT or fallback', port);
    } else {
      // In production, use direct connection
      const apiBase = getApiBase();
      baseUrl = `${apiBase}/sse/events`;
      debugLog('Production: Direct SSE connection', baseUrl);
    }

    const validChannels = channels.filter(ch => typeof ch === 'string' && ch.trim());
    const params = new URLSearchParams();

    // Add channels if any
    if (validChannels.length > 0) {
      const channelParams = validChannels.slice(0, currentConfig.maxChannels).join(',');
      params.set('channels', channelParams);
    }

    // Debug: Log session context being used
    debugLog('Session context in buildSSEUrl:', currentConfig.sessionContext);

    // Add session context parameters if provided in config
    if (currentConfig.sessionContext) {
      const ctx = currentConfig.sessionContext;

      debugLog('Processing session context parameters:', {
        gameId: ctx.gameId,
        lobbyId: ctx.lobbyId,
        sessionId: ctx.sessionId,
        isLobbyOwner: ctx.isLobbyOwner,
        isActiveParticipant: ctx.isActiveParticipant,
        priorityHint: ctx.priorityHint
      });

      debugLog('Parameter validation before URL building:', {
        'gameId defined': !!ctx.gameId,
        'lobbyId defined': !!ctx.lobbyId,
        'sessionId defined': !!ctx.sessionId,
        'isLobbyOwner value': ctx.isLobbyOwner,
        'isActiveParticipant value': ctx.isActiveParticipant,
        'priorityHint defined': !!ctx.priorityHint
      });

      // Add lobby and session identifiers (only if they have actual values)
      if (ctx.gameId && ctx.gameId !== 'undefined') {
        params.set('game_id', ctx.gameId);
        debugLog('Added game_id parameter:', ctx.gameId);
      }
      if (ctx.lobbyId && ctx.lobbyId !== 'undefined') {
        params.set('lobby_id', ctx.lobbyId);
        debugLog('Added lobby_id parameter:', ctx.lobbyId);
      }
      if (ctx.sessionId && ctx.sessionId !== 'undefined') {
        params.set('session_id', ctx.sessionId);
        debugLog('Added session_id parameter:', ctx.sessionId);
      }

      // Add boolean flags (only if explicitly true)
      if (ctx.isLobbyOwner === true) {
        params.set('is_lobby_owner', 'true');
        debugLog('Added is_lobby_owner parameter: true');
      }
      if (ctx.isActiveParticipant === true) {
        params.set('is_active_participant', 'true');
        debugLog('Added is_active_participant parameter: true');
      }

      // Add priority hint if provided
      if (ctx.priorityHint && ctx.priorityHint !== 'undefined') {
        params.set('priority_hint', ctx.priorityHint);
        debugLog('Added priority_hint parameter:', ctx.priorityHint);
      }
    } else {
      debugLog('No session context provided in config');
    }

    // Note: Authentication is handled via httpOnly cookies
    // Cross-origin requests (e.g., ludora.app → api.ludora.app) require withCredentials: true
    // Same-origin requests work automatically

    const queryString = params.toString();
    const finalUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    debugLog('Built SSE URL:', finalUrl);
    debugLog('Query parameters:', queryString);

    return finalUrl;
  }, [channels, debugLog]); // Remove config dependencies to prevent recreation

  // Handle incoming SSE events
  const handleSSEEvent = useCallback((event) => {
    // CRITICAL DEBUG: Log ALL events received (always log, not just in debug mode)
    console.log('🎯 [SSE] Received SSE event:', {
      type: event.type,
      data: event.data,
      timestamp: new Date().toISOString()
    });

    debugLog('Received SSE event', { type: event.type, data: event.data });

    try {
      // Parse event data
      let parsedData;
      try {
        parsedData = JSON.parse(event.data);
        console.log('🎯 [SSE] Parsed event data:', parsedData);
      } catch (parseError) {
        console.error('🎯 [SSE] Failed to parse event data:', parseError, 'Raw data:', event.data);
        debugLog('Failed to parse event data', parseError);
        return;
      }

      // Handle meta events
      if (parsedData.eventType === 'meta:heartbeat') {
        debugLog('Received heartbeat');
        resetHeartbeat();
        return;
      }

      if (parsedData.eventType === 'connection:established') {
        console.log('🎯 [SSE] Processing connection:established event:', parsedData.data);
        debugLog('Connection established', parsedData.data);
        console.log('🎯 [SSE] Setting connection state to CONNECTED');
        isConnectingRef.current = false; // Reset connecting flag on successful connection
        setConnectionState(SSE_CONNECTION_STATES.CONNECTED);
        setSubscribedChannels(parsedData.data.subscribedChannels || []);
        setRetryCount(0);
        setError(null);
        setFallbackActive(false);
        currentRetryDelayRef.current = config.initialRetryDelay;
        resetHeartbeat();
        console.log('🎯 [SSE] Connection established processing complete');
        return;
      }

      if (parsedData.eventType === 'connection:closing') {
        debugLog('Server closing connection', parsedData.data);
        return;
      }

      // Update last event state
      setLastEvent({
        ...parsedData,
        receivedAt: new Date(),
        id: Math.random().toString(36).slice(2, 11)
      });

      // Call registered event handlers
      if (eventHandlersRef.current.has(parsedData.eventType)) {
        const handlers = eventHandlersRef.current.get(parsedData.eventType);
        handlers.forEach(handler => {
          try {
            handler(parsedData);
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
            handler(parsedData);
          } catch (handlerError) {
            debugLog('Error in global event handler', handlerError);
          }
        });
      }

      resetHeartbeat();

    } catch (error) {
      debugLog('Error handling SSE event', error);
    }
  }, [resetHeartbeat, debugLog]);


  // Connect to SSE endpoint
  const connect = useCallback(async () => {
    console.log('🚀 [useSSE] connect() function called, isUnmounted:', isUnmountedRef.current);

    if (isUnmountedRef.current) {
      console.log('❌ [useSSE] connect() aborted - component unmounted');
      return;
    }

    // Prevent multiple concurrent connection attempts
    if (isConnectingRef.current) {
      console.log('⏸️ [useSSE] connect() aborted - already connecting');
      return;
    }

    console.log('✅ [useSSE] connect() proceeding...');
    isConnectingRef.current = true;
    // Read current config to avoid dependency issues
    const currentConfig = configRef.current;
    debugLog('Attempting to connect to SSE');
    setConnectionState(SSE_CONNECTION_STATES.CONNECTING);
    setError(null);

    try {
      // Build SSE URL (authentication via cookies)
      const sseUrl = buildSSEUrl();
      debugLog('Connecting to SSE URL with cookie-based authentication');

      // Create EventSource (now same-origin in both dev and prod)
      debugLog('Creating native EventSource...');

      // Check if EventSource is supported
      if (typeof EventSource === 'undefined') {
        throw new Error('EventSource is not supported in this browser');
      }

      console.log('🎯 [SSE] About to create EventSource with URL:', sseUrl);

      // Detect if this is a cross-origin request based on actual URLs
      const currentOrigin = window.location.origin;
      const sseOrigin = new URL(sseUrl).origin;
      const isCrossOrigin = currentOrigin !== sseOrigin;

      console.log('🎯 [SSE] Cross-origin detection:', {
        currentOrigin,
        sseOrigin,
        isCrossOrigin,
        isDevelopment: import.meta.env.DEV
      });

      // Create EventSource (credentials are automatically included for both same-origin and cross-origin
      // when the server responds with Access-Control-Allow-Credentials: true)
      // EventSource API doesn't have a withCredentials option like XMLHttpRequest
      const eventSource = new EventSource(sseUrl);

      console.log('🎯 [SSE] EventSource created with options:', {
        url: sseUrl,
        credentialsMode: 'automatic', // Credentials included automatically for cross-origin when CORS allows
        isDevelopment: import.meta.env.DEV
      });

      eventSourceRef.current = eventSource;
      console.log('🎯 [SSE] EventSource created:', {
        url: sseUrl,
        viaProxy: import.meta.env.DEV
      });

      // Immediate status check
      setTimeout(() => {
        console.log('🎯 [SSE] Immediate EventSource status after creation:', {
          readyState: eventSource.readyState,
          url: eventSource.url
        });
      }, 10);

      console.log('🎯 [SSE] EventSource created:', {
        readyState: eventSource.readyState,
        url: sseUrl,
        constants: {
          CONNECTING: EventSource.CONNECTING || 0,
          OPEN: EventSource.OPEN || 1,
          CLOSED: EventSource.CLOSED || 2
        }
      });

      debugLog('EventSource created:', {
        readyState: eventSource.readyState,
        constants: {
          CONNECTING: EventSource.CONNECTING || 0,
          OPEN: EventSource.OPEN || 1,
          CLOSED: EventSource.CLOSED || 2
        }
      });

      // Monitor EventSource status periodically for debugging
      const statusMonitor = setInterval(() => {
        console.log('🎯 [SSE] EventSource status check:', {
          readyState: eventSource.readyState,
          url: eventSource.url,
          status: eventSource.readyState === 0 ? 'CONNECTING' :
                  eventSource.readyState === 1 ? 'OPEN' :
                  eventSource.readyState === 2 ? 'CLOSED' : 'UNKNOWN'
        });

        // Clear monitor after 30 seconds or when connected
        if (eventSource.readyState === 1 || eventSource.readyState === 2) {
          clearInterval(statusMonitor);
        }
      }, 2000); // Check every 2 seconds

      // Clear monitor after 30 seconds max
      setTimeout(() => clearInterval(statusMonitor), 30000);

      // Set connection timeout with better error messaging
      connectionTimeoutRef.current = setTimeout(() => {
        const timeoutError = new Error(`SSE connection timeout after ${currentConfig.connectionTimeout}ms. Check if API server is running on the configured port.`);
        debugLog('Connection timeout - API server may not be running on configured port', {
          configuredUrl: sseUrl,
          timeoutDuration: currentConfig.connectionTimeout
        });

        eventSource.close();
        isConnectingRef.current = false; // Reset connecting flag on timeout
        if (!isUnmountedRef.current) {
          setConnectionState(SSE_CONNECTION_STATES.ERROR);
          setError(timeoutError);
          if (currentConfig.autoReconnect) {
            scheduleReconnect();
          }
        }
      }, currentConfig.connectionTimeout);

      // Setup event listeners
      eventSource.onopen = () => {
        console.log('🎯 [SSE] EventSource.onopen triggered - connection opened!', {
          readyState: eventSource.readyState,
          url: eventSource.url
        });
        debugLog('SSE connection opened');
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }
        // Wait for connection:established event to set as connected
      };

      eventSource.onmessage = handleSSEEvent;

      eventSource.onerror = () => {
        const errorDetails = {
          readyState: eventSource.readyState,
          url: eventSource.url,
          configuredUrl: sseUrl,
          timestamp: new Date().toISOString()
        };

        console.error('🎯 [SSE] EventSource.onerror triggered - connection error!', errorDetails);
        debugLog('SSE connection error', errorDetails);

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        if (!isUnmountedRef.current) {
          let errorMessage = 'SSE connection error';

          if (eventSource.readyState === EventSource.CLOSED) {
            console.error('🎯 [SSE] Connection is CLOSED, setting error state');
            isConnectingRef.current = false; // Reset connecting flag on error

            // Provide helpful error message based on likely causes
            if (retryCount === 0) {
              // First connection attempt failed - likely port mismatch or server not running
              errorMessage = `Failed to connect to SSE endpoint at ${sseUrl}. Check if API server is running on the correct port.`;
            } else {
              errorMessage = 'SSE connection closed unexpectedly';
            }

            setConnectionState(SSE_CONNECTION_STATES.ERROR);
            setError(new Error(errorMessage));

            if (currentConfig.autoReconnect) {
              scheduleReconnect();
            } else if (currentConfig.enableFallback) {
              startFallback();
            }
          } else {
            console.log('🎯 [SSE] Connection error but not CLOSED, readyState:', eventSource.readyState);
          }
        }
      };

    } catch (error) {
      const enhancedError = new Error(`Failed to create SSE connection: ${error.message}. Check if EventSource is supported and API server is accessible.`);
      debugLog('Failed to create SSE connection', { error, sseUrl: buildSSEUrl() });
      isConnectingRef.current = false; // Reset connecting flag on exception
      setConnectionState(SSE_CONNECTION_STATES.ERROR);
      setError(enhancedError);

      const currentConfig = configRef.current;
      if (!isUnmountedRef.current && currentConfig.autoReconnect) {
        scheduleReconnect();
      }
    }
  }, [buildSSEUrl, handleSSEEvent, debugLog]); // Remove config dependency to prevent recreation

  // Schedule reconnection with improved retry strategy
  const scheduleReconnect = useCallback(() => {
    if (isUnmountedRef.current) return;

    setRetryCount(prev => {
      const newCount = prev + 1;
      // Read current config to avoid dependency issues
      const currentConfig = configRef.current;

      // Check if max retries exceeded
      if (newCount >= currentConfig.maxRetryAttempts) {
        debugLog('Max retry attempts exceeded');
        setConnectionState(SSE_CONNECTION_STATES.PERMANENTLY_FAILED);
        setError(new Error(`Failed to connect after ${currentConfig.maxRetryAttempts} attempts. Please check your network connection and try again.`));
        isConnectingRef.current = false; // Reset connecting flag
        setConnectionQuality('poor'); // Mark connection quality as poor

        if (currentConfig.enableFallback) {
          startFallback();
        }

        return newCount;
      }

      // ✅ IMPROVED: Fast retry strategy for initial attempts
      let delay;
      if (newCount <= currentConfig.fastRetryThreshold) {
        // Use faster, fixed delay for first few attempts (better UX)
        delay = currentConfig.initialRetryDelay;
        debugLog(`Fast retry attempt ${newCount}/${currentConfig.fastRetryThreshold} in ${delay}ms`);
      } else {
        // Use exponential backoff for subsequent attempts
        delay = Math.min(
          currentRetryDelayRef.current,
          currentConfig.maxRetryDelay
        );
        debugLog(`Exponential backoff retry attempt ${newCount} in ${delay}ms`);
      }

      // ✅ IMPROVED: Better user feedback during retry process
      setError(new Error(`Connection failed. Retrying... (attempt ${newCount}/${currentConfig.maxRetryAttempts})`));
      setConnectionState(SSE_CONNECTION_STATES.RECONNECTING);
      setConnectionQuality('unknown'); // Reset quality during reconnection

      retryTimeoutRef.current = setTimeout(() => {
        if (!isUnmountedRef.current) {
          connect();
        }
      }, delay);

      // ✅ IMPROVED: Only update delay after fast retry threshold
      if (newCount > currentConfig.fastRetryThreshold) {
        currentRetryDelayRef.current = Math.min(
          currentRetryDelayRef.current * currentConfig.retryDelayMultiplier,
          currentConfig.maxRetryDelay
        );
      }

      return newCount;
    });
  }, [connect, debugLog]); // Remove config dependency

  // Set up scheduleReconnectRef for heartbeat timeout usage
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // Reconnect manually (resets retry count)
  const reconnect = useCallback(() => {
    debugLog('Manual reconnection requested');

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    clearTimers();
    setRetryCount(0);
    setFallbackActive(false);
    // Read current config to avoid dependency issues
    const currentConfig = configRef.current;
    currentRetryDelayRef.current = currentConfig.initialRetryDelay;

    connect();
  }, [connect, clearTimers, debugLog]); // Remove config dependency

  // Disconnect from SSE
  const disconnect = useCallback(() => {
    debugLog('Disconnecting from SSE');

    setConnectionState(SSE_CONNECTION_STATES.DISCONNECTED);
    clearTimers();

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setError(null);
    setRetryCount(0);
    setFallbackActive(false);
    // Read current config to avoid dependency issues
    const currentConfig = configRef.current;
    currentRetryDelayRef.current = currentConfig.initialRetryDelay;
  }, [clearTimers, debugLog]); // Remove config dependency

  // Start fallback polling (if SSE completely fails)
  const startFallback = useCallback(() => {
    // Read current config to avoid dependency issues
    const currentConfig = configRef.current;
    if (!currentConfig.enableFallback || fallbackIntervalRef.current) return;

    debugLog('Starting fallback polling');
    setFallbackActive(true);

    fallbackIntervalRef.current = setInterval(() => {
      // Placeholder for fallback polling logic
      // This would typically call specific API endpoints to get updates
      debugLog('Fallback polling tick (not implemented yet)');
    }, currentConfig.fallbackInterval);
  }, [debugLog]); // Remove config dependencies

  // Add event handler for specific event type
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

  // Remove event handler
  const removeEventListener = useCallback((eventType, handler) => {
    const handlers = eventHandlersRef.current.get(eventType);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        eventHandlersRef.current.delete(eventType);
      }
    }
  }, []);

  // Handle page visibility changes
  useEffect(() => {
    // Read current config to avoid dependency issues
    const currentConfig = configRef.current;
    if (!currentConfig.pauseOnHidden) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        debugLog('Page hidden - pausing SSE connection');
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
          eventSourceRef.current = null;
        }
        clearTimers();
      } else {
        debugLog('Page visible - resuming SSE connection');
        const latestConfig = configRef.current;
        if (latestConfig.autoReconnect) {
          connect();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connect, clearTimers, debugLog]); // Remove config dependencies

  // Extract stable gameId and debugMode to prevent reconnections when config object changes
  const gameId = options.sessionContext?.gameId;
  const debugMode = options.debugMode;

  // Auto-connect on mount or channel/config changes
  useEffect(() => {
    // Reset unmounted flag since effect is running (component is mounted)
    isUnmountedRef.current = false;

    console.log('🔄 [useSSE] Effect triggered - channels or gameId changed:', {
      channels: channels,
      gameId: gameId,
      debugMode: debugMode
    });

    console.log('🔄 [useSSE] About to call connect() for channels:', channels);

    if (channels.length > 0) {
      connect();
    }

    return () => {
      console.log('🧹 [useSSE] Effect cleanup function running - will disconnect');
      // Don't set isUnmountedRef.current = true here - that's only for actual component unmounting
      // This cleanup is just for reconnecting with new sessionContext
      disconnect();
    };
  }, [
    channels.join(','),
    // Only reconnect for core changes that require a new connection
    gameId, // Use extracted gameId instead of config.sessionContext?.gameId
    // Note: Removed lobbyId, sessionId and other dynamic properties to prevent rapid reconnections
    // These are sent as URL parameters but don't require reconnection when they change
    debugMode // Use extracted debugMode to prevent config object recreation from triggering reconnections
    // Removed connect, disconnect from dependencies to prevent recreation loops
  ]); // Minimal dependencies to prevent unnecessary reconnections

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      disconnect();
    };
  }, [disconnect]);

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