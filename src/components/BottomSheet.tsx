import type { ReactNode } from "react";

type BottomSheetProps = {
  children: ReactNode;
};

export function BottomSheet({ children }: BottomSheetProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/35 px-4 pb-4">
      <div className="mx-auto w-full max-w-[420px] rounded-[8px] bg-white p-4 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
