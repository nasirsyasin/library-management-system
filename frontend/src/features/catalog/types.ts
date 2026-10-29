export interface Author {
  authorId: string;
  name: string;
}

export interface Book {
  bookId: string;
  title: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
  author: Author;
}

export interface CreateBookRequest {
  title: string;
  isbn: string;
  totalCopies: number;
  author: { authorId: string };
}