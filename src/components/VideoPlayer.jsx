import React, { useState, useEffect, useCallback } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Play, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { createSignedUrl } from '@/services/functions';
import { clog, cerror } from '@/lib/utils';

// Helper function to detect and convert Google Drive URLs
const processVideoUrl = (url, is_private = false) => {
  if (!url) return null;
  
  // If it's a private file (file_uri), we need to generate a signed URL
  if (is_private && url.startsWith('private://')) {
    return { needsSignedUrl: true, originalUrl: url };
  }
  
  // Convert Google Drive view URLs to direct playback URLs
  if (url.includes('drive.google.com/file/d/')) {
    const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (fileIdMatch) {
      const fileId = fileIdMatch[1];
      return { 
        needsSignedUrl: false, 
        originalUrl: url,
        playbackUrl: `https://drive.google.com/uc?id=${fileId}`,
        isGoogleDrive: true
      };
    }
  }
  
  // Convert Google Drive uc URLs (already direct)
  if (url.includes('drive.google.com/uc?id=')) {
    return { 
      needsSignedUrl: false, 
      originalUrl: url,
      playbackUrl: url,
      isGoogleDrive: true
    };
  }
  
  // Regular external URL
  return { 
    needsSignedUrl: false, 
    originalUrl: url,
    playbackUrl: url,
    isExternal: true
  };
};

export default function VideoPlayer({ 
  file_uri, 
  video_url, 
  is_private = false, 
  product_id, 
  className = "", 
  title = "וידיאו" 
}) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [urlExpiry, setUrlExpiry] = useState(null);
  const [processedUrl, setProcessedUrl] = useState(null);

  // Determine which URL to use - prioritize file_uri over video_url
  const sourceUrl = file_uri || video_url;
  const sourceIsPrivate = file_uri ? true : is_private;

  const generateSignedUrl = useCallback(async () => {
    if (!sourceUrl) {
      setError('אין קובץ וידאו זמין');
      return;
    }

    const urlInfo = processVideoUrl(sourceUrl, sourceIsPrivate);
    
    if (!urlInfo.needsSignedUrl) {
      // External URL, use directly
      setProcessedUrl(urlInfo);
      return;
    }

    // Need to generate signed URL for private file
    setIsLoading(true);
    setError(null);

    try {
      const { data } = await createSignedUrl({
        file_uri: sourceUrl,
        expires_in: 3600, // 1 hour
        product_id: product_id
      });

      if (data && data.signed_url) {
        setSignedUrl(data.signed_url);
        setUrlExpiry(new Date(data.expires_at));
        setProcessedUrl({
          needsSignedUrl: true,
          originalUrl: sourceUrl,
          playbackUrl: data.signed_url,
          isPrivate: true
        });
        clog('Generated signed URL for video, expires at:', data.expires_at);
      } else {
        throw new Error('לא התקבל קישור תקין מהשרת');
      }
    } catch (error) {
      cerror('Error generating signed URL:', error);
      setError(error.response?.data?.error || error.message || 'שגיאה בטעינת הוידאו');
    } finally {
      setIsLoading(false);
    }
  }, [sourceUrl, sourceIsPrivate, product_id]);

  // Process URL when component mounts or URL changes
  useEffect(() => {
    if (sourceUrl) {
      const urlInfo = processVideoUrl(sourceUrl, sourceIsPrivate);
      if (urlInfo.needsSignedUrl) {
        generateSignedUrl();
      } else {
        setProcessedUrl(urlInfo);
        setIsLoading(false);
      }
    }
  }, [sourceUrl, sourceIsPrivate, generateSignedUrl]);

  // Check if URL is expiring soon and refresh it
  useEffect(() => {
    if (signedUrl && urlExpiry) {
      const checkExpiry = () => {
        const now = new Date();
        const timeToExpiry = urlExpiry.getTime() - now.getTime();
        
        // If less than 5 minutes remaining, refresh the URL
        if (timeToExpiry < 5 * 60 * 1000 && timeToExpiry > 0) {
          clog('Signed URL expiring soon, refreshing...');
          generateSignedUrl();
        }
      };

      const interval = setInterval(checkExpiry, 60000); // Check every minute
      return () => clearInterval(interval);
    }
  }, [signedUrl, urlExpiry, generateSignedUrl]);

  if (!sourceUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <Play className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">אין וידיאו זמין</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={generateSignedUrl}>
            נסה שוב
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (isLoading || !processedUrl) {
    return (
      <div className={`bg-gray-100 rounded-lg p-8 text-center ${className}`}>
        <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
        <p className="text-gray-600">טוען וידאו...</p>
      </div>
    );
  }

  return (
    <div className={`bg-black rounded-lg overflow-hidden ${className}`}>
      <video
        controls
        controlsList="nodownload" // Prevent download button in some browsers
        className="w-full h-full"
        title={title}
        preload="metadata" // Only load metadata initially
      >
        <source src={processedUrl.playbackUrl} type="video/mp4" />
        <source src={processedUrl.playbackUrl} type="video/webm" />
        <source src={processedUrl.playbackUrl} type="video/ogg" />
        הדפדפן שלך לא תומך בהצגת וידאו.
      </video>
      
      {/* Source indicator */}
      <div className="bg-gray-800 text-white text-xs p-2 flex items-center justify-between">
        <span className="opacity-70">
          {processedUrl.isGoogleDrive && <span>📁 Google Drive</span>}
          {processedUrl.isPrivate && <span>🔒 אחסון מאובטח</span>}
          {processedUrl.isExternal && !processedUrl.isGoogleDrive && <span><ExternalLink className="w-3 h-3 inline mr-1" />קישור חיצוני</span>}
        </span>
        
        {urlExpiry && (
          <span className="opacity-70">
            בתוקף עד: {urlExpiry.toLocaleString('he-IL')}
          </span>
        )}
      </div>
    </div>
  );
}