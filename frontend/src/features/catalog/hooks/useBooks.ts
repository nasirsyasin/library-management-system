import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { catalogApi } from "../api";
import { CreateBookRequest } from "../types";

export const catalogQueryKeys = {
  all: ["catalog", "books"] as const,
  search: (query: string) => ["catalog", "books", query] as const,
  detail: (bookId: string) => ["catalog", "book", bookId] as const,
  authors: ["catalog", "authors"] as const,
};

export function useBooks(query: string) {
  return useQuery({
    queryKey: catalogQueryKeys.search(query),
    queryFn: () => catalogApi.searchBooks(query),
    refetchInterval: 10_000,
  });
}

export function useBook(bookId: string) {
  return useQuery({
    queryKey: catalogQueryKeys.detail(bookId),
    queryFn: () => catalogApi.getBook(bookId),
    enabled: Boolean(bookId),
  });
}

export function useAuthors() {
  return useQuery({ queryKey: catalogQueryKeys.authors, queryFn: catalogApi.getAuthors });
}

export function useCreateAuthor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => catalogApi.createAuthor(name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueryKeys.authors }),
  });
}

export function useCreateBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (book: CreateBookRequest) => catalogApi.createBook(book),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all }),
  });
}

export function useAddCopy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => catalogApi.addCopy(bookId),
    onSuccess: (book) => {
      queryClient.setQueryData(catalogQueryKeys.detail(book.bookId), book);
      return queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all });
    },
  });
}

export function useDeleteBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bookId: string) => catalogApi.deleteBook(bookId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: catalogQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: ["reservation", "book-queues"] }),
      ]);
    },
  });
}