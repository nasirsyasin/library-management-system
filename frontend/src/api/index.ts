import { api } from "../shared/http";

export const catalogAPI = {
  searchBooks: (query: string) =>
    api.get("/api/catalog/books", { params: { q: query } }),
  getBook: (bookId: string) =>
    api.get(`/api/catalog/books/${bookId}`),
  checkAvailability: (bookId: string) =>
    api.get(`/api/catalog/books/${bookId}/availability`),
  getAuthors: () => api.get("/api/catalog/authors"),
  createAuthor: (name: string) => api.post("/api/catalog/authors", { name }),
  createBook: (book: {
    title: string;
    isbn: string;
    totalCopies: number;
    availableCopies: number;
    author: { authorId: string };
  }) => api.post("/api/catalog/books", book),
};

export const borrowAPI = {
  getActiveBorrows: () =>
    api.get("/api/borrow/borrows/active"),
  getOverdueBorrows: () =>
    api.get("/api/borrow/borrows/overdue"),
  getMemberHistory: (memberId: string) =>
    api.get(`/api/borrow/borrows/member/${memberId}`),
  borrowBook: (memberId: string, bookId: string) =>
    api.post("/api/borrow/borrows", { memberId, bookId }),
  returnBook: (borrowId: string) =>
    api.post(`/api/borrow/borrows/${borrowId}/return`),
};

export const reservationAPI = {
  createReservation: (bookId: string) =>
    api.post("/api/reservations/reservations", { bookId }),
  getQueueForBook: (bookId: string) =>
    api.get(`/api/reservations/reservations/book/${bookId}`),
  getMemberReservations: (memberId: string) =>
    api.get(`/api/reservations/reservations/member/${memberId}`),
};

export const authAPI = {
  register: (input: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }) => api.post<{ message: string }>("/auth/register", input),
  login: (email: string, password: string) =>
    api.post<{ token: string }>("/auth/login", { email, password }),
  currentUser: () => api.get<{
    memberId: string;
    role: "member" | "librarian";
    email: string;
    fullName: string;
  }>("/auth/me"),
};

export default api;
