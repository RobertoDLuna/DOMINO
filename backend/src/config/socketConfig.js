const { Server } = require("socket.io");

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*", // Em produção, mude para a URL do seu frontend
      methods: ["GET", "POST"],
    },
  });

  return io;
};

module.exports = setupSocket;
