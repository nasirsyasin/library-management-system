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

For local services started with npm, the `*_DB_*` settings in `.env` connect
to the Compose-published host ports 15432 (Catalog), 15433 (Borrow), 15434
(Reservation), and 15435 (Identity). The service code and Drizzle Kit translate
the Docker DNS names to `127.0.0.1` for host-run processes. Compose containers
instead use Docker DNS names and container port 5432. To use a single database
for an individual service, set its `DATABASE_URL` (or its service-specific
`*_DATABASE_URL`) explicitly.

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

Docker Compose runs published Docker Hub images; it does not build application
images on the installing computer. The release pipeline publishes these five
public repositories:

- `nasirsyasin/library-management-frontend`
- `nasirsyasin/library-management-api-gateway`
- `nasirsyasin/library-management-catalog-service`
- `nasirsyasin/library-management-borrow-service`
- `nasirsyasin/library-management-reservation-service`

#### Prerequisites

- Docker Engine/Desktop with the Docker Compose plugin
- Git
- Network access to Docker Hub

#### Install and configure

Clone the GitLab distribution repository (replace the path with the project's
actual GitLab group/project):

```bash
git clone https://gitlab.com/<group>/<project>.git
cd <project>
cp .env.example .env
```

Edit `.env` before startup:

1. Set four unique database passwords (`*_DB_PASSWORD`).
2. Set `JWT_SECRET` to a cryptographically random value of at least 32
   characters. Generate one with `openssl rand -hex 32`; do not commit it.
3. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` (12–128 characters,
   uppercase, lowercase, and a number). This provisions the initial librarian
   only when that email does not already exist.
4. Keep `DOCKERHUB_NAMESPACE=nasirsyasin`. Use a commit hash in `IMAGE_TAG` to
   pin a particular published version; `latest` selects the latest `main`
   release.

The variables in `.env.example` are blank placeholders where credentials are
required. Compose fails early rather than booting with an empty password or
JWT secret.

#### Pull, start, verify

```bash
docker compose pull
docker compose up -d
docker compose ps
curl -fsS http://localhost:8080/health
curl -fsS http://localhost:8080/ready
```

Open the frontend at <http://localhost:3000>. Sign in with the configured
librarian account or register a member and approve the registration as a
librarian. The Gateway health and readiness endpoints should return JSON with
an `ok` or `ready` status. `docker compose ps` should show the application and
four database containers as healthy.

Domain services and the Gateway apply their own pending Drizzle migrations
during startup, after their database is healthy. No source checkout or local
application image build is needed for this installation; only the Compose
file and configured `.env` are used.

#### Logs, shutdown and database persistence

```bash
docker compose logs -f
docker compose logs --tail=100 api-gateway catalog-service borrow-service reservation-service
docker compose down
```

`docker compose down` stops and removes containers/network but **preserves**
all four named database volumes. On the next start, the same data is reused.
To back up a database:

```bash
docker compose exec -T catalog-db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > catalog-backup.sql
```

Do not use `docker compose down -v` unless you deliberately want to delete all
Compose database volumes and their data. Keep backups outside the repository
and do not commit them.

#### Troubleshooting

- **Compose reports a missing variable:** Complete the required `.env`
  settings; Compose requires non-empty DB passwords, administrator credentials,
  and `JWT_SECRET`.
- **Image pull denied/not found:** Confirm the five Hub repositories are
  public, the namespace is `nasirsyasin`, and the selected `IMAGE_TAG` exists.
  Run `docker compose pull` again after the CI publish job succeeds.
- **Port already allocated:** Stop the local process using 3000 or 8080, or
  adjust the published host port and matching Gateway CORS/frontend build
  configuration.
- **A service is unhealthy:** Use `docker compose logs <service>` and check
  that its database is healthy. Each service runs its migration during startup.
- **Login fails after changing the admin environment values:** The bootstrap
  account is created only once; changing `.env` does not reset an existing
  account password. Use the documented interactive admin reset command.

Databases are only published to the host loopback interface on ports 15432
through 15435 for local database tools. Application containers connect to
database/service names on the private Compose network.

### Option 2: Local Development (npm workspaces)

Install all dependencies:
```bash
npm ci
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

### Option 3: Kubernetes / Minikube

The reduced demo is in `k8s/minikube-demo.yaml` and deploys to the isolated
`library-demo` namespace. It uses the same published images and has no
Ingress/load balancer or high-availability replicas. Its four demo databases
have dedicated PVCs. Do not apply these demo resources to the existing
`library-system` namespace; the older manifests there are a separate existing
deployment and some database Deployments do not yet have PVCs.

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
For local development, set the `IDENTITY_DB_*` values and use the host port
15435; Compose supplies the private `identity-db` service settings.

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

### GitLab and Docker Hub publishing

The GitHub source repository remains the canonical source (`main`). The
GitLab project is the distribution/CI copy; keep its remote separate rather
than replacing GitHub's `origin`. The `.gitlab-ci.yml` pipeline runs the
workspace build and tests, then builds and pushes five Docker Hub images.
The Node service images compile in a build stage and include production
dependencies only in their runtime stage.

