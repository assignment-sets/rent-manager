import {
  S3Client,
  PutObjectCommand,
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
} from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

export const getAwsConfig = () => {
  const region = process.env.AWS_REGION;
  const bucketName = process.env.AWS_S3_BUCKET_NAME;

  if (!region || !bucketName) {
    const error = new Error(
      "AWS S3 configuration missing. Please ensure AWS_REGION and AWS_S3_BUCKET_NAME are defined in environment variables.",
    );
    error.statusCode = 500;
    throw error;
  }

  return { region, bucketName };
};

/**
 * Upload an in-memory buffer directly to AWS S3.
 *
 * @param {Object} params
 * @param {Buffer} params.buffer - The binary file buffer
 * @param {string} params.key - The S3 object key (e.g. "agreements/tenantId/signed_agreement.pdf")
 * @param {string} params.contentType - The MIME type (e.g. "application/pdf", "image/png")
 * @param {string} [params.cacheControl] - Optional Cache-Control header (defaults to no-cache for versioned assets)
 * @returns {Promise<{ url: string, key: string, bucket: string }>}
 */
export const uploadBufferToS3 = async ({
  buffer,
  key,
  contentType,
  cacheControl = "no-cache, no-store, must-revalidate",
}) => {
  const { region, bucketName } = getAwsConfig();

  const s3Client = new S3Client({
    region,
  });

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    CacheControl: cacheControl,
  });

  await s3Client.send(command);

  const url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
  return { url, key, bucket: bucketName };
};

/**
 * Delete one or more objects from AWS S3 (Used for compensating rollback if DB writes fail).
 *
 * @param {string[]} keys - Array of S3 object keys to delete
 * @returns {Promise<void>}
 */
export const deleteObjectsFromS3 = async (keys) => {
  if (!keys || keys.length === 0) return;

  const validKeys = keys.filter(Boolean);
  if (validKeys.length === 0) return;

  try {
    const { region, bucketName } = getAwsConfig();

    const s3Client = new S3Client({
      region,
    });

    const command = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: validKeys.map((k) => ({ Key: k })),
        Quiet: true,
      },
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("[S3 Rollback Warning] Failed to delete orphaned S3 objects:", error);
  }
};

/**
 * Permanently delete ALL versions and delete-markers of a specific S3 object key.
 *
 * @param {string} key - S3 object key (e.g. "agreements/tenantId/signed_agreement.pdf")
 * @returns {Promise<void>}
 */
export const deleteAllVersionsOfObject = async (key) => {
  if (!key) return;

  try {
    const { region, bucketName } = getAwsConfig();

    const s3Client = new S3Client({
      region,
    });

    const listCommand = new ListObjectVersionsCommand({
      Bucket: bucketName,
      Prefix: key,
    });

    const listResult = await s3Client.send(listCommand);

    const objectsToDelete = [];

    // Collect all version IDs for this specific key
    if (listResult.Versions) {
      for (const v of listResult.Versions) {
        if (v.Key === key) {
          objectsToDelete.push({ Key: v.Key, VersionId: v.VersionId });
        }
      }
    }

    // Collect all delete markers for this specific key
    if (listResult.DeleteMarkers) {
      for (const dm of listResult.DeleteMarkers) {
        if (dm.Key === key) {
          objectsToDelete.push({ Key: dm.Key, VersionId: dm.VersionId });
        }
      }
    }

    if (objectsToDelete.length === 0) return;

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objectsToDelete,
        Quiet: true,
      },
    });

    await s3Client.send(deleteCommand);
  } catch (error) {
    console.error(`[S3 Purge Warning] Failed to purge all versions for key "${key}":`, error);
  }
};

/**
 * Permanently delete all objects and versions under a prefix (e.g. "tenants/userId/" or "agreements/tenantId/").
 *
 * @param {string} prefix - S3 folder prefix
 * @returns {Promise<void>}
 */
export const deletePrefixAllVersions = async (prefix) => {
  if (!prefix) return;

  try {
    const { region, bucketName } = getAwsConfig();

    const s3Client = new S3Client({
      region,
    });

    const listCommand = new ListObjectVersionsCommand({
      Bucket: bucketName,
      Prefix: prefix,
    });

    const listResult = await s3Client.send(listCommand);

    const objectsToDelete = [];

    if (listResult.Versions) {
      for (const v of listResult.Versions) {
        objectsToDelete.push({ Key: v.Key, VersionId: v.VersionId });
      }
    }

    if (listResult.DeleteMarkers) {
      for (const dm of listResult.DeleteMarkers) {
        objectsToDelete.push({ Key: dm.Key, VersionId: dm.VersionId });
      }
    }

    if (objectsToDelete.length === 0) return;

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: objectsToDelete,
        Quiet: true,
      },
    });

    await s3Client.send(deleteCommand);
  } catch (error) {
    console.error(`[S3 Prefix Purge Warning] Failed to purge objects under prefix "${prefix}":`, error);
  }
};

