import axios from "axios";
import { issueServiceToken } from "../middleware/auth.middleware";

// Borrow is the Customer, Catalog is the Supplier (Customer/Supplier
// relationship identified in the requirements analysis): Borrow calls
// Catalog over REST, Catalog remains the single source of truth on copies.
const CATALOG_URL = process.env.CATALOG_SERVICE_URL || "http://catalog-service:8081";
const serviceHeaders = () => ({
  Authorization: `Bearer ${issueServiceToken("borrow-service")}`,
});

export const CatalogClient = {
  checkAvailability: async (bookId: string) => {
    const { data } = await axios.get(`${CATALOG_URL}/api/books/${bookId}/availability`);
    return data.available as boolean;
  },
  decrementAvailability: async (bookId: string) => {
    try {
      await axios.post(`${CATALOG_URL}/api/books/${bookId}/availability/decrement`, undefined, { headers: serviceHeaders() });
    } catch (error: unknown) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        throw new Error("Book is not available");
      }
      throw error;
    }
  },
  incrementAvailability: (bookId: string) =>
    axios.post(`${CATALOG_URL}/api/books/${bookId}/availability/increment`, undefined, { headers: serviceHeaders() }),
};
