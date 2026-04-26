import imageCompression from 'browser-image-compression';
import { isImageFile, isVideoFile } from '@shared/helpers/file';

export const compressImage = async (file: File) => {
  if (file.type.startsWith('image/') && !file.type.includes('gif') && !file.type.includes('svg')) {
    try {
      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
      };
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Compression skipped or failed:", error);
      return file;
    }
  }
  return file;
};

export const rotateImage = async (file: File, previewUrl: string): Promise<{file: File, preview: string}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = previewUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas context'));
      
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(90 * Math.PI / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      
      const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Blob creation failed'));
        
        const newFileName = file.name.replace(/\.[^/.]+$/, "") + "_rotated" + (outType === 'image/png' ? '.png' : '.jpg');
        const newFile = new File([blob], newFileName, { type: outType, lastModified: Date.now() });
        const newPreview = URL.createObjectURL(newFile);
        
        resolve({ file: newFile, preview: newPreview });
      }, outType, 0.92);
    };
    img.onerror = reject;
  });
};
