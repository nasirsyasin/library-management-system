export interface Loan {
  borrowId: string;
  memberId: string;
  bookId: string;
  borrowDate: string | null;
  dueDate: string | null;
  returnDate: string | null;
  status: "pending" | "approved" | "rejected";
}