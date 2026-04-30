/**
 * useChessSocket.js
 * Custom hook that manages the Socket.IO connection to the /chess namespace.
 */
import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

import { SOCKET_URL } from '../config/api';

// Singleton socket instance for the /chess namespace
const socket = io(`${SOCKET_URL}/chess`, { 
  transports: ['websocket'], 
  autoConnect: false 
});

let mountCount = 0;

export function useChessSocket() {
  const [connected, setConnected] = useState(socket.connected);

  useEffect(() => {
    mountCount++;
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial state in case it connected before the listener was attached
    setConnected(socket.connected);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      
      mountCount--;
      if (mountCount === 0) {
        socket.disconnect();
      }
    };
  }, []);

  const emit = useCallback((event, data) => {
    socket.emit(event, data);
  }, []);

  const on = useCallback((event, handler) => {
    socket.on(event, handler);
    return () => socket.off(event, handler);
  }, []);

  const off = useCallback((event, handler) => {
    socket.off(event, handler);
  }, []);

  return { emit, on, off, connected };
}
