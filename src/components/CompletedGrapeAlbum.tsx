"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import type { GrapeEntry } from "@/lib/photo-song-types";

type CompletedGrapeAlbumProps = {
  title: string;
  entries: GrapeEntry[];
  grapeCount: number;
  onEntryClick: (entry: GrapeEntry) => void;
  onClose: () => void;
};

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const characters = Array.from(text);
  let line = "";
  let currentY = y;

  characters.forEach((character) => {
    const testLine = line + character;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, currentY);
      line = character;
      currentY += lineHeight;
      return;
    }
    line = testLine;
  });

  if (line) {
    context.fillText(line, x, currentY);
  }
}

function createGrapePoints(count: number) {
  const points: Array<{ x: number; y: number }> = [];
  const rowPattern = [5, 4];
  let grapeIndex = 0;

  while (grapeIndex < count) {
    const rowIndex = points.length === 0 ? 0 : Math.floor(grapeIndex / 4.5);
    const rowSize = Math.min(rowPattern[rowIndex % rowPattern.length], count - grapeIndex);
    const offset = rowSize === 4 ? 31 : 0;

    for (let columnIndex = 0; columnIndex < rowSize; columnIndex += 1) {
      if (grapeIndex >= count) break;
      points.push({
        x: 250 + offset + columnIndex * 62,
        y: 250 + rowIndex * 58,
      });
      grapeIndex += 1;
    }
  }

  return points;
}

async function generateShareImage(title: string, grapeCount: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1080;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("이미지를 만들 수 없습니다.");
  }

  context.fillStyle = "#fff8f3";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = "#6f2c83";
  context.beginPath();
  context.arc(540, 126, 58, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#ffffff";
  context.font = "700 54px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("🍇", 540, 126);

  context.fillStyle = "#7c3a5d";
  context.font = "800 34px sans-serif";
  context.fillText("PhotoSong-i", 540, 230);

  context.fillStyle = "#241424";
  context.font = "900 64px sans-serif";
  context.textBaseline = "top";
  drawWrappedText(context, title, 540, 292, 760, 76);

  context.fillStyle = "#604c5a";
  context.font = "800 34px sans-serif";
  context.textBaseline = "middle";
  context.fillText(`${grapeCount}개의 포도알을 모두 채웠어요`, 540, 440);

  const points = createGrapePoints(grapeCount);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const clusterWidth = maxX - minX + 58;
  const clusterHeight = maxY - minY + 58;
  const scale = Math.min(1.28, 620 / clusterWidth, 420 / clusterHeight);
  const originX = 540 - ((minX + maxX) / 2) * scale;
  const originY = 714 - ((minY + maxY) / 2) * scale;

  context.save();
  context.translate(originX, originY);
  context.scale(scale, scale);

  context.strokeStyle = "#5b7f2e";
  context.lineWidth = 18;
  context.lineCap = "round";
  context.beginPath();
  context.moveTo(520, 210);
  context.quadraticCurveTo(545, 170, 585, 178);
  context.stroke();

  points.forEach((point, index) => {
    const gradient = context.createRadialGradient(
      point.x - 12,
      point.y - 14,
      6,
      point.x,
      point.y,
      31,
    );
    gradient.addColorStop(0, index % 3 === 0 ? "#c98be0" : "#b86bd4");
    gradient.addColorStop(1, "#6f2c83");
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(point.x, point.y, 29, 0, Math.PI * 2);
    context.fill();
  });
  context.restore();

  context.fillStyle = "#6f2c83";
  context.font = "900 42px sans-serif";
  context.textBaseline = "middle";
  context.fillText("포도송이를 완성했습니다", 540, 958);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error("이미지를 저장하지 못했습니다."));
    }, "image/png");
  });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function CompletedGrapeAlbum({
  title,
  entries,
  grapeCount,
  onEntryClick,
  onClose,
}: CompletedGrapeAlbumProps) {
  const [shareMessage, setShareMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  async function handleShareImage() {
    if (sharing) return;

    setSharing(true);
    setShareMessage("");

    try {
      const blob = await generateShareImage(title, grapeCount);
      const fileName = `photosong-i-${title.replace(/[^\w가-힣-]+/g, "-")}.png`;
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "포토송이",
          text: `${title} 포도송이를 완성했어요.`,
        });
        setShareMessage("공유 이미지를 열었습니다.");
        return;
      }

      downloadBlob(blob, fileName);
      setShareMessage("공유 이미지를 저장했습니다.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setShareMessage("");
        return;
      }
      setShareMessage(
        error instanceof Error
          ? error.message
          : "공유 이미지를 만들지 못했습니다.",
      );
    } finally {
      setSharing(false);
    }
  }

  return (
    <BottomSheet>
      <div>
        <h2 className="text-lg font-black">완성된 포도송이</h2>
        <p className="mt-1 text-sm font-bold text-[#604c5a]">{title}</p>
        <button
          className="mt-4 h-12 w-full rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
          disabled={sharing}
          onClick={() => void handleShareImage()}
          type="button"
        >
          {sharing ? "이미지 만드는 중" : "공유 이미지 저장"}
        </button>
        {shareMessage ? (
          <p className="mt-2 text-center text-xs font-bold text-[#6f2c83]">
            {shareMessage}
          </p>
        ) : null}
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
