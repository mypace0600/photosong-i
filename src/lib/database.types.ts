export type ChallengeRow = {
  id: string;
  user_id: string;
  title: string;
  grape_count: number;
  created_at: string;
  completed_at: string | null;
  one_grape_per_day: boolean;
};

export type GrapeEntryRow = {
  id: string;
  challenge_id: string;
  user_id: string;
  grape_index: number;
  image_path: string;
  content: string | null;
  event_date: string;
  created_at: string;
};
