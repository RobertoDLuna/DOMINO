const { io } = require("socket.io-client");

console.log("Connecting to /velha...");
const socketVelha = io("http://localhost:3001/velha", { transports: ['websocket'] });

socketVelha.on("connect", () => {
  console.log("SUCCESS: /velha connected with id", socketVelha.id);
  process.exit(0);
});

socketVelha.on("connect_error", (err) => {
  console.log("ERROR: /velha connect_error", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.log("TIMEOUT");
  process.exit(1);
}, 3000);
