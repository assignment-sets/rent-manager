import * as rentableUnitService from "../services/rentableUnit.service.js";

/**
 * Get all rentable units (Admin only)
 */
export const handleGetAllRentableUnits = async (req, res) => {
  try {
    const units = await rentableUnitService.getAllRentableUnits();
    return res.status(200).json({
      success: true,
      count: units.length,
      data: units,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get the rentable unit occupied by or assigned to the authenticated user
 */
export const handleGetMyRentableUnit = async (req, res) => {
  try {
    const unit = await rentableUnitService.getTenantCurrentUnit(req.user);
    return res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get a single rentable unit by _id or unitCode (Admin or verified occupant)
 */
export const handleGetRentableUnitByIdentifier = async (req, res) => {
  try {
    const { identifier } = req.params;
    const unit = await rentableUnitService.getRentableUnitByIdentifier(
      identifier,
      req.user,
    );
    return res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Update a rentable unit by _id or unitCode (Admin only)
 */
export const handleUpdateRentableUnit = async (req, res) => {
  try {
    const { identifier } = req.params;
    const updatedUnit = await rentableUnitService.updateRentableUnit(
      identifier,
      req.body,
      req.user,
    );
    return res.status(200).json({
      success: true,
      message: "Rentable unit updated successfully",
      data: updatedUnit,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Assign a tenant to a rentable unit (Admin only)
 */
export const handleAssignTenantToUnit = async (req, res) => {
  try {
    const { identifier } = req.params;
    const { tenantId } = req.body;
    const result = await rentableUnitService.assignTenantToUnit(
      identifier,
      tenantId,
      req.user,
    );
    return res.status(200).json({
      success: true,
      message: "Tenant assigned to rentable unit successfully",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Vacate a rentable unit (Admin only)
 */
export const handleVacateRentableUnit = async (req, res) => {
  try {
    const { identifier } = req.params;
    const vacatedUnit = await rentableUnitService.vacateRentableUnit(
      identifier,
      req.user,
    );
    return res.status(200).json({
      success: true,
      message: "Rentable unit vacated successfully",
      data: vacatedUnit,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
