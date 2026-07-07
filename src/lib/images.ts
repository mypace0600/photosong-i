export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const TARGET_IMAGE_MAX_EDGE = 1600;
const TARGET_IMAGE_QUALITY = 0.82;

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

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("이미지를 읽지 못했습니다."));
    };
    image.src = imageUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", TARGET_IMAGE_QUALITY);
  });
}

export async function optimizeImageFile(file: File) {
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return file;
  }

  try {
    const image = await loadImageFromFile(file);
    const scale = Math.min(
      1,
      TARGET_IMAGE_MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(image, 0, 0, width, height);

    const blob = await canvasToBlob(canvas);
    if (!blob || blob.size >= file.size) return file;

    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
