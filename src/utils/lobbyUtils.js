// utils/lobbyUtils.js
// Reusable lobby status utilities

/**
 * Compute lobby status based on expiration and manual closure
 * @param {Object} lobby - Lobby object with expires_at and closed_at fields
 * @returns {string} Computed status: 'pending', 'open', 'open_indefinitely', 'closed'
 */
export const computeLobbyStatus = (lobby) => {
  // Manual close takes precedence
  if (lobby.closed_at) return 'closed';

  // No expiration = pending activation
  if (!lobby.expires_at) return 'pending';

  const now = new Date();
  const expiration = new Date(lobby.expires_at);
  const hundredYearsFromNow = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());

  // Past expiration = closed
  if (expiration <= now) return 'closed';

  // ~100 years = indefinite
  if (expiration >= hundredYearsFromNow) return 'open_indefinitely';

  // Normal future date = open
  return 'open';
};

/**
 * Check if a lobby is considered active/joinable
 * Active statuses: 'open', 'open_indefinitely', 'pending'
 * @param {Object} lobby - Lobby object
 * @returns {boolean} True if lobby is active/joinable
 */
export const isLobbyActive = (lobby) => {
  const status = lobby.computed_status || computeLobbyStatus(lobby);
  return status === 'open' || status === 'open_indefinitely' || status === 'pending';
};

/**
 * Filter an array of lobbies to only return active ones
 * @param {Array} lobbies - Array of lobby objects
 * @returns {Array} Array of active lobbies only
 */
export const filterActiveLobbies = (lobbies) => {
  return lobbies.filter(isLobbyActive);
};

/**
 * Get lobby status configuration for UI display
 * @param {Object} lobby - Lobby object
 * @returns {Object} Status config with color, text, icon, timeInfo
 */
export const getLobbyStatusConfig = (lobby) => {
  const status = lobby.computed_status || computeLobbyStatus(lobby);
  const now = new Date();

  switch (status) {
    case 'pending':
      return {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        text: 'ממתין להפעלה',
        icon: 'Clock',
        timeInfo: null
      };
    case 'open':
      if (lobby.expires_at) {
        const timeRemaining = Math.ceil((new Date(lobby.expires_at) - now) / (1000 * 60)); // minutes
        const hours = Math.floor(timeRemaining / 60);
        const minutes = timeRemaining % 60;
        return {
          color: 'bg-green-100 text-green-700 border-green-200',
          text: 'פתוח להרשמה',
          icon: 'Play',
          timeInfo: hours > 0 ? `${hours}ש ${minutes}ד נותרו` : `${minutes}ד נותרו`
        };
      }
      return {
        color: 'bg-green-100 text-green-700 border-green-200',
        text: 'פתוח להרשמה',
        icon: 'Play',
        timeInfo: null
      };
    case 'open_indefinitely':
      return {
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        text: 'פתוח ללא הגבלת זמן',
        icon: 'Play',
        timeInfo: null
      };
    case 'closed':
    default:
      return {
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        text: 'סגור',
        icon: 'Square',
        timeInfo: null
      };
  }
};

/**
 * Find the most appropriate active lobby from a list
 * Prioritizes: open > open_indefinitely > pending
 * @param {Array} lobbies - Array of lobby objects
 * @returns {Object|null} Most appropriate active lobby or null
 */
export const findBestActiveLobby = (lobbies) => {
  if (!lobbies || !lobbies.length) return null;

  const activeLobbies = filterActiveLobbies(lobbies);
  if (activeLobbies.length === 0) return null;

  // Priority order: open -> open_indefinitely -> pending
  const openLobby = activeLobbies.find(lobby => {
    const status = lobby.computed_status || computeLobbyStatus(lobby);
    return status === 'open';
  });

  const openIndefinitelyLobby = activeLobbies.find(lobby => {
    const status = lobby.computed_status || computeLobbyStatus(lobby);
    return status === 'open_indefinitely';
  });

  const pendingLobby = activeLobbies.find(lobby => {
    const status = lobby.computed_status || computeLobbyStatus(lobby);
    return status === 'pending';
  });

  return openLobby || openIndefinitelyLobby || pendingLobby;
};

/**
 * Find the most recent lobby regardless of status
 * Prioritizes active lobbies, then falls back to most recent
 * @param {Array} lobbies - Array of lobby objects
 * @returns {Object|null} Most recent lobby or null
 */
export const findMostRecentLobby = (lobbies) => {
  if (!lobbies || !lobbies.length) return null;

  const activeLobby = findBestActiveLobby(lobbies);
  return activeLobby || lobbies[0]; // Assuming lobbies are sorted by recency
};