import { Router } from "express";
import reservationRoutes from "./reservation.routes";

const router = Router();
router.use(reservationRoutes);

export default router;
