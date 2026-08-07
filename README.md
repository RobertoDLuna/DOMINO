# EDU GAMES - Plataforma Educacional Multiplayer

Uma plataforma completa de jogos educacionais e clássicos desenvolvida para promover o engajamento estudantil, facilitar diagnósticos pedagógicos alinhados à Base Nacional Comum Curricular (BNCC) e fomentar o aprendizado através de competições lúdicas em tempo real.

---

## 📑 Sumário

- [Visão Geral e Módulos de Jogo](#-visão-geral-e-módulos-de-jogo)
- [Arquitetura do Sistema](#-arquitetura-do-sistema)
- [Estrutura de Pastas](#-estrutura-de-pastas)
- [Segurança e Conformidade (LGPD)](#-segurança-e-conformidade-lgpd)
- [Variáveis de Ambiente](#-variáveis-de-ambiente)
- [Instalação e Execução Local](#-instalação-e-execução-local)
- [Carga de Dados e Matrizes BNCC](#-carga-de-dados-e-matrizes-bncc)
- [Credenciais Padrão para Testes](#-credenciais-padrão-para-testes)
- [Scripts e Comandos Úteis](#-scripts-e-comandos-úteis)
- [Deploy em Produção](#-deploy-em-produção)

---

## 🎮 Visão Geral e Módulos de Jogo

A plataforma opera como um ecossistema centralizado com suporte a multiplayer em tempo real (PvP), partidas contra robôs e inteligência artificial (PvE), e modo offline responsivo:

### 🧩 1. Dominó Educativo
- **Multiplayer e Solo:** Partidas multiplayer em tempo real e modo contra robô.
- **Categorias e Temas Customizáveis:** Suporte a temas dinâmicos (Arte, Computação, Matemática, Ciências, etc.) com criador de temas integrado.

### ♟️ 2. Ecossistema de Xadrez
- **Xadrez Clássico:** Integração com motor de xadrez e motor Stockfish, múltiplos níveis de dificuldade, relatórios de precisão e partidas online.
- **Xadrez da Velha:** Variação dinâmica e estratégica mesclando peças de xadrez no tabuleiro de jogo da velha.
- **Batalha dos Peões:** Modo dinâmico focado em fundamentos e estratégia inicial de peões.

### 🧠 3. Mestre do Quiz (Pedagógico & BNCC)
- **Avaliação Diagnóstica:** Totalmente mapeado de acordo com habilidades da BNCC por ano e disciplina, gerando diagnósticos por nível de proficiência (*Iniciante, Em Construção, Proficiente, Avançado*).
- **Modos Solo e Sala Coletiva:** Salas em tempo real onde o professor atua como anfitrião e os alunos competem simultaneamente.
- **Modo Comemorativo:** Voltado a datas comemorativas e eventos interdisciplinares.

### 🏆 4. Gestão de Torneios e Ranqueamento
- **Formatos de Torneio:** Suporte a Eliminatórias (Mata-Mata com chaveamento automático e *byes*) e Pontos Corridos (*Round Robin*).
- **Ranking Estratificado:** Classificação contínua individual por jogo e consolidada por escola.

### 👥 5. Gestão de Acessos e Perfis (RBAC)
- **Perfis de Usuário:** Administrador, Professor, Aluno e Visitante (*Guest*).
- **Multi-Tenancy Institucional:** Segregação lógica de métricas, turmas e relatórios por unidade escolar.

---

## 🏗️ Arquitetura do Sistema

```mermaid
flowchart TD
    subgraph Client ["Frontend (React 18 + Vite + Tailwind)"]
        UI[UI Responsiva / PWA]
        SockClient[Socket.io Client]
        StockfishEngine[Motor Stockfish / Chess.js]
    end

    subgraph Gateway ["Roteamento e Rede"]
        Traefik[Traefik Proxy / SSL]
    end

    subgraph Server ["Backend (Node.js + Express 5)"]
        REST[API REST / Middlewares]
        SockServer[Socket.io Server]
        Cron[Node-Cron / Torneios & Quizzes]
        Prisma[Prisma ORM]
    end

    subgraph Data ["Camada de Persistência & Cache"]
        PostgreSQL[(PostgreSQL)]
        Redis[(Redis Pub/Sub & Cache)]
    end

    UI -->|HTTP / REST| Traefik
    SockClient -->|WebSockets| Traefik
    Traefik --> REST
    Traefik --> SockServer
    REST --> Prisma
    SockServer --> Redis
    Cron --> Prisma
    Prisma --> PostgreSQL
```

### Stack Tecnológica

| Camada | Tecnologias Principais |
| :--- | :--- |
| **Frontend** | React 18, Vite, Tailwind CSS, Socket.io-client, Lucide Icons, Canvas Confetti |
| **Motores de Jogo** | Chess.js, React-Chessboard, Stockfish WebWorker |
| **Backend** | Node.js, Express 5, Socket.io, `@socket.io/redis-adapter`, JWT, BcryptJS, Multer |
| **Banco de Dados & Cache** | PostgreSQL, Prisma ORM, Redis |
| **Agendamento & Tarefas** | Node-Cron (automação de status de torneios e sessões) |
| **Testes & QA** | Vitest (Unitários/Integração no Backend e Frontend), Cypress (E2E) |
| **Infraestrutura** | Docker, Docker Compose, Docker Swarm, Traefik |

---

## 📂 Estrutura de Pastas

```text
DOMINO/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma              # Modelagem de dados relacional
│   ├── src/
│   │   ├── core/                      # Módulos centrais (Admin, Autenticação)
│   │   │   ├── admin/                 # Controladores e rotas de administração
│   │   │   └── auth/                  # Login, registro, sessões e JWT
│   │   ├── modules/                   # Módulos isolados por domínio de jogo
│   │   │   ├── chess/                 # Xadrez, Peão, Velha, Sockets e Rankings
│   │   │   ├── domino/                # Dominó, Temas e Pontuação
│   │   │   ├── quiz/                  # Quizzes, BNCC, Sessões e Relatórios
│   │   │   └── tournament/            # Chaveamentos, Cron e Campeonatos
│   │   ├── scripts/                   # Scripts de seed, importação BNCC e simulação
│   │   ├── shared/                    # Configurações (Prisma, Redis, Sockets) e Middlewares
│   │   └── tests/                     # Testes automatizados (API, Services e Unitários)
│   └── server.js                      # Ponto de entrada do servidor backend
│
├── frontend/
│   ├── src/
│   │   ├── components/                # Componentes globais e layouts
│   │   ├── context/                   # Contextos React (Autenticação, Tema, Som, Jogo)
│   │   ├── modules/                   # Telas e componentes por módulo
│   │   │   ├── chess/                 # Telas de Xadrez, Peão, Velha e Relatórios
│   │   │   ├── domino/                # Tabuleiro de Dominó e Criador de Temas
│   │   │   ├── quiz/                  # Modos Solo, Multiplayer e Editor de Quiz
│   │   │   └── tournament/            # Listagem, Chaves e Detalhes de Torneios
│   │   ├── services/                  # Clientes de API e gerenciadores de áudio
│   │   └── App.jsx                    # Roteador central e controle de sessão
│   └── vite.config.js
│
├── cypress/                           # Bateria de testes End-to-End (E2E)
├── docker-compose.db.yml              # Serviços de banco local (Postgres + Redis)
├── docker-stack.yml                   # Configuração de deploy para Docker Swarm
└── DEPLOY.md                          # Guia detalhado de deploy em VPS
```

---

## 🛡️ Segurança e Conformidade (LGPD)

O sistema segue rigorosamente as diretrizes da Lei Geral de Proteção de Dados e as melhores práticas de Clean Architecture:

- **Isolamento Lógico Multi-Tenant:** Segregação estrita dos dados institucionais por `schoolId`. Usuários de uma instituição não acessam métricas nem dados privados de outra.
- **Autenticação Segura:** Autenticação stateless via JSON Web Token (JWT) com expiração controlada e senhas criptografadas com `bcryptjs` (salt rounds 10).
- **Proteção Contra SQL Injection:** O acesso ao banco é 100% orquestrado via queries parametrizadas pelo Prisma ORM, impedindo concatenação arbitrária de strings SQL.
- **Sanitização de Logs:** Logs de sistema utilizam identificadores anônimos (`requestId`) e não expõem senhas, tokens ou dados sensíveis (PII).
- **Controle de Sessão e Visitantes:** Modo visitante estruturado para não reter dados pessoais quando desnecessário.

---

## ⚙️ Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto com base no arquivo `.env.example`:

| Variável | Descrição | Exemplo / Padrão Local |
| :--- | :--- | :--- |
| `DATABASE_URL` | URL de conexão com o PostgreSQL | `postgresql://postgres:postgres@localhost:5432/domino_db?schema=public` |
| `POSTGRES_PASSWORD` | Senha do container PostgreSQL | `postgres` |
| `JWT_SECRET` | Chave secreta de assinatura JWT | `sua_chave_secreta_super_forte_aqui` |
| `REDIS_URL` *(opcional)* | URL de conexão com o servidor Redis | `redis://localhost:6379` |
| `PORT` *(opcional)* | Porta do servidor Backend | `3000` |
| `FRONTEND_URL` *(opcional)* | URL de origem autorizada para CORS | `http://localhost:5173` |

---

## 🚀 Instalação e Execução Local

### 1. Pré-requisitos
- **Node.js:** Versão 18 ou superior.
- **Docker & Docker Compose:** Para provisionar o PostgreSQL e o Redis localmente.

### 2. Instalação das Dependências
Clone o repositório e instale as dependências de todas as camadas com um único comando:
```bash
npm run install:all
```

### 3. Subir os Serviços de Infraestrutura (Banco & Cache)
Inicie o PostgreSQL e o Redis via Docker Compose:
```bash
docker-compose -f docker-compose.db.yml up -d
```

### 4. Executar Migrações e Inicializar o Banco
Execute as migrações do Prisma para estruturar as tabelas:
```bash
npm run prisma:migrate --prefix backend
```

### 5. Executar o Projeto em Desenvolvimento
Inicie simultaneamente o Frontend (Vite) e o Backend (Express):
```bash
npm run dev
```

Acesse a aplicação no navegador: **`http://localhost:5173`** (API disponível em `http://localhost:3000`).

---

## 📚 Carga de Dados e Matrizes BNCC

Para popular o banco com as categorias, matrizes curriculares da BNCC, perguntas pedagógicas e usuários de demonstração, execute os scripts disponíveis na pasta `backend/src/scripts`:

```bash
# 1. Popula as categorias padrão do Dominó (Educação Infantil, Anos Iniciais, etc.)
node backend/src/scripts/seedCategories.js

# 2. Importa as habilidades da BNCC (Matrizes de Arte e Computação)
node backend/src/scripts/importBncc.js

# 3. Cria os Quizzes pedagógicos divididos por anos/séries alinhados à BNCC
node backend/src/scripts/seedQuizQuestions.js

# 4. Cria o usuário Administrador padrão
node backend/src/scripts/seedAdmin.js

# 5. (Opcional) Simula torneios e gera histórico para visualização de dashboards
node backend/src/scripts/simulateTournaments.js
```

---

## 🔑 Credenciais Padrão para Testes

Após executar os scripts de seed acima, você pode utilizar os seguintes acessos padrão no ambiente de desenvolvimento:

| Perfil | E-mail | Senha Padrão | Finalidade |
| :--- | :--- | :--- | :--- |
| **Administrador** | `robertocgw@gmail.com` | `admin123` | Acesso total, aprovação de temas, importação de escolas e métricas gerais |
| **Admin de Testes** | `admin@test.com` | `test123` | Utilizado na suíte de testes automatizados e Cypress E2E |

---

## 🧪 Scripts e Comandos Úteis

### Comandos da Raiz

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o Frontend e o Backend concorrentemente |
| `npm run install:all` | Instala dependências do Frontend e Backend |
| `npm test` | Executa a suíte de testes completa (Frontend + Backend) |
| `npm run test:coverage` | Executa testes com relatório completo de cobertura de código |
| `npm run test:e2e` | Executa os testes de ponta a ponta com Cypress |
| `npm run cy:open` | Abre a interface interativa do Cypress |

### Comandos do Backend

| Comando | Descrição |
| :--- | :--- |
| `npm test --prefix backend` | Executa os testes automatizados do Backend (Vitest) |
| `npm run test:watch --prefix backend` | Executa os testes em modo observador (*watch*) |
| `npx prisma studio --schema backend/prisma/schema.prisma` | Abre o painel visual do Prisma Studio no navegador |
| `npm run prisma:generate --prefix backend` | Atualiza o cliente tipado do Prisma após alterações no schema |

### Comandos do Frontend

| Comando | Descrição |
| :--- | :--- |
| `npm run build --prefix frontend` | Compila o bundle otimizado de produção do Frontend |
| `npm run preview --prefix frontend` | Visualiza localmente o build de produção |

---

## 🌐 Deploy em Produção

Para instruções completas sobre deploy em servidores de produção com **Docker Swarm**, segredos seguros (*Docker Secrets*), terminação SSL e proxy reverso com **Traefik**, consulte o documento dedicado:

📖 **[Guia de Deploy (DEPLOY.md)](./DEPLOY.md)**

---

*Projeto arquitetado sob rigorosas práticas de engenharia de software, priorizando acessibilidade, modularidade, tempo de resposta em tempo real e governança de dados.*
