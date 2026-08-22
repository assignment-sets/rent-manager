import { Router } from "express";
import { handleGetDashboardProperties } from "../controllers/dashboard.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = Router();

// Requires authentication
router.use(authenticateToken);

// Aggregated property hierarchy matching frontend mock structure
router.get("/", handleGetDashboardProperties);
router.get("/properties", handleGetDashboardProperties);

export default router;
