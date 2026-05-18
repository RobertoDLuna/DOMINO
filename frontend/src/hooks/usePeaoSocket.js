import { useEffect, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../config/api';

const socket = io(`${SOCKET_URL}/peao`, {
  transports: ['websocket'],
  autoConnect: false,
});

let mountCount = 0;

export function usePeaoSocket() {
  const [isConnected, setIsConnected] = useState(socket.connected);

  useEffect(() => {
    mountCount++;
    if (!socket.connected) socket.connect();

    const onConnect    = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    setIsConnected(socket.connected);

    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
      mountCount--;
      if (mountCount === 0) socket.disconnect();
    };
  }, []);

  const emit = useCallback((event, data) => socket.emit(event, data), []);
  const on   = useCallback((event, cb)   => { socket.on(event, cb); return () => socket.off(event, cb); }, []);
  const off  = useCallback((event, cb)   => socket.off(event, cb), []);

  return { isConnected, emit, on, off, socketId: socket.id };
}
