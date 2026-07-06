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

type ChallengeSummary = {
  id: string;
  title: string;
  grapeCount: number;
  entryCount: number;
  createdAt: string;
};

const GRAPE_BUCKET = "grape-photos";

function getAuthRedirectUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
}

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

  const [challengeSummaries, setChallengeSummaries] = useState<
    ChallengeSummary[]
  >([]);
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [captureOpen, setCaptureOpen] = useState(false);
  const [entryEditOpen, setEntryEditOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GrapeEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<GrapeEntry | null>(null);
  const [draftTitle, setDraftTitle] = useState("운동 30일");
  const [draftGrapeCount, setDraftGrapeCount] = useState(30);
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

  async function loadChallengeList(currentUser: User) {
    setDataLoading(true);
    setAppError("");

    try {
      const { data: challenges, error: challengeError } = await supabase
        .from("challenges")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (challengeError) throw challengeError;

      const challengeRows = (challenges ?? []) as ChallengeRow[];

      if (challengeRows.length === 0) {
        setChallengeSummaries([]);
        setChallenge(null);
        setDetailEntry(null);
        return;
      }

      const { data: entryCounts, error: entryCountError } = await supabase
        .from("grape_entries")
        .select("challenge_id")
        .eq("user_id", currentUser.id);

      if (entryCountError) throw entryCountError;

      const countByChallenge = new Map<string, number>();
      (entryCounts ?? []).forEach((row) => {
        const challengeId = row.challenge_id as string;
        countByChallenge.set(
          challengeId,
          (countByChallenge.get(challengeId) ?? 0) + 1,
        );
      });

      setChallengeSummaries(
        challengeRows.map((row) => ({
          id: row.id,
          title: row.title,
          grapeCount: row.grape_count,
          entryCount: countByChallenge.get(row.id) ?? 0,
          createdAt: formatDate(row.created_at),
        })),
      );
      setChallenge(null);
      setDetailEntry(null);
    } catch (error) {
      setAppError(
        error instanceof Error
          ? error.message
          : "목표 목록을 불러오지 못했습니다.",
      );
    } finally {
      setDataLoading(false);
    }
  }

  async function loadChallengeDetail(challengeId: string) {
    if (!user) return;

    setDataLoading(true);
    setAppError("");

    try {
      const { data: challengeRow, error: challengeError } = await supabase
        .from("challenges")
        .select("*")
        .eq("id", challengeId)
        .eq("user_id", user.id)
        .single();

      if (challengeError) throw challengeError;

      const { data: entryRows, error: entryError } = await supabase
        .from("grape_entries")
        .select("*")
        .eq("challenge_id", challengeId)
        .order("grape_index", { ascending: true });

      if (entryError) throw entryError;

      const row = challengeRow as ChallengeRow;
      const entries = await mapEntriesWithImages(
        (entryRows ?? []) as GrapeEntryRow[],
      );

      setChallenge({
        id: row.id,
        title: row.title,
        grapeCount: row.grape_count,
        entries,
      });
      setDraftTitle(row.title);
      setDraftGrapeCount(row.grape_count);
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
      if (currentUser) void loadChallengeList(currentUser);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setAuthLoading(false);
      setChallengeSummaries([]);
      setChallenge(null);
      setDetailEntry(null);
      if (currentUser) void loadChallengeList(currentUser);
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
                emailRedirectTo: getAuthRedirectUrl(),
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

  async function handleResendConfirmation() {
    const email = authDraft.email.trim();
    if (!email) {
      setAuthMessage("이메일을 입력한 뒤 다시 보내기를 눌러주세요.");
      return;
    }

    setAuthSubmitting(true);
    setAuthMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) throw error;

      setAuthMessage("확인 메일을 다시 보냈습니다. 메일함을 확인하세요.");
    } catch (error) {
      setAuthMessage(
        error instanceof Error
          ? error.message
          : "확인 메일을 다시 보내지 못했습니다.",
      );
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setAuthMessage("");
    setAuthSubmitting(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthRedirectUrl(),
        },
      });

      if (error) throw error;
    } catch (error) {
      setAuthSubmitting(false);
      setAuthMessage(
        error instanceof Error
          ? error.message
          : "소셜 로그인을 시작하지 못했습니다.",
      );
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setUser(null);
    setChallengeSummaries([]);
    setChallenge(null);
    setSetupOpen(false);
    setEditingChallengeId(null);
    setEntryEditOpen(false);
    setEditingEntry(null);
  }

  function openTodayGrape() {
    if (!challenge || complete) return;
    setDraftEntry({ file: null, previewUrl: "", content: "" });
    setAppError("");
    setCaptureOpen(true);
  }

  function openEntryEdit(entry: GrapeEntry) {
    setEditingEntry(entry);
    setDraftEntry({
      file: null,
      previewUrl: entry.imageUrl,
      content: entry.content,
    });
    setAppError("");
    setEntryEditOpen(true);
  }

  function openCreateGoal() {
    setEditingChallengeId(null);
    setDraftTitle("");
    setDraftGrapeCount(30);
    setAppError("");
    setSetupOpen(true);
  }

  function openEditGoal(summary: ChallengeSummary) {
    setEditingChallengeId(summary.id);
    setDraftTitle(summary.title);
    setDraftGrapeCount(summary.grapeCount);
    setAppError("");
    setSetupOpen(true);
  }

  async function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;

    const title = draftTitle.trim();
    if (!title) return;
    const grapeCount = Math.max(1, Math.min(100, draftGrapeCount));

    setSaving(true);
    setAppError("");

    try {
      if (editingChallengeId) {
        const currentEntryCount =
          challenge?.id === editingChallengeId
            ? challenge.entries.length
            : (challengeSummaries.find((item) => item.id === editingChallengeId)
                ?.entryCount ?? 0);
        const nextGrapeCount = Math.max(grapeCount, currentEntryCount, 1);

        const { data, error } = await supabase
          .from("challenges")
          .update({
            title,
            grape_count: nextGrapeCount,
          })
          .eq("id", editingChallengeId)
          .eq("user_id", user.id)
          .select("*")
          .single();

        if (error) throw error;

        const row = data as ChallengeRow;
        setChallengeSummaries((current) =>
          current.map((item) =>
            item.id === row.id
              ? {
                  ...item,
                  title: row.title,
                  grapeCount: row.grape_count,
                }
              : item,
          ),
        );
        setChallenge((current) =>
          current && current.id === row.id
            ? {
                ...current,
                title: row.title,
                grapeCount: row.grape_count,
              }
            : current,
        );
        setDraftGrapeCount(row.grape_count);
        setEditingChallengeId(null);
        setSetupOpen(false);
        return;
      }

      const { data, error } = await supabase
        .from("challenges")
        .insert({
          user_id: user.id,
          title,
          grape_count: grapeCount,
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
      setChallengeSummaries((current) => [
        {
          id: row.id,
          title: row.title,
          grapeCount: row.grape_count,
          entryCount: 0,
          createdAt: formatDate(row.created_at),
        },
        ...current,
      ]);
      setDetailEntry(null);
      setJustAddedIndex(null);
      setEditingChallengeId(null);
      setSetupOpen(false);
    } catch (error) {
      setAppError(
        error instanceof Error ? error.message : "목표를 만들지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteChallenge(challengeId: string) {
    if (!user || saving) return;
    const ok = window.confirm("이 목표와 포도알 기록을 삭제할까요?");
    if (!ok) return;

    setSaving(true);
    setAppError("");

    try {
      const { data: entryRows, error: entryError } = await supabase
        .from("grape_entries")
        .select("image_path")
        .eq("challenge_id", challengeId)
        .eq("user_id", user.id);

      if (entryError) throw entryError;

      const imagePaths = (entryRows ?? [])
        .map((row) => row.image_path as string)
        .filter(Boolean);

      if (imagePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from(GRAPE_BUCKET)
          .remove(imagePaths);

        if (storageError) throw storageError;
      }

      const { error: deleteError } = await supabase
        .from("challenges")
        .delete()
        .eq("id", challengeId)
        .eq("user_id", user.id);

      if (deleteError) throw deleteError;

      setChallengeSummaries((current) =>
        current.filter((item) => item.id !== challengeId),
      );
      if (challenge?.id === challengeId) {
        setChallenge(null);
        setDetailEntry(null);
      }
      setSetupOpen(false);
      setEditingChallengeId(null);
    } catch (error) {
      setAppError(
        error instanceof Error ? error.message : "목표를 삭제하지 못했습니다.",
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
      setChallengeSummaries((current) =>
        current.map((item) =>
          item.id === challenge.id
            ? { ...item, entryCount: item.entryCount + 1 }
            : item,
        ),
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

  async function handleEntryUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !challenge || !editingEntry) return;

    setSaving(true);
    setAppError("");

    try {
      let nextImagePath = editingEntry.imagePath;

      if (draftEntry.file) {
        nextImagePath = `${user.id}/${challenge.id}/${editingEntry.grapeIndex}-${Date.now()}.${getImageExtension(draftEntry.file)}`;
        const { error: uploadError } = await supabase.storage
          .from(GRAPE_BUCKET)
          .upload(nextImagePath, draftEntry.file, {
            contentType: draftEntry.file.type || "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw uploadError;
      }

      const { data, error } = await supabase
        .from("grape_entries")
        .update({
          image_path: nextImagePath,
          content: draftEntry.content.trim() || "오늘 포도알 하나 채웠다.",
        })
        .eq("id", editingEntry.id)
        .eq("user_id", user.id)
        .select("*")
        .single();

      if (error) throw error;

      if (draftEntry.file && nextImagePath !== editingEntry.imagePath) {
        await supabase.storage.from(GRAPE_BUCKET).remove([editingEntry.imagePath]);
      }

      const entryRow = data as GrapeEntryRow;
      const updatedEntry = {
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
              entries: current.entries.map((entry) =>
                entry.id === updatedEntry.id ? updatedEntry : entry,
              ),
            }
          : current,
      );
      setDetailEntry(updatedEntry);
      setEditingEntry(null);
      setEntryEditOpen(false);
      setDraftEntry({ file: null, previewUrl: "", content: "" });
    } catch (error) {
      setAppError(
        error instanceof Error
          ? error.message
          : "포도알을 수정하지 못했습니다.",
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

            <div className="mt-4 grid gap-2">
              <button
                className="flex h-12 items-center justify-center rounded-[8px] border border-[#dec9c0] bg-white text-sm font-black text-[#241424] shadow-sm disabled:text-[#9b8ca2]"
                disabled={authSubmitting}
                onClick={handleGoogleSignIn}
                type="button"
              >
                Google로 계속하기
              </button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#ead8d0]" />
              <span className="text-xs font-black text-[#9a8793]">
                이메일로 계속하기
              </span>
              <span className="h-px flex-1 bg-[#ead8d0]" />
            </div>

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
              <div className="mt-3 rounded-[8px] bg-[#fff8f3] p-3">
                <p className="text-sm font-bold leading-5 text-[#6f2c83]">
                  {authMessage}
                </p>
                {authMode === "signup" ? (
                  <button
                    className="mt-3 h-10 w-full rounded-[8px] bg-white text-sm font-black text-[#6f2c83] shadow-sm disabled:text-[#9b8ca2]"
                    disabled={authSubmitting}
                    onClick={handleResendConfirmation}
                    type="button"
                  >
                    확인 메일 다시 보내기
                  </button>
                ) : null}
              </div>
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

  if (!challenge && challengeSummaries.length > 0) {
    return (
      <main className="min-h-screen bg-[#fff8f3] px-5 text-[#241424]">
        <section className="mx-auto flex min-h-screen w-full max-w-[460px] flex-col py-6">
          <header className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[#7c3a5d]">PhotoSong-i</p>
              <h1 className="mt-1 text-3xl font-black tracking-normal">
                목표 목록
              </h1>
            </div>
            <button
              className="h-9 rounded-full bg-[#eee7eb] px-3 text-xs font-black text-[#604c5a] shadow-sm"
              onClick={handleSignOut}
              type="button"
            >
              로그아웃
            </button>
          </header>

          {appError ? (
            <p className="mt-4 rounded-[8px] bg-[#fff2f2] p-3 text-sm font-bold leading-5 text-[#a33535]">
              {appError}
            </p>
          ) : null}

          <div className="mt-6 space-y-3">
            {challengeSummaries.map((summary) => {
              const progress = Math.round(
                (summary.entryCount / summary.grapeCount) * 100,
              );

              return (
                <article
                  className="rounded-[8px] bg-white p-4 shadow-sm"
                  key={summary.id}
                >
                  <button
                    className="block w-full text-left"
                    onClick={() => void loadChallengeDetail(summary.id)}
                    type="button"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-black">
                          🍇 {summary.title}
                        </h2>
                        <p className="mt-1 text-xs font-bold text-[#86717f]">
                          {summary.createdAt}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#fff8f3] px-3 py-1 text-sm font-black text-[#6f2c83]">
                        {summary.entryCount}/{summary.grapeCount}
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[#ead8d0]">
                      <div
                        className="h-full rounded-full bg-[#6f2c83]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </button>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      className="h-10 rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
                      onClick={() => openEditGoal(summary)}
                      type="button"
                    >
                      수정
                    </button>
                    <button
                      className="h-10 rounded-[8px] bg-[#fff2f2] text-sm font-black text-[#a33535]"
                      disabled={saving}
                      onClick={() => void handleDeleteChallenge(summary.id)}
                      type="button"
                    >
                      삭제
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          <button
            className="mt-5 h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white shadow-[0_12px_22px_rgba(111,44,131,0.18)]"
            onClick={openCreateGoal}
            type="button"
          >
            + 새 목표 만들기
          </button>

          {setupOpen ? (
            <div className="fixed inset-0 z-20 flex items-end bg-black/35 px-4 pb-4">
              <form
                className="mx-auto w-full max-w-[420px] rounded-[8px] bg-white p-4 shadow-2xl"
                onSubmit={handleGoalSubmit}
              >
                <h2 className="text-lg font-black">
                  {editingChallengeId ? "목표 수정" : "목표 만들기"}
                </h2>
                <label className="mt-4 block text-sm font-bold text-[#604c5a]">
                  목표
                  <input
                    className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                    onChange={(event) => setDraftTitle(event.target.value)}
                    placeholder="운동"
                    required
                    value={draftTitle}
                  />
                </label>
                <label className="mt-4 block text-sm font-bold text-[#604c5a]">
                  도전 일수
                  <input
                    className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                    inputMode="numeric"
                    max={100}
                    min={1}
                    onChange={(event) =>
                      setDraftGrapeCount(Number(event.target.value))
                    }
                    required
                    type="number"
                    value={draftGrapeCount}
                  />
                </label>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    className="h-12 rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
                    onClick={() => {
                      setSetupOpen(false);
                      setEditingChallengeId(null);
                    }}
                    type="button"
                  >
                    닫기
                  </button>
                  <button
                    className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
                    disabled={saving}
                    type="submit"
                  >
                    {editingChallengeId ? "수정" : "시작"}
                  </button>
                </div>
              </form>
            </div>
          ) : null}
        </section>
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
                placeholder="운동"
                required
                value={draftTitle}
              />
            </label>
            <label className="mt-4 block text-sm font-bold text-[#604c5a]">
              도전 일수
              <input
                className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                inputMode="numeric"
                max={100}
                min={1}
                onChange={(event) =>
                  setDraftGrapeCount(Number(event.target.value))
                }
                required
                type="number"
                value={draftGrapeCount}
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
            onClick={() =>
              openEditGoal({
                id: challenge.id,
                title: challenge.title,
                grapeCount: challenge.grapeCount,
                entryCount: challenge.entries.length,
                createdAt: "",
              })
            }
            type="button"
          >
            <span className="block text-xs font-bold text-[#7c3a5d]">
              PhotoSong-i
            </span>
            <span className="block text-xl font-black tracking-normal">
              {challenge.title}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <div className="rounded-full bg-white px-3 py-2 text-sm font-black text-[#6f2c83] shadow-sm">
              {challenge.entries.length}/{challenge.grapeCount}
            </div>
            <button
              className="h-9 rounded-full bg-white px-3 text-xs font-black text-[#6f2c83] shadow-sm"
              onClick={() => {
                setChallenge(null);
                setDetailEntry(null);
              }}
              type="button"
            >
              목록
            </button>
            <button
              className="h-9 rounded-full bg-[#eee7eb] px-3 text-xs font-black text-[#604c5a] shadow-sm"
              onClick={handleSignOut}
              type="button"
            >
              로그아웃
            </button>
          </div>
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
              <h2 className="text-lg font-black">
                {editingChallengeId ? "목표 수정" : "목표 만들기"}
              </h2>
              <label className="mt-4 block text-sm font-bold text-[#604c5a]">
                목표
                <input
                  className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                  onChange={(event) => setDraftTitle(event.target.value)}
                  placeholder="운동"
                  required
                  value={draftTitle}
                />
              </label>
              <label className="mt-4 block text-sm font-bold text-[#604c5a]">
                도전 일수
                <input
                  className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                  inputMode="numeric"
                  max={100}
                  min={1}
                  onChange={(event) =>
                    setDraftGrapeCount(Number(event.target.value))
                  }
                  required
                  type="number"
                  value={draftGrapeCount}
                />
              </label>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  className="h-12 rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
                  onClick={() => {
                    setSetupOpen(false);
                    setEditingChallengeId(null);
                  }}
                  type="button"
                >
                  닫기
                </button>
                <button
                  className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
                  disabled={saving}
                  type="submit"
                >
                  {editingChallengeId ? "수정" : "시작"}
                </button>
              </div>
              {editingChallengeId ? (
                <button
                  className="mt-2 h-11 w-full rounded-[8px] bg-[#fff2f2] text-sm font-black text-[#a33535]"
                  disabled={saving}
                  onClick={() => void handleDeleteChallenge(editingChallengeId)}
                  type="button"
                >
                  삭제
                </button>
              ) : null}
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

              <div className="mt-4">
                <label className="grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-[8px] border border-dashed border-[#b88ac8] bg-[#fff8f3] text-sm font-black text-[#6f2c83]">
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
                    className="sr-only"
                    onChange={handleImageChange}
                    required={!draftEntry.file}
                    type="file"
                  />
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid h-11 cursor-pointer place-items-center rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]">
                    사진 찍기
                    <input
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={handleImageChange}
                      type="file"
                    />
                  </label>
                  <label className="grid h-11 cursor-pointer place-items-center rounded-[8px] bg-[#fff8f3] text-sm font-black text-[#6f2c83] shadow-sm">
                    앨범에서 선택
                    <input
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                      type="file"
                    />
                  </label>
                </div>
              </div>

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

        {entryEditOpen && editingEntry ? (
          <div className="fixed inset-0 z-20 flex items-end bg-black/35 px-4 pb-4">
            <form
              className="mx-auto w-full max-w-[420px] rounded-[8px] bg-white p-4 shadow-2xl"
              onSubmit={handleEntryUpdate}
            >
              <h2 className="text-lg font-black">
                {editingEntry.grapeIndex}번째 포도알 수정
              </h2>

              <div className="mt-4">
                <label className="grid aspect-[4/3] w-full cursor-pointer place-items-center overflow-hidden rounded-[8px] border border-dashed border-[#b88ac8] bg-[#fff8f3] text-sm font-black text-[#6f2c83]">
                  {draftEntry.previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      alt="수정할 포도알 사진"
                      className="h-full w-full object-cover"
                      src={draftEntry.previewUrl}
                    />
                  ) : (
                    <span>사진 선택</span>
                  )}
                  <input
                    accept="image/*"
                    className="sr-only"
                    onChange={handleImageChange}
                    type="file"
                  />
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="grid h-11 cursor-pointer place-items-center rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]">
                    사진 다시 찍기
                    <input
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={handleImageChange}
                      type="file"
                    />
                  </label>
                  <label className="grid h-11 cursor-pointer place-items-center rounded-[8px] bg-[#fff8f3] text-sm font-black text-[#6f2c83] shadow-sm">
                    앨범에서 교체
                    <input
                      accept="image/*"
                      className="sr-only"
                      onChange={handleImageChange}
                      type="file"
                    />
                  </label>
                </div>
              </div>

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
                  onClick={() => {
                    setEntryEditOpen(false);
                    setEditingEntry(null);
                    setDraftEntry({ file: null, previewUrl: "", content: "" });
                  }}
                  type="button"
                >
                  닫기
                </button>
                <button
                  className="h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
                  disabled={saving}
                  type="submit"
                >
                  {saving ? "저장 중" : "수정"}
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {detailEntry ? (
          <div className="fixed inset-x-0 bottom-0 z-10 mx-auto max-w-[460px] px-5 pb-[max(96px,env(safe-area-inset-bottom))]">
            <div className="mb-2 flex justify-end gap-2">
              <button
                className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#6f2c83] shadow-sm"
                onClick={() => openEntryEdit(detailEntry)}
                type="button"
              >
                수정
              </button>
              <button
                aria-label="포도알 상세 닫기"
                className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-[#604c5a] shadow-sm"
                onClick={() => setDetailEntry(null)}
                type="button"
              >
                닫기
              </button>
            </div>
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
