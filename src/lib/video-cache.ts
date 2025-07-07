/**
 * Video Cache Manager
 * Prevents duplicate video requests and manages preloading efficiently
 */

class VideoCacheManager {
  private preloadedUrls = new Set<string>();
  private preloadingUrls = new Set<string>();
  private videoElements = new Map<string, HTMLVideoElement>();
  
  async preloadVideo(url: string): Promise<void> {
    // Skip if already preloaded or currently preloading
    if (this.preloadedUrls.has(url) || this.preloadingUrls.has(url)) {
      return;
    }
    
    this.preloadingUrls.add(url);
    console.log('📹 Starting preload for:', url.split('/').pop());
    
    try {
      // Create video element for preloading
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.preload = 'auto';
      video.playsInline = true;
      video.muted = true; // Muted videos can autoplay
      
      // Wait for video metadata to load
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video preload timeout'));
        }, 10000); // 10 second timeout
        
        video.addEventListener('loadedmetadata', () => {
          clearTimeout(timeout);
          resolve();
        }, { once: true });
        
        video.addEventListener('error', () => {
          clearTimeout(timeout);
          reject(new Error('Video preload failed'));
        }, { once: true });
        
        video.src = url;
      });
      
      // Cache the video element
      this.videoElements.set(url, video);
      this.preloadedUrls.add(url);
      console.log('✅ Preloaded video:', url.split('/').pop());
      
    } catch (error) {
      console.error('❌ Failed to preload video:', url.split('/').pop(), error);
    } finally {
      this.preloadingUrls.delete(url);
    }
  }
  
  isPreloaded(url: string): boolean {
    return this.preloadedUrls.has(url);
  }
  
  isPreloading(url: string): boolean {
    return this.preloadingUrls.has(url);
  }
  
  getCachedVideo(url: string): HTMLVideoElement | undefined {
    return this.videoElements.get(url);
  }
  
  clearCache(): void {
    this.videoElements.forEach(video => {
      video.src = '';
      video.remove();
    });
    this.videoElements.clear();
    this.preloadedUrls.clear();
    this.preloadingUrls.clear();
  }
  
  getStats() {
    return {
      preloaded: this.preloadedUrls.size,
      preloading: this.preloadingUrls.size,
      cached: this.videoElements.size
    };
  }
}

// Export singleton instance
export const videoCacheManager = new VideoCacheManager();