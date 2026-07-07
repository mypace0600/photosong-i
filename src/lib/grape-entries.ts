import type { GrapeEntryRow } from "@/lib/database.types";
import { formatDate } from "@/lib/date";
import {
  createSignedUrl,
  createSignedUrlMap,
  removeGrapePhotosQuietly,
  uploadGrapePhoto,
} from "@/lib/grape-photos";
import type { GrapeEntry } from "@/lib/photo-song-types";
import { supabase } from "@/lib/supabase";

export const DEFAULT_ENTRY_CONTENT = "오늘 포도알 하나 채웠다.";

export function mapEntryRow(row: GrapeEntryRow, imageUrl: string): GrapeEntry {
  return {
    id: row.id,
    grapeIndex: row.grape_index,
    imagePath: row.image_path,
    imageUrl,
    content: row.content ?? DEFAULT_ENTRY_CONTENT,
    eventDate: row.event_date,
    createdAt: formatDate(row.created_at),
  };
}

export async function mapEntriesWithImages(rows: GrapeEntryRow[]) {
  const signedUrlByPath = await createSignedUrlMap(
    rows.map((row) => row.image_path),
  );

  return rows.map((row) =>
    mapEntryRow(row, signedUrlByPath.get(row.image_path) ?? ""),
  );
}

export async function createGrapeEntry(params: {
  userId: string;
  challengeId: string;
  grapeIndex: number;
  file: File;
  content: string;
  eventDate: string;
}) {
  let uploadedImagePath = "";

  try {
    uploadedImagePath = await uploadGrapePhoto({
      userId: params.userId,
      challengeId: params.challengeId,
      grapeIndex: params.grapeIndex,
      file: params.file,
    });

    const { data, error } = await supabase
      .from("grape_entries")
      .insert({
        challenge_id: params.challengeId,
        user_id: params.userId,
        grape_index: params.grapeIndex,
        image_path: uploadedImagePath,
        content: params.content.trim() || DEFAULT_ENTRY_CONTENT,
        event_date: params.eventDate,
      })
      .select("*")
      .single();

    if (error) throw error;
    uploadedImagePath = "";

    const entryRow = data as GrapeEntryRow;
    return mapEntryRow(entryRow, await createSignedUrl(entryRow.image_path));
  } catch (error) {
    if (uploadedImagePath) {
      await removeGrapePhotosQuietly([uploadedImagePath]);
    }
    throw error;
  }
}

export async function updateGrapeEntry(params: {
  userId: string;
  challengeId: string;
  entry: GrapeEntry;
  file: File | null;
  content: string;
  eventDate: string;
}) {
  let uploadedImagePath = "";
  let nextImagePath = params.entry.imagePath;

  try {
    if (params.file) {
      uploadedImagePath = await uploadGrapePhoto({
        userId: params.userId,
        challengeId: params.challengeId,
        grapeIndex: params.entry.grapeIndex,
        file: params.file,
      });
      nextImagePath = uploadedImagePath;
    }

    const { data, error } = await supabase
      .from("grape_entries")
      .update({
        image_path: nextImagePath,
        content: params.content.trim() || DEFAULT_ENTRY_CONTENT,
        event_date: params.eventDate,
      })
      .eq("id", params.entry.id)
      .eq("user_id", params.userId)
      .select("*")
      .single();

    if (error) throw error;
    uploadedImagePath = "";

    if (params.file && nextImagePath !== params.entry.imagePath) {
      void removeGrapePhotosQuietly([params.entry.imagePath]);
    }

    const entryRow = data as GrapeEntryRow;
    return mapEntryRow(entryRow, await createSignedUrl(entryRow.image_path));
  } catch (error) {
    if (uploadedImagePath) {
      await removeGrapePhotosQuietly([uploadedImagePath]);
    }
    throw error;
  }
}
