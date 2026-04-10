require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");

const themeRoutes = require("./src/routes/themeRoutes");
const authRoutes = require("./src/routes/authRoutes");
const schoolRoutes = require("./src/routes/schoolRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const rankingRoutes = require("./src/routes/rankingRoutes");

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

// Garantir diretórios de upload para persistência (Docker Volumes)
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
const themesDir = path.join(uploadsDir, 'themes');
if (!fs.existsSync(themesDir)) {
  console.log("📁 Criando diretórios de upload...");
  fs.mkdirSync(themesDir, { recursive: true });
} else {
  const files = fs.readdirSync(themesDir);
  console.log(`✅ Volume de Temas detectado em [${themesDir}]: ${files.length} arquivos.`);
  console.log(`🔍 Auditoria de Uploads: ${JSON.stringify(files)}`);
}

const setupSocket = require("./src/config/socketConfig");
const errorMiddleware = require("./src/middleware/errorMiddleware");

const app = express();
app.use(cors());
app.use(express.json());

// Log de requisições para depuração (Raio-X)
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/schools", schoolRoutes);
app.use("/api/themes", themeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ranking", rankingRoutes);

// Serving Static Frontend Files (Production)
const frontendPath = path.join(__dirname, "../frontend/dist");
const indexPath = path.join(frontendPath, "index.html");
console.log(`🌐 Servindo frontend de: ${frontendPath}`);
console.log(`📄 index.html encontrado? ${require('fs').existsSync(indexPath) ? '✅ SIM' : '❌ NÃO'}`);
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
app.use((req, res) => {
  // Se for uma requisição de API que chegou aqui, é um 404 real de API
  if (req.url.startsWith('/api')) {
    return res.status(404).json({ error: "Endpoint de API não encontrado. Verifique se o servidor foi reiniciado." });
  }

  console.log(`🔍 SPA Fallback: Servindo index.html para ${req.url}. Caminho: ${path.join(frontendPath, "index.html")}`);

  const indexPath = path.join(frontendPath, "index.html");
  if (require('fs').existsSync(indexPath)) {
    return res.sendFile(indexPath);
  }
  
  // Resposta resiliente padrão
  res.status(200).send(`
    <body style="background:#009660;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
      <div style="text-align:center">
        <h1>🚀 DOMINÓ ONLINE</h1>
        <p>Iniciando componentes da plataforma...</p>
        <script>setTimeout(() => location.reload(), 3000)</script>
      </div>
    </body>
  `);
});

// Middleware de Erros Global
app.use(errorMiddleware);

const syncDefaultThemes = async () => {
  const { getPrisma } = require('./src/config/prismaClient');
  const prisma = getPrisma();
  
  const defaultThemes = [
    { id: 'animais', name: 'Animais Selvagens' },
    { id: 'matematica', name: 'Matemática Divertida' },
    { id: 'frutas', name: 'Frutas Tropicais' },
    { id: 'espaco', name: 'Espaço Sideral' },
    { id: 'objetos', name: 'Objetos Escolares' },
    { id: 'classico', name: 'Dominó Clássico' }
  ];

  try {
    // Garante que existe uma categoria "Padrão"
    const cat = await prisma.category.upsert({
      where: { name: 'Padrão' },
      update: {},
      create: { name: 'Padrão', isDefault: true }
    });

    for (const theme of defaultThemes) {
      await prisma.theme.upsert({
        where: { id: theme.id },
        update: { name: theme.name, categoryId: cat.id, isApproved: true, isPublic: true },
        create: { 
          id: theme.id, 
          name: theme.name, 
          categoryId: cat.id, 
          isApproved: true, 
          isPublic: true,
          color: '#009660'
        }
      });
    }
    console.log("✅ Temas Padrão sincronizados no banco de dados.");
  } catch (err) {
    console.error("❌ Erro ao sincronizar temas padrão:", err);
  }
};

server.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  await syncDefaultThemes();
});
