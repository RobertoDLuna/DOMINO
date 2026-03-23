const express = require("express");
const http = require("http");
const cors = require("cors");
const setupSocket = require("./src/config/socketConfig");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = setupSocket(server);

// Importar e conectar handlers do socket
require("./src/sockets/gameSocket")(io);

const PORT = process.env.PORT || 3001;

// Rota básica para conferência
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Servidor de Dominó Online" });
});

// Middleware de Erros Global
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
