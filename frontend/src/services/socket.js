import { io } from "socket.io-client";

// Detect if we are in production to use relative URL
const isProduction = window.location.hostname !== "localhost";
const SOCKET_URL = isProduction ? window.location.origin : "http://localhost:3001"; 

export const socket = io(SOCKET_URL, {
  autoConnect: true,
  reconnection: true,
});
