import axios from "axios";

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || "http://catalog-service:8081";

export async function assertBookIsActive(bookId: string): Promise<void> {
  try {
    const response = await axios.get<{ archivedAt?: string | null }>(
      `${CATALOG_URL}/api/books/${encodeURIComponent(bookId)}`,
    );
    if (response.data.archivedAt) throw new Error("Book not found");
  } catch (error: unknown) {
    if (error instanceof Error && error.message === "Book not found") throw error;
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error("Book not found");
    }
    throw error;
  }
}
