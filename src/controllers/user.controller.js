import * as userService from '../services/user.service.js';

/**
 * Controller to search/find a user by unique parameters (id, email, phone)
 */
export const handleFindUser = async (req, res) => {
  try {
    const { id, email, phone } = req.query;
    const user = await userService.findUserByUniqueParams({ id, email, phone });
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
 * Controller to update a user by ID (Admin only)
 */
export const handleUpdateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedUser = await userService.updateUserById(id, req.body, req.user);
    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updatedUser,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};

/**
 * Controller to delete a user by ID (Admin only)
 */
export const handleDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await userService.deleteUserById(id, req.user);
    return res.status(200).json({
      success: true,
      message: 'User deleted successfully',
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || 'Internal server error',
    });
  }
};
