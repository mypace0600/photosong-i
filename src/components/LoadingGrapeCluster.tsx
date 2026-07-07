export function LoadingGrapeCluster() {
  return (
    <div className="grid gap-2" aria-hidden="true">
      {[5, 4, 5, 4].map((count, rowIndex) => (
        <div
          className={`flex justify-center gap-2 ${
            rowIndex % 2 === 1 ? "translate-x-4" : ""
          }`}
          key={`${count}-${rowIndex}`}
        >
          {Array.from({ length: count }).map((_, grapeIndex) => (
            <span
              className="size-9 animate-pulse rounded-full bg-[#e4d8df]"
              key={`${rowIndex}-${grapeIndex}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
