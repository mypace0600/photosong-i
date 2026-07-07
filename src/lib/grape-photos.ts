import { getImageExtension, optimizeImageFile } from "@/lib/images";
import { supabase } from "@/lib/supabase";

export const GRAPE_BUCKET = "grape-photos";

export async function createSignedUrl(imagePath: string) {
  const { data, error } = await supabase.storage
    .from(GRAPE_BUCKET)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

export async function createSignedUrlMap(imagePaths: string[]) {
  if (imagePaths.length === 0) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(GRAPE_BUCKET)
    .createSignedUrls(imagePaths, 60 * 60);

  if (error) throw error;

  return new Map(data.map((item) => [item.path, item.signedUrl]));
}

export async function uploadGrapePhoto(params: {
  userId: string;
  challengeId: string;
  grapeIndex: number;
  file: File;
}) {
  const uploadFile = await optimizeImageFile(params.file);
  const imagePath = `${params.userId}/${params.challengeId}/${params.grapeIndex}-${Date.now()}.${getImageExtension(uploadFile)}`;
  const { error } = await supabase.storage
    .from(GRAPE_BUCKET)
    .upload(imagePath, uploadFile, {
      contentType: uploadFile.type || "image/jpeg",
      upsert: false,
    });

  if (error) throw error;
  return imagePath;
}

export async function removeGrapePhotos(imagePaths: string[]) {
  if (imagePaths.length === 0) return;

  const { error } = await supabase.storage
    .from(GRAPE_BUCKET)
    .remove(imagePaths);

  if (error) throw error;
}

export async function removeGrapePhotosQuietly(imagePaths: string[]) {
  try {
    await removeGrapePhotos(imagePaths);
  } catch {
    // Best-effort cleanup. The primary DB operation has already succeeded.
  }
}
