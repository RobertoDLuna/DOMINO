# 🚀 Guia de Deploy - EDU GAMES Dominó com PostgreSQL

## Pré-requisitos no VPS
- Docker Swarm inicializado
- Rede `public-proxy-v2` criada
- Traefik configurado

---

## 1️⃣ Criar o Secret da senha do Postgres (UMA VEZ APENAS)

```bash
# No VPS (manager node), crie o secret de forma segura:
echo "SUA_SENHA_AQUI" | docker secret create postgres_password -

# Ou melhor, use um password gerado aleatoriamente:
openssl rand -base64 32 | docker secret create postgres_password -
```

---

## 2️⃣ Configurar a variável POSTGRES_PASSWORD no Swarm

O `docker-stack.yml` usa `${POSTGRES_PASSWORD}` como variável de ambiente.
Você tem duas opções:

**Opção A - Exportar antes do deploy (mais simples):**
```bash
export POSTGRES_PASSWORD="SUA_SENHA_FORTE_AQUI"
docker stack deploy -c docker-stack.yml domino
```

**Opção B - Usar arquivo .env no VPS (recomendado):**
```bash
# Crie um arquivo de variáveis no VPS (fora do código):
echo "POSTGRES_PASSWORD=SUA_SENHA_FORTE_AQUI" > /opt/domino/.env

# E faça o deploy carregando as variáveis:
export $(cat /opt/domino/.env | xargs) && docker stack deploy -c docker-stack.yml domino
```

---

## 3️⃣ Deploy da stack

```bash
docker stack deploy -c docker-stack.yml domino
```

---

## 4️⃣ Executar Migrações do Banco (Primeira vez)

O container já executa `prisma migrate deploy` automaticamente no startup.
Mas se quiser verificar:

```bash
# Ver logs do container de app:
docker service logs domino_app --tail 50

# Ou executar manualmente em um container temporário:
docker run --rm \
  --network public-proxy-v2 \
  -e DATABASE_URL="postgresql://domino:SUA_SENHA@postgres:5432/domino_db?schema=public" \
  robsluna/domino-game:latest \
  sh -c "cd /app/backend && npx prisma migrate deploy"
```

---

## 5️⃣ Popular Categorias Iniciais (Primeira vez)

```bash
# Executar seed de categorias no banco:
docker run --rm \
  --network public-proxy-v2 \
  -e DATABASE_URL="postgresql://domino:SUA_SENHA@postgres:5432/domino_db?schema=public" \
  robsluna/domino-game:latest \
  sh -c "cd /app/backend && node src/scripts/seedCategories.js"
```

---

## 📊 Verificar Status

```bash
# Listar serviços rodando:
docker stack ps domino

# Logs do Postgres:
docker service logs domino_postgres

# Logs da App:
docker service logs domino_app

# Verificar volumes:
docker volume ls | grep domino
```

---

## 🔄 Atualizar a Imagem (CI/CD)

```bash
# Fazer build e push da nova imagem:
docker build -t robsluna/domino-game:latest .
docker push robsluna/domino-game:latest

# No VPS, atualizar o serviço:
docker service update --image robsluna/domino-game:latest domino_app
```

---

## ⚠️ Backup do Banco

```bash
# Fazer dump do banco:
docker exec $(docker ps -q -f name=domino_postgres) \
  pg_dump -U domino domino_db > backup_$(date +%Y%m%d).sql

# Restaurar:
docker exec -i $(docker ps -q -f name=domino_postgres) \
  psql -U domino domino_db < backup_20241201.sql
```
