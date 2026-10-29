import { Router } from "express";
import borrowRoutes from "./borrow.routes";

const router = Router();
router.use(borrowRoutes);

export default router;
