const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");

const themeRoutes = require("./src/routes/themeRoutes");

// Global error handlers for Docker troubleshooting
process.on("uncaughtException", (err) => {
  console.error("❌ FATAL: Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ FATAL: Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

console.log("🚀 Iniciando servidor de Dominó...");
console.log(`📂 Diretorio atual (__dirname): ${__dirname}`);

const setupSocket = require("./src/config/socketConfig");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/themes", themeRoutes);

// Serving Static Frontend Files (Production)
const frontendPath = path.join(__dirname, "../frontend/dist");
console.log(`🌐 Servindo frontend de: ${frontendPath}`);
app.use(express.static(frontendPath));

// Servindo Uploads de Temas Customizados
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const server = http.createServer(app);
const io = setupSocket(server);

// Importar e conectar handlers do socket
try {
  require("./src/sockets/gameSocket")(io);
  console.log("🔌 Handlers do Socket carregados com sucesso");
} catch (err) {
  console.error("❌ Erro ao carregar gameSocket:", err);
  process.exit(1);
}

const PORT = process.env.PORT || 3001;

// Healthcheck
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Servidor de Dominó Online" });
});

// SPA Fallback: Qualquer rota que não seja arquivo estático ou API, serve o index.html
// Usando middleware genérico no final para evitar erros de sintaxe do Express 5
app.use((req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// Middleware de Erros Global
app.use(errorMiddleware);

server.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
