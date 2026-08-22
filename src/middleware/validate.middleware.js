/**
 * Generic request validation middleware using Zod
 *
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against req.body
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    const parsedData = await schema.parseAsync(req.body);
    req.body = parsedData; // Replace body with trimmed & validated data
    next();
  } catch (error) {
    if (error && error.issues) {
      const formattedErrors = error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      }));

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors: formattedErrors,
      });
    }

    return res.status(400).json({
      success: false,
      message: error.message || "Invalid request payload",
    });
  }
};
