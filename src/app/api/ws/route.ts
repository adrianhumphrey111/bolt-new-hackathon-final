import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '../../../lib/supabase/server';

// WebSocket connection store
const connections = new Map<string, WebSocket>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return new Response('Missing token', { status: 401 });
    }

    // For development, return a mock response since WebSocket upgrade isn't available in Next.js API routes
    if (process.env.NODE_ENV === 'development') {
      return new Response('WebSocket mock endpoint - not implemented in development', { 
        status: 501,
        headers: {
          'Content-Type': 'text/plain'
        }
      });
    }

    // Verify the token with Supabase
    const supabase = createServerSupabaseClient();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return new Response('Invalid token', { status: 401 });
    }

    // Check if browser supports WebSocket upgrade
    const upgrade = request.headers.get('upgrade');
    if (upgrade !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 400 });
    }

    // Create WebSocket connection
    const { socket, response } = upgradeWebSocket(request);
    
    const connectionId = `${user.id}_${Date.now()}`;
    connections.set(connectionId, socket);

    socket.onopen = () => {
      console.log(`WebSocket connected: ${connectionId}`);
      
      // Send welcome message
      socket.send(JSON.stringify({
        type: 'connection',
        data: { status: 'connected', connectionId },
        timestamp: Date.now(),
        userId: user.id,
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          return;
        }

        // Handle other message types
        handleWebSocketMessage(connectionId, user.id, message);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    };

    socket.onclose = () => {
      console.log(`WebSocket disconnected: ${connectionId}`);
      connections.delete(connectionId);
    };

    socket.onerror = (error) => {
      console.error(`WebSocket error for ${connectionId}:`, error);
      connections.delete(connectionId);
    };

    return response;
  } catch (error) {
    console.error('WebSocket connection error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

function upgradeWebSocket(request: NextRequest) {
  // This is a simplified WebSocket upgrade implementation
  // In a real production environment, you'd use a proper WebSocket library
  
  const response = new Response(null, {
    status: 101,
    headers: {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Accept': generateWebSocketAccept(
        request.headers.get('Sec-WebSocket-Key') || ''
      ),
    },
  });

  // Mock WebSocket object for development
  const socket = {
    send: (data: string) => {
      console.log('WebSocket send:', data);
    },
    onopen: null as (() => void) | null,
    onmessage: null as ((event: { data: string }) => void) | null,
    onclose: null as (() => void) | null,
    onerror: null as ((error: any) => void) | null,
  };

  return { socket, response };
}

function generateWebSocketAccept(key: string): string {
  // WebSocket protocol requires specific key transformation
  const crypto = require('crypto');
  const WEBSOCKET_MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  return crypto
    .createHash('sha1')
    .update(key + WEBSOCKET_MAGIC_STRING)
    .digest('base64');
}

function handleWebSocketMessage(connectionId: string, userId: string, message: any) {
  console.log(`WebSocket message from ${connectionId}:`, message);
  
  // Handle different message types
  switch (message.type) {
    case 'subscribe_video':
      subscribeToVideo(connectionId, message.data.videoId);
      break;
    
    case 'subscribe_upload_session':
      subscribeToUploadSession(connectionId, message.data.sessionId);
      break;
    
    case 'unsubscribe':
      unsubscribeFromAll(connectionId);
      break;
    
    default:
      console.warn('Unknown message type:', message.type);
  }
}

function subscribeToVideo(connectionId: string, videoId: string) {
  // In a real implementation, this would set up database listeners
  console.log(`Subscribing connection ${connectionId} to video ${videoId}`);
}

function subscribeToUploadSession(connectionId: string, sessionId: string) {
  // In a real implementation, this would set up session listeners
  console.log(`Subscribing connection ${connectionId} to upload session ${sessionId}`);
}

function unsubscribeFromAll(connectionId: string) {
  // Clean up all subscriptions for this connection
  console.log(`Unsubscribing connection ${connectionId} from all events`);
}

// Broadcast message to all connections for a specific user
export function broadcastToUser(userId: string, message: any) {
  connections.forEach((socket, connectionId) => {
    if (connectionId.startsWith(userId)) {
      try {
        socket.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error broadcasting to connection:', error);
      }
    }
  });
}

// Broadcast message to specific connection
export function broadcastToConnection(connectionId: string, message: any) {
  const socket = connections.get(connectionId);
  if (socket) {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error broadcasting to connection:', error);
    }
  }
}

// Broadcast message to all connections
export function broadcastToAll(message: any) {
  connections.forEach((socket, connectionId) => {
    try {
      socket.send(JSON.stringify(message));
    } catch (error) {
      console.error('Error broadcasting to connection:', error);
    }
  });
}

// Get connection count
export function getConnectionCount(): number {
  return connections.size;
}

// Get connections for a specific user
export function getUserConnections(userId: string): string[] {
  return Array.from(connections.keys()).filter(id => id.startsWith(userId));
}