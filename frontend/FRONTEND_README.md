# Library Management System - Frontend Documentation

## Overview
A complete React + TypeScript frontend application for the library management system with support for members and librarians.

## Features

### 1. **Authentication** 🔐
- Development login system with role-based access
- JWT token management
- Automatic logout on token expiration
- Member and Librarian roles

### 2. **Member Features** 👤
- **Book Catalog**: Search and browse available books
- **Borrow Books**: Borrow available books with 14-day borrowing period
- **Reserve Books**: Reserve books that are currently unavailable
- **My Borrows**: View active and returned book borrowings
  - See borrow date, due date, and return status
  - Return books directly from the interface
  - Track overdue books (highlighted in red)
- **My Reservations**: View all reservations with status tracking
  - Status: waiting, ready, fulfilled, or cancelled

### 3. **Librarian Features** 👨‍💼
- **Admin Dashboard**: 
  - View statistics (active and overdue borrow counts)
  - Monitor all active borrows across the system
  - Track overdue books by member
  - View reservation queues for specific books
  - Click on book IDs to see who's waiting in the reservation queue

## Project Structure

```
frontend/
├── src/
│   ├── api/                    # API integration layer
│   │   ├── index.ts           # Catalog, Borrow, Reservation API clients
│   │   └── client.ts          # Legacy (can be removed)
│   │
│   ├── components/            # Reusable React components
│   │   ├── BookCard.tsx       # Book display card with borrow/reserve
│   │   └── NavBar.tsx         # Navigation bar (top menu)
│   │
│   ├── context/               # React Context
│   │   └── AuthContext.tsx    # Authentication state management
│   │
│   ├── hooks/                 # Custom React hooks
│   │   └── useAuth.ts         # Hook to access auth context
│   │
│   ├── pages/                 # Page components (routes)
│   │   ├── LoginPage.tsx      # Login/authentication
│   │   ├── CatalogPage.tsx    # Book catalog & search
│   │   ├── MyBorrowsPage.tsx  # User's borrowed books
│   │   ├── MyReservationsPage.tsx  # User's reservations
│   │   └── AdminPage.tsx      # Librarian dashboard
│   │
│   ├── types.ts               # TypeScript interfaces & types
│   ├── App.tsx                # Main app with routing
│   ├── main.tsx               # React DOM entry point
│   ├── index.css              # Global styles (Tailwind)
│   └── vite-env.d.ts          # Vite type definitions
│
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── tailwind.config.js         # Tailwind CSS configuration
├── postcss.config.js          # PostCSS configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies & scripts
```

## Key Technologies

- **React 18.3**: UI library
- **TypeScript**: Type safety
- **React Router v6**: Client-side routing
- **Axios**: HTTP client for API calls
- **Tailwind CSS**: Utility-first CSS framework
- **Vite 5.4**: Build tool & dev server

## Available Routes

| Route | Role | Description |
|-------|------|-------------|
| `/login` | Any | Login page |
| `/` | Authenticated | Catalog search & borrow |
| `/my-borrows` | Member | View borrowed books |
| `/my-reservations` | Member | View reservations |
| `/admin` | Librarian | Admin dashboard |

## API Integration

The frontend communicates with services through the API Gateway at `http://localhost:8080`:

### Catalog Service
- `GET /api/catalog/books?q={query}` - Search books
- `GET /api/catalog/books/{id}` - Get book details
- `GET /api/catalog/books/{id}/availability` - Check availability

### Borrow Service
- `GET /api/borrow/borrows/active` - Active borrows (librarian only)
- `GET /api/borrow/borrows/overdue` - Overdue borrows (librarian only)
- `GET /api/borrow/borrows/member/{id}` - Member's borrow history
- `POST /api/borrow/borrows` - Create new borrow
- `POST /api/borrow/borrows/{id}/return` - Return book

### Reservation Service
- `POST /api/reservations/reservations` - Create reservation
- `GET /api/reservations/reservations/book/{id}` - Reservation queue
- `GET /api/reservations/reservations/member/{id}` - Member's reservations

## Development

### Install dependencies
```bash
npm install
```

### Run development server
```bash
npm run dev
```
Server runs at `http://localhost:5173`

### Build for production
```bash
npm run build
```

### Preview production build
```bash
npm run preview
```

## Environment Variables

Create `.env` file:
```
VITE_API_BASE_URL=http://localhost:8080
```

## Usage Examples

### 1. Login
- Visit `/login`
- Enter any member ID
- Select role (Member or Librarian)
- Click Login

### 2. Search & Borrow Books
- Use search bar on homepage to find books
- Click "Borrow" button on available books
- View borrowed books in "My Borrows"

### 3. Reserve Books
- Search for a book
- Click "Reserve" button
- Check status in "My Reservations"

### 4. Admin Dashboard (Librarian only)
- View system-wide statistics
- Monitor active and overdue borrows
- View reservation queues by clicking book IDs

## Styling

The application uses **Tailwind CSS** for styling with a clean, professional design:
- Blue primary color (#2563eb)
- Responsive grid layout
- Mobile-friendly design
- Consistent spacing and typography

## Security Notes

⚠️ **Development Only**: The current authentication is a development stand-in. In production, implement:
- OAuth2 (Google/GitHub)
- Secure JWT storage
- HTTPS only
- CSRF protection
- Rate limiting

## Future Enhancements

- [ ] Book reviews and ratings
- [ ] Notification system for reservation readiness
- [ ] Fine tracking for overdue books
- [ ] Book recommendations
- [ ] Reading history analytics
- [ ] Advanced search filters
- [ ] Mobile app (React Native)
- [ ] Real-time notifications (WebSockets)
