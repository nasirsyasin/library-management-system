import { api } from "../../shared/http";
import { Author, Book, CreateBookRequest } from "./types";

export const catalogApi = {
  searchBooks: async (query: string): Promise<Book[]> => {
    const response = await api.get<Book[]>("/api/catalog/books", { params: { q: query } });
    return response.data;
  },
  getBook: async (bookId: string): Promise<Book> => {
    const response = await api.get<Book>(`/api/catalog/books/${bookId}`);
    return response.data;
  },
  getAuthors: async (): Promise<Author[]> => {
    const response = await api.get<Author[]>("/api/catalog/authors");
    return response.data;
  },
  createAuthor: async (name: string): Promise<Author> => {
    const response = await api.post<Author>("/api/catalog/authors", { name });
    return response.data;
  },
  createBook: async (book: CreateBookRequest): Promise<Book> => {
    const response = await api.post<Book>("/api/catalog/books", book);
    return response.data;
  },
  addCopy: async (bookId: string): Promise<Book> => {
    const response = await api.post<Book>(`/api/catalog/books/${bookId}/copies`);
    return response.data;
  },
  deleteBook: async (bookId: string): Promise<void> => {
    await api.delete(`/api/catalog/books/${bookId}`);
  },
};