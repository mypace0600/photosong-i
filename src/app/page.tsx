"use client";

import type { User } from "@supabase/supabase-js";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import type { ChallengeRow, GrapeEntryRow } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";

type GrapeEntry = {
  id: string;
  grapeIndex: number;
  imagePath: string;
  imageUrl: string;
  content: string;
  createdAt: string;
};

type Challenge = {
  id: string;
  title: string;
  grapeCount: number;
  entries: GrapeEntry[];
};

const GRAPE_BUCKET = "grape-photos";

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date(value))
    .replaceAll(". ", ".")
    .replace(/\.$/, "");
}

function getImageExtension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/heic") return "heic";
  return "jpg";
}

async function createSignedUrl(imagePath: string) {
  const { data, error } = await supabase.storage
    .from(GRAPE_BUCKET)
    .createSignedUrl(imagePath, 60 * 60);

  if (error) throw error;
  return data.signedUrl;
}

async function mapEntriesWithImages(rows: GrapeEntryRow[]) {
  if (rows.length === 0) return [];

  const { data, error } = await supabase.storage
    .from(GRAPE_BUCKET)
    .createSignedUrls(
      rows.map((row) => row.image_path),
      60 * 60,
    );

  if (error) throw error;

  const signedUrlByPath = new Map(
    data.map((item) => [item.path, item.signedUrl]),
  );

  return rows.map((row) => ({
    id: row.id,
    grapeIndex: row.grape_index,
    imagePath: row.image_path,
    imageUrl: signedUrlByPath.get(row.image_path) ?? "",
    content: row.content ?? "오늘 포도알 하나 채웠다.",
    createdAt: formatDate(row.created_at),
  }));
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authDraft, setAuthDraft] = useState({ email: "", password: "" });
  const [authMessage, setAuthMessage] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [detailEntry, setDetailEntry] = useState<GrapeEntry | null>(null);
  const [draftTitle, setDraftTitle] = useState("운동 30일");
  const [draftEntry, setDraftEntry] = useState<{
    file: File | null;
    previewUrl: string;
    content: string;
  }>({ file: null, previewUrl: "", content: "" });
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [appError, setAppError] = useState("");

  const rows = useMemo(
    () => createGrapeRows(challenge?.grapeCount ?? 30),
    [challenge?.grapeCount],
  );
  const nextGrapeIndex = (challenge?.entries.length ?? 0) + 1;
  const complete = Boolean(
    challenge && challenge.entries.length >= challenge.grapeCount,
  );

  async function loadChallenge(currentUser: User) {
    setDataLoading(true);
    setAppError("");

    try {
      const { data: challenges, error: challengeError } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (challengeError) throw challengeError;

      const activeChallenge = challenges?.[0] as ChallengeRow | undefined;

      if (!activeChallenge) {
        setChallenge(null);
        setDetailEntry(null);
        return;
      }

      const { data: entryRows, error: entryError } = await supabase
        .from("grape_entries")
        .select("*")
        .eq("challenge_id", activeChallenge.id)
        .order("grape_index", { ascending: true });

      if (entryError) throw entryError;

      const entries = await mapEntriesWithImages(
        (entryRows ?? []) as GrapeEntryRow[],
      );

      const nextChallenge = {
        id: activeChallenge.id,
        title: activeChallenge.title,
        grapeCount: activeChallenge.grape_count,
        entries,
      };

      setChallenge(nextChallenge);
      setDraftTitle(activeChallenge.title);
      setDetailEntry(entries.at(-1) ?? null);
    } catch (error) {
      setAppError(
        error instanceof Error
          ? error.message
          : "포도송이를 불러오지 못했습니다.",
      );
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      if (currentUser) void loadChallenge(currentUser);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      setChallenge(null);
      setDetailEntry(null);
      if (currentUser) void loadChallenge(currentUser);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthMessage("");
    setAuthSubmitting(true);

    try {
      const email = authDraft.email.trim();
      const password = authDraft.password;

      const { data, error } =
        authMode === "signup"
          ? await supabase.auth.signUp({
              email,
              password,
              options: {
                emailRedirectTo: window.location.origin,
              },
            })
          : await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      if (authMode === "signup" && !data.session) {
        setAuthMessage("가입 확인 메일을 확인한 뒤 다시 로그인하세요.");
        return;
      }

      setAuthMessage("");
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "인증에 실패했습니다.",
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setChallenge(null);
  }

  function openTodayGrape() {
    if (!challenge || complete) return;
    setDraftEntry({ file: null, previewUrl: "", content: "" });
    setAppError("");
    setCaptureOpen(true);
  }

  async function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const title = draftTitle.trim();
    if (!title) return;

    setSaving(true);
    setAppError("");

    try {
      const { data, error } = await supabase
        .from("challenges")
        .insert({
          user_id: user.id,
          title,
          grape_count: 30,
        })
        .select("*")
        .single();

      if (error) throw error;

      const row = data as ChallengeRow;
      setChallenge({
        id: row.id,
        title: row.title,
        grapeCount: row.grape_count,
        entries: [],
      });
      setDetailEntry(null);
      setJustAddedIndex(null);
      setSetupOpen(false);
    } catch (error) {
      setAppError(
        error instanceof Error ? error.message : "목표를 만들지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (draftEntry.previewUrl) {
      URL.revokeObjectURL(draftEntry.previewUrl);
    }

    setDraftEntry((current) => ({
      ...current,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
  }

  async function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !challenge || nextGrapeIndex > challenge.grapeCount) return;

    if (!draftEntry.file) {
      setAppError("사진을 먼저 선택하세요.");
      return;
    }

    setSaving(true);
    setAppError("");

    try {
      const imagePath = `${user.id}/${challenge.id}/${nextGrapeIndex}-${Date.now()}.${getImageExtension(draftEntry.file)}`;
      const { error: uploadError } = await supabase.storage
        .from(GRAPE_BUCKET)
        .upload(imagePath, draftEntry.file, {
          contentType: draftEntry.file.type || "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data, error } = await supabase
        .from("grape_entries")
        .insert({
          challenge_id: challenge.id,
          user_id: user.id,
          grape_index: nextGrapeIndex,
          image_path: imagePath,
          content: draftEntry.content.trim() || "오늘 포도알 하나 채웠다.",
        })
        .select("*")
        .single();

      if (error) throw error;

      if (nextGrapeIndex === challenge.grapeCount) {
        await supabase
          .from("challenges")
          .update({ completed_at: new Date().toISOString() })
          .eq("id", challenge.id);
      }

      const entryRow = data as GrapeEntryRow;
      const entry = {
        id: entryRow.id,
        grapeIndex: entryRow.grape_index,
        imagePath: entryRow.image_path,
        imageUrl: await createSignedUrl(entryRow.image_path),
        content: entryRow.content ?? "오늘 포도알 하나 채웠다.",
        createdAt: formatDate(entryRow.created_at),
      };

      setChallenge((current) =>
        current
          ? {
              ...current,
              entries: [...current.entries, entry],
            }
          : current,
      );
      setDetailEntry(entry);
      setJustAddedIndex(entry.grapeIndex);
      setDraftEntry({ file: null, previewUrl: "", content: "" });
      setCaptureOpen(false);

      window.setTimeout(() => setJustAddedIndex(null), 700);
    } catch (error) {
      setAppError(
        error instanceof Error
          ? error.message
          : "오늘의 포도알을 저장하지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8f3] px-5 text-[#241424]">
        <p className="text-sm font-black text-[#6f2c83]">포토송이 여는 중</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#fff8f3] px-5 text-[#241424]">
        <section className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center">
          <div className="text-center">
            <div className="mx-auto grid size-20 place-items-center rounded-full bg-[#6f2c83] text-4xl text-white shadow-[0_16px_32px_rgba(111,44,131,0.22)]">
              🍇
            </div>
            <p className="mt-6 text-sm font-black text-[#7c3a5d]">
              PhotoSong-i
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-normal">
              포토송이
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-[#604c5a]">
              목표를 사진으로 키우세요.
            </p>
          </div>

          <form
            className="mt-8 rounded-[8px] bg-white p-4 shadow-xl"
            onSubmit={handleAuthSubmit}
          >
            <h2 className="text-lg font-black">
              {authMode === "signin" ? "로그인" : "회원가입"}
            </h2>
            <label className="mt-4 block text-sm font-bold text-[#604c5a]">
              이메일
              <input
                className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                onChange={(event) =>
                  setAuthDraft((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
                required
                type="email"
                value={authDraft.email}
              />
            </label>
            <label className="mt-3 block text-sm font-bold text-[#604c5a]">
              비밀번호
              <input
                className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                minLength={6}
                onChange={(event) =>
                  setAuthDraft((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                required
                type="password"
                value={authDraft.password}
              />
            </label>

            {authMessage ? (
              <p className="mt-3 rounded-[8px] bg-[#fff8f3] p-3 text-sm font-bold leading-5 text-[#6f2c83]">
                {authMessage}
              </p>
            ) : null}

            <button
              className="mt-4 h-12 w-full rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
              disabled={authSubmitting}
              type="submit"
            >
              {authSubmitting
                ? "처리 중"
                : authMode === "signin"
                  ? "시작하기"
                  : "가입하기"}
            </button>

            <button
              className="mt-3 h-10 w-full text-sm font-black text-[#6f2c83]"
              onClick={() => {
                setAuthMode((current) =>
                  current === "signin" ? "signup" : "signin",
                );
                setAuthMessage("");
              }}
              type="button"
            >
              {authMode === "signin"
                ? "처음이라면 회원가입"
                : "이미 계정이 있다면 로그인"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  if (dataLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8f3] px-5 text-[#241424]">
        <p className="text-sm font-black text-[#6f2c83]">
          내 포도송이 불러오는 중
        </p>
      </main>
    );
  }

  if (!challenge) {
    return (
      <main className="min-h-screen bg-[#fff8f3] px-5 text-[#241424]">
        <section className="mx-auto flex min-h-screen w-full max-w-[420px] flex-col justify-center">
          <div className="text-center">
            <p className="text-sm font-black text-[#7c3a5d]">PhotoSong-i</p>
            <h1 className="mt-1 text-3xl font-black tracking-normal">
              목표 만들기
            </h1>
          </div>

          <form
            className="mt-8 rounded-[8px] bg-white p-4 shadow-xl"
            onSubmit={handleGoalSubmit}
          >
            <label className="block text-sm font-bold text-[#604c5a]">
              목표
              <input
                className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="운동 30일"
                required
                value={draftTitle}
              />
            </label>
            {appError ? (
              <p className="mt-3 rounded-[8px] bg-[#fff2f2] p-3 text-sm font-bold leading-5 text-[#a33535]">
                {appError}
              </p>
            ) : null}
            <button
              className="mt-4 h-12 w-full rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
              disabled={saving}
              type="submit"
            >
              {saving ? "만드는 중" : "시작"}
            </button>
            <button
              className="mt-3 h-10 w-full text-sm font-black text-[#6f2c83]"
              onClick={handleSignOut}
              type="button"
            >
              로그아웃
            </button>
          </form>
        </section>
      </main>
    );
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

          <button
            className="rounded-full bg-white px-3 py-2 text-sm font-black text-[#6f2c83] shadow-sm"
            onClick={handleSignOut}
            type="button"
          >
            {challenge.entries.length}/{challenge.grapeCount}
          </button>
        </header>

        {appError ? (
          <p className="mt-4 rounded-[8px] bg-[#fff2f2] p-3 text-sm font-bold leading-5 text-[#a33535]">
            {appError}
          </p>
        ) : null}

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
          disabled={complete || saving}
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
                  required
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
                  className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
                  disabled={saving}
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
                {draftEntry.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt="오늘의 포도알 사진"
                    className="h-full w-full object-cover"
                    src={draftEntry.previewUrl}
                  />
                ) : (
                  <span>사진 *</span>
                )}
                <input
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={handleImageChange}
                  required
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
                  className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "저장 중" : "등록"}
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
