# Library Management System

TAASS Project (2025/26), University of Turin
Author: Nasir Shahzad Yasin (1236376)
Instructor: Professor Claudia Picardi

## Architecture

Three domain microservices, one API Gateway, one frontend, matching the
team-of-1 requirement (three microservices, at least two "domain logic").
All three here are domain logic; Identity and Access is handled at the
API Gateway (password authentication, account approval, and JWT) rather than as a fourth microservice, and
Notification is handled inside Reservation rather than as its own service.

| Service               | Bounded Context        | Owns                            |
|------------------------|-------------------------|-----------------------------------|
| catalog-service        | Catalog                 | Book, Author                     |
| borrow-service         | Borrow                  | Borrow                           |
| reservation-service    | Reservation             | Reservation, Notification        |
| api-gateway            | (Identity and Access)   | Identity store, account approval, JWT, routing |

Communication: REST between services (team-of-1 requirement: REST-only is
acceptable). Catalog calls Borrow and Reservation to check for active
transactions before archiving a title. Borrow calls Catalog to update copy
availability and Reservation to coordinate its queue. Reservation calls
Catalog to verify that a title exists and is active. The availability
notification flow currently uses REST and Socket.IO; a message broker such as
RabbitMQ or Kafka is a possible future extension, not a current dependency.

Each service owns its own PostgreSQL database (database-per-service).

See `/docs` for the requirements analysis, class diagram, and collaboration
diagram produced during Project Review 1. For a fully annotated file-by-file
breakdown, see `docs/PROJECT_STRUCTURE.md`.

### Request and data flow

```text
Browser (React)
  ├── /auth/*, /admin/* ────────────────────────────┐
  ├── /api/catalog/* ──> API Gateway ──> Catalog ──> catalog PostgreSQL
  ├── /api/borrow/* ───> API Gateway ──> Borrow ────> borrow PostgreSQL
  ├── /api/reservations/* -> API Gateway -> Reservation -> reservation PostgreSQL
  └── Socket.IO connection ───────────────> API Gateway

Catalog ── REST/service JWT ──> Borrow and Reservation (active-transaction checks)
Borrow ─── REST/service JWT ──> Catalog (copy counts)
Borrow ─── REST/service JWT ──> Reservation (waiting-list promotion/fulfillment)
Reservation ── REST/service JWT ──> API Gateway (member availability notification)
```

The browser sends user requests to the Gateway. The Gateway validates the JWT
and re-checks the current account role and approval status before proxying
protected requests. Service-to-service requests use short-lived JWTs signed
with the same `JWT_SECRET`. The services use REST; there is no message broker.
Socket.IO is used by the Gateway for member notifications.

### Main user workflows

- **Accounts:** Members register and remain pending until a librarian approves
  them. Approved members sign in and use the catalog. Librarians can review
  registrations and manage catalog and borrow requests.
- **Borrowing:** A member submits a borrow request. A librarian approves or
  rejects it. Approval assigns a copy and the member can see the loan and due
  date in **My Borrowed Books**.
- **Returns and reservations:** Returning a book updates the borrow record and
  Catalog availability. When members are waiting, the next reservation is
  promoted and a pending borrow request is created for librarian approval.
  Active loans do not remove titles from catalog search; members can reserve
  titles whose available-copy count is zero.
- **History and notices:** Members can view returned books, reservations and
  availability notifications. Reservation status and notifications are stored
  by the Reservation Service.
- **Catalog administration:** Librarians can create titles, add copies, and
  archive eligible titles. Archiving is logical rather than destructive and
  is blocked while active borrowings or reservations exist.

### Technology

| Area | Technologies |
|---|---|
| Web client | React 18, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS |
| HTTP and real-time | Node.js 20, Express 4, REST/JSON, Socket.IO |
| Authentication | Gateway-issued JWTs, `jsonwebtoken`, PostgreSQL-backed identities, scrypt password hashes |
| Persistence | PostgreSQL 16, `pg`, Drizzle ORM and Drizzle Kit |
| Tests | Vitest and Testing Library (frontend), Node test runner (Gateway), Jest (services) |
| Packaging and orchestration | Docker multi-stage builds, Docker Compose, Kubernetes manifests |

## Running locally

### PostgreSQL configuration

The three domain services keep separate PostgreSQL databases, consistent with
the database-per-service architecture. Drizzle ORM uses the existing `pg`
driver. The API Gateway owns a separate identity database as the source of
truth for accounts and approval status; signed JWTs carry the authenticated
member ID and role to domain services. Book copies remain aggregate
availability counters in Catalog, and Borrow/Reservation store foreign
context IDs as references rather than cross-database foreign keys.

