import { createClientSupabaseClient } from './supabase/client';

export interface WebSocketMessage {
  type: 'video_progress' | 'video_complete' | 'video_failed' | 'upload_progress' | 'system_status';
  data: any;
  timestamp: number;
  userId?: string;
  videoId?: string;
  sessionId?: string;
}

export interface VideoProgressData {
  videoId: string;
  status: 'uploading' | 'converting' | 'processing' | 'completed' | 'failed';
  progress: number;
  step?: string;
  message?: string;
  error?: string;
  estimatedTimeRemaining?: number;
}

export interface UploadProgressData {
  sessionId: string;
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  overallProgress: number;
  currentFile?: {
    name: string;
    progress: number;
  };
  speed?: number; // MB/s
}

class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private connected = false;
  private heartbeatInterval?: NodeJS.Timeout;
  private supabase = createClientSupabaseClient();

  constructor() {
    // Only connect in browser environment and if WebSocket is enabled
    if (typeof window !== 'undefined' && this.isWebSocketEnabled()) {
      // Delay connection to allow for component initialization
      setTimeout(() => this.connect(), 1000);
    } else {
      console.log('WebSocket disabled or not available, running in offline mode');
    }
  }

  private isWebSocketEnabled(): boolean {
    // Disable WebSocket in development unless explicitly enabled
    if (process.env.NODE_ENV === 'development') {
      return process.env.NEXT_PUBLIC_ENABLE_WEBSOCKET === 'true';
    }
    return true; // Enable in production by default
  }

  private async connect() {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn('WebSocket not available in server environment');
        return;
      }

      // Skip connection if disabled
      if (!this.isWebSocketEnabled()) {
        console.log('WebSocket connections disabled');
        return;
      }

      // Get user session for authentication
      const { data: { session } } = await this.supabase.auth.getSession();
      
      if (!session) {
        console.warn('No user session for WebSocket connection');
        // Don't retry in development mode
        if (process.env.NODE_ENV === 'development') {
          console.log('Skipping WebSocket retry in development mode');
          return;
        }
        this.scheduleReconnect();
        return;
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?token=${session.access_token}`;
      
      console.log('Attempting WebSocket connection to:', wsUrl);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.notifySubscribers('connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.stopHeartbeat();
        this.notifySubscribers('connection', { status: 'disconnected' });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.notifySubscribers('connection', { status: 'error', error });
      };

    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    // Skip reconnection in development if WebSocket is disabled
    if (process.env.NODE_ENV === 'development' && !this.isWebSocketEnabled()) {
      console.log('Skipping WebSocket reconnection in development mode');
      return;
    }

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 30000); // Max 30 seconds
      
      console.log(`WebSocket reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.warn('WebSocket max reconnection attempts reached, operating in offline mode');
      this.notifySubscribers('connection', { status: 'offline' });
      
      // Only retry in production
      if (process.env.NODE_ENV === 'production') {
        // Reset attempts after 5 minutes for retry
        setTimeout(() => {
          this.reconnectAttempts = 0;
          console.log('WebSocket retry attempts reset, attempting reconnection...');
          this.connect();
        }, 5 * 60 * 1000);
      }
    }
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private handleMessage(message: WebSocketMessage) {
    console.log('WebSocket message received:', message);
    
    switch (message.type) {
      case 'video_progress':
        this.notifySubscribers('video_progress', message.data);
        this.notifySubscribers(`video_progress_${message.data.videoId}`, message.data);
        break;
      
      case 'video_complete':
        this.notifySubscribers('video_complete', message.data);
        this.notifySubscribers(`video_complete_${message.data.videoId}`, message.data);
        break;
      
      case 'video_failed':
        this.notifySubscribers('video_failed', message.data);
        this.notifySubscribers(`video_failed_${message.data.videoId}`, message.data);
        break;
      
      case 'upload_progress':
        this.notifySubscribers('upload_progress', message.data);
        this.notifySubscribers(`upload_progress_${message.data.sessionId}`, message.data);
        break;
      
      case 'system_status':
        this.notifySubscribers('system_status', message.data);
        break;
    }
  }

  private notifySubscribers(event: string, data: any) {
    const subscribers = this.subscribers.get(event);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket subscriber callback:', error);
        }
      });
    }
  }

  public subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    
    this.subscribers.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.subscribers.get(event);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.subscribers.delete(event);
        }
      }
    };
  }

  public subscribeToVideo(videoId: string, callback: (data: VideoProgressData) => void): () => void {
    return this.subscribe(`video_progress_${videoId}`, callback);
  }

  public subscribeToUploadSession(sessionId: string, callback: (data: UploadProgressData) => void): () => void {
    return this.subscribe(`upload_progress_${sessionId}`, callback);
  }

  public send(message: WebSocketMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  public sendVideoProgress(videoId: string, progress: VideoProgressData) {
    this.send({
      type: 'video_progress',
      data: progress,
      timestamp: Date.now(),
      videoId,
    });
  }

  public sendUploadProgress(sessionId: string, progress: UploadProgressData) {
    this.send({
      type: 'upload_progress',
      data: progress,
      timestamp: Date.now(),
      sessionId,
    });
  }

  public isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  public disconnect() {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.subscribers.clear();
    this.connected = false;
  }
}

// Singleton instance
export const webSocketManager = new WebSocketManager();

// React hook for WebSocket
export function useWebSocket() {
  return webSocketManager;
}

// Specific hooks for common use cases
export function useVideoProgress(videoId: string, callback: (data: VideoProgressData) => void) {
  const ws = useWebSocket();
  
  React.useEffect(() => {
    const unsubscribe = ws.subscribeToVideo(videoId, callback);
    return unsubscribe;
  }, [videoId, callback, ws]);
}

export function useUploadProgress(sessionId: string, callback: (data: UploadProgressData) => void) {
  const ws = useWebSocket();
  
  React.useEffect(() => {
    const unsubscribe = ws.subscribeToUploadSession(sessionId, callback);
    return unsubscribe;
  }, [sessionId, callback, ws]);
}