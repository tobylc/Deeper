// Audio helper utilities for robust audio file handling

export interface AudioLoadResult {
  success: boolean;
  error?: string;
  canUseFallback?: boolean;
}

/**
 * Centralized audio URL construction with consistent logic
 * Handles both S3 URLs and local uploads
 */
export function constructAudioUrl(audioFileUrl: string): string {
  if (!audioFileUrl) return '';
  
  // If already a full URL (S3 or other external), return as-is
  if (audioFileUrl.startsWith('http')) {
    return audioFileUrl;
  }
  
  // Handle local uploads (legacy fallback)
  // Clean the URL and ensure proper /uploads/ prefix
  let cleanUrl = audioFileUrl.replace(/^\/+/, '');
  
  // If it doesn't start with uploads/, add it
  if (!cleanUrl.startsWith('uploads/')) {
    cleanUrl = `uploads/${cleanUrl}`;
  }
  
  // Construct full URL with current origin for local files
  return `${window.location.origin}/${cleanUrl}`;
}

/**
 * Test if an audio file is accessible with retry logic
 * Enhanced for S3 URLs with better error handling and CORS support
 */
export async function testAudioFileAccess(audioUrl: string, retries = 2): Promise<AudioLoadResult> {
  const isS3Url = audioUrl.startsWith('http') && !audioUrl.includes(window.location.origin);
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Enhanced timeout and CORS handling for S3 URLs
      const controller = new AbortController();
      const timeoutMs = isS3Url ? 10000 : 5000; // Longer timeout for S3
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const fetchOptions: RequestInit = {
        method: 'HEAD',
        cache: 'no-cache',
        signal: controller.signal,
        // Use CORS mode for external S3 URLs, same-origin for local files
        mode: isS3Url ? 'cors' : 'same-origin',
        credentials: isS3Url ? 'omit' : 'same-origin'
      };

      const response = await fetch(audioUrl, fetchOptions);
      clearTimeout(timeoutId);
      
      if (response.ok) {
        console.log(`[AUDIO_HELPER] Audio file accessible (${isS3Url ? 'S3' : 'local'}) on attempt ${attempt + 1}`);
        return { success: true };
      }
      
      // If 401/403, might be authentication issue
      if (response.status === 401 || response.status === 403) {
        return { 
          success: false, 
          error: `Authentication required to access audio file (${response.status})`,
          canUseFallback: true
        };
      }
      
      // If 404, file not found
      if (response.status === 404) {
        return { 
          success: false, 
          error: 'Audio file not found - may have been moved or deleted',
          canUseFallback: true
        };
      }
      
      // For S3 URLs, try GET fallback if HEAD fails with other errors
      if (isS3Url && attempt === retries) {
        try {
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 5000);
          
          const fallbackResponse = await fetch(audioUrl, {
            method: 'GET',
            cache: 'no-cache',
            signal: fallbackController.signal,
            mode: 'cors',
            credentials: 'omit'
          });
          
          clearTimeout(fallbackTimeoutId);
          
          if (fallbackResponse.ok) {
            console.log(`[AUDIO_HELPER] S3 audio file accessible via GET fallback`);
            return { success: true };
          }
        } catch (fallbackError) {
          console.warn(`[AUDIO_HELPER] S3 GET fallback failed:`, fallbackError);
        }
      }
      
      // Other HTTP errors
      console.warn(`[AUDIO_HELPER] Audio file unavailable (${response.status}) on attempt ${attempt + 1}`);
      
    } catch (error) {
      console.warn(`[AUDIO_HELPER] Audio access test failed on attempt ${attempt + 1}:`, error);
      
      // Network error - retry if we have attempts left
      if (attempt < retries) {
        const delay = isS3Url ? 2000 * (attempt + 1) : 1000 * (attempt + 1); // Longer delays for S3
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
    }
  }
  
  const storageType = isS3Url ? 'S3 storage' : 'local storage';
  return { 
    success: false, 
    error: `Audio file not accessible from ${storageType} after ${retries + 1} attempts`,
    canUseFallback: true
  };
}

/**
 * Load audio element with enhanced error handling and recovery
 */
export function loadAudioWithRecovery(
  audio: HTMLAudioElement, 
  audioUrl: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener('canplay', onCanPlay);
      audio.removeEventListener('canplaythrough', onCanPlayThrough);
      audio.removeEventListener('error', onError);
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('stalled', onStalled);
    };

    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Audio load timeout'));
    }, 15000);

    const onCanPlay = () => {
      clearTimeout(timeout);
      cleanup();
      resolve();
    };
    
    const onCanPlayThrough = () => {
      clearTimeout(timeout);
      cleanup();
      resolve();
    };
    
    const onError = (e: Event) => {
      clearTimeout(timeout);
      cleanup();
      const audioError = (e.target as HTMLAudioElement)?.error;
      const errorMessage = audioError?.message || 'Unknown audio error';
      reject(new Error(`Audio load failed: ${errorMessage}`));
    };
    
    const onLoadStart = () => {
      // Audio loading started successfully
    };
    
    const onStalled = () => {
      // Network stalled - we'll let the timeout handle this
    };
    
    audio.addEventListener('canplay', onCanPlay);
    audio.addEventListener('canplaythrough', onCanPlayThrough);
    audio.addEventListener('error', onError);
    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('stalled', onStalled);
    
    // Reset audio element
    audio.pause();
    audio.currentTime = 0;
    
    // Set source and load
    audio.src = audioUrl;
    audio.load();
  });
}

/**
 * Check if transcription can be used as fallback
 */
export function hasValidTranscription(transcription?: string): boolean {
  return !!(transcription && 
    transcription !== '[Transcription unavailable - audio only]' && 
    transcription.trim().length > 0);
}