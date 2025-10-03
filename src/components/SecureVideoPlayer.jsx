import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, AlertCircle } from 'lucide-react';
import logoSm from '../assets/images/logo_sm.png';
import { clog, cerror } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { getApiBase } from '@/utils/api.js';

// Utility function to detect YouTube URLs
const isYouTubeUrl = (url) => {
  if (!url) return false;
  const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  return youtubeRegex.test(url);
};

// Extract YouTube video ID
const getYouTubeId = (url) => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// Check if URL is a supported video format for direct streaming
const isSupportedVideoFormat = (url) => {
  if (!url) return false;

  // Check for direct file extensions in URL
  const supportedFormats = ['.mp4', '.webm', '.ogg', '.m3u8'];
  const hasExtension = supportedFormats.some(format => url.toLowerCase().includes(format));

  // If it has a supported extension, it's supported
  if (hasExtension) return true;

  // Check for our API streaming endpoints
  if (url.includes('/stream-marketing-video/') || url.includes('/stream-video/')) {
    return true;
  }

  // For uploaded files from cloud storage (S3, etc.) that may not have extensions in URL,
  // assume they are supported video files if they come from our upload endpoints
  if (url.includes('/videos/') || url.includes('ludora-files') || url.includes('amazonaws.com')) {
    return true;
  }

  return false;
};

// Check if URL is a public marketing video (no authentication required)
const isPublicMarketingVideo = (url) => {
  if (!url) return false;

  // Check for public marketing video patterns
  return url.includes('/public/marketing/') ||
         url.includes('/stream-marketing-video/') || // Add our streaming endpoint
         (url.includes('ludora-files') && url.includes('/public/')) ||
         (url.includes('amazonaws.com') && url.includes('/public/'));
};

// Check if URL is a local file that needs secure streaming
const isLocalVideoFile = (url) => {
  if (!url) return false;
  // Local files don't start with http/https or are relative paths
  return !url.startsWith('http://') && !url.startsWith('https://');
};

