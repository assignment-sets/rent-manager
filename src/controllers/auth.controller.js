import * as authService from '../services/auth.service.js';

/**
 * Login controller
 */
export const handleLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const { token } = await authService.loginUser(email, password);
    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Onboard tenant controller - only accessible by ADMIN
 */
export const handleOnboardTenant = async (req, res) => {
  try {
    const result = await authService.onboardTenant(req.body);
    return res.status(201).json({
      success: true,
      message: 'Tenant onboarding initiated successfully by Admin',
      data: {
        id: result.user._id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        assignedUnit: result.assignedUnit,
      },
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Get currently authenticated user profile
 */
export const handleGetMe = async (req, res) => {
  try {
    const user = await authService.getUserProfile(req.user.id);
    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Initial admin creation endpoint
 */
export const handleBootstrapAdmin = async (req, res) => {
  try {
    const { token } = await authService.bootstrapAdmin(req.body);
    return res.status(201).json({
      success: true,
      message: 'Initial ADMIN created successfully',
      token,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
