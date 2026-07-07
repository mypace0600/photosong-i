export type GrapeEntry = {
  id: string;
  grapeIndex: number;
  imagePath: string;
  imageUrl: string;
  content: string;
  eventDate: string;
  createdAt: string;
};

export type Challenge = {
  id: string;
  title: string;
  grapeCount: number;
  entries: GrapeEntry[];
};

export type ChallengeSummary = {
  id: string;
  title: string;
  grapeCount: number;
  entryCount: number;
  createdAt: string;
};

export type GrapeEntryDraft = {
  file: File | null;
  previewUrl: string;
  content: string;
  eventDate: string;
};
