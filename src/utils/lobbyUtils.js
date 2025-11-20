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
 * Check if a lobby is considered active for management
 * Active statuses: 'open', 'open_indefinitely', 'pending' (teachers can manage all these)
 * @param {Object} lobby - Lobby object
 * @returns {boolean} True if lobby is active for management
 */
export const isLobbyActive = (lobby) => {
  // Use backend-computed status first (for anonymous users), fallback to frontend computation
  const status = lobby.status || lobby.computed_status || computeLobbyStatus(lobby);
  return status === 'open' || status === 'open_indefinitely' || status === 'pending';
};

/**
 * Check if a lobby is actually joinable by students
 * Joinable statuses: 'open', 'open_indefinitely' (matches backend validation)
 * @param {Object} lobby - Lobby object
 * @returns {boolean} True if students can actually join this lobby
 */
export const isLobbyJoinable = (lobby) => {
  // Use backend-computed status first (for anonymous users), fallback to frontend computation
  const status = lobby.status || lobby.computed_status || computeLobbyStatus(lobby);
  return status === 'open' || status === 'open_indefinitely';
};

/**
 * Filter an array of lobbies to only return active ones (for management)
 * @param {Array} lobbies - Array of lobby objects
 * @returns {Array} Array of active lobbies only
 */
export const filterActiveLobbies = (lobbies) => {
  return lobbies.filter(isLobbyActive);
};

/**
 * Filter an array of lobbies to only return joinable ones (for students)
 * @param {Array} lobbies - Array of lobby objects
 * @returns {Array} Array of joinable lobbies only
 */
export const filterJoinableLobbies = (lobbies) => {
  return lobbies.filter(isLobbyJoinable);
};

/**
 * Get lobby status configuration for UI display
 * @param {Object} lobby - Lobby object
 * @returns {Object} Status config with color, text, icon, timeInfo
 */
export const getLobbyStatusConfig = (lobby) => {
  const status = lobby.status || lobby.computed_status || computeLobbyStatus(lobby);

  switch (status) {
    case 'pending':
      return {
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        text: 'ממתין להפעלה',
        icon: 'Clock',
        timeInfo: getLobbyClosureTimeText(lobby)
      };
    case 'open':
      return {
        color: 'bg-green-100 text-green-700 border-green-200',
        text: 'פתוח להרשמה',
        icon: 'Play',
        timeInfo: getLobbyClosureTimeText(lobby)
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
 * Find the best joinable lobby from a list (for students)
 * Prioritizes: open > open_indefinitely (excludes pending)
 * @param {Array} lobbies - Array of lobby objects
 * @returns {Object|null} Best joinable lobby or null
 */
export const findBestJoinableLobby = (lobbies) => {
  if (!lobbies || !lobbies.length) return null;

  const joinableLobbies = filterJoinableLobbies(lobbies);
  if (joinableLobbies.length === 0) return null;

  // Priority order: open -> open_indefinitely
  const openLobby = joinableLobbies.find(lobby => {
    const status = lobby.status || lobby.computed_status || computeLobbyStatus(lobby);
    return status === 'open';
  });

  const openIndefinitelyLobby = joinableLobbies.find(lobby => {
    const status = lobby.status || lobby.computed_status || computeLobbyStatus(lobby);
    return status === 'open_indefinitely';
  });

  return openLobby || openIndefinitelyLobby;
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

/**
 * Get formatted text for when a lobby will close
 * @param {Object} lobby - Lobby object with expires_at field
 * @returns {string|null} Formatted closure time text in Hebrew, or null if no expiration
 */
export const getLobbyClosureTimeText = (lobby) => {
  if (!lobby.expires_at) return null;
  const baseText = 'המשחק יסגר';
  const now = new Date();
  const expiration = new Date(lobby.expires_at);
  const hundredYearsFromNow = new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());

  // Check if it's indefinite (~100 years)
  if (expiration >= hundredYearsFromNow) return null;

  // Check if already closed
  if (expiration <= now) return null;

  const diffMs = expiration.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Hebrew day names
  const dayNames = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  // Format time as HH:MM
  const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Format date as DD/MM
  const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  // Less than 60 minutes - show countdown
  if (diffMinutes < 60) {
    return baseText + ` בעוד ${diffMinutes} דקות`;
  }

  const nowDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expirationDate = new Date(expiration.getFullYear(), expiration.getMonth(), expiration.getDate());
  const diffDaysExact = Math.floor((expirationDate.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24));

  // Today (60+ minutes)
  if (diffDaysExact === 0) {
    return baseText + ` היום בשעה ${formatTime(expiration)}`;
  }

  // Tomorrow
  if (diffDaysExact === 1) {
    return baseText + ` מחר בשעה ${formatTime(expiration)}`;
  }

  // After tomorrow
  const dayOfWeek = dayNames[expiration.getDay()];
  return baseText + ` בתאריך ${formatDate(expiration)} יום ${dayOfWeek} בשעה ${formatTime(expiration)}`;
};