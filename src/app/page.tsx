"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";

type GrapeEntry = {
  grapeIndex: number;
  imageUrl: string;
  content: string;
  createdAt: string;
};

type Challenge = {
  title: string;
  grapeCount: number;
  entries: GrapeEntry[];
};

const initialChallenge: Challenge = {
  title: "운동 30일",
  grapeCount: 30,
  entries: Array.from({ length: 12 }, (_, index) => ({
    grapeIndex: index + 1,
    imageUrl:
      index % 2 === 0
        ? "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=80"
        : "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=900&q=80",
    content: index === 11 ? "오늘은 5km 뛰었다." : "오늘도 움직였다.",
    createdAt: `2026.06.${String(18 + index).padStart(2, "0")}`,
  })),
};

function createGrapeRows(count: number) {
  const rows: number[][] = [];
  let grapeIndex = 1;
  const rowPattern = [5, 4];

  while (grapeIndex <= count) {
    const rowSize = rowPattern[rows.length % rowPattern.length];
    const remaining = count - grapeIndex + 1;
    const currentSize = Math.min(rowSize, remaining);

    rows.push(Array.from({ length: currentSize }, () => grapeIndex++));
  }

  return rows;
}

function formatToday() {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll(". ", ".")
    .replace(/\.$/, "");
}

