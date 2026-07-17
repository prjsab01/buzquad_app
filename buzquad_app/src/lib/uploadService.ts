/**
 * Upload service using Cloudinary unsigned upload preset.
 *
 * Required .env vars:
 *   VITE_CLOUDINARY_CLOUD_NAME   — your Cloudinary cloud name
 *   VITE_CLOUDINARY_UPLOAD_PRESET — an unsigned upload preset name
 *
 * Setup (free, no credit card):
 *   1. Sign up at https://cloudinary.com (free tier: 25 GB storage, 25 GB bandwidth)
 *   2. Dashboard → Settings → Upload → Upload presets → Add upload preset
 *   3. Set signing mode to "Unsigned"
 *   4. Copy the preset name and your cloud name into .env
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;

export type UploadFolder = 'avatars' | 'covers' | 'posts' | 'chat' | 'voice' | 'uploads';

export interface UploadResult {
  key: string;       // Cloudinary public_id
  publicUrl: string; // secure_url
}

export async function uploadFile(
  file: File,
  folder: UploadFolder = 'uploads',
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      'Missing VITE_CLOUDINARY_CLOUD_NAME or VITE_CLOUDINARY_UPLOAD_PRESET in .env',
    );
  }

  const fileToUpload =
    file.type.startsWith('image/') && file.size > 1024 * 1024
      ? await compressImage(file)
      : file;

  const form = new FormData();
  form.append('file', fileToUpload);
  form.append('upload_preset', UPLOAD_PRESET);
  form.append('folder', `buzquad/${folder}`);

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', UPLOAD_URL);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const res = JSON.parse(xhr.responseText) as {
            public_id: string;
            secure_url: string;
          };
          resolve({ key: res.public_id, publicUrl: res.secure_url });
        } catch {
          reject(new Error('Invalid response from Cloudinary.'));
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          reject(new Error(err.error?.message ?? `Upload failed (${xhr.status})`));
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`));
        }
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload.'));
    xhr.send(form);
  });
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1280;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
        else { width = Math.round((width * MAX) / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob ? new File([blob], file.name, { type: 'image/webp' }) : file),
        'image/webp',
        0.82,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
