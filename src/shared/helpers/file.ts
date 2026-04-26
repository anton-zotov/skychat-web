export const isVideoFile = (fileName: string) => /\.(mp4|mov|webm|ogg|m4v)$/i.test(fileName);
export const isImageFile = (fileName: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
