require('dotenv').config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");

const themeRoutes = require("./src/modules/domino/themeRoutes");
const authRoutes = require("./src/core/auth/authRoutes");
const schoolRoutes = require("./src/core/schools/schoolRoutes");
const adminRoutes = require("./src/core/admin/adminRoutes");
const rankingRoutes = require("./src/modules/domino/rankingRoutes");
const chessRankingRoutes = require("./src/modules/chess/chessRoutes");
const chessReportRoutes = require("./src/modules/chess/chessReportRoutes");
const quizRoutes = require("./src/modules/quiz/quizRoutes");

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

const setupSocket = require("./src/shared/config/socketConfig");
const errorMiddleware = require("./src/shared/middleware/errorMiddleware");

const app = express();
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175"
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Bloqueado pelo CORS'));
    }
  },
  credentials: true
}));
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
app.use("/api/chess/ranking", chessRankingRoutes);
app.use("/api/chess/reports", chessReportRoutes);
app.use("/api/quiz", quizRoutes);

// Serving Static Frontend Files (Production)
const frontendPath = path.join(__dirname, "../frontend/dist");
const indexPath = path.join(frontendPath, "index.html");
console.log(`🌐 Servindo frontend de: ${frontendPath}`);
console.log(`📄 index.html encontrado? ${require('fs').existsSync(indexPath) ? '✅ SIM' : '❌ NÃO'}`);
app.use(express.static(frontendPath));

// Servindo Uploads de Temas Customizados e Imagens com header CORP liberado
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  setHeaders: (res) => {
    res.set("Cross-Origin-Resource-Policy", "cross-origin");
  }
}));

const server = http.createServer(app);
const io = setupSocket(server);

// Importar e conectar handlers do socket
try {
  require("./src/modules/domino/gameSocket")(io);
  console.log("🔌 Handlers do Socket (Dominó) carregados com sucesso");
} catch (err) {
  console.error("❌ Erro ao carregar gameSocket:", err);
  process.exit(1);
}

try {
  require("./src/modules/chess/chessSocket")(io);
  console.log("♟️  Handlers do Socket (Xadrez) carregados com sucesso");
} catch (err) {
  console.error("❌ Erro ao carregar chessSocket:", err);
  process.exit(1);
}

try {
  require("./src/modules/chess/velhaSocket")(io);
  console.log("❌ Handlers do Socket (Xadrez da Velha) carregados com sucesso");
} catch (err) {
  console.error("❌ Erro ao carregar velhaSocket:", err);
  process.exit(1);
}

try {
  require("./src/modules/chess/peaoSocket")(io);
  console.log("♟️ Handlers do Socket (Peões) carregados com sucesso");
} catch (err) {
  console.error("❌ Erro ao carregar peaoSocket:", err);
  process.exit(1);
}

try {
  require("./src/modules/quiz/quizSocket")(io);
  console.log("🧠 Handlers do Socket (Quiz) carregados com sucesso");
} catch (err) {
  console.error("❌ Erro ao carregar quizSocket:", err);
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
  const { getPrisma } = require('./src/shared/config/prismaClient');
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

const syncDefaultQuizzes = async () => {
  const fs = require('fs');
  const path = require('path');
  const { getPrisma } = require('./src/shared/config/prismaClient');
  const prisma = getPrisma();
  
  try {
    // Verifica se os quizzes padrões já existem (pelo título do primeiro quiz)
    const existingDefaultQuiz = await prisma.quizGame.findFirst({
      where: { title: "Banco BNCC - Computação (Ensino Fundamental I)" }
    });
    
    if (existingDefaultQuiz) {
      console.log(`✅ Banco de Quizzes já contém os quizzes padrão. Pulando seed.`);
      return;
    }

    const seedPath = path.join(__dirname, 'prisma', 'seeds', 'quizzes.json');
    if (!fs.existsSync(seedPath)) {
      console.log(`⚠️ Arquivo de seed de Quizzes não encontrado em: ${seedPath}`);
      return;
    }

    const quizzesData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
    console.log(`🔄 Iniciando seed de ${quizzesData.length} quizzes padrão...`);

    // Um usuário ADMIN ou do sistema precisa ser vinculado como criador do Quiz.
    // Vamos pegar o primeiro ADMIN ou criar um fictício caso o banco esteja totalmente limpo.
    let adminUser = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: {
          fullName: 'Sistema EduGames',
          email: 'sistema@edugames.com',
          password: 'not_used_password',
          role: 'ADMIN'
        }
      });
    }

    for (const quiz of quizzesData) {
      await prisma.quizGame.create({
        data: {
          title: quiz.title,
          description: quiz.description,
          type: quiz.type,
          discipline: quiz.discipline,
          educStage: quiz.educStage,
          yearGrade: quiz.yearGrade,
          timePerQuestion: quiz.timePerQuestion,
          isPublic: true,
          createdById: adminUser.id,
          questions: {
            create: quiz.questions.map(q => ({
              questionText: q.questionText,
              imageUrl: q.imageUrl,
              bnccCode: q.bnccCode,
              bnccSkill: q.bnccSkill,
              answers: {
                create: q.answers.map(a => ({
                  answerText: a.answerText,
                  isCorrect: a.isCorrect
                }))
              }
            }))
          }
        }
      });
    }
    console.log("✅ Seed de Quizzes finalizado com sucesso!");
  } catch (err) {
    console.error("❌ Erro ao realizar seed dos quizzes:", err);
  }
};

if (require.main === module) {
  server.listen(PORT, async () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    await syncDefaultThemes();
    await syncDefaultQuizzes();
  });
}

module.exports = app;