export default function Home() {
  const [challenge, setChallenge] = useState(initialChallenge);
  const [setupOpen, setSetupOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<GrapeEntry | null>(
    initialChallenge.entries.at(-1) ?? null,
  );
  const [draftTitle, setDraftTitle] = useState(initialChallenge.title);
  const [draftEntry, setDraftEntry] = useState({ imageUrl: "", content: "" });
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);

  const rows = useMemo(
    () => createGrapeRows(challenge.grapeCount),
    [challenge.grapeCount],
  );
  const nextGrapeIndex = challenge.entries.length + 1;
  const complete = challenge.entries.length >= challenge.grapeCount;

  function openTodayGrape() {
    if (complete) return;
    setDraftEntry({ imageUrl: "", content: "" });
    setCaptureOpen(true);
  }

  function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = draftTitle.trim();
    if (!title) return;

    setChallenge({ title, grapeCount: 30, entries: [] });
    setDetailEntry(null);
    setJustAddedIndex(null);
    setSetupOpen(false);
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setDraftEntry((current) => ({
      ...current,
      imageUrl: URL.createObjectURL(file),
    }));
  }

  function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (nextGrapeIndex > challenge.grapeCount) return;

    const entry: GrapeEntry = {
      grapeIndex: nextGrapeIndex,
      imageUrl:
        draftEntry.imageUrl ||
        "https://images.unsplash.com/photo-1528825871115-3581a5387919?auto=format&fit=crop&w=900&q=80",
      content: draftEntry.content.trim() || "오늘 포도알 하나 채웠다.",
      createdAt: formatToday(),
    };

    setChallenge((current) => ({
      ...current,
      entries: [...current.entries, entry],
    }));
    setDetailEntry(entry);
    setJustAddedIndex(entry.grapeIndex);
    setCaptureOpen(false);

    window.setTimeout(() => setJustAddedIndex(null), 700);
  }

  return (
    <main className="min-h-screen bg-[#fff8f3] text-[#241424]">
      <section className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col px-5 pb-6 pt-[max(24px,env(safe-area-inset-top))]">
        <header className="flex items-center justify-between">
          <button
            className="h-10 rounded-full px-1 text-left"
            onClick={() => setSetupOpen(true)}
            type="button"
          >
            <span className="block text-xs font-bold text-[#7c3a5d]">
              PhotoSong-i
            </span>
            <span className="block text-xl font-black tracking-normal">
              {challenge.title}
            </span>
          </button>

          <div className="rounded-full bg-white px-3 py-2 text-sm font-black text-[#6f2c83] shadow-sm">
            {challenge.entries.length}/{challenge.grapeCount}
          </div>
        </header>

        <section className="flex flex-1 flex-col justify-center py-8">
          <div className="relative mx-auto w-full max-w-[380px]">
            <div className="absolute left-1/2 top-2 h-16 w-4 -translate-x-1/2 rounded-full bg-[#4d7b37]" />
            <div className="absolute left-[51%] top-4 h-10 w-20 origin-left rotate-[22deg] rounded-[100%] bg-[#6f9b45]" />

            <div className="relative pt-16">
              {rows.map((row, rowIndex) => (
                <div
                  className={`flex justify-center gap-2 ${
                    rowIndex % 2 === 1 ? "translate-x-5" : ""
                  }`}
                  key={row.join("-")}
                >
                  {row.map((grapeIndex) => {
                    const entry = challenge.entries.find(
                      (item) => item.grapeIndex === grapeIndex,
                    );
                    const filled = Boolean(entry);
                    const isNext = grapeIndex === nextGrapeIndex && !complete;
                    const isFresh = grapeIndex === justAddedIndex;

                    return (
                      <button
                        aria-label={`${grapeIndex}번째 포도알`}
                        className={`relative my-1 grid size-[54px] place-items-center overflow-hidden rounded-full border text-sm font-black transition sm:size-[60px] ${
                          filled
                            ? "border-[#481653] bg-[#723084] text-white shadow-[inset_-7px_-9px_0_rgba(0,0,0,0.18),0_10px_18px_rgba(103,39,120,0.18)]"
                            : isNext
                              ? "border-[#cfc0c7] bg-white text-[#8b7a84] shadow-sm"
                              : "border-[#d8cfd3] bg-[#ede8ea] text-transparent"
                        } ${isFresh ? "animate-grape-pop" : ""}`}
                        disabled={!filled && !isNext}
                        key={grapeIndex}
                        onClick={() => {
                          if (entry) {
                            setDetailEntry(entry);
                            return;
                          }
                          if (isNext) openTodayGrape();
                        }}
                        type="button"
                      >
                        {entry ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              alt=""
                              className="absolute inset-0 h-full w-full object-cover"
                              src={entry.imageUrl}
                            />
                            <span className="absolute inset-0 bg-[#6f2c83]/45 mix-blend-multiply" />
                            <span className="absolute inset-0 rounded-full shadow-[inset_-8px_-10px_0_rgba(42,12,52,0.32),inset_7px_8px_0_rgba(255,255,255,0.18)]" />
                            <span className="absolute left-3 top-2 size-3 rounded-full bg-white/55 blur-[1px]" />
                          </>
                        ) : isNext ? (
                          "○"
                        ) : (
                          ""
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {complete ? (
            <div className="mt-8 rounded-[8px] bg-[#fff2bd] px-4 py-3 text-center text-sm font-black text-[#614200] shadow-[0_0_28px_rgba(219,178,63,0.35)]">
              포도송이를 완성했습니다!
            </div>
          ) : null}
        </section>

        <button
          className="h-14 w-full rounded-[8px] bg-[#6f2c83] text-base font-black text-white shadow-[0_16px_28px_rgba(111,44,131,0.24)] transition active:scale-[0.99] disabled:bg-[#b6a6bd]"
          disabled={complete}
          onClick={openTodayGrape}
          type="button"
        >
          오늘의 포도알
        </button>

        {setupOpen ? (
          <div className="fixed inset-0 z-20 flex items-end bg-black/35 px-4 pb-4">
            <form
              className="mx-auto w-full max-w-[420px] rounded-[8px] bg-white p-4 shadow-2xl"
              onSubmit={handleGoalSubmit}
            >
              <h2 className="text-lg font-black">목표 만들기</h2>
              <label className="mt-4 block text-sm font-bold text-[#604c5a]">
                목표
                <input
                  className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="운동 30일"
                  value={draftTitle}
                />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="h-12 rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
                  onClick={() => setSetupOpen(false)}
                  type="button"
                >
                  닫기
                </button>
                <button
                  className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white"
                  type="submit"
                >
                  시작
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {captureOpen ? (
          <div className="fixed inset-0 z-20 flex items-end bg-black/35 px-4 pb-4">
            <form
              className="mx-auto w-full max-w-[420px] rounded-[8px] bg-white p-4 shadow-2xl"
              onSubmit={handleEntrySubmit}
            >
              <h2 className="text-lg font-black">
                {nextGrapeIndex}번째 포도알
              </h2>

              <label className="mt-4 grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-[8px] border border-dashed border-[#b88ac8] bg-[#fff8f3] text-sm font-black text-[#6f2c83]">
                {draftEntry.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="오늘의 포도알 사진"
                    className="h-full w-full object-cover"
                    src={draftEntry.imageUrl}
                  />
                ) : (
                  <span>사진 *</span>
                )}
                <input
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleImageChange}
                  type="file"
                />
              </label>

              <label className="mt-4 block text-sm font-bold text-[#604c5a]">
                한 줄
                <input
                  className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                  onChange={(event) =>
                    setDraftEntry((current) => ({
                      ...current,
                      content: event.target.value,
                    }))
                  }
                  placeholder="오늘도 움직였다."
                  value={draftEntry.content}
                />
              </label>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="h-12 rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
                  onClick={() => setCaptureOpen(false)}
                  type="button"
                >
                  닫기
                </button>
                <button
                  className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white"
                  type="submit"
                >
                  등록
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {detailEntry ? (
          <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[460px] px-5 pb-[max(96px,env(safe-area-inset-bottom))]">
            <button
              aria-label="포도알 상세 닫기"
              className="mb-2 ml-auto block rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#604c5a] shadow-sm"
              onClick={() => setDetailEntry(null)}
              type="button"
            >
              닫기
            </button>
            <article className="overflow-hidden rounded-[8px] bg-white shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={`${detailEntry.grapeIndex}번째 포도알 사진`}
                className="aspect-[4/3] w-full object-cover"
                src={detailEntry.imageUrl}
              />
              <div className="p-4">
                <p className="text-xs font-black text-[#6f2c83]">
                  {detailEntry.grapeIndex}번째 포도알
                </p>
                <p className="mt-2 text-base font-bold leading-6">
                  {detailEntry.content}
                </p>
                <p className="mt-2 text-xs font-bold text-[#86717f]">
                  {detailEntry.createdAt}
                </p>
              </div>
            </article>
          </div>
        ) : null}
      </section>
    </main>
  );
}
