import type { GrapeEntry } from "@/lib/photo-song-types";
import { formatDate } from "@/lib/date";

type GrapeEntryDetailProps = {
  entry: GrapeEntry;
  onEdit: (entry: GrapeEntry) => void;
  onClose: () => void;
};

export function GrapeEntryDetail({
  entry,
  onEdit,
  onClose,
}: GrapeEntryDetailProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[460px] px-5 pb-[max(96px,env(safe-area-inset-bottom))]">
      <div className="mb-2 flex justify-end gap-2">
        <button
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#6f2c83] shadow-sm"
          onClick={() => onEdit(entry)}
          type="button"
        >
          수정
        </button>
        <button
          aria-label="포도알 상세 닫기"
          className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#604c5a] shadow-sm"
          onClick={onClose}
          type="button"
        >
          닫기
        </button>
      </div>
      <article className="max-h-[min(72vh,620px)] overflow-y-auto rounded-[8px] bg-white shadow-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${entry.grapeIndex}번째 포도알 사진`}
          className="aspect-[4/3] w-full object-cover"
          src={entry.imageUrl}
        />
        <div className="p-4">
          <p className="text-xs font-black text-[#6f2c83]">
            {entry.grapeIndex}번째 포도알
          </p>
          <p className="mt-2 text-base font-bold leading-6">{entry.content}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold text-[#86717f]">
            <p>사건 날짜 {formatDate(entry.eventDate)}</p>
            <p>등록일 {entry.createdAt}</p>
          </div>
        </div>
      </article>
    </div>
  );
}
