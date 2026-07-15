# EDU GAMES - Plataforma Educacional Multiplayer

Uma plataforma de jogos educacionais e clássicos desenvolvida para promover engajamento estudantil, facilitar diagnósticos pedagógicos integrados à Base Nacional Comum Curricular (BNCC) e fomentar o aprendizado através de competições lúdicas.

---

## Visão Geral e Funcionalidades Principais

### Modos de Jogo e Interatividade
A plataforma opera como um ecossistema centralizado com suporte a multiplayer em tempo real (PvP) e integração com inteligência artificial (PvE):
- **Dominó:** Suporte a partidas multiplayer com temas e categorias customizáveis (ex: arte, computação).
- **Xadrez Clássico:** Integração com o motor Stockfish, oferecendo múltiplos níveis de dificuldade e suporte a partidas online entre usuários.
- **Xadrez da Velha:** Variação dinâmica do jogo da velha tradicional.
- **Batalha dos Peões:** Módulo focado em introdução à estratégia enxadrística.
- **Mestre do Quiz:** Módulo de avaliação com duas abordagens principais:
  - **Avaliação Pedagógica:** Totalmente mapeado de acordo com as habilidades da BNCC. Permite a geração de diagnósticos de nível de proficiência dos alunos (Iniciante, Em Construção, Proficiente, Avançado).
  - **Modo Comemorativo:** Voltado ao engajamento livre em datas específicas.

### Sistema de Torneios e Ranqueamento
- **Gerenciamento de Campeonatos:** Criação e administração de torneios nos formatos de Eliminatórias (chaveamento padrão) e Pontos Corridos (Round Robin).
- **Ranking Estratificado:** Sistema de pontuação contínuo que classifica alunos e consolida o desempenho por instituição de ensino, baseado em taxas de vitórias e progressão em torneios.

### Controle de Acesso e Gestão Institucional
- **Perfis de Usuário (RBAC):** Controle de permissões baseado em funções (Administrador, Professor, Aluno e Público Externo).
- **Modo Visitante (Guest):** Avaliação da plataforma e participação em atividades de forma anônima e sem registro.
- **Arquitetura Multi-Tenant:** Associação estruturada de usuários a entidades escolares, permitindo a segregação de métricas e painéis administrativos por instituição.

---

## Arquitetura e Stack Tecnológica

O sistema foi concebido utilizando uma arquitetura distribuída, com clara separação de responsabilidades entre Frontend (Client) e Backend (API e Sockets). O ecossistema é otimizado para comunicação assíncrona de baixa latência.

### Frontend
- **Framework base:** React 18 empacotado via Vite.
- **Estilização e UI/UX:** Tailwind CSS, adotando metodologias Mobile-First e características de Progressive Web Apps (PWA).
- **Protocolo de Comunicação em Tempo Real:** Socket.io-client.
- **Motores Específicos:** Bibliotecas especializadas como `chess.js`, `react-chessboard` e `stockfish`.
- **Garantia de Qualidade (Testes):** Vitest para testes unitários e Cypress para testes end-to-end (E2E).

### Backend
- **Ambiente de Execução:** Node.js integrado com o framework Express.
- **Mensageria Real-time:** Socket.io acoplado ao `@socket.io/redis-adapter` para suporte nativo a escalabilidade horizontal.
- **Persistência de Dados:** PostgreSQL com interface e orquestração pelo Prisma ORM.
- **Gestão de Estado e Pub/Sub:** Redis.
- **Controle de Autenticação:** Criptografia Bcrypt acoplada à geração e validação de JSON Web Tokens (JWT).
- **Processamento Assíncrono:** Módulo `node-cron` para controle transacional automatizado (ex: encerramento temporal de quizzes e gerenciamento do ciclo de vida de torneios).

### Infraestrutura, Orquestração e Deploy
- **Containerização:** Padrão Docker e orquestração em nível de cluster utilizando Docker Swarm.
- **Balanceamento de Carga e Gateway:** Traefik configurado para roteamento dinâmico e terminação SSL nativa.
- **Integração Contínua e Deploy Contínuo (CI/CD):** Parametrização baseada em `docker-stack.yml` e scripts de deploy consolidados para automação de esteiras.

---

## Segurança e Conformidade Regulatória (LGPD)

Todo o ecossistema é estritamente aderente aos princípios da Lei Geral de Proteção de Dados (LGPD) e alinhado aos padrões da Clean Architecture:
- **Proteção de Dados em Trânsito e em Repouso:** Nenhuma credencial, token ou API key é trafegada sem criptografia. Todas as senhas operam sob processos unidirecionais de hashing.
- **Isolamento Lógico (Multi-Tenancy):** Dados operacionais e históricos são particionados por identificadores institucionais (`schoolId`), garantindo a estrita mitigação de vazamento de informações operacionais entre organizações.
- **Princípio do Menor Privilégio:** Interações com o banco de dados são blindadas por camadas de validação via JWT na API. O Frontend é estritamente abstraído da topologia e modelo de dados, mitigando vulnerabilidades como SQL Injection (garantia provida em âmbito de banco de dados pelo Prisma ORM).
- **Auditoria e Monitoramento Seguros:** Processos de logging não indexam PII (Personally Identifiable Information). São utilizados Correlation IDs para fins de rastreabilidade de requisições, preservando o sigilo individual.

---

## Instruções para Execução Local

### 1. Requisitos de Sistema
- Ambiente de execução Node.js (versão 18 ou superior).
- Docker e Docker Compose devidamente instalados para orquestração dos serviços de infraestrutura de dados (Banco de Dados e Cache).

### 2. Configuração do Ambiente
Realize o clone do repositório e proceda com a instalação unificada das dependências para todas as camadas do projeto:
```bash
npm run install:all
```
Crie e preencha os arquivos `.env` baseando-se no modelo estabelecido em `.env.example`.

### 3. Provisionamento de Dados
Inicie os serviços auxiliares (PostgreSQL e Redis) através do contêiner configurado:
```bash
docker-compose -f docker-compose.db.yml up -d
```
Sincronize o schema do banco de dados e execute a injeção dos dados obrigatórios iniciais:
```bash
npm run prisma:migrate --prefix backend
npm run db:seed --prefix backend
```

### 4. Inicialização do Projeto
Na raiz do projeto, acione o comando para iniciar simultaneamente as instâncias de desenvolvimento do Frontend e do Backend:
```bash
npm run dev
```
A interface gráfica da aplicação estará acessível através do endereço `http://localhost:5173`.

---

## Garantia de Qualidade de Código (QA)

A plataforma conta com esteiras de testes focadas em garantir a integridade das lógicas de negócio cruciais, baseando-se no ciclo Test-Driven Development (TDD):
- **Testes Unitários e de Integração:** Gerenciados e executados pelo Vitest.
- **Testes E2E (End-to-End):** Processados via Cypress. Para executar a bateria completa localmente, utilize o comando `npm run test:e2e`.

---
*Projeto arquitetado sob foco em rigorosas práticas de engenharia de software, priorizando acessibilidade, modularidade, e governança corporativa de segurança da informação.*
