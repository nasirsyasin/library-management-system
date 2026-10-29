# Project Structure

This document maps the repository layout to the bounded contexts and
architecture decisions from the Project Review 1 requirements analysis
(`docs/Requirements_Analysis_Library_Management_System.docx`).

## Service-to-context mapping

| Folder                          | Bounded Context     | Type       | Owns                        | Port |
|----------------------------------|----------------------|------------|------------------------------|------|
| `services/catalog-service`       | Catalog              | Supporting | Book, Author                 | 8081 |
| `services/borrow-service`        | Borrow               | Core       | Borrow (borrow / return)     | 8082 |
| `services/reservation-service`   | Reservation          | Core       | Reservation, Notification    | 8083 |
| `api-gateway`                    | Identity and Access  | Generic    | Routing, JWT / OAuth2        | 8080 |

Three domain microservices (Catalog, Borrow, Reservation) satisfy the
team-of-1 requirement of three microservices, all "domain logic." Identity
and Access is folded into the API Gateway rather than built as a fourth
microservice: it issues JWTs after OAuth2 login (Google / GitHub) and every
downstream service verifies the token's claims rather than owning its own
user store. This matches the Open Host Service relationship identified in
the requirements analysis, where "user identity" is published once and
consumed by the other contexts.

## Full tree

```
library-management-system/
├── README.md                      # setup + architecture summary
├── docker-compose.yml             # local orchestration, one Postgres per service
├── .env.example                   # shared env vars (JWT secret, OAuth keys, DB creds, service URLs)
├── .gitignore
│
├── api-gateway/                   # Identity and Access + ingress
│   ├── src/
│   │   ├── auth.ts                # issueToken(): JWT issuing after OAuth2 login
│   │   └── index.ts               # routes /api/catalog, /api/borrow, /api/reservations
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── services/
│   ├── catalog-service/           # Catalog bounded context
│   │   └── src/
│   │       ├── repositories/      # book.repository.ts
│   │       ├── services/          # book.service.ts — search, availability
│   │       ├── controllers/       # book.controller.ts
│   │       ├── routes/            # book.routes.ts — /api/books/*
│   │       ├── middleware/        # auth.middleware.ts — verifies gateway JWT
│   │       ├── db/                # Drizzle schema, connection, migrations, seed
│   │       └── index.ts           # Express app entrypoint
│   │   ├── drizzle/               # SQL migrations and Drizzle metadata
│   │   └── drizzle.config.ts
│   │
│   ├── borrow-service/            # Borrow bounded context (Core)
│   │   └── src/
│   │       ├── db/                # Drizzle schema, connection, migration runner
│   │       ├── repositories/      # borrow.repository.ts
│   │       ├── services/
│   │       │   ├── borrow.service.ts    # borrow / return / overdue logic
│   │       │   └── catalog.client.ts    # REST client -> catalog-service (Customer/Supplier)
│   │       ├── controllers/       # borrow.controller.ts
│   │       ├── routes/            # borrow.routes.ts — /api/borrows/*
│   │       ├── middleware/
│   │       └── index.ts
│   │   ├── drizzle/               # SQL migrations and Drizzle metadata
│   │   └── drizzle.config.ts
│   │
│   └── reservation-service/       # Reservation bounded context (Core)
│       └── src/
│           ├── db/                # Drizzle schema, connection, migration runner
│           ├── repositories/      # reservation.repository.ts
│           ├── services/          # reservation.service.ts — queue + notify logic
│           ├── controllers/       # reservation.controller.ts — /notify-availability
│           ├── routes/            # reservation.routes.ts — /api/reservations/*
│           ├── middleware/
│           └── index.ts
│       ├── drizzle/               # SQL migrations and Drizzle metadata
│       └── drizzle.config.ts
│
├── frontend/                      # React + TypeScript (Vite)
│   └── src/
│       ├── api/client.ts          # axios instance, always calls the gateway
│       ├── pages/CatalogPage.tsx  # search + borrow flow (User Story: Borrowing a Book)
│       └── App.tsx
│
├── k8s/                           # Kubernetes / Minikube manifests
│   ├── namespace.yaml
│   ├── ingress.yaml               # routes /api/* to api-gateway, /* to frontend
│   ├── secrets.example.yaml
│   ├── catalog-service-{deployment,service}.yaml
│   ├── borrow-service-{deployment,service}.yaml
│   ├── reservation-service-{deployment,service}.yaml
│   ├── api-gateway-{deployment,service}.yaml
│   └── frontend-{deployment,service}.yaml
│
└── docs/
    ├── PROJECT_STRUCTURE.md                              # this file
    ├── Requirements_Analysis_Library_Management_System.docx
    └── uml/
        ├── class-diagram.png                              # main entities/aggregates
        └── collaboration-diagram.png                      # book-returned -> reservation-notified flow
```

## Request flow example: borrowing a book

1. Frontend calls `POST /api/borrow/borrows` on the **api-gateway**, with a JWT from a prior login.
2. Gateway proxies to **borrow-service** at `/api/borrows`.
3. `borrow.middleware` verifies the JWT (issued by the gateway); `borrow.service.borrow()`:
   - calls `catalog.client.checkAvailability(bookId)` -> **catalog-service** (REST, Customer/Supplier)
   - calls `catalog.client.decrementAvailability(bookId)` -> **catalog-service**
   - persists the `Borrow` record in `borrow-service`'s own Postgres database
4. Response returns to the frontend through the gateway.

## Request flow example: a reserved book becomes available

See `docs/uml/collaboration-diagram.png` for the full six-step sequence.
In code: `borrow.controller.returnBook()` calls `catalog.client.incrementAvailability()`,
then POSTs to `reservation-service`'s `/api/reservations/notify-availability`, which is
where `reservation.service.notifyNextInQueue()` picks the next member in the
waiting list and creates a `Notification`.

## Database-per-service

Each domain service owns its own Postgres database (`catalog-db`,
`borrow-db`, `reservation-db` in `docker-compose.yml`) — no service reads
another's database directly. Cross-context data (e.g. `bookId` inside a
`Borrow` record) is stored as a plain reference id, not a foreign key,
and resolved via REST calls when needed. This keeps the bounded contexts
independently deployable, per the low-coupling requirement in the course
guidelines.

The services use Drizzle ORM with the existing `pg` driver. Catalog owns
`author` and `book`; Borrow owns `borrow`; Reservation owns `reservation` and
`notification`. User identity remains in the API Gateway JWT, while inventory
is represented by the Catalog book-level `totalCopies` and `availableCopies`
counters. Each service's initial migration preserves the existing
TypeORM-compatible table and column names.