const SecureVideoPlayer = ({
  videoUrl,
  title = "Video Player",
  onError = () => {},
  className = "",
  autoPlay = false,
  contentType = null // 'marketing', 'content', etc.
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authenticatedVideoUrl, setAuthenticatedVideoUrl] = useState(null);
  const [bufferedRanges, setBufferedRanges] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferingTimeout, setBufferingTimeout] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(null);
  const videoRef = useRef(null);

  // Determine video type
  const videoType = React.useMemo(() => {
    if (!videoUrl) return 'none';
    if (isYouTubeUrl(videoUrl)) return 'youtube';

    // Check for API video endpoints first (these are always supported)
    if (videoUrl.includes('/api/media/stream/')) {
      return 'video';
    }

    // Check for direct video file formats
    if (isSupportedVideoFormat(videoUrl)) {
      return 'video';
    }

    return 'unsupported';
  }, [videoUrl, contentType]);

  const youtubeId = React.useMemo(() => {
    if (videoType === 'youtube') {
      return getYouTubeId(videoUrl);
    }
    return null;
  }, [videoUrl, videoType]);

  // Handle authentication for secure API endpoints
  useEffect(() => {
    if (!videoUrl) return;

    // Clear previous error when URL changes
    setError(null);
    setRetryCount(0);

    // Check if this is a public marketing video (no authentication needed)
    if (isPublicMarketingVideo(videoUrl) || contentType === 'marketing') {
      // Set the URL directly without any authentication
      setAuthenticatedVideoUrl(videoUrl);
      return;
    }

    if (videoUrl.includes('/api/media/stream/')) {
      // For secure API endpoints, add authentication token
      const token = localStorage.getItem('authToken');
      if (token) {
        // For relative URLs in development, keep them relative to use vite proxy
        if (!videoUrl.startsWith('http') && import.meta.env.DEV) {
          // Keep relative for proxy in development - just add auth token as query param
          const separator = videoUrl.includes('?') ? '&' : '?';
          const authenticatedPath = `${videoUrl}${separator}authToken=${token}`;
          setAuthenticatedVideoUrl(authenticatedPath);
          return;
        }

        // For absolute URLs or production, handle normally
        let url;
        if (videoUrl.startsWith('http')) {
          url = new URL(videoUrl);
        } else {
          // For relative URLs in production, we should use the API base URL, not frontend origin
          const apiBase = getApiBase();
          // Remove /api suffix if present since videoUrl already includes it
          const baseUrl = apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
          url = new URL(videoUrl, baseUrl);
        }
        url.searchParams.set('authToken', token);
        const finalUrl = url.toString();

        // Debug logging in development
        if (import.meta.env.DEV) {
          clog('🎬 SecureVideoPlayer URL processing:', {
            inputVideoUrl: videoUrl,
            isFullUrl: videoUrl.startsWith('http'),
            baseUrl: videoUrl.startsWith('http') ? 'N/A (full URL)' : getApiBase(),
            finalUrl,
            tokenType: token === 'token_dev' ? 'dev' : 'jwt'
          });

          // Test the URL by making a fetch request to see the response
          fetch(finalUrl, {
            method: 'HEAD',
            headers: {
              'Range': 'bytes=0-1024'
            }
          })
          .then(response => {
            clog('🌐 Video URL HEAD request result:', {
              status: response.status,
              statusText: response.statusText,
              headers: Object.fromEntries(response.headers.entries()),
              url: response.url
            });
          })
          .catch(error => {
            cerror('🚨 Video URL HEAD request failed:', error);
          });
        }

        setAuthenticatedVideoUrl(finalUrl);
      } else {
        setError('נדרשת הזדהות לצפייה בווידאו');
      }
    } else {
      // For external URLs (YouTube, etc.), use directly
      setAuthenticatedVideoUrl(videoUrl);
    }
  }, [videoUrl]);

  // Cleanup timeouts on unmount or video change
  useEffect(() => {
    return () => {
      if (bufferingTimeout) {
        clearTimeout(bufferingTimeout);
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [bufferingTimeout, loadingTimeout]);

  // Security measures to prevent downloads
  useEffect(() => {
    if (videoType !== 'video' || !videoRef.current) return;

    const video = videoRef.current;

    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts for saving
    const handleKeyDown = (e) => {
      // Prevent Ctrl+S, Ctrl+A, F12, etc.
      if ((e.ctrlKey && (e.key === 's' || e.key === 'a')) || e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    };

    // Prevent drag and drop
    const handleDragStart = (e) => {
      e.preventDefault();
      return false;
    };

    video.addEventListener('contextmenu', handleContextMenu);
    video.addEventListener('keydown', handleKeyDown);
    video.addEventListener('dragstart', handleDragStart);
    document.addEventListener('keydown', handleKeyDown);

    // Add CSS to prevent text selection and other interactions
    video.style.userSelect = 'none';
    video.style.webkitUserSelect = 'none';
    video.style.mozUserSelect = 'none';
    video.style.msUserSelect = 'none';

    return () => {
      video.removeEventListener('contextmenu', handleContextMenu);
      video.removeEventListener('keydown', handleKeyDown);
      video.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [videoType]);

  // Video event handlers
  const handlePlay = () => {
    if (videoRef.current) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePause = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);

      // Update buffered ranges for progress bar
      const buffered = videoRef.current.buffered;
      const newBufferedRanges = [];

      // Only update buffered ranges every few calls to avoid too many re-renders
      const now = Date.now();
      if (!videoRef.current._lastBufferUpdate || now - videoRef.current._lastBufferUpdate > 500) {
        for (let i = 0; i < buffered.length; i++) {
          const start = buffered.start(i);
          const end = buffered.end(i);

          // Only show significant buffer chunks (>1 second)
          if (end - start > 1) {
            newBufferedRanges.push({ start, end });
          }
        }

        setBufferedRanges(newBufferedRanges);
        videoRef.current._lastBufferUpdate = now;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setIsLoading(false);
    }
  };

  const testVideoCodec = useCallback(async () => {
    if (!authenticatedVideoUrl) return false;
    
    try {
      // Test if browser can play the video
      const testVideo = document.createElement('video');
      testVideo.preload = 'metadata';
      testVideo.muted = true; // Mute to avoid audio issues
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          cerror('Video codec test timed out');
          resolve(false);
        }, 5000);
        
        testVideo.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          cerror('✅ Video metadata loaded successfully - codec appears compatible');
          resolve(true);
        });
        
        testVideo.addEventListener('error', (e) => {
          clearTimeout(timeout);
          cerror('❌ Video codec test failed:', e.target?.error);
          resolve(false);
        });
        
        testVideo.src = authenticatedVideoUrl;
      });
    } catch (error) {
      cerror('Video codec test error:', error);
      return false;
    }
  }, [authenticatedVideoUrl]);

  const retryVideo = useCallback(async () => {
    if (retryCount >= 2) {
      cerror('Maximum retry attempts reached');
      return;
    }

    setIsRetrying(true);
    setError(null);
    setIsBuffering(false); // Clear buffering state during retry
    setRetryCount(prev => prev + 1);

    // Clear any existing timeouts
    if (bufferingTimeout) {
      clearTimeout(bufferingTimeout);
      setBufferingTimeout(null);
    }
    if (loadingTimeout) {
      clearTimeout(loadingTimeout);
      setLoadingTimeout(null);
    }

    // Wait a moment before retrying
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (videoRef.current && authenticatedVideoUrl) {
      try {
        // On retry, try muted playback to avoid audio codec issues
        if (retryCount >= 0) {
          videoRef.current.muted = true;
          setIsMuted(true);
          cerror('🔇 Retrying with muted audio to bypass audio codec issues');
        }

        // Just reload without clearing src to preserve streaming
        videoRef.current.load();

      } catch (error) {
        cerror('Error during video retry:', error);
      }
    }

    setIsRetrying(false);
  }, [retryCount, authenticatedVideoUrl, bufferingTimeout, loadingTimeout]);

  const handleError = (e) => {
    cerror('Video error:', e);
    cerror('Video player error:', e.target?.error);
    cerror('Video URL attempted:', authenticatedVideoUrl);
    cerror('Original video URL:', videoUrl);

    // In development mode, throw detailed error
    if (import.meta.env.DEV) {
      const errorDetails = {
        error: e.target?.error,
        errorCode: e.target?.error?.code,
        errorMessage: e.target?.error?.message,
        networkState: e.target?.networkState,
        readyState: e.target?.readyState,
        videoUrl: videoUrl,
        authenticatedVideoUrl: authenticatedVideoUrl,
        currentSrc: e.target?.currentSrc,
        src: e.target?.src
      };
      cerror('🚨 Detailed video error:', errorDetails);

      // Map common video error codes to readable messages
      const errorMessages = {
        1: 'MEDIA_ERR_ABORTED - The video download was aborted',
        2: 'MEDIA_ERR_NETWORK - A network error occurred while downloading',
        3: 'MEDIA_ERR_DECODE - An error occurred while decoding the video',
        4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - The video format is not supported'
      };

      if (e.target?.error?.code) {
        cerror(`🎬 Error Code ${e.target.error.code}: ${errorMessages[e.target.error.code] || 'Unknown error'}`);
      }
    }

    // Handle specific error types
    const errorCode = e.target?.error?.code;

    // Auto-retry on network or decode errors if this is the first failure
    if (retryCount === 0 && (errorCode === 2 || errorCode === 3)) {
      cerror(`🔄 Initial ${errorCode === 2 ? 'network' : 'decode'} error - attempting automatic retry`);
      retryVideo();
      return;
    }

    // Only retry on decode errors for subsequent failures
    if (errorCode === 3 && retryCount < 2) { // MEDIA_ERR_DECODE - up to 2 retries total
      cerror(`🔄 Decode error - attempting muted retry ${retryCount + 1}/2`);
      retryVideo();
      return;
    }

    // Set appropriate error message after retries are exhausted
    if (errorCode === 3) { // MEDIA_ERR_DECODE
      setError('בעיה בקידוד הווידאו - נסה עם שמע מושתק');
    } else if (errorCode === 2) { // MEDIA_ERR_NETWORK
      setError('שגיאת רשת - בדוק את החיבור לאינטרנט');
    } else if (errorCode === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
      setError('פורמט הווידאו לא נתמך בדפדפן זה');
    } else {
      setError('שגיאה בהשמעת הווידאו');
    }
    setIsLoading(false);

    // Only show toast after multiple failures to avoid noise
    if (retryCount >= 1) {
      toast({
        title: "שגיאה בהשמעת הווידאו",
        description: "לא הצלחנו להשמיע את הווידאו. אנא נסה שוב או בדוק את החיבור לאינטרנט.",
        variant: "destructive",
      });
    }

    onError(e);
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;

      // Always calculate from left to right regardless of RTL
      const progress = Math.max(0, Math.min(1, clickX / rect.width));
      const newTime = progress * duration;

      clog('🎯 Seek debug:', {
        clickX,
        rectWidth: rect.width,
        progress,
        newTime,
        duration
      });

      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  // Render based on video type
  if (videoType === 'none') {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-white">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>לא צוין קישור לווידאו</p>
        </div>
      </div>
    );
  }

  if (videoType === 'unsupported') {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center h-64 ${className}`}>
        <div className="text-center text-white">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
          <p>פורמט הווידאו לא נתמך</p>
          <p className="text-sm text-gray-400 mt-2">נתמכים: MP4, WebM, YouTube</p>
        </div>
      </div>
    );
  }

  if (videoType === 'youtube') {
    return (
      <div className={`relative ${className}`}>
        <iframe
          width="100%"
          height="400"
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&showinfo=0&modestbranding=1`}
          title={title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="rounded-lg"
          style={{ minHeight: '300px' }}
        />
      </div>
    );
  }

  // Custom secure video player
  return (
    <div className={`relative bg-black rounded-lg overflow-hidden ${className}`}>
      {error && !isRetrying && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-400" />
            <p className="mb-4">{error}</p>
            {retryCount < 2 && (
              <button
                onClick={retryVideo}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
              >
                נסה שוב
              </button>
            )}
            {retryCount >= 2 && (
              <p className="text-sm text-gray-400">
                לא הצלחנו להשמיע את הווידאו לאחר מספר ניסיונות
              </p>
            )}
          </div>
        </div>
      )}

      {(isLoading || isRetrying || isBuffering) && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 text-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="mb-4">
              {isRetrying ? `מנסה שוב... (${retryCount + 1}/3)` :
               isBuffering ? 'ממתין לנתונים...' :
               'טוען ווידאו...'}
            </p>
            {isBuffering && (
              <button
                onClick={() => {
                  setIsBuffering(false);
                  if (bufferingTimeout) {
                    clearTimeout(bufferingTimeout);
                    setBufferingTimeout(null);
                  }
                  if (videoRef.current) {
                    videoRef.current.load();
                  }
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm transition-colors"
              >
                אלץ המשכה
              </button>
            )}
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={authenticatedVideoUrl || ''}
        className="w-full h-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onError={handleError}
        onLoadStart={() => {
          setIsLoading(true);
          setError(null); // Clear any previous errors when starting to load

          // Set a timeout to prevent infinite loading
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
          }
          const timeout = setTimeout(() => {
            setIsLoading(false);
            setError('הטעינה ארכה יותר מהצפוי - נסה שוב');
          }, 15000); // 15 second timeout
          setLoadingTimeout(timeout);
        }}
        onCanPlay={() => {
          setIsLoading(false);
          setIsBuffering(false);
          setError(null); // Clear errors when video can play
          if (bufferingTimeout) {
            clearTimeout(bufferingTimeout);
            setBufferingTimeout(null);
          }
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            setLoadingTimeout(null);
          }
        }}
        onLoadedData={() => {
          cerror('✅ Video data loaded successfully');
        }}
        onSuspend={() => {
          // Handle network suspension - normal for streaming
          clog('Video suspended - buffering or network pause (normal for streaming)');
        }}
        onStalled={() => {
          // Handle stalled playback - normal for streaming
          clog('Video stalled - waiting for more data (normal for streaming)');
        }}
        onWaiting={() => {
          // Video is waiting for more data - show buffering spinner
          setIsBuffering(true);

          // Clear any existing timeout
          if (bufferingTimeout) {
            clearTimeout(bufferingTimeout);
          }

          // Set timeout to hide buffering spinner if it takes too long (30 seconds)
          const timeout = setTimeout(() => {
            setIsBuffering(false);
          }, 30000);
          setBufferingTimeout(timeout);
        }}
        onCanPlayThrough={() => {
          // Video can play through without stopping
          setIsLoading(false);
          setIsBuffering(false);
          if (bufferingTimeout) {
            clearTimeout(bufferingTimeout);
            setBufferingTimeout(null);
          }
          if (loadingTimeout) {
            clearTimeout(loadingTimeout);
            setLoadingTimeout(null);
          }
        }}
        preload="metadata" // Load metadata but not full video
        autoPlay={false} // Let user control playback
        playsInline
        muted={false} // Start unmuted, will be muted on retry if needed
        // Security attributes
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        style={{
          pointerEvents: isLoading ? 'none' : 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        דפדפן זה אינו תומך בהשמעת וידאו
      </video>

      {/* Custom Controls */}
      {!isLoading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div
            className="w-full h-2 bg-gray-600 rounded mb-4 cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
            style={{ direction: 'ltr' }}
          >
            {/* Buffered ranges */}
            {bufferedRanges.map((range, index) => (
              <div
                key={index}
                className="absolute h-full bg-gray-300 opacity-70"
                style={{
                  left: duration ? `${(range.start / duration) * 100}%` : '0%',
                  width: duration ? `${((range.end - range.start) / duration) * 100}%` : '0%',
                  direction: 'ltr'
                }}
              />
            ))}

            {/* Current progress */}
            <div
              className="absolute h-full bg-blue-500 rounded transition-all duration-150 z-10"
              style={{
                width: duration ? `${(currentTime / duration) * 100}%` : '0%',
                direction: 'ltr'
              }}
            />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center space-x-4 space-x-reverse">
              <button
                onClick={isPlaying ? handlePause : handlePlay}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              <button
                onClick={toggleMute}
                className="p-2 hover:bg-white/20 rounded transition-colors"
              >
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>

              <div className="text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white/20 rounded transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Logo Watermark */}
      <div
        className="absolute top-4 right-4 pointer-events-none select-none"
        style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      >
        <img
          src={logoSm}
          alt="Ludora"
          className="h-8 w-auto opacity-80"
          draggable="false"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        />
      </div>
    </div>
  );
};

export default SecureVideoPlayer;