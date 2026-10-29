import axios from "axios";
import { issueServiceToken } from "../middleware/auth.middleware";

const BORROW_URL = process.env.BORROW_SERVICE_URL || "http://borrow-service:8082";
const RESERVATION_URL = process.env.RESERVATION_SERVICE_URL || "http://reservation-service:8083";

export class TransactionCheckError extends Error {
  constructor(readonly causeError: unknown) {
    super("Active transactions could not be verified");
    this.name = "TransactionCheckError";
  }
}

function serviceHeaders() {
  return { Authorization: `Bearer ${issueServiceToken("catalog-service")}` };
}

export async function hasActiveTransactions(bookId: string): Promise<boolean> {
  const headers = serviceHeaders();
  try {
    const [borrowResponse, reservationResponse] = await Promise.all([
      axios.get<{ active: boolean }>(`${BORROW_URL}/api/internal/books/${bookId}/active-transactions`, { headers }),
      axios.get<{ active: boolean }>(`${RESERVATION_URL}/api/internal/books/${bookId}/active-transactions`, { headers }),
    ]);
    return borrowResponse.data.active || reservationResponse.data.active;
  } catch (error: unknown) {
    throw new TransactionCheckError(error);
  }
}
