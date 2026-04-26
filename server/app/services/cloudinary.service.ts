/**
 * cloudinary.service.ts
 *
 * Wraps Cloudinary upload/delete operations for QR code assets.
 * Upload target: shortlink/qr_codes/ folder.
 *
 * Design: if Cloudinary is not configured (missing env vars),
 * upload will throw — callers must handle and store cloudinary_url = null.
 */
import { cloudinaryV2 } from "../libs/cloudinary.js";
import { logger } from "../utils/logger.js";

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
}

/**
 * Upload a base64 PNG data URL to Cloudinary.
 * @param base64DataUrl - The data URL string (data:image/png;base64,...)
 * @param publicId      - The full public_id to use (e.g. shortlink/qr_codes/1/42_1700000000)
 */
export const uploadQrCodeToCloudinary = async (
  base64DataUrl: string,
  publicId: string,
): Promise<CloudinaryUploadResult> => {
  const result = await cloudinaryV2.uploader.upload(base64DataUrl, {
    public_id: publicId,
    folder: "",        // public_id already includes the full path
    overwrite: true,   // allow re-upload on regenerate with same public_id
    resource_type: "image",
    format: "png",
  });

  logger.info("Cloudinary: QR uploaded", { publicId: result.public_id });

  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
  };
};

/**
 * Delete a QR code asset from Cloudinary by its public_id.
 * Errors are logged but not propagated — deletion failure should not
 * block soft-delete or UI feedback.
 */
export const deleteQrCodeFromCloudinary = async (
  publicId: string,
): Promise<void> => {
  try {
    await cloudinaryV2.uploader.destroy(publicId, { resource_type: "image" });
    logger.info("Cloudinary: QR deleted", { publicId });
  } catch (error) {
    logger.error("Cloudinary: failed to delete QR asset", { publicId, error });
  }
};
