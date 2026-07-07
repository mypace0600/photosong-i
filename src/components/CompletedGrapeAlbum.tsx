import { BottomSheet } from "@/components/BottomSheet";
import type { GrapeEntry } from "@/lib/photo-song-types";

type CompletedGrapeAlbumProps = {
  title: string;
  entries: GrapeEntry[];
  onEntryClick: (entry: GrapeEntry) => void;
  onClose: () => void;
};

export function CompletedGrapeAlbum({
  title,
  entries,
  onEntryClick,
  onClose,
}: CompletedGrapeAlbumProps) {
  return (
    <BottomSheet>
      <div>
        <h2 className="text-lg font-black">완성된 포도송이</h2>
        <p className="mt-1 text-sm font-bold text-[#604c5a]">{title}</p>
        <div className="mt-4 grid max-h-[58vh] grid-cols-3 gap-2 overflow-y-auto pr-1">
          {entries.map((entry) => (
            <button
              className="overflow-hidden rounded-[8px] bg-[#fff8f3] text-left"
              key={entry.id}
              onClick={() => onEntryClick(entry)}
              type="button"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${entry.grapeIndex}번째 포도알 사진`}
                className="aspect-square w-full object-cover"
                src={entry.imageUrl}
              />
              <p className="px-2 py-1 text-xs font-black text-[#6f2c83]">
                {entry.grapeIndex}
              </p>
            </button>
          ))}
        </div>
        <button
          className="mt-4 h-12 w-full rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
          onClick={onClose}
          type="button"
        >
          닫기
        </button>
      </div>
    </BottomSheet>
  );
}
