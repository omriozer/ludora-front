import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { apiDownload } from '@/services/apiClient';
import { ludlog, luderror } from '@/lib/ludlog';

const AudioCacheContext = createContext();

export const useAudioCache = () => {
  const context = useContext(AudioCacheContext);
  if (!context) {
    throw new Error('useAudioCache must be used within an AudioCacheProvider');
  }
  return context;
};

export const AudioCacheProvider = ({ children }) => {
  // Store cached audio files as blob URLs
  const [audioCache, setAudioCache] = useState(new Map());

  // Store loading states for ongoing downloads
  const [loadingStates, setLoadingStates] = useState(new Map());

  // Store download promises to prevent duplicate requests
  const downloadPromises = useRef(new Map());

  /**
   * Check if an audio file is cached
   * @param {string} audioFileId - The AudioFile ID
   * @returns {boolean} True if cached
   */
  const isCached = useCallback((audioFileId) => {
    return audioCache.has(audioFileId);
  }, [audioCache]);

  /**
   * Get cached audio URL
   * @param {string} audioFileId - The AudioFile ID
   * @returns {string|null} Blob URL or null if not cached
   */
  const getCachedUrl = useCallback((audioFileId) => {
    return audioCache.get(audioFileId) || null;
  }, [audioCache]);

  /**
   * Check if an audio file is currently being downloaded
   * @param {string} audioFileId - The AudioFile ID
   * @returns {boolean} True if downloading
   */
  const isLoading = useCallback((audioFileId) => {
    return loadingStates.get(audioFileId) || false;
  }, [loadingStates]);

  /**
   * Download and cache an audio file
   * @param {string} audioFileId - The AudioFile ID
   * @returns {Promise<string>} Promise resolving to blob URL
   */
  const downloadAndCache = useCallback(async (audioFileId) => {
    // If already cached, return immediately
    if (audioCache.has(audioFileId)) {
      return audioCache.get(audioFileId);
    }

    // If already downloading, return the existing promise
    if (downloadPromises.current.has(audioFileId)) {
      return downloadPromises.current.get(audioFileId);
    }

    // Start new download
    const downloadPromise = (async () => {
      try {
        // Set loading state
        setLoadingStates(prev => new Map(prev.set(audioFileId, true)));

        ludlog.media(`🎵 Downloading audio file: ${audioFileId}`);

        // Use API client download method with proper authentication
        const blob = await apiDownload(`/media/download/audiofile/${audioFileId}`);

        // Create blob URL
        const blobUrl = URL.createObjectURL(blob);

        // Cache the blob URL
        setAudioCache(prev => new Map(prev.set(audioFileId, blobUrl)));

        ludlog.media(`✅ Audio file cached: ${audioFileId}`);
        return blobUrl;

      } catch (error) {
        luderror.media(`Failed to download audio file ${audioFileId}:`, error);
        throw error;
      } finally {
        // Clear loading state
        setLoadingStates(prev => {
          const newMap = new Map(prev);
          newMap.delete(audioFileId);
          return newMap;
        });

        // Clear download promise
        downloadPromises.current.delete(audioFileId);
      }
    })();

    // Store the promise to prevent duplicate requests
    downloadPromises.current.set(audioFileId, downloadPromise);

    return downloadPromise;
  }, [audioCache]);

  /**
   * Remove an audio file from cache and revoke its blob URL
   * @param {string} audioFileId - The AudioFile ID
   */
  const removeFromCache = useCallback((audioFileId) => {
    const blobUrl = audioCache.get(audioFileId);
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl);
      setAudioCache(prev => {
        const newMap = new Map(prev);
        newMap.delete(audioFileId);
        return newMap;
      });
      ludlog.media(`🗑️ Audio file removed from cache: ${audioFileId}`);
    }
  }, [audioCache]);

  /**
   * Clear all cached audio files and revoke their blob URLs
   */
  const clearCache = useCallback(() => {
    audioCache.forEach((blobUrl) => {
      URL.revokeObjectURL(blobUrl);
    });
    setAudioCache(new Map());
    setLoadingStates(new Map());
    downloadPromises.current.clear();
    ludlog.media('🗑️ All audio cache cleared');
  }, [audioCache]);

  /**
   * Get cache statistics
   */
  const getCacheStats = useCallback(() => {
    return {
      cachedCount: audioCache.size,
      loadingCount: loadingStates.size,
      pendingDownloads: downloadPromises.current.size
    };
  }, [audioCache, loadingStates]);

  const contextValue = {
    // State queries
    isCached,
    getCachedUrl,
    isLoading,
    getCacheStats,

    // Actions
    downloadAndCache,
    removeFromCache,
    clearCache
  };

  return (
    <AudioCacheContext.Provider value={contextValue}>
      {children}
    </AudioCacheContext.Provider>
  );
};

export default AudioCacheProvider;