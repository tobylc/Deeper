// Audio helper utilities for robust audio file handling

export interface AudioLoadResult {
  success: boolean;
  error?: string;
  canUseFallback?: boolean;
}

/**
 * Centralized audio URL construction with consistent logic
 */
export function constructAudioUrl(audioFileUrl: string): string {
  if (!audioFileUrl) return '';
  
  // If already a full URL, return as-is
  if (audioFileUrl.startsWith('http')) {
    return audioFileUrl;
  }
  
  // Clean the URL and ensure proper /uploads/ prefix
  let cleanUrl = audioFileUrl.replace(/^\/+/, '');
  
  // If it doesn't start with uploads/, add it
  if (!cleanUrl.startsWith('uploads/')) {
    cleanUrl = `uploads/${cleanUrl}`;
  }
  
  // Construct full URL with current origin
  return `${window.location.origin}/${cleanUrl}`;
}

/**
 * Test if an audio file is accessible with retry logic
 */
export async function testAudioFileAccess(audioUrl: string, retries = 2): Promise<AudioLoadResult> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(audioUrl, { 
        method: 'HEAD',
        cache: 'no-cache',
        credentials: 'same-origin' // Include session cookies
      });
      
      if (response.ok) {
        return { success: true };
      }
      
      // If 401/403, might be authentication issue
      if (response.status === 401 || response.status === 403) {
        return { 
          success: false, 
          error: 'Authentication required to access audio file',
          canUseFallback: true
        };
      }
      
      // If 404, file not found
      if (response.status === 404) {
        return { 
          success: false, 
          error: 'Audio file not found',
          canUseFallback: true
        };
      }
      
      // Other HTTP errors
      return { 
        success: false, 
        error: `Audio file unavailable (${response.status})`,
        canUseFallback: true
      };
      
    } catch (error) {
      // Network error - retry if we have attempts left
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Progressive delay
        continue;
      }
      
      return { 
        success: false, 
        error: 'Network error accessing audio file',
        canUseFallback: true
      };
    }
  }
  
  return { 
    success: false, 
    error: 'Failed to access audio file after retries',
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