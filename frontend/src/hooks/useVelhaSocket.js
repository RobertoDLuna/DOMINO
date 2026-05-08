import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const socket = io(`${SOCKET_URL}/velha`, {
  transports: ['websocket'],
  autoConnect: false,
});

let mountCount = 0;

export function useVelhaSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    mountCount++;
    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Set initial state in case it connected before the listener was attached
    setIsConnected(socket.connected);

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

  const on = useCallback((event, callback) => {
    socket.on(event, callback);
    return () => socket.off(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socket.off(event, callback);
  }, []);

  return { isConnected, emit, on, off, socketId: socket.id };
}
