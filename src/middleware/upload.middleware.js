import multer from "multer";

/**
 * In-memory storage engine.
 * Files are held in memory buffers (`file.buffer`) for streaming directly to S3.
 */
const storage = multer.memoryStorage();

/**
 * Multer middleware for Phase 2 Agreement Document uploads.
 * Accepts:
 * - aadharCard: 1 file (PDF / image)
 * - passportPhoto: 1 file (image)
 */
export const uploadAgreementDocsMiddleware = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB ceiling
  },
}).fields([
  { name: "aadharCard", maxCount: 1 },
  { name: "passportPhoto", maxCount: 1 },
]);

/**
 * Multer middleware for Admin Agreement PDF upload.
 * Accepts:
 * - agreementPdf: 1 file (PDF)
 */
export const uploadAgreementPdfMiddleware = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB ceiling for signed legal documents
  },
}).single("agreementPdf");

