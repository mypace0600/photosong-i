import type { GrapeEntry } from "@/lib/photo-song-types";

type GrapeClusterProps = {
  rows: number[][];
  entries: GrapeEntry[];
  nextGrapeIndex: number;
  complete: boolean;
  justAddedIndex: number | null;
  onEntryClick: (entry: GrapeEntry) => void;
  onNextClick: () => void;
};

export function GrapeCluster({
  rows,
  entries,
  nextGrapeIndex,
  complete,
  justAddedIndex,
  onEntryClick,
  onNextClick,
}: GrapeClusterProps) {
  return (
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
              const entry = entries.find(
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
                        ? "border-[#7f3d90] bg-white text-[#6f2c83] shadow-[0_0_0_5px_rgba(111,44,131,0.08),0_12px_22px_rgba(111,44,131,0.14)]"
                        : "border-[#d8cfd3] bg-[#eee9ec] text-transparent opacity-70"
                  } ${isFresh ? "animate-grape-pop" : ""}`}
                  disabled={!filled && !isNext}
                  key={grapeIndex}
                  onClick={() => {
                    if (entry) {
                      onEntryClick(entry);
                      return;
                    }
                    if (isNext) onNextClick();
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
                      <span className="absolute inset-0 bg-[#6f2c83]/25 mix-blend-multiply" />
                      <span className="absolute inset-0 rounded-full shadow-[inset_-8px_-10px_0_rgba(42,12,52,0.26),inset_7px_8px_0_rgba(255,255,255,0.2)]" />
                      <span className="absolute left-3 top-2 size-3 rounded-full bg-white/55 blur-[1px]" />
                    </>
                  ) : isNext ? (
                    "+"
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
  );
}
