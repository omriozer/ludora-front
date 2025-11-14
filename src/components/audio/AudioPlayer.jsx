import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square, Volume2, Loader2 } from 'lucide-react';
import { useAudioCache } from '@/contexts/AudioCacheContext';
import { clog, cerror } from '@/lib/utils';

export default function AudioPlayer({ src, audioFileId, volume = 1, className = "" }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [downloadError, setDownloadError] = useState(null);
  const audioRef = useRef(null);

  // Use audio cache for AudioFile entities
  const { isCached, getCachedUrl, isLoading, downloadAndCache } = useAudioCache();

  // Determine the actual audio source to use
  const [audioSrc, setAudioSrc] = useState(null);

  // Check if this is a cached audio file or direct src
  const useCache = audioFileId && !src;

  // Handle audio source determination
  useEffect(() => {
    if (useCache) {
      // Using cache system - check if already cached
      if (isCached(audioFileId)) {
        const cachedUrl = getCachedUrl(audioFileId);
        setAudioSrc(cachedUrl);
      } else {
        // Not cached yet - will download on first play
        setAudioSrc(null);
      }
    } else {
      // Using direct src
      setAudioSrc(src);
    }
  }, [useCache, audioFileId, src, isCached, getCachedUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0); // Reset to beginning when track ends
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const togglePlayPause = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      // Currently playing - just pause
      audio.pause();
      setIsPlaying(false);
      return;
    }

    // Trying to play
    if (useCache && !audioSrc) {
      // Need to download the audio file first
      try {
        setDownloadError(null);
        clog('Downloading audio file for playback:', audioFileId);

        const cachedUrl = await downloadAndCache(audioFileId);
        setAudioSrc(cachedUrl);

        // Wait for audio to load, then play
        setTimeout(() => {
          const audioEl = audioRef.current;
          if (audioEl) {
            audioEl.play().then(() => {
              setIsPlaying(true);
            }).catch(error => {
              cerror('Audio playback failed:', error);
              setDownloadError('Playback failed');
            });
          }
        }, 100);

      } catch (error) {
        cerror('Audio download failed:', error);
        setDownloadError(error.message || 'Download failed');
      }
    } else if (audioSrc) {
      // Audio source is ready - play immediately
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (error) {
        cerror('Audio playback failed:', error);
        setDownloadError('Playback failed');
      }
    }
  };

  const handleStop = () => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.currentTime = 0;
    setCurrentTime(0);
    setIsPlaying(false);
  };

  const handleSeek = (e) => {
    const audio = audioRef.current;
    if (!audio) return;

    const progressBar = e.currentTarget;
    const clickX = e.clientX - progressBar.offsetLeft;
    const width = progressBar.offsetWidth;
    const newTime = (clickX / width) * duration;
    
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const showStopButton = isPlaying || currentTime > 0;
  const isDownloading = useCache && isLoading(audioFileId);
  const isReady = audioSrc || (!useCache && src);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <audio ref={audioRef} src={audioSrc || src} />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={togglePlayPause}
          disabled={isDownloading}
          className="h-8 w-8 p-0"
          title={
            downloadError ? `Error: ${downloadError}` :
            isDownloading ? 'Downloading audio...' :
            !isReady ? 'Click to load audio' :
            isPlaying ? 'Pause' : 'Play'
          }
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className={`w-4 h-4 ${downloadError ? 'text-red-500' : ''}`} />
          )}
        </Button>

        {showStopButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStop}
            className="h-8 w-8 p-0"
          >
            <Square className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 flex items-center gap-2">
        <span className="text-xs text-gray-500 w-10">
          {formatTime(currentTime)}
        </span>
        
        <div
          className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative"
          onClick={handleSeek}
        >
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${(currentTime / duration) * 100}%` }}
          />
        </div>
        
        <span className="text-xs text-gray-500 w-10">
          {formatTime(duration)}
        </span>
      </div>

      <Volume2 className="w-4 h-4 text-gray-400" />

      {/* Status indicator */}
      {downloadError && (
        <span className="text-xs text-red-500 ml-2" title={downloadError}>
          Error
        </span>
      )}
      {isDownloading && (
        <span className="text-xs text-blue-500 ml-2">
          Loading...
        </span>
      )}
      {useCache && !isReady && !isDownloading && !downloadError && (
        <span className="text-xs text-gray-400 ml-2">
          Click play to load
        </span>
      )}
    </div>
  );
}