Create these five **public** repositories in the Docker Hub namespace
`nasirsyasin`:

```text
library-management-frontend
library-management-api-gateway
library-management-catalog-service
library-management-borrow-service
library-management-reservation-service
```

In the GitLab project, add CI/CD variables:

| Variable | Value | Protection |
|---|---|---|
| `DOCKERHUB_USERNAME` | Docker Hub account used to authenticate | Mask if GitLab permits |
| `DOCKERHUB_TOKEN` | Docker Hub access token with read/write permission to the five repositories | Masked and protected |
| `DOCKERHUB_NAMESPACE` | `nasirsyasin` (already the pipeline default) | Unmasked |
| `RELEASE_BRANCH` | `main` (the current release branch) | Unmasked |
| `FRONTEND_API_BASE_URL` | `http://localhost:8080` for the published local Compose/Minikube demo | Unmasked |

Never put a Docker Hub password/token in the repository or in `.env.example`.
Protect `main` and the publish token in GitLab. The pipeline publishes an
immutable full Git commit SHA tag on the default branch and Git tags. It pushes
`latest` only when the commit branch equals `RELEASE_BRANCH` (default `main`);
tag pipelines do not move `latest`. Docker Hub must be public so a colleague
can pull without credentials.

After creating the GitLab project, push the source without changing the
existing GitHub remote:

```bash
git remote add gitlab https://gitlab.com/<group>/<project>.git
git push gitlab main
```

If GitLab is configured as a mirror/import instead, use that workflow and
confirm the pipeline runs on the GitLab default branch. The `origin` remote
continues to point to GitHub.

For manual publication from a trusted development machine, first authenticate
interactively using a Docker Hub access token when prompted; do not put the
token in a command argument:

```bash
docker login --username nasirsyasin
TAG=$(git rev-parse HEAD)
docker build -t docker.io/nasirsyasin/library-management-api-gateway:$TAG ./api-gateway
docker build -t docker.io/nasirsyasin/library-management-catalog-service:$TAG ./services/catalog-service
docker build -t docker.io/nasirsyasin/library-management-borrow-service:$TAG ./services/borrow-service
docker build -t docker.io/nasirsyasin/library-management-reservation-service:$TAG ./services/reservation-service
docker build --build-arg VITE_API_BASE_URL=http://localhost:8080 -t docker.io/nasirsyasin/library-management-frontend:$TAG ./frontend
docker push docker.io/nasirsyasin/library-management-api-gateway:$TAG
docker push docker.io/nasirsyasin/library-management-catalog-service:$TAG
docker push docker.io/nasirsyasin/library-management-borrow-service:$TAG
docker push docker.io/nasirsyasin/library-management-reservation-service:$TAG
docker push docker.io/nasirsyasin/library-management-frontend:$TAG
```

Only from the `main` release branch, the same images may additionally be
tagged and pushed as `latest`. The manual commands are:

```bash
test "$(git branch --show-current)" = "main"
for image in \
  library-management-api-gateway \
  library-management-catalog-service \
  library-management-borrow-service \
  library-management-reservation-service \
  library-management-frontend
do
  docker tag "docker.io/nasirsyasin/$image:$TAG" "docker.io/nasirsyasin/$image:latest"
  docker push "docker.io/nasirsyasin/$image:latest"
done
```

Prefer the GitLab pipeline so tests gate publication and tags are consistent.

### Minikube demonstration

The demo is isolated from the existing `library-system` deployment and uses
PVCs for all four PostgreSQL databases. It pulls the published Docker Hub
images; it does not build application images locally.

1. Publish the images using the GitLab pipeline, then install Minikube and
   start a cluster:

   ```bash
   minikube start
   kubectl config use-context minikube
   ```

2. Make a private Kubernetes Secret file. Replace **every** placeholder with
   a unique DB password, a random `JWT_SECRET` (for example
   `openssl rand -hex 32`), and an initial administrator account. Do not
   commit the resulting file:

   ```bash
   cp k8s/minikube-demo-secrets.example.yaml k8s/minikube-demo-secrets.yaml
   chmod 600 k8s/minikube-demo-secrets.yaml
   ```

3. Deploy the independent `library-demo` namespace and wait for every
   database/application rollout:

   ```bash
   ./scripts/deploy-minikube-demo.sh
   ```

4. In separate terminals, forward the frontend and Gateway. Their local ports
   match the frontend image's build-time API URL:

   ```bash
   kubectl port-forward svc/frontend 3000:3000 -n library-demo
   kubectl port-forward svc/api-gateway 8080:8080 -n library-demo
   ```

   Open <http://localhost:3000>. Verify with
   `curl -fsS http://localhost:8080/health` and
   `kubectl get pods,pvc -n library-demo`.

