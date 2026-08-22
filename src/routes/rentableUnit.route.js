import { Router } from "express";
import {
  handleGetAllRentableUnits,
  handleGetMyRentableUnit,
  handleGetRentableUnitByIdentifier,
  handleUpdateRentableUnit,
  handleAssignTenantToUnit,
  handleVacateRentableUnit,
} from "../controllers/rentableUnit.controller.js";
import {
  authenticateToken,
  requireAdmin,
} from "../middleware/auth.middleware.js";

const router = Router();

// All rentable unit operations require a valid JWT bearer token
router.use(authenticateToken);

// Caller's currently assigned/occupied unit
router.get("/my-unit", handleGetMyRentableUnit);

// List all rentable units across plots and floors (Admin only)
router.get("/", requireAdmin, handleGetAllRentableUnits);

// Fetch a specific unit by MongoDB _id or unitCode (Admin or verified unit occupant)
router.get("/:identifier", handleGetRentableUnitByIdentifier);

// Update a unit by MongoDB _id or unitCode (Admin only)
router.patch("/:identifier", requireAdmin, handleUpdateRentableUnit);

// Assign a tenant to a unit (Admin only)
router.post("/:identifier/assign", requireAdmin, handleAssignTenantToUnit);

// Vacate a unit (Admin only)
router.post("/:identifier/vacate", requireAdmin, handleVacateRentableUnit);

export default router;
