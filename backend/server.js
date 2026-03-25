const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const setupSocket = require("./src/config/socketConfig");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

// Serving Static Frontend Files (Production)
const frontendPath = path.join(__dirname, "../frontend/dist");
app.use(express.static(frontendPath));

const server = http.createServer(app);
const io = setupSocket(server);

// Importar e conectar handlers do socket
require("./src/sockets/gameSocket")(io);

const PORT = process.env.PORT || 3001;

// Healthcheck
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Servidor de Dominó Online" });
});

// SPA Fallback: Qualquer rota que não seja arquivo estático ou API, serve o index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Middleware de Erros Global
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
