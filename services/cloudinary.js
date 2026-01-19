const crypto = require("crypto");
const { Blob } = require("buffer");

const hasCloudinary = () =>
  !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );

const assertCloudinary = () => {
  if (!hasCloudinary()) {
    throw new Error(
      "Cloudinary env vars missing. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
    );
  }
};

const buildFolder = ({ storeId, itemId }) => {
  const template = process.env.CLOUDINARY_FOLDER || "clickmenu/stores/{storeId}/items/{itemId}";
  return template
    .replace("{storeId}", storeId || "unknown-store")
    .replace("{itemId}", itemId || "general");
};

const createSignature = (params, apiSecret) => {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return crypto.createHash("sha1").update(payload + apiSecret).digest("hex");
};

const uploadBuffer = async ({ buffer, filename, resourceType, folder }) => {
  assertCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = { folder, timestamp };
  const signature = createSignature(paramsToSign, process.env.CLOUDINARY_API_SECRET);
  const formData = new FormData();
  formData.append("file", new Blob([buffer]), filename);
  formData.append("api_key", process.env.CLOUDINARY_API_KEY);
  formData.append("timestamp", String(timestamp));
  formData.append("folder", folder);
  formData.append("signature", signature);
  const endpoint = `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  const response = await fetch(endpoint, { method: "POST", body: formData });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Cloudinary upload failed");
  }
  return response.json();
};

const uploadFiles = async ({ storeId, itemId, files }) => {
  if (!files || files.length === 0) return [];
  if (!hasCloudinary()) {
    return files.map(
      (file) =>
        `https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=800&q=80&sig=${encodeURIComponent(
          file.originalname
        )}`
    );
  }
  const folder = buildFolder({ storeId, itemId });
  const uploads = await Promise.all(
    files.map((file) => {
      const resourceType = file.mimetype?.startsWith("video/") ? "video" : "image";
      return uploadBuffer({
        buffer: file.buffer,
        filename: file.originalname,
        resourceType,
        folder,
      });
    })
  );
  return uploads.map((upload) => upload.secure_url);
};

module.exports = {
  hasCloudinary,
  uploadFiles,
  buildFolder,
};
