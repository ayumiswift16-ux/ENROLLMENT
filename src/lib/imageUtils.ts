/**
 * Compresses an image to a maximum size and quality.
 * Returns a base64 string.
 */
export async function compressImage(
  base64Str: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.6
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Calculate new dimensions
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Get base64 at lower quality
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = (e) => reject(e);
  });
}

/**
 * Utility to check the approximate size of a base64 string in bytes.
 */
export function getBase64Size(base64: string): number {
  const stringLength = base64.length - (base64.indexOf(',') + 1);
  const sizeInBytes = Math.ceil(stringLength * 0.75);
  return sizeInBytes;
}