No ingress, replica scaling, or monitoring stack is included, keeping the
demonstration small. `kubectl delete -f k8s/minikube-demo.yaml` is **not** a
shutdown command: it also deletes PVC objects and may delete demo data. To
stop while preserving data, scale Deployments to zero and keep the namespace
and PVCs, or stop Minikube with `minikube stop`. For a disposable demo only,
remove the namespace after backing up or intentionally discarding the data.

The existing Docker Desktop manifests under `k8s/` still target the
`library-system` namespace and contain database Deployments that do not all
mount persistent storage. Do not apply/restart those database manifests as
part of this isolated Minikube demonstration.

### Troubleshooting database setup

- **Connection refused:** Check PostgreSQL health and the port/hostname in the
  service's database settings. Use `127.0.0.1` with ports 15432–15435 from the
  host and the Compose database service name on the internal container network.
- **Authentication/database does not exist:** Verify the matching `*_DB_NAME`,
  `*_DB_USER`, and `*_DB_PASSWORD` values. PostgreSQL only applies changed
  credentials when initializing a new data volume.
- **Database password changed but authentication still fails:** The official
  PostgreSQL image uses `POSTGRES_PASSWORD` to initialize a new data directory;
  changing it does not rotate a password in an existing volume. Use SQL to
  rotate the DB role password deliberately or restore the documented backup;
  never delete the volume as a password-reset workaround.
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
| Frontend (Compose/Minikube demo) | `3000` | Browser UI |
| Frontend (Vite development server) | `5173` | Browser UI during local npm development |
| API Gateway (Compose/Minikube demo) | `8080` | Public API, identity, proxy and Socket.IO |
| Catalog Service | `8081` | Internal catalog API |
| Borrow Service | `8082` | Internal borrow API |
| Reservation Service | `8083` | Internal reservation API |
| PostgreSQL from Compose host | `15432`–`15435` | Catalog, Borrow, Reservation, Identity DBs respectively; loopback only |

Copy `.env.example` to `.env` for local work. `.env` is private and must not be
committed. The example contains placeholders only; replace the database
passwords, administrator password and JWT secret with unique values.

| Variables | Used by |
|---|---|
| `DOCKERHUB_NAMESPACE`, `IMAGE_TAG` | Compose selects the published Docker Hub image namespace/tag; defaults are `nasirsyasin` and `latest` |
| `CATALOG_DB_HOST`, `CATALOG_DB_PORT`, `CATALOG_DB_LOCAL_PORT`, `CATALOG_DB_NAME`, `CATALOG_DB_USER`, `CATALOG_DB_PASSWORD` | Catalog Service, Catalog PostgreSQL, Drizzle Kit |
| `BORROW_DB_HOST`, `BORROW_DB_PORT`, `BORROW_DB_LOCAL_PORT`, `BORROW_DB_NAME`, `BORROW_DB_USER`, `BORROW_DB_PASSWORD` | Borrow Service, Borrow PostgreSQL, Drizzle Kit |
| `RESERVATION_DB_HOST`, `RESERVATION_DB_PORT`, `RESERVATION_DB_LOCAL_PORT`, `RESERVATION_DB_NAME`, `RESERVATION_DB_USER`, `RESERVATION_DB_PASSWORD` | Reservation Service, Reservation PostgreSQL, Drizzle Kit |
| `IDENTITY_DB_HOST`, `IDENTITY_DB_PORT`, `IDENTITY_DB_LOCAL_PORT`, `IDENTITY_DB_NAME`, `IDENTITY_DB_USER`, `IDENTITY_DB_PASSWORD` | API Gateway and Identity PostgreSQL |
| `JWT_SECRET` | Shared signing/verifying key; API Gateway and all domain services require a unique non-placeholder value of at least 32 characters |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | Initial librarian provisioning by the Gateway; Compose requires email and password |
| `VITE_API_BASE_URL` | Frontend build-time Gateway URL |
| `OAUTH_GOOGLE_CLIENT_ID`, `OAUTH_GOOGLE_CLIENT_SECRET`, `OAUTH_GITHUB_CLIENT_ID`, `OAUTH_GITHUB_CLIENT_SECRET` | Reserved optional provider fields in the example environment; OAuth login routes are not currently implemented |

Compose and Minikube set service-to-service URLs inside their private networks.
For local npm processes, configure the `*_DB_*` values and published database
ports. `DATABASE_URL` and service-specific database URL variables are optional
overrides. Containers must use database/service DNS names, not `localhost`.

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
npm test --workspace=services/borrow-service -- --passWithNoTests
npm test --workspace=services/reservation-service -- --passWithNoTests
```

The root `npm run lint` script currently delegates to the workspace TypeScript
builds; it is not a separate ESLint configuration. Borrow and Reservation
currently have no Jest test files, so the `passWithNoTests` flag documents that
absence while still running each package's test command.

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
├── k8s/                         # Existing cluster manifests + isolated Minikube demo
├── docs/                        # Project review, requirements and diagrams
├── docker-compose.yaml          # Published-image multi-container application + four DBs
├── .gitlab-ci.yml               # GitLab tests and Docker Hub image publication
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
