import type { ChangeEvent, FormEvent } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { FeedbackMessage } from "@/components/FeedbackMessage";
import type { GrapeEntryDraft } from "@/lib/photo-song-types";

type GrapeEntrySheetProps = {
  mode: "create" | "edit";
  grapeIndex: number;
  draft: GrapeEntryDraft;
  error: string;
  saving: boolean;
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDraftChange: (draft: Partial<GrapeEntryDraft>) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
};

export function GrapeEntrySheet({
  mode,
  grapeIndex,
  draft,
  error,
  saving,
  onImageChange,
  onDraftChange,
  onSubmit,
  onClose,
}: GrapeEntrySheetProps) {
  const isEdit = mode === "edit";

  return (
    <BottomSheet>
      <form onSubmit={onSubmit}>
        <h2 className="text-lg font-black">
          {grapeIndex}번째 포도알 {isEdit ? "고치기" : "붙이기"}
        </h2>

        <div className="mt-4">
          <label className="grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-[8px] border border-dashed border-[#b88ac8] bg-[#fff8f3] text-sm font-black text-[#6f2c83] shadow-inner">
            {draft.previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt={isEdit ? "수정할 포도알 사진" : "오늘의 포도알 사진"}
                className="h-full w-full object-cover"
                src={draft.previewUrl}
              />
            ) : (
              <span>오늘의 사진 선택</span>
            )}
            <input
              accept="image/*"
              className="sr-only"
              onChange={onImageChange}
              required={!isEdit && !draft.file}
              type="file"
            />
          </label>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="grid h-12 cursor-pointer place-items-center rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]">
              {isEdit ? "사진 다시 찍기" : "사진 찍기"}
              <input
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={onImageChange}
                type="file"
              />
            </label>
            <label className="grid h-12 cursor-pointer place-items-center rounded-[8px] bg-[#fff8f3] text-sm font-black text-[#6f2c83] shadow-sm">
              {isEdit ? "앨범에서 교체" : "앨범에서 선택"}
              <input
                accept="image/*"
                className="sr-only"
                onChange={onImageChange}
                type="file"
              />
            </label>
          </div>
        </div>

        <label className="mt-4 block text-sm font-bold text-[#604c5a]">
          사건 날짜
          <input
            className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
            onChange={(event) => onDraftChange({ eventDate: event.target.value })}
            required
            type="date"
            value={draft.eventDate}
          />
        </label>

        <label className="mt-4 block text-sm font-bold text-[#604c5a]">
          한 줄 기록
          <input
            className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
            maxLength={60}
            onChange={(event) => onDraftChange({ content: event.target.value })}
            placeholder="비워두면 기본 문구로 저장돼요."
            value={draft.content}
          />
        </label>

        <FeedbackMessage error={error} className="mt-3" />

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            className="h-12 rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
          <button
            className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
            disabled={saving}
            type="submit"
          >
            {saving
              ? isEdit
                ? "포도알 고치는 중"
                : "포도알 붙이는 중"
              : isEdit
                ? "포도알 고치기"
                : "포도알 붙이기"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
