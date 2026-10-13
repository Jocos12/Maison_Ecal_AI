export const AVATAR_SIZE = 256;
export const AVATAR_MAX_INPUT_BYTES = 8 * 1024 * 1024;

/** Centre-crop the picked image to a square and shrink it, so what is stored stays a few dozen kB. */
export async function toAvatarDataUrl(file) {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = AVATAR_SIZE;
  canvas.height = AVATAR_SIZE;
  canvas
    .getContext('2d')
    .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
  bitmap.close?.();
  return canvas.toDataURL('image/jpeg', 0.86);
}
