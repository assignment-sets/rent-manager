import mongoose from "mongoose";
import { PaymentMethod } from "../models/paymentMethod.model.js";

/**
 * Retrieve all active payment methods (For tenants & general display)
 */
export const getActivePaymentMethods = async () => {
  return PaymentMethod.find({ isActive: true })
    .sort({ isPrimary: -1, displayOrder: 1, createdAt: 1 })
    .lean();
};

/**
 * Retrieve all payment methods including inactive ones (Admin view)
 */
export const getAllPaymentMethodsAdmin = async () => {
  return PaymentMethod.find()
    .sort({ isPrimary: -1, displayOrder: 1, createdAt: 1 })
    .lean();
};

/**
 * Retrieve a payment method by ID
 */
export const getPaymentMethodById = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid payment method ID format.");
    error.statusCode = 400;
    throw error;
  }

  const paymentMethod = await PaymentMethod.findById(id);
  if (!paymentMethod) {
    const error = new Error("Payment method not found.");
    error.statusCode = 404;
    throw error;
  }

  return paymentMethod;
};

/**
 * Create a new payment method (Admin only)
 */
export const createPaymentMethod = async (data) => {
  // Normalize UPI_ID to UPI
  if (data.type === "UPI_ID") {
    data.type = "UPI";
  }

  // If marked as primary, demote any existing primary payment methods
  if (data.isPrimary) {
    await PaymentMethod.updateMany(
      { isPrimary: true },
      { $set: { isPrimary: false } },
    );
  }

  const paymentMethod = new PaymentMethod(data);
  await paymentMethod.save();
  return paymentMethod;
};

/**
 * Update an existing payment method (Admin only)
 */
export const updatePaymentMethod = async (id, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid payment method ID format.");
    error.statusCode = 400;
    throw error;
  }

  const paymentMethod = await PaymentMethod.findById(id);
  if (!paymentMethod) {
    const error = new Error("Payment method not found.");
    error.statusCode = 404;
    throw error;
  }

  // If setting as primary, demote any other primary methods
  if (updateData.isPrimary) {
    await PaymentMethod.updateMany(
      { _id: { $ne: paymentMethod._id }, isPrimary: true },
      { $set: { isPrimary: false } },
    );
  }

  // Handle nested detail updates safely
  const allowedRootFields = [
    "title",
    "subtitle",
    "isPrimary",
    "isActive",
    "displayOrder",
    "instructions",
  ];

  for (const field of allowedRootFields) {
    if (updateData[field] !== undefined) {
      paymentMethod[field] = updateData[field];
    }
  }

  if (updateData.bankDetails && paymentMethod.type === "BANK_TRANSFER") {
    paymentMethod.bankDetails = {
      ...paymentMethod.bankDetails?.toObject(),
      ...updateData.bankDetails,
    };
  }

  if (
    updateData.upiDetails &&
    (paymentMethod.type === "UPI" || paymentMethod.type === "UPI_ID")
  ) {
    paymentMethod.upiDetails = {
      ...paymentMethod.upiDetails?.toObject(),
      ...updateData.upiDetails,
    };
  }

  if (updateData.cashDetails && paymentMethod.type === "CASH") {
    paymentMethod.cashDetails = {
      ...paymentMethod.cashDetails?.toObject(),
      ...updateData.cashDetails,
    };
  }

  await paymentMethod.save();
  return paymentMethod;
};

/**
 * Delete a payment method (Admin only)
 */
export const deletePaymentMethod = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid payment method ID format.");
    error.statusCode = 400;
    throw error;
  }

  const deleted = await PaymentMethod.findByIdAndDelete(id);
  if (!deleted) {
    const error = new Error("Payment method not found.");
    error.statusCode = 404;
    throw error;
  }

  return { id: deleted._id, title: deleted.title };
};

/**
 * Toggle payment method active state (Admin only)
 */
export const togglePaymentMethodActive = async (id) => {
  const paymentMethod = await getPaymentMethodById(id);
  paymentMethod.isActive = !paymentMethod.isActive;
  await paymentMethod.save();
  return paymentMethod;
};

/**
 * Set a payment method as primary (Admin only)
 */
export const setPrimaryPaymentMethod = async (id) => {
  const paymentMethod = await getPaymentMethodById(id);

  // Unset previous primary
  await PaymentMethod.updateMany(
    { _id: { $ne: paymentMethod._id }, isPrimary: true },
    { $set: { isPrimary: false } },
  );

  paymentMethod.isPrimary = true;
  paymentMethod.isActive = true; // Primary must be active
  await paymentMethod.save();

  return paymentMethod;
};
