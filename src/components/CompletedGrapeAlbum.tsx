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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openPrintableAlbum(title: string, entries: GrapeEntry[]) {
  const printWindow = window.open("", "_blank", "noopener,noreferrer");
  if (!printWindow) {
    throw new Error("팝업이 차단되어 PDF 화면을 열지 못했습니다.");
  }

  const safeTitle = escapeHtml(title);
  const entryHtml = entries
    .map(
      (entry) => `
        <article class="entry">
          <img alt="${entry.grapeIndex}번째 포도알 사진" src="${entry.imageUrl}" />
          <div class="entry-body">
            <strong>${entry.grapeIndex}번째 포도알</strong>
            <span>사건 날짜 ${escapeHtml(entry.eventDate)}</span>
            <p>${escapeHtml(entry.content)}</p>
          </div>
        </article>
      `,
    )
    .join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeTitle} - 포토송이 앨범</title>
        <style>
          @page { margin: 18mm; }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            color: #241424;
            background: #fff8f3;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          main { max-width: 880px; margin: 0 auto; padding: 36px 24px; }
          header { text-align: center; margin-bottom: 28px; }
          .brand { color: #7c3a5d; font-weight: 900; font-size: 14px; }
          h1 { margin: 8px 0 10px; font-size: 34px; line-height: 1.2; }
          .summary { color: #604c5a; font-weight: 800; }
          .entry {
            break-inside: avoid;
            display: grid;
            grid-template-columns: 180px 1fr;
            gap: 18px;
            margin-top: 16px;
            padding: 16px;
            border-radius: 8px;
            background: #ffffff;
            border: 1px solid #ead8d0;
          }
          img {
            width: 180px;
            height: 180px;
            object-fit: cover;
            border-radius: 8px;
            background: #eee7eb;
          }
          .entry-body { padding-top: 4px; }
          strong { display: block; color: #6f2c83; font-size: 18px; }
          span {
            display: block;
            margin-top: 6px;
            color: #86717f;
            font-size: 13px;
            font-weight: 800;
          }
          p {
            margin: 18px 0 0;
            color: #241424;
            font-size: 18px;
            font-weight: 800;
            line-height: 1.55;
            white-space: pre-wrap;
          }
          .print {
            position: sticky;
            bottom: 18px;
            display: block;
            width: min(320px, 100%);
            height: 48px;
            margin: 28px auto 0;
            border: 0;
            border-radius: 8px;
            background: #6f2c83;
            color: #ffffff;
            font-weight: 900;
            cursor: pointer;
          }
          @media print {
            body { background: #ffffff; }
            main { padding: 0; }
            .print { display: none; }
          }
          @media (max-width: 640px) {
            .entry { grid-template-columns: 1fr; }
            img { width: 100%; height: auto; aspect-ratio: 1 / 1; }
          }
        </style>
      </head>
      <body>
        <main>
          <header>
            <div class="brand">PhotoSong-i</div>
            <h1>${safeTitle}</h1>
            <div class="summary">${entries.length}개의 포도알 앨범</div>
          </header>
          ${entryHtml}
          <button class="print" onclick="window.print()">PDF로 저장 / 인쇄</button>
        </main>
      </body>
    </html>
  `);
  printWindow.document.close();
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
        <button
          className="mt-2 h-11 w-full rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
          onClick={() => openPrintableAlbum(title, entries)}
          type="button"
        >
          앨범 PDF 저장
        </button>
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
