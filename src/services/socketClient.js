// Socket.IO client service for real-time lobby updates
// Integrates with existing Ludora API and authentication patterns

import React from 'react';
import { io } from 'socket.io-client';
import { getApiBase } from '@/utils/api.js';
import { ludlog, luderror } from '@/lib/ludlog';
import {
  getPortalContext,
  CREDENTIAL_POLICY,
  PORTAL_TYPES,
  shouldUseAnonymousConnection,
  shouldAllowAuthenticatedConnection
} from '@/utils/portalContext.js';

/**
 * SocketClient - Singleton Socket.IO client for lobby updates
 * Replaces SSE system with bi-directional Socket.IO communication
 */
class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.listeners = new Map(); // Event listeners storage
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.lobbyUpdateChannel = 'lobby-updates'; // Fixed channel name

    // Portal context for authentication strategy
    this.portalContext = null;
    this.connectionAttempts = []; // Track different connection attempts
  }

  /**
   * Initialize Socket.IO connection with portal-aware authentication
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  async connect(options = {}) {
    if (this.socket && this.connected) {
      ludlog.api('🔌 Socket already connected');
      return Promise.resolve();
    }

    // Get portal context for authentication strategy
    try {
      this.portalContext = await getPortalContext();
    } catch (error) {
      luderror.api('🔌 Error getting portal context:', error);
      throw error;
    }

    return this.connectWithCredentialPolicy(this.portalContext, options);
  }

  /**
   * Connect with specific credential policy
   * @param {Object} portalContext - Portal context with credential policy
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  async connectWithCredentialPolicy(portalContext, options = {}) {
    const { credentialPolicy } = portalContext;

    switch (credentialPolicy) {
      case CREDENTIAL_POLICY.WITH_CREDENTIALS:
        return this.connectWithCredentials(portalContext, options);

      case CREDENTIAL_POLICY.WITHOUT_CREDENTIALS:
        return this.connectWithoutCredentials(portalContext, options);

      case CREDENTIAL_POLICY.TRY_BOTH:
        return this.connectWithFallback(portalContext, options);

      default:
        throw new Error(`Unknown credential policy: ${credentialPolicy}`);
    }
  }

  /**
   * Connect with credentials (Firebase authentication)
   * @param {Object} portalContext - Portal context
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  connectWithCredentials(portalContext, options = {}) {
    return this.createSocketConnection({
      withCredentials: true,
      auth: {
        portalType: portalContext.portalType,
        credentialPolicy: CREDENTIAL_POLICY.WITH_CREDENTIALS,
        studentsAccessMode: portalContext.studentsAccessMode,
        authMethod: portalContext.authMethod
      },
      ...options
    });
  }

  /**
   * Connect without credentials (anonymous/player session)
   * @param {Object} portalContext - Portal context
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  connectWithoutCredentials(portalContext, options = {}) {
    return this.createSocketConnection({
      withCredentials: false, // No cookies sent
      auth: {
        portalType: portalContext.portalType,
        credentialPolicy: CREDENTIAL_POLICY.WITHOUT_CREDENTIALS,
        studentsAccessMode: portalContext.studentsAccessMode,
        authMethod: portalContext.authMethod
      },
      ...options
    });
  }

  /**
   * Connect with fallback (try credentials first, then anonymous)
   * @param {Object} portalContext - Portal context
   * @param {Object} options - Connection options
   * @returns {Promise<void>}
   */
  async connectWithFallback(portalContext, options = {}) {
    try {
      // Try with credentials first
      await this.connectWithCredentials(portalContext, options);

    } catch (error) {
      try {
        // Fallback to anonymous connection
        await this.connectWithoutCredentials(portalContext, options);
      } catch (fallbackError) {
        throw fallbackError;
      }
    }
  }

  /**
   * Create Socket.IO connection with specified configuration
   * @param {Object} connectionConfig - Socket.IO connection configuration
   * @returns {Promise<void>}
   */
  createSocketConnection(connectionConfig) {
    return new Promise((resolve, reject) => {
      try {
        // Get base API URL and construct proper Socket.IO URL
        const apiBase = getApiBase();
        let socketUrl;

        if (apiBase === '/api') {
          // Development: Connect through same origin to preserve cookies
          // Socket.IO will use the current page's origin (localhost:5173)
          // and Vite will proxy WebSocket connections to the API server
          // This ensures cookies set on localhost:5173 are sent with the connection
          socketUrl = window.location.origin;
        } else {
          // Staging/Production: Use API domain but convert HTTP to WebSocket
          socketUrl = apiBase.replace('/api', '').replace('http://', 'ws://').replace('https://', 'wss://');
        }

        // Create Socket.IO client with portal-aware authentication
        this.socket = io(socketUrl, {
          transports: ['websocket', 'polling'], // Support both transports
          timeout: 5000,
          reconnection: true,
          reconnectionDelay: this.reconnectDelay,
          reconnectionAttempts: this.maxReconnectAttempts,
          ...connectionConfig
        });

        // Connection success handler
        this.socket.on('connect', () => {
          this.connected = true;
          this.reconnectAttempts = 0;

          // Auto-join lobby updates channel
          this.joinLobbyUpdates();

          // Notify listeners of successful connection
          this.notifyListeners('connect', { socketId: this.socket.id });

          resolve();
        });

        // Connection error handler
        this.socket.on('connect_error', (error) => {
          this.connected = false;
          luderror.api('❌ Socket connection failed:', error);
          reject(error);
        });

        // Disconnection handler
        this.socket.on('disconnect', (reason) => {
          this.connected = false;

          // Notify listeners of disconnection
          this.notifyListeners('disconnect', { reason });
        });

        // Reconnection handlers
        this.socket.on('reconnect', (attemptNumber) => {
          this.connected = true;
          this.reconnectAttempts = 0;

          // Re-join lobby updates channel
          this.joinLobbyUpdates();

          // Notify listeners of reconnection
          this.notifyListeners('reconnect', { attemptNumber });
        });

        this.socket.on('reconnect_attempt', (attemptNumber) => {
          this.reconnectAttempts = attemptNumber;
        });

        this.socket.on('reconnect_failed', () => {
          luderror.api('❌ Socket reconnection failed after', this.maxReconnectAttempts, { context: 'attempts' });

          // Notify listeners of reconnection failure
          this.notifyListeners('reconnect_failed', {});
        });

        // Setup lobby update listeners
        this.setupLobbyUpdateHandlers();

      } catch (error) {
        luderror.api('❌ Failed to initialize Socket.IO:', error);
        reject(error);
      }
    });
  }

  /**
   * Join the lobby updates channel to receive lobby events
   */
  joinLobbyUpdates() {
    if (!this.socket) {
      luderror.api('❌ Cannot join lobby updates: Socket not initialized');
      return;
    }

    this.socket.emit('join', this.lobbyUpdateChannel);
  }

  /**
   * Leave the lobby updates channel
   */
  leaveLobbyUpdates() {
    if (!this.socket) {
      luderror.api('❌ Cannot leave lobby updates: Socket not initialized');
      return;
    }

    this.socket.emit('leave', this.lobbyUpdateChannel);
  }

  /**
   * Setup handlers for lobby update events
   */
  setupLobbyUpdateHandlers() {
    if (!this.socket) return;

    // Listen for lobby updates
    this.socket.on('lobby:update', (eventData) => {
      // Notify registered listeners for general 'lobby:update' event
      this.notifyListeners('lobby:update', eventData);

      // Emit specific event types for easier component integration
      if (eventData.type) {
        this.notifyListeners(`lobby:${eventData.type}`, eventData.data);
      }
    });
  }

  /**
   * Subscribe to lobby update events
   * @param {string} eventType - Event type to listen for
   * @param {function} callback - Callback function
   * @returns {function} Unsubscribe function
   */
  onLobbyUpdate(eventType, callback) {
    if (typeof callback !== 'function') {
      luderror.api('❌ Callback must be a function');
      return () => {};
    }

    const listenerId = this.addListener(eventType, callback);

    // Return unsubscribe function
    return () => {
      this.removeListener(eventType, listenerId);
    };
  }

  /**
   * Add event listener
   * @param {string} eventType - Event type
   * @param {function} callback - Callback function
   * @returns {string} Listener ID
   */
  addListener(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Map());
    }

    const listenerId = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.listeners.get(eventType).set(listenerId, callback);

    return listenerId;
  }

  /**
   * Remove event listener
   * @param {string} eventType - Event type
   * @param {string} listenerId - Listener ID
   */
  removeListener(eventType, listenerId) {
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).delete(listenerId);

      // Clean up empty event type maps
      if (this.listeners.get(eventType).size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  /**
   * Notify all listeners of an event
   * @param {string} eventType - Event type
   * @param {any} data - Event data
   */
  notifyListeners(eventType, data) {
    if (!this.listeners.has(eventType)) return;

    const eventListeners = this.listeners.get(eventType);
    eventListeners.forEach((callback, listenerId) => {
      try {
        callback(data);
      } catch (error) {
        luderror.api(`❌ Error in listener ${listenerId} for event ${eventType}:`, error);
      }
    });
  }

  /**
   * Disconnect Socket.IO client
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.connected = false;
      this.listeners.clear();
    }
  }

  /**
   * Get current connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      connected: this.connected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      listenersCount: Array.from(this.listeners.values())
        .reduce((total, eventMap) => total + eventMap.size, 0)
    };
  }

  /**
   * Send test message to server (for debugging)
   * @param {string} message - Test message
   */
  sendTest(message = 'Frontend test message') {
    if (!this.socket || !this.connected) {
      luderror.api('❌ Cannot send test: Socket not connected');
      return;
    }

    this.socket.emit('test', { message, timestamp: new Date().toISOString() });
  }

  /**
   * Manually trigger lobby channel join (for debugging)
   */
  debugJoinLobby() {
    this.joinLobbyUpdates();
  }

  /**
   * Get current portal context
   * @returns {Object|null} Current portal context
   */
  getPortalContext() {
    return this.portalContext;
  }

  /**
   * Get detailed debug information including portal context
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    const status = this.getStatus();
    return {
      ...status,
      url: this.socket?.io?.uri || null,
      transport: this.socket?.io?.engine?.transport?.name || null,
      portalContext: this.portalContext,
      connectionAttempts: this.connectionAttempts,
      listeners: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([eventType, listenerMap]) => [
          eventType,
          Array.from(listenerMap.keys())
        ])
      )
    };
  }
}

// Create singleton instance
const socketClient = new SocketClient();

// React Hook for Socket.IO integration
export function useSocket() {
  const [status, setStatus] = React.useState(socketClient.getStatus());

  React.useEffect(() => {
    // Update status when connection changes
    const updateStatus = () => setStatus(socketClient.getStatus());

    const unsubscribeConnect = socketClient.onLobbyUpdate('connect', updateStatus);
    const unsubscribeDisconnect = socketClient.onLobbyUpdate('disconnect', updateStatus);
    const unsubscribeReconnect = socketClient.onLobbyUpdate('reconnect', updateStatus);

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeReconnect();
    };
  }, []);

  return {
    ...status,
    connect: socketClient.connect.bind(socketClient),
    disconnect: socketClient.disconnect.bind(socketClient),
    onLobbyUpdate: socketClient.onLobbyUpdate.bind(socketClient),
    sendTest: socketClient.sendTest.bind(socketClient),
    getDebugInfo: socketClient.getDebugInfo.bind(socketClient)
  };
}

// React Hook for Lobby Updates
export function useLobbyUpdates() {
  const [lobbies, setLobbies] = React.useState([]);
  const [lastUpdate, setLastUpdate] = React.useState(null);

  React.useEffect(() => {
    // Subscribe to lobby updates
    const unsubscribe = socketClient.onLobbyUpdate('lobby:update', (eventData) => {
      setLastUpdate({
        type: eventData.type,
        timestamp: eventData.timestamp,
        data: eventData.data
      });

      // Handle specific lobby events
      switch (eventData.type) {
        case 'lobby_created':
        case 'lobby_activated':
          setLobbies(prev => {
            const existingIndex = prev.findIndex(l => l.id === eventData.data.id);
            if (existingIndex >= 0) {
              // Update existing lobby
              const updated = [...prev];
              updated[existingIndex] = eventData.data;
              return updated;
            } else {
              // Add new lobby
              return [...prev, eventData.data];
            }
          });
          break;

        case 'lobby_closed':
          setLobbies(prev => prev.filter(l => l.id !== eventData.data.id));
          break;

        case 'session_created':
        case 'participant_joined':
        case 'participant_left':
        case 'game_state_updated':
        case 'session_started':
        case 'session_finished':
          // Update lobby with session changes
          if (eventData.data.lobby_id) {
            setLobbies(prev => prev.map(lobby =>
              lobby.id === eventData.data.lobby_id
                ? { ...lobby, lastSessionUpdate: eventData.data }
                : lobby
            ));
          }
          break;

        default:
          break;
      }
    });

    return unsubscribe;
  }, []);

  return {
    lobbies,
    lastUpdate,
    clearLobbies: () => setLobbies([]),
    updateLobby: (lobbyId, updates) => {
      setLobbies(prev => prev.map(lobby =>
        lobby.id === lobbyId ? { ...lobby, ...updates } : lobby
      ));
    }
  };
}

// Export singleton instance and utility functions
export default socketClient;

// Export specific lobby update event types for easy component integration
export const LOBBY_UPDATE_TYPES = {
  LOBBY_CREATED: 'lobby_created',
  LOBBY_ACTIVATED: 'lobby_activated',
  LOBBY_CLOSED: 'lobby_closed',
  SESSION_CREATED: 'session_created',
  PARTICIPANT_JOINED: 'participant_joined',
  PARTICIPANT_LEFT: 'participant_left',
  GAME_STATE_UPDATED: 'game_state_updated',
  SESSION_STARTED: 'session_started',
  SESSION_FINISHED: 'session_finished'
};

// Convenience functions for common lobby events
export const onLobbyCreated = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.LOBBY_CREATED, callback);
export const onLobbyActivated = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.LOBBY_ACTIVATED, callback);
export const onLobbyClosed = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.LOBBY_CLOSED, callback);
export const onSessionCreated = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.SESSION_CREATED, callback);
export const onParticipantJoined = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.PARTICIPANT_JOINED, callback);
export const onParticipantLeft = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.PARTICIPANT_LEFT, callback);
export const onGameStateUpdated = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.GAME_STATE_UPDATED, callback);
export const onSessionStarted = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.SESSION_STARTED, callback);
export const onSessionFinished = (callback) => socketClient.onLobbyUpdate(LOBBY_UPDATE_TYPES.SESSION_FINISHED, callback);