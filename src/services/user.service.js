import mongoose from 'mongoose';
import { User } from '../models/user.model.js';
import { hasRole } from '../middleware/auth.middleware.js';

/**
 * Unified user lookup by unique query parameters (id, email, phone)
 */
export const findUserByUniqueParams = async ({ id, email, phone }) => {
  if (!id && !email && !phone) {
    const error = new Error('At least one unique search parameter (id, email, or phone) is required.');
    error.statusCode = 400;
    throw error;
  }

  const queryConditions = [];

  if (id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const error = new Error('Invalid user ID format.');
      error.statusCode = 400;
      throw error;
    }
    queryConditions.push({ _id: id });
  }

  if (email) {
    queryConditions.push({ email: email.toLowerCase().trim() });
  }

  if (phone) {
    queryConditions.push({ phone: phone.trim() });
  }

  const user = await User.findOne({ $or: queryConditions });

  if (!user) {
    const error = new Error('User not found matching the provided criteria.');
    error.statusCode = 404;
    throw error;
  }

  return user;
};

/**
 * Update user profile by ID (Admin only)
 */
export const updateUserById = async (targetUserId, updateData, requestingUser) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const error = new Error('Invalid user ID format.');
    error.statusCode = 400;
    throw error;
  }

  if (requestingUser && !hasRole(requestingUser, 'ADMIN')) {
    const error = new Error('Access forbidden. Admin role required.');
    error.statusCode = 403;
    throw error;
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const { name, email, phone, role, password } = updateData;

  // Check email uniqueness if email is being changed
  if (email && email.toLowerCase().trim() !== user.email) {
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      const error = new Error('User with this email already exists.');
      error.statusCode = 400;
      throw error;
    }
    user.email = email.toLowerCase().trim();
  }

  if (name !== undefined) user.name = name.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (role !== undefined && ['ADMIN', 'TENANT'].includes(role)) user.role = role;
  if (password) user.password = password; // Will trigger pre-save hook for hashing

  await user.save();
  return user;
};

/**
 * Delete user by ID (Admin only, with self-deletion protection)
 */
export const deleteUserById = async (targetUserId, requestingUser) => {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    const error = new Error('Invalid user ID format.');
    error.statusCode = 400;
    throw error;
  }

  if (requestingUser && !hasRole(requestingUser, 'ADMIN')) {
    const error = new Error('Access forbidden. Admin role required.');
    error.statusCode = 403;
    throw error;
  }

  const adminId = requestingUser?.id || requestingUser?._id || '';
  if (targetUserId.toString() === adminId.toString()) {
    const error = new Error('Action denied. You cannot delete your own admin account.');
    error.statusCode = 400;
    throw error;
  }

  const deletedUser = await User.findByIdAndDelete(targetUserId);
  if (!deletedUser) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return {
    id: deletedUser._id,
    name: deletedUser.name,
    email: deletedUser.email,
  };
};
