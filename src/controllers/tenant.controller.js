import * as tenantService from "../services/tenant.service.js";
import { hasRole } from "../middleware/auth.middleware.js";

/**
 * Onboard a new tenant profile (Tenant onboarding)
 */
export const handleOnboardTenant = async (req, res) => {
  try {
    // If Admin provides a target userId, use it; otherwise link to logged-in user
    const targetUserId =
      hasRole(req.user, "ADMIN") && req.body.userId
        ? req.body.userId
        : req.user.id;

    const tenant = await tenantService.onboardTenantProfile(
      targetUserId,
      req.body,
    );

    return res.status(201).json({
      success: true,
      message: "Tenant profile onboarded successfully",
      data: tenant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get all tenants (Admin only)
 */
export const handleGetAllTenants = async (req, res) => {
  try {
    const tenants = await tenantService.getAllTenants();
    return res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get logged-in tenant's own profile
 */
export const handleGetMyTenantProfile = async (req, res) => {
  try {
    const tenant = await tenantService.getTenantByUserId(req.user.id);
    return res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Update logged-in tenant's own profile
 */
export const handleUpdateMyTenantProfile = async (req, res) => {
  try {
    const tenant = await tenantService.getTenantByUserId(req.user.id);
    const updatedTenant = await tenantService.updateTenant(
      tenant._id,
      req.body,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Tenant profile updated successfully",
      data: updatedTenant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Get tenant by ID (Admin or Profile Owner)
 */
export const handleGetTenantById = async (req, res) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.id);

    // Permission check
    const isOwner = tenant.userId._id.toString() === req.user.id;
    const isAdmin = hasRole(req.user, "ADMIN");

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Access forbidden. You cannot view other tenant profiles.",
      });
    }

    return res.status(200).json({
      success: true,
      data: tenant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Update tenant by ID (Admin or Profile Owner)
 */
export const handleUpdateTenant = async (req, res) => {
  try {
    const updatedTenant = await tenantService.updateTenant(
      req.params.id,
      req.body,
      req.user,
    );

    return res.status(200).json({
      success: true,
      message: "Tenant profile updated successfully",
      data: updatedTenant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Delete tenant by ID (Admin only)
 */
export const handleDeleteTenant = async (req, res) => {
  try {
    const result = await tenantService.deleteTenantById(req.params.id);
    return res.status(200).json({
      success: true,
      message: "Tenant profile deleted and unit released successfully",
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
 * Submit Phase 2 Agreement Documents (Tenant Action)
 */
export const handleSubmitAgreementDocs = async (req, res) => {
  try {
    const updatedTenant = await tenantService.submitAgreementDocs(req.user.id, {
      files: req.files,
      body: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Agreement documents uploaded and submitted successfully",
      data: updatedTenant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

/**
 * Update Agreement Verification Status (Admin only)
 */
export const handleUpdateAgreementStatus = async (req, res) => {
  try {
    const updatedTenant = await tenantService.updateAgreementStatus(
      req.params.id,
      req.body,
      req.file,
    );

    return res.status(200).json({
      success: true,
      message: "Agreement verification status updated successfully",
      data: updatedTenant,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

