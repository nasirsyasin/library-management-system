import { Router } from "express";
import bookRoutes from "./book.routes";
import authorRoutes from "./author.routes";

const router = Router();
router.use(bookRoutes);
router.use(authorRoutes);

export default router;
