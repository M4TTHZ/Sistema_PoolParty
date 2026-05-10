# 🏊 PoolParty Manager

Sistema completo de gestão de reservas, estoque e manutenção.

---

## Instalação local

```bash
pnpm install
cp .env.example .env        # configure DATABASE_URL
pnpm drizzle-kit push       # cria as tabelas
pnpm add pino pino-pretty helmet express-rate-limit pdfkit
pnpm add -D @types/pdfkit
mysql -u root -p poolparty < drizzle/add_indexes.sql   # índices
pnpm dev
```

## Docker

```bash
docker-compose up -d        # sobe MySQL + App
docker-compose logs -f app
docker-compose down
```

## Arquitetura

```
server/
├── _core/          Express, tRPC, OAuth
├── repositories/   Acesso ao banco (por entidade)
├── routers/        Regras de negócio (tRPC)
├── services/       PDF, etc.
└── utils/          logger.ts, errorHandler.ts
```

## Segurança

- Helmet (security headers)
- Rate limit: 300 req/min
- Request ID em todos os logs
- RBAC: admin / user
- Zod em todos os inputs
- Global error handler padronizado

## Logs (Pino)

```
LOG_LEVEL=debug|info|warn|error   # via .env
```

## Backup (Docker)

```bash
docker exec poolparty_db mysqldump -u root -pPoolparty123! poolparty > backup.sql
```