Copy the example environment file and replace the placeholder secrets:

```bash
cp .env.example .env
```

For local services started with npm, the service-specific `*_DATABASE_URL`
values connect to `127.0.0.1` on ports 15432 (Catalog), 15433 (Borrow), and
15434 (Reservation). Alternatively, Drizzle Kit builds each service connection
from its corresponding `*_DB_*` variables in the root `.env`, translating
Compose hostnames to `127.0.0.1` and using host ports 15432 (Catalog), 15433
(Borrow), and 15434 (Reservation) when Studio runs on your computer. These
ports avoid conflicts with locally installed PostgreSQL servers. To use a
single database instead, set `DATABASE_URL` for the service being run. Compose
containers connect to their PostgreSQL service names, not `localhost`.
URL-encode special characters in database usernames and passwords used in
connection URLs.

Start the databases only:

```bash
docker compose up -d catalog-db borrow-db reservation-db
```

The Compose database volumes are persistent. PostgreSQL creates each database
and user on first volume initialization. PostgreSQL is configured with a
health check, and services wait for their database to become healthy before
starting.

### Drizzle commands

Build the TypeScript migration runners and apply all three service migrations:

```bash
npm install
npm run db:migrate
```

Generate migrations after changing a service schema, then review and commit the
generated SQL and metadata:

```bash
npm run db:generate
npm run db:migrate
```

Each service also has `db:generate`, `db:migrate`, and `db:studio` scripts.
Use `db:pull` to introspect a configured service database before adopting an
existing schema.
Run Drizzle Studio for a specific service with, for example:

```bash
npm run db:studio --workspace=services/catalog-service
```

Seed synthetic Catalog authors and books after migrations:

```bash
npm run db:seed
```

The initial migrations use `CREATE TABLE IF NOT EXISTS` and preserve the
existing table and column names. They add Drizzle migration history and
constraints/indexes without dropping TypeORM-managed tables or their data.
Borrow and reservation dates use PostgreSQL `timestamp` without time zone to
match the existing tables and JavaScript `Date` model.
Back up important databases before applying schema changes.

### Option 1: Docker Compose (Recommended for full system)
```bash
cp .env.example .env
docker compose up --build
```

- Frontend:        http://localhost:3000
- API Gateway:      http://localhost:8080
- Catalog Service:  http://localhost:8081 (internal, via gateway in prod)
- Borrow Service:   http://localhost:8082 (internal, via gateway in prod)
- Reservation Svc:  http://localhost:8083 (internal, via gateway in prod)

Domain-service startup scripts apply pending migrations before accepting
requests. The database containers expose ports 15432, 15433, and 15434 for local
database clients.

### Option 2: Local Development (npm workspaces)

Install all dependencies:
```bash
npm install
```

Build all services:
```bash
npm run build
```

Run individual services in separate terminals:

**Terminal 1: Frontend**
```bash
npm run frontend
```
Available at http://localhost:5173

**Terminal 2: API Gateway**
```bash
npm run gateway
```

**Terminal 3: Catalog Service** (requires PostgreSQL running and migrated)
```bash
npm run catalog
```

**Terminal 4: Borrow Service** (requires PostgreSQL running)
```bash
npm run borrow
```

**Terminal 5: Reservation Service** (requires PostgreSQL running)
```bash
npm run reservation
```

### Option 3: Kubernetes

