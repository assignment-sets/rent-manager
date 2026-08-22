import * as paymentMethodService from "../services/paymentMethod.service.js";

/**
 * Get active payment methods (For tenants & general display)
 */
export const handleGetActivePaymentMethods = async (req, res) => {
  try {
    const paymentMethods =
      await paymentMethodService.getActivePaymentMethods();
    return res.status(200).json({
      success: true,
      count: paymentMethods.length,
      data: paymentMethods,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get all payment methods including inactive ones (Admin only)
 */
export const handleGetAllPaymentMethodsAdmin = async (req, res) => {
  try {
    const paymentMethods =
      await paymentMethodService.getAllPaymentMethodsAdmin();
    return res.status(200).json({
      success: true,
      count: paymentMethods.length,
      data: paymentMethods,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get a specific payment method by ID
 */
export const handleGetPaymentMethodById = async (req, res) => {
  try {
    const paymentMethod = await paymentMethodService.getPaymentMethodById(
      req.params.id,
    );
    return res.status(200).json({
      success: true,
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Create a new payment method (Admin only)
 */
export const handleCreatePaymentMethod = async (req, res) => {
  try {
    const paymentMethod = await paymentMethodService.createPaymentMethod(
      req.body,
    );
    return res.status(201).json({
      success: true,
      message: "Payment method created successfully",
      data: paymentMethod,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Update an existing payment method (Admin only)
 */
export const handleUpdatePaymentMethod = async (req, res) => {
  try {
    const updated = await paymentMethodService.updatePaymentMethod(
      req.params.id,
      req.body,
    );
    return res.status(200).json({
      success: true,
      message: "Payment method updated successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Delete a payment method (Admin only)
 */
export const handleDeletePaymentMethod = async (req, res) => {
  try {
    const result = await paymentMethodService.deletePaymentMethod(
      req.params.id,
    );
    return res.status(200).json({
      success: true,
      message: "Payment method deleted successfully",
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
 * Toggle payment method active state (Admin only)
 */
export const handleTogglePaymentMethodActive = async (req, res) => {
  try {
    const updated = await paymentMethodService.togglePaymentMethodActive(
      req.params.id,
    );
    return res.status(200).json({
      success: true,
      message: `Payment method ${updated.isActive ? "activated" : "deactivated"} successfully`,
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Set a payment method as primary (Admin only)
 */
export const handleSetPrimaryPaymentMethod = async (req, res) => {
  try {
    const updated = await paymentMethodService.setPrimaryPaymentMethod(
      req.params.id,
    );
    return res.status(200).json({
      success: true,
      message: "Payment method set as primary successfully",
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
