import type { User } from "@supabase/supabase-js";
import type { ChallengeRow, GrapeEntryRow } from "@/lib/database.types";
import { formatDate } from "@/lib/date";
import { mapEntriesWithImages } from "@/lib/grape-entries";
import { removeGrapePhotosQuietly } from "@/lib/grape-photos";
import type { Challenge, ChallengeSummary } from "@/lib/photo-song-types";
import { supabase } from "@/lib/supabase";

export async function fetchChallengeSummaries(userId: string) {
  const { data: challenges, error: challengeError } = await supabase
    .from("challenges")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (challengeError) throw challengeError;

  const challengeRows = (challenges ?? []) as ChallengeRow[];
  if (challengeRows.length === 0) return [];

  const { data: entryCounts, error: entryCountError } = await supabase
    .from("grape_entries")
    .select("challenge_id")
    .eq("user_id", userId);

  if (entryCountError) throw entryCountError;

  const countByChallenge = new Map<string, number>();
  (entryCounts ?? []).forEach((row) => {
    const challengeId = row.challenge_id as string;
    countByChallenge.set(
      challengeId,
      (countByChallenge.get(challengeId) ?? 0) + 1,
    );
  });

  return challengeRows.map((row) => ({
    id: row.id,
    title: row.title,
    grapeCount: row.grape_count,
    entryCount: countByChallenge.get(row.id) ?? 0,
    createdAt: formatDate(row.created_at),
  }));
}

export async function fetchChallengeDetail(
  challengeId: string,
  currentUser: User,
): Promise<Challenge> {
  const { data: challengeRow, error: challengeError } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", challengeId)
    .eq("user_id", currentUser.id)
    .single();

  if (challengeError) throw challengeError;

  const { data: entryRows, error: entryError } = await supabase
    .from("grape_entries")
    .select("*")
    .eq("challenge_id", challengeId)
    .order("grape_index", { ascending: true });

  if (entryError) throw entryError;

  const row = challengeRow as ChallengeRow;
  const entries = await mapEntriesWithImages(
    (entryRows ?? []) as GrapeEntryRow[],
  );

  return {
    id: row.id,
    title: row.title,
    grapeCount: row.grape_count,
    entries,
  };
}

export async function createChallenge(params: {
  userId: string;
  title: string;
  grapeCount: number;
}) {
  const { data, error } = await supabase
    .from("challenges")
    .insert({
      user_id: params.userId,
      title: params.title,
      grape_count: params.grapeCount,
    })
    .select("*")
    .single();

  if (error) throw error;
  const row = data as ChallengeRow;

  return {
    challenge: {
      id: row.id,
      title: row.title,
      grapeCount: row.grape_count,
      entries: [],
    },
    summary: {
      id: row.id,
      title: row.title,
      grapeCount: row.grape_count,
      entryCount: 0,
      createdAt: formatDate(row.created_at),
    },
  };
}

export async function updateChallenge(params: {
  userId: string;
  challengeId: string;
  title: string;
  grapeCount: number;
}) {
  const { data, error } = await supabase
    .from("challenges")
    .update({
      title: params.title,
      grape_count: params.grapeCount,
    })
    .eq("id", params.challengeId)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  if (error) throw error;
  return data as ChallengeRow;
}

export async function completeChallenge(challengeId: string) {
  const { error } = await supabase
    .from("challenges")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", challengeId);

  if (error) throw error;
}

export async function deleteChallenge(params: {
  userId: string;
  challengeId: string;
}) {
  const { data: entryRows, error: entryError } = await supabase
    .from("grape_entries")
    .select("image_path")
    .eq("challenge_id", params.challengeId)
    .eq("user_id", params.userId);

  if (entryError) throw entryError;

  const imagePaths = (entryRows ?? [])
    .map((row) => row.image_path as string)
    .filter(Boolean);

  const { error: deleteError } = await supabase
    .from("challenges")
    .delete()
    .eq("id", params.challengeId)
    .eq("user_id", params.userId);

  if (deleteError) throw deleteError;

  void removeGrapePhotosQuietly(imagePaths);
}

export function toChallengeSummary(
  row: ChallengeRow,
  previous?: ChallengeSummary,
): ChallengeSummary {
  return {
    id: row.id,
    title: row.title,
    grapeCount: row.grape_count,
    entryCount: previous?.entryCount ?? 0,
    createdAt: previous?.createdAt ?? formatDate(row.created_at),
  };
}
