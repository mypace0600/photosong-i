export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function getImageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  return "jpg";
}

export function isObjectUrl(value: string) {
  return value.startsWith("blob:");
}

export function validateImageFile(file: File) {
  if (file.type && !file.type.startsWith("image/")) {
    return "이미지 파일만 올릴 수 있습니다.";
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return "사진은 5MB 이하로 선택하세요.";
  }

  return "";
}
