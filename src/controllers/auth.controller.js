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
 * Register controller - only accessible by ADMIN
 */
export const handleRegister = async (req, res) => {
  try {
    const newUser = await authService.registerUser(req.body);
    return res.status(201).json({
      success: true,
      message: 'User registered successfully by Admin',
      data: {
        id: newUser._id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
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
