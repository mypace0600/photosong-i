import type { FormEvent } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { FeedbackMessage } from "@/components/FeedbackMessage";
import { GoalTemplatePicker } from "@/components/GoalTemplatePicker";

type GoalSheetProps = {
  editing: boolean;
  title: string;
  grapeCount: number;
  oneGrapePerDay: boolean;
  error: string;
  saving: boolean;
  authSubmitting?: boolean;
  showDangerActions?: boolean;
  onTitleChange: (value: string) => void;
  onGrapeCountChange: (value: number) => void;
  onOneGrapePerDayChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  onDelete?: () => void;
  onSignOut?: () => void;
};

export function GoalSheet({
  editing,
  title,
  grapeCount,
  oneGrapePerDay,
  error,
  saving,
  authSubmitting = false,
  showDangerActions = false,
  onTitleChange,
  onGrapeCountChange,
  onOneGrapePerDayChange,
  onSubmit,
  onClose,
  onDelete,
  onSignOut,
}: GoalSheetProps) {
  return (
    <BottomSheet>
      <form onSubmit={onSubmit}>
        <h2 className="text-lg font-black">
          {editing ? "목표 수정" : "목표 만들기"}
        </h2>
        {!editing ? (
          <GoalTemplatePicker
            onSelect={(template) => {
              onTitleChange(template.title);
              onGrapeCountChange(template.grapeCount);
            }}
          />
        ) : null}
        <label className="mt-4 block text-sm font-bold text-[#604c5a]">
          목표
          <input
            className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
            maxLength={32}
            onChange={(event) => onTitleChange(event.target.value)}
            placeholder="운동 30일"
            required
            value={title}
          />
        </label>
        <label className="mt-4 block text-sm font-bold text-[#604c5a]">
          도전 일수
          <input
            className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
            inputMode="numeric"
            max={100}
            min={1}
            onChange={(event) => onGrapeCountChange(Number(event.target.value))}
            required
            type="number"
            value={grapeCount}
          />
        </label>
        <label className="mt-4 flex items-start gap-3 rounded-[8px] bg-[#fff8f3] p-3 text-sm font-bold text-[#604c5a] ring-1 ring-[#ead8d0]">
          <input
            checked={oneGrapePerDay}
            className="mt-1 size-4 accent-[#6f2c83]"
            onChange={(event) => onOneGrapePerDayChange(event.target.checked)}
            type="checkbox"
          />
          <span>
            같은 달성일 중복 방지
            <span className="mt-1 block text-xs leading-5 text-[#86717f]">
              이 목표에서는 같은 달성일로 포도알을 여러 개 등록할 수 없습니다.
            </span>
          </span>
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
            {saving ? "저장 중" : editing ? "수정" : "시작"}
          </button>
        </div>
        {showDangerActions && editing && onDelete ? (
          <button
            className="mt-2 h-11 w-full rounded-[8px] bg-[#fff2f2] text-sm font-black text-[#a33535]"
            disabled={saving}
            onClick={onDelete}
            type="button"
          >
            삭제
          </button>
        ) : null}
        {showDangerActions && onSignOut ? (
          <button
            className="mt-2 h-10 w-full text-sm font-black text-[#6f2c83] disabled:text-[#b6a6bd]"
            disabled={saving || authSubmitting}
            onClick={onSignOut}
            type="button"
          >
            로그아웃
          </button>
        ) : null}
      </form>
    </BottomSheet>
  );
}
