export type BookAvailability = 'available' | 'checked_out';
export type BorrowingStatus = 'active' | 'due-soon' | 'overdue' | 'returned';
export type ReservationStatus = 'waiting' | 'available' | 'notified' | 'cancelled' | 'ready' | 'fulfilled';

export interface Author {
  authorId: string;
  name: string;
}

export interface Book {
  id: string;
  bookId?: string;
  title: string;
  author: string;
  isbn: string;
  category: string;
  summary: string;
  availability: BookAvailability;
  totalCopies: number;
  availableCopies: number;
}

export interface Borrowing {
  id: string;
  borrowId?: string;
  memberId: string;
  bookId: string;
  status: BorrowingStatus;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
}

export interface Borrow extends Borrowing {
  borrowId: string;
}

export interface Reservation {
  id: string;
  reservationId: string;
  memberId: string;
  bookId: string;
  status: ReservationStatus;
  queuePosition: number;
  createdAt: string;
  requestDate: string;
}

export interface NotificationItem {
  id: string;
  bookId: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface Notification extends NotificationItem {
  notificationId?: string;
  memberId?: string;
  sentDate?: string;
}

export interface User {
  memberId: string;
  role: 'member' | 'librarian';
}
