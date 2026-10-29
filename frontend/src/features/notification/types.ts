export interface Notification {
  notificationId: string;
  memberId: string;
  message: string;
  sentDate: string;
  read: boolean;
}

export interface BookReturnedEvent {
  bookId: string;
  notificationId: string;
}