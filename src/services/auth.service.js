import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

const getJwtSecret = () => process.env.JWT_SECRET;
const getJwtExpiresIn = () => process.env.JWT_EXPIRES_IN || "24h";

/**
 * Generate JWT token containing user details
 */
export const generateToken = (user) => {
  const payload = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: getJwtExpiresIn(),
  });
};

/**
 * Register a new user (admin or tenant) - invoked by Admin
 */
export const registerUser = async (userData) => {
  const { name, email, password, role, phone } = userData;

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("User with this email already exists");
    error.statusCode = 400;
    throw error;
  }

  const user = new User({
    name,
    email,
    password,
    role: role || "TENANT",
    phone: phone || "",
  });

  await user.save();
  return user;
};

/**
 * Authenticate user login credentials
 */
export const loginUser = async (email, password) => {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  // Explicitly select password since select: false is set on user schema
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordMatch = await user.comparePassword(password);
  if (!isPasswordMatch) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user);
  return { token };
};

/**
 * Initial admin setup function for fresh database deployment
 */
export const bootstrapAdmin = async (adminData) => {
  const existingAdmin = await User.findOne({ role: "ADMIN" });
  if (existingAdmin) {
    const error = new Error(
      "An ADMIN user already exists. Bootstrap setup is disabled.",
    );
    error.statusCode = 400;
    throw error;
  }

  const admin = new User({
    name: adminData.name || "System Admin",
    email: adminData.email,
    password: adminData.password,
    role: "ADMIN",
  });

  await admin.save();
  const token = generateToken(admin);

  return { token };
};

/**
 * Get profile for authenticated user
 */
export const getUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }
  return user;
};