The manifests in `k8s/` are for the existing `library-system` namespace and
Docker Desktop Kubernetes. For the complete Docker Desktop deployment
procedure, including private Secret setup, local image builds, and port
forwarding, see [Docker Desktop Kubernetes deployment](#docker-desktop-kubernetes-update)
below. Do not apply `k8s/secrets.example.yaml` as a live Secret: it contains
placeholders. Apply the private `k8s/secrets.yaml` only after replacing them
with local values, and never commit that file.

### Member registration and administrator approval

The API Gateway owns member identities in a separate `identity` PostgreSQL
database. Public registrations are inserted with the `member` role and
`pending` status; role/status fields sent by a client are ignored. Passwords
are stored as salted scrypt hashes. Approval/rejection is an atomic
pending-only transition, and the gateway verifies the current account status
before forwarding protected API requests.

The previous development login did not have persisted accounts and accepted a
client-selected ID and role. It has been removed. Configure an administrator
using `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the private `.env` file (the
password must be 12–128 characters with uppercase, lowercase, and a number).
On startup, the gateway creates this approved librarian account only if that
email does not already exist. Changing these variables later does not reset an
existing administrator password. Use a new email if the configured address
already belongs to another account.

The identity schema migration is generated and applied like the other
Drizzle-managed schemas. Gateway startup applies it before accepting traffic.
For local development, set `GATEWAY_DATABASE_URL` in `.env`; for containers,
Compose supplies the private `identity-db` service settings.

To reset an existing account password, connect the local gateway database
(for Kubernetes, forward the identity database port and configure
`GATEWAY_DATABASE_URL` in `.env` to use that forwarded port), then run:

```sh
npm run admin:reset-password --workspace=api-gateway
```

The command prompts for an account email, reads the new password without
echoing it, and requires typing `RESET` before changing the stored password
hash. Do not pass passwords as command-line arguments or environment values.

### Deleting books from the catalog

Librarians can delete a book from the catalog dashboard. The catalog service
checks the Borrow and Reservation services using short-lived service tokens;
deletion is rejected while a book has an unreturned loan or a `waiting`/`ready`
reservation. The catalog archives eligible books using a nullable
`archivedAt` timestamp rather than physically removing the row. This keeps
borrow and reservation history intact while hiding archived books from active
catalog searches and preventing new reservations or borrowing.

The catalog service applies the additive Drizzle migration at startup. When
running services in Compose, the internal service URLs are explicitly set to
Compose DNS names; local npm development continues to use the localhost URLs
from `.env`.

Build and run the focused checks:

```bash
npm run build --workspace=api-gateway
npm test --workspace=api-gateway
npm test --workspace=services/catalog-service
npm run build --workspace=services/borrow-service
npm run build --workspace=services/reservation-service
npm run build --workspace=frontend
npm test --workspace=frontend
```

#### Docker Compose update

After setting real, unique database credentials and a strong `JWT_SECRET` and
administrator password in `.env` (do not use the example placeholders):

```bash
docker compose build api-gateway frontend
docker compose up -d identity-db
docker compose run --rm --no-deps api-gateway npm run db:migrate
docker compose up -d api-gateway frontend
docker compose logs --tail=100 api-gateway identity-db
```

For catalog deletion, rebuild the affected service images and apply the additive
catalog migration before serving requests:

```bash
docker compose build catalog-service borrow-service reservation-service frontend
docker compose up -d catalog-db borrow-db reservation-db
docker compose run --rm --no-deps catalog-service node dist/db/migrate.js
docker compose up -d catalog-service borrow-service reservation-service frontend
docker compose logs --tail=100 catalog-service borrow-service reservation-service frontend
```

The migration adds only `book.archivedAt`; it does not reset existing volumes
or remove book, borrow, or reservation records.

#### Docker Desktop Kubernetes update

Create/update `library-secrets` with non-example values before applying the
database manifests. For a first local deployment, copy the example and replace
every placeholder privately (do not commit the resulting Secret):

```bash
cp k8s/secrets.example.yaml k8s/secrets.yaml
# Edit k8s/secrets.yaml with strong, unique credentials and a 32+ character JWT_SECRET.
```

Include the existing `CATALOG_DB_*`, `BORROW_DB_*`,
`RESERVATION_DB_*` keys plus `IDENTITY_DB_NAME`, `IDENTITY_DB_USER`,
`IDENTITY_DB_PASSWORD`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and
`ADMIN_NAME`. Do not commit the generated Secret or its credentials.

```bash
kubectl apply -f k8s/namespace.yaml
# Apply the privately populated library-secrets Secret before the databases.
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/databases.yaml
kubectl rollout status deployment/catalog-db -n library-system
kubectl rollout status deployment/borrow-db -n library-system
kubectl rollout status deployment/reservation-db -n library-system
kubectl rollout status deployment/identity-db -n library-system
```

For a complete local Docker Desktop deployment, build images into Docker
Desktop's image store. The frontend API URL is compiled into the frontend
bundle, so set it to the local Gateway port-forward address:

```bash
docker build -t api-gateway:latest ./api-gateway
docker build -t catalog-service:latest ./services/catalog-service
docker build -t borrow-service:latest ./services/borrow-service
docker build -t reservation-service:latest ./services/reservation-service
docker build --build-arg VITE_API_BASE_URL=http://localhost:8081 -t frontend:latest ./frontend

kubectl apply -f k8s/api-gateway-service.yaml -f k8s/api-gateway-deployment.yaml
kubectl apply -f k8s/catalog-service-service.yaml -f k8s/catalog-service-deployment.yaml
kubectl apply -f k8s/borrow-service-service.yaml -f k8s/borrow-service-deployment.yaml
kubectl apply -f k8s/reservation-service-service.yaml -f k8s/reservation-service-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml -f k8s/frontend-deployment.yaml

kubectl rollout status deployment/api-gateway -n library-system
kubectl rollout status deployment/catalog-service -n library-system
kubectl rollout status deployment/borrow-service -n library-system
kubectl rollout status deployment/reservation-service -n library-system
kubectl rollout status deployment/frontend -n library-system
```

Domain services and the Gateway apply pending Drizzle migrations during
startup. Check the `kubectl rollout status` results and service logs if any
pod does not become ready. For later frontend-only changes, rebuild the
frontend image and restart only its Deployment.

For browser access through port-forwarding, run these in two terminals:

```bash
kubectl port-forward svc/frontend 8082:3000 -n library-system
```

```bash
kubectl port-forward svc/api-gateway 8081:8080 -n library-system
```

Open `http://localhost:8082`. The gateway allows that local frontend origin;
the frontend bundle sends API and Socket.IO requests to `http://localhost:8081`.
Use an alternate frontend port if `8082` is already occupied; a local process
already listening on `8080` may prevent the frontend port-forward from binding.

For an existing cluster, update the book deletion feature with Docker
Desktop's local image store and distinct tags (non-`latest` tags use
Kubernetes' default `IfNotPresent` behavior):

```bash
docker build -t catalog-service:book-delete ./services/catalog-service
docker build -t borrow-service:book-delete ./services/borrow-service
docker build -t reservation-service:book-delete ./services/reservation-service
docker build -t frontend:book-delete ./frontend
kubectl set image deployment/catalog-service catalog-service=catalog-service:book-delete -n library-system
kubectl set image deployment/borrow-service borrow-service=borrow-service:book-delete -n library-system
kubectl set image deployment/reservation-service reservation-service=reservation-service:book-delete -n library-system
kubectl set image deployment/frontend frontend=frontend:book-delete -n library-system
kubectl rollout status deployment/catalog-service -n library-system
kubectl rollout status deployment/borrow-service -n library-system
kubectl rollout status deployment/reservation-service -n library-system
kubectl rollout status deployment/frontend -n library-system
kubectl exec -n library-system deploy/catalog-service -- node dist/db/migrate.js
```

Catalog startup applies the pending Drizzle migration automatically; the
explicit command is safe to repeat and verifies it completed. The image
updates are for Catalog (archive/schema and transaction checks), Borrow and
Reservation (service-only active-transaction lookups), and Frontend (admin
delete dialog). API Gateway code and deployment configuration do not change;
its existing authenticated proxy forwards the DELETE request to Catalog.

For a schema change, the service image must include the updated `drizzle/`
directory before its startup migration can apply the change. With Docker
Desktop Kubernetes, rebuild the affected local image, then restart and verify
only that service. For example, Borrow applies its pending migration on
startup:

```bash
docker build -t borrow-service:latest ./services/borrow-service
kubectl rollout restart deployment/borrow-service -n library-system
kubectl rollout status deployment/borrow-service -n library-system
kubectl logs deployment/borrow-service -n library-system
```

Confirm the new migration appears in `drizzle.__drizzle_migrations` and the
expected schema is present before considering the migration complete.

### Troubleshooting database setup

- **Connection refused:** Check PostgreSQL health and the port/hostname in the
  service's `*_DATABASE_URL`. Use `localhost` from the host and the Compose
  database service name from a container.
- **Authentication/database does not exist:** Verify the matching `*_DB_NAME`,
  `*_DB_USER`, and `*_DB_PASSWORD` values. PostgreSQL only applies changed
  credentials when initializing a new data volume.
- **Migration failure:** Run `npm run build` and `npm run db:migrate`; inspect
  the service log for the migration and constraint error. Do not delete a
  database volume to resolve a migration error.
- **Schema changes:** Update `src/db/schema.ts`, run `npm run db:generate`,
  review the SQL in that service's `drizzle/` directory, and apply it with
  `npm run db:migrate`.

## Service and API reference

All application routes below are served through the API Gateway. Routes other
than authentication and health/readiness checks require
`Authorization: Bearer <JWT>` and an approved account. Librarian routes
additionally require the `librarian` role. Internal service routes are not
public API endpoints.

### API Gateway and Identity

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/health` | Gateway liveness check |
| `GET` | `/ready` | Gateway readiness check, including identity database |
| `POST` | `/auth/register` | Register a pending member |
| `POST` | `/auth/login` | Sign in and receive a 12-hour JWT |
| `GET` | `/auth/me` | Read the current approved account |
| `GET` | `/admin/member-requests` | Librarian: list pending registrations |
| `PATCH` | `/admin/member-requests/:memberId/approve` | Librarian: approve a registration |
| `PATCH` | `/admin/member-requests/:memberId/reject` | Librarian: reject a registration |

### Catalog Service

Gateway prefix: `/api/catalog`

| Method | Route | Access | Purpose |
|---|---|---|---|
| `GET` | `/books?q=<query>` | Approved account | Search by title, author, or ISBN; includes unavailable active titles |
| `GET` | `/books/:bookId` | Approved account | Get book details |
| `GET` | `/books/:bookId/availability` | Approved account | Check whether a copy is available |
| `GET` | `/authors` | Approved account | List authors |
| `POST` | `/books` | Librarian | Create a title |
| `POST` | `/books/:bookId/copies` | Librarian | Add a copy |
| `POST` | `/authors` | Librarian | Create an author |
| `DELETE` | `/books/:bookId` | Librarian | Archive a title when there are no active transactions |

Catalog is the source of truth for title metadata and available/total copy
counters. It stores author and book records in its own PostgreSQL database.

### Borrow Service

Gateway prefix: `/api/borrow`

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/borrows` | Approved member | Submit a borrow request for a book |
| `GET` | `/borrows/member/:memberId` | Owner or librarian | View borrow and return history |
| `POST` | `/borrows/:borrowId/return` | Borrowing member | Return an active loan |
| `GET` | `/borrows/requests` | Librarian | List pending borrow requests |
| `PATCH` | `/borrows/requests/:borrowId/approve` | Librarian | Approve and assign a copy/request |
| `PATCH` | `/borrows/requests/:borrowId/reject` | Librarian | Reject a pending request |
| `GET` | `/borrows/active` | Librarian | List active loans |
| `GET` | `/borrows/overdue` | Librarian | List overdue loans |

Borrow owns the borrow-request, loan, due-date, and return-date records. It
calls Catalog to update copy availability and Reservation to coordinate the
waiting list.

### Reservation Service

Gateway prefix: `/api/reservations`

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/reservations` | Approved member | Join a book's reservation queue |
| `GET` | `/reservations/member/:memberId` | Owner or librarian | View a member's reservations |
| `GET` | `/reservations/book/:bookId` | Librarian | View a book's reservation queue |
| `GET` | `/notifications/member/:memberId` | Reservation owner | List member notifications |
| `PATCH` | `/notifications/:notificationId/read` | Notification owner | Mark a notification read |

Reservation owns reservation queue state and notification records. Internal
service-only endpoints under `/internal` and `/reservations/notify-availability`
are used for active-transaction checks, queue promotion, fulfillment and
availability notifications; they require valid service tokens.

## Ports and environment configuration

| Component | Port | Purpose |
|---|---:|---|
| Frontend (Compose) | `3000` | Browser UI |
| Frontend (Vite dev server) | `5173` | Browser UI during local npm development |
| API Gateway (Compose/local) | `8080` | Public API, identity, proxy and Socket.IO |
| Catalog Service | `8081` | Catalog API |
| Borrow Service | `8082` | Borrow API |
| Reservation Service | `8083` | Reservation API |
| PostgreSQL from host | `15432`–`15435` | Catalog, Borrow, Reservation, Identity DBs respectively |

Copy `.env.example` to `.env` for local work. `.env` is private and must not be
committed. The example contains placeholders only; replace the database
passwords, administrator password and JWT secret with unique values.

| Variables | Used by |
|---|---|
| `CATALOG_DB_HOST`, `CATALOG_DB_PORT`, `CATALOG_DB_LOCAL_PORT`, `CATALOG_DB_NAME`, `CATALOG_DB_USER`, `CATALOG_DB_PASSWORD`, `CATALOG_DATABASE_URL` | Catalog Service, Catalog PostgreSQL, Drizzle Kit |
| `BORROW_DB_HOST`, `BORROW_DB_PORT`, `BORROW_DB_LOCAL_PORT`, `BORROW_DB_NAME`, `BORROW_DB_USER`, `BORROW_DB_PASSWORD`, `BORROW_DATABASE_URL` | Borrow Service, Borrow PostgreSQL, Drizzle Kit |
| `RESERVATION_DB_HOST`, `RESERVATION_DB_PORT`, `RESERVATION_DB_LOCAL_PORT`, `RESERVATION_DB_NAME`, `RESERVATION_DB_USER`, `RESERVATION_DB_PASSWORD`, `RESERVATION_DATABASE_URL` | Reservation Service, Reservation PostgreSQL, Drizzle Kit |
| `IDENTITY_DB_HOST`, `IDENTITY_DB_PORT`, `IDENTITY_DB_LOCAL_PORT`, `IDENTITY_DB_NAME`, `IDENTITY_DB_USER`, `IDENTITY_DB_PASSWORD`, `GATEWAY_DB_HOST`, `GATEWAY_DB_PORT`, `GATEWAY_DB_NAME`, `GATEWAY_DB_USER`, `GATEWAY_DB_PASSWORD`, `GATEWAY_DATABASE_URL` | API Gateway and Identity PostgreSQL |
| `JWT_SECRET` | API Gateway token signing and service-token verification; use a unique random value of at least 32 characters |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Optional initial librarian provisioning by the Gateway |
| `CATALOG_SERVICE_URL`, `BORROW_SERVICE_URL`, `RESERVATION_SERVICE_URL` | Service-to-service REST URLs; use localhost for host-run services and Compose DNS names inside Compose |
| `VITE_API_BASE_URL` | Frontend build-time Gateway URL |
| `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`, `OAUTH_GITHUB_CLIENT_ID`, `OAUTH_GITHUB_CLIENT_SECRET` | Reserved optional provider fields in the example environment; OAuth login routes are not currently implemented |

For local npm processes, use the `*_DATABASE_URL` URLs or the host-side
`*_DB_*` values and published ports. Containers must use database/service DNS
names, not `localhost`. URL-encode special characters in database credentials
when placing them in a connection URL.

## Testing

Build all workspaces:

```bash
npm run build
```

Run tests by workspace:

```bash
npm test --workspace=frontend
npm test --workspace=api-gateway
npm test --workspace=services/catalog-service
npm test --workspace=services/borrow-service
npm test --workspace=services/reservation-service
```

The root `npm run lint` script currently delegates to the workspace TypeScript
builds; it is not a separate ESLint configuration.

## Repository layout

```text
library-management-system/
├── api-gateway/                 # Express entry point, identity, JWT, routing, Socket.IO
│   ├── src/routes/              # Authentication and librarian endpoints
│   ├── src/db/                  # Identity schema and migration runner
│   ├── drizzle/                 # Gateway identity migrations
│   └── Dockerfile
├── services/
│   ├── catalog-service/         # Book/Author API, availability and catalog DB
│   │   ├── src/{controllers,db,middleware,repositories,routes,services}/
│   │   ├── drizzle/             # Catalog migrations
│   │   └── Dockerfile
│   ├── borrow-service/          # Borrow requests, loans, returns and Borrow DB
│   │   ├── src/{controllers,db,middleware,repositories,routes,services}/
│   │   ├── drizzle/             # Borrow migrations
│   │   └── Dockerfile
│   └── reservation-service/     # Reservation queues, notifications and Reservation DB
│       ├── src/{controllers,db,middleware,repositories,routes,services}/
│       ├── drizzle/             # Reservation migrations
│       └── Dockerfile
├── frontend/                    # React/TypeScript application, tests and Vite config
│   └── src/features/            # Admin, borrow, catalog, notification, reservation
├── k8s/                         # Docker Desktop Kubernetes Services/Deployments
├── docs/                        # Project review, requirements and diagrams
├── docker-compose.yml           # Local multi-container system and four DBs
├── .env.example                 # Local environment template (no real credentials)
└── package.json                 # npm workspaces and root-level scripts
```

## Security and data safety

- Never commit `.env`, `k8s/secrets.yaml`, database credentials, admin
  passwords, or JWT secrets. `k8s/secrets.example.yaml` is a template, not a
  production Secret.
- Do not use the example placeholder values in a running environment. Protect
  backups and use unique credentials for each database.
- The Gateway's `JWT_SECRET` must be shared with services that verify
  service-to-service tokens. Rotating it invalidates existing user tokens and
  service tokens.
- Do not use Docker Compose `down -v`, delete Kubernetes PVCs, or reset
  PostgreSQL volumes to troubleshoot ordinary startup or migration problems.
- Compose uses named volumes for its databases. Review Kubernetes database
  manifests and storage settings before treating a cluster deployment as
  durable or production-ready.
