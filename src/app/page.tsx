"use client";

import type { User } from "@supabase/supabase-js";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { FeedbackMessage } from "@/components/FeedbackMessage";
import { CompletedGrapeAlbum } from "@/components/CompletedGrapeAlbum";
import { GoalTemplatePicker } from "@/components/GoalTemplatePicker";
import { GrapeCluster } from "@/components/GrapeCluster";
import { GrapeEntryDetail } from "@/components/GrapeEntryDetail";
import { GoalSheet } from "@/components/GoalSheet";
import { GrapeEntrySheet } from "@/components/GrapeEntrySheet";
import { LoadingGrapeCluster } from "@/components/LoadingGrapeCluster";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";
import {
  completeChallenge,
  createChallenge,
  deleteChallenge,
  fetchChallengeDetail,
  fetchChallengeSummaries,
  toChallengeSummary,
  updateChallenge,
} from "@/lib/challenges";
import { formatDateInput } from "@/lib/date";
import { getFriendlyErrorMessage } from "@/lib/errors";
import { createGrapeEntry, updateGrapeEntry } from "@/lib/grape-entries";
import { isObjectUrl, validateImageFile } from "@/lib/images";
import type {
  Challenge,
  ChallengeSummary,
  GrapeEntry,
  GrapeEntryDraft,
} from "@/lib/photo-song-types";
import { supabase } from "@/lib/supabase";

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


export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  const [challengeSummaries, setChallengeSummaries] = useState<
    ChallengeSummary[]
  >([]);
  const [challengeListFilter, setChallengeListFilter] = useState<
    "active" | "completed"
  >("active");
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);
  const [managingChallengeId, setManagingChallengeId] = useState<string | null>(
    null,
  );
  const [editingChallengeId, setEditingChallengeId] = useState<string | null>(
    null,
  );
  const [captureOpen, setCaptureOpen] = useState(false);
  const [entryEditOpen, setEntryEditOpen] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<GrapeEntry | null>(null);
  const [detailEntry, setDetailEntry] = useState<GrapeEntry | null>(null);
  const [draftTitle, setDraftTitle] = useState("운동 30일");
  const [draftGrapeCount, setDraftGrapeCount] = useState(30);
  const [draftOneGrapePerDay, setDraftOneGrapePerDay] = useState(false);
  const [draftEntry, setDraftEntry] = useState<GrapeEntryDraft>({
    file: null,
    previewUrl: "",
    content: "",
    eventDate: formatDateInput(new Date()),
  });
  const [justAddedIndex, setJustAddedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [appError, setAppError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const rows = useMemo(
    () => createGrapeRows(challenge?.grapeCount ?? 30),
    [challenge?.grapeCount],
  );
  const nextGrapeIndex = (challenge?.entries.length ?? 0) + 1;
  const complete = Boolean(
    challenge && challenge.entries.length >= challenge.grapeCount,
  );
  const activeChallengeSummaries = challengeSummaries.filter(
    (summary) => !summary.completedAt && summary.entryCount < summary.grapeCount,
  );
  const completedChallengeSummaries = challengeSummaries.filter(
    (summary) =>
      Boolean(summary.completedAt) || summary.entryCount >= summary.grapeCount,
  );
  const visibleChallengeSummaries =
    challengeListFilter === "active"
      ? activeChallengeSummaries
      : completedChallengeSummaries;

  function clearDraftEntry() {
    setDraftEntry((current) => {
      if (isObjectUrl(current.previewUrl)) {
        URL.revokeObjectURL(current.previewUrl);
      }

      return {
        file: null,
        previewUrl: "",
        content: "",
        eventDate: formatDateInput(new Date()),
      };
    });
  }

  async function loadChallengeList(currentUser: User) {
    setDataLoading(true);
    setAppError("");
    setSuccessMessage("");

    try {
      const summaries = await fetchChallengeSummaries(currentUser.id);

      if (summaries.length === 0) {
        setChallengeSummaries([]);
        setChallenge(null);
        setDetailEntry(null);
        return;
      }

      setChallengeSummaries(summaries);

      setChallenge(null);
      setDetailEntry(null);
    } catch (error) {
      setAppError(
        getFriendlyErrorMessage(error, "목표 목록을 불러오지 못했습니다."),
      );
    } finally {
      setDataLoading(false);
    }
  }

  async function loadChallengeDetail(challengeId: string, currentUser = user) {
    if (!currentUser) return;

    setDataLoading(true);
    setAppError("");
    setSuccessMessage("");

    try {
      const nextChallenge = await fetchChallengeDetail(challengeId, currentUser);

      setChallenge(nextChallenge);
      setDraftTitle(nextChallenge.title);
      setDraftGrapeCount(nextChallenge.grapeCount);
      setDraftOneGrapePerDay(nextChallenge.oneGrapePerDay);
      setDetailEntry(null);
    } catch (error) {
      setAppError(
        getFriendlyErrorMessage(error, "포도송이를 불러오지 못했습니다."),
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
    // Supabase auth subscription is intentionally installed once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogleSignIn() {
    if (authSubmitting) return;

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
    if (saving || authSubmitting) return;

    await supabase.auth.signOut();
    setUser(null);
    setChallengeSummaries([]);
    setChallenge(null);
    setSetupOpen(false);
    setManagingChallengeId(null);
    setEditingChallengeId(null);
    setEntryEditOpen(false);
    setAlbumOpen(false);
    setEditingEntry(null);
  }

  function openTodayGrape() {
    if (!challenge || complete) return;
    clearDraftEntry();
    setAppError("");
    setSuccessMessage("");
    setCaptureOpen(true);
  }

  function openEntryEdit(entry: GrapeEntry) {
    setEditingEntry(entry);
    setDraftEntry({
      file: null,
      previewUrl: entry.imageUrl,
      content: entry.content,
      eventDate: entry.eventDate,
    });
    setAppError("");
    setEntryEditOpen(true);
  }

  function openCreateGoal() {
    setEditingChallengeId(null);
    setDraftTitle("");
    setDraftGrapeCount(30);
    setDraftOneGrapePerDay(false);
    setAppError("");
    setSuccessMessage("");
    setSetupOpen(true);
  }

  function openEditGoal(summary: ChallengeSummary) {
    setEditingChallengeId(summary.id);
    setDraftTitle(summary.title);
    setDraftGrapeCount(summary.grapeCount);
    setDraftOneGrapePerDay(summary.oneGrapePerDay);
    setAppError("");
    setSuccessMessage("");
    setSetupOpen(true);
  }

  async function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || saving) return;

    const title = draftTitle.trim();
    const grapeCount = Number(draftGrapeCount);

    if (!title) {
      setAppError("목표 이름을 입력하세요.");
      return;
    }

    if (!Number.isFinite(grapeCount) || grapeCount < 1 || grapeCount > 100) {
      setAppError("도전 일수는 1일부터 100일 사이로 입력하세요.");
      return;
    }

    setSaving(true);
    setAppError("");
    setSuccessMessage("");

    try {
      if (editingChallengeId) {
        const currentEntryCount =
          challenge?.id === editingChallengeId
            ? challenge.entries.length
            : (challengeSummaries.find((item) => item.id === editingChallengeId)
                ?.entryCount ?? 0);

        if (grapeCount < currentEntryCount) {
          setAppError(
            `이미 ${currentEntryCount}개의 포도알이 있어서 도전 일수를 그보다 줄일 수 없습니다.`,
          );
          setDraftGrapeCount(currentEntryCount);
          return;
        }

        const row = await updateChallenge({
          userId: user.id,
          challengeId: editingChallengeId,
          title,
          grapeCount,
          oneGrapePerDay: draftOneGrapePerDay,
        });
        setChallengeSummaries((current) =>
          current.map((item) =>
            item.id === row.id
              ? toChallengeSummary(row, item)
              : item,
          ),
        );
        setChallenge((current) =>
          current && current.id === row.id
            ? {
                ...current,
                title: row.title,
                grapeCount: row.grape_count,
                oneGrapePerDay: row.one_grape_per_day ?? false,
              }
            : current,
        );
        setDraftGrapeCount(row.grape_count);
        setEditingChallengeId(null);
        setManagingChallengeId(null);
        setSetupOpen(false);
        setSuccessMessage("목표를 수정했습니다.");
        return;
      }

      const created = await createChallenge({
        userId: user.id,
        title,
        grapeCount,
        oneGrapePerDay: draftOneGrapePerDay,
      });
      setChallenge(created.challenge);
      setChallengeSummaries((current) => [created.summary, ...current]);
      setDetailEntry(null);
      setJustAddedIndex(null);
      setEditingChallengeId(null);
      setManagingChallengeId(null);
      setSetupOpen(false);
      setSuccessMessage("첫 포도송이를 만들었습니다.");
    } catch (error) {
      setAppError(
        getFriendlyErrorMessage(error, "목표를 저장하지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteChallenge(challengeId: string) {
    if (!user || saving) return;
    const targetTitle =
      challenge?.id === challengeId
        ? challenge.title
        : (challengeSummaries.find((item) => item.id === challengeId)?.title ??
          "이 목표");
    const ok = window.confirm(
      `"${targetTitle}" 목표와 포도알 기록을 삭제할까요?`,
    );
    if (!ok) return;

    setSaving(true);
    setAppError("");
    setSuccessMessage("");

    try {
      await deleteChallenge({ userId: user.id, challengeId });

      setChallengeSummaries((current) =>
        current.filter((item) => item.id !== challengeId),
      );
      if (challenge?.id === challengeId) {
        setChallenge(null);
        setDetailEntry(null);
      }
      setSetupOpen(false);
      setManagingChallengeId(null);
      setEditingChallengeId(null);
      setSuccessMessage("목표를 삭제했습니다.");
    } catch (error) {
      setAppError(
        getFriendlyErrorMessage(error, "목표를 삭제하지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      setAppError(validationMessage);
      setSuccessMessage("");
      event.target.value = "";
      return;
    }

    if (isObjectUrl(draftEntry.previewUrl)) {
      URL.revokeObjectURL(draftEntry.previewUrl);
    }

    setAppError("");
    setSuccessMessage("");
    setDraftEntry((current) => ({
      ...current,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
  }

  async function handleEntrySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !challenge || saving || nextGrapeIndex > challenge.grapeCount) {
      return;
    }

    if (!draftEntry.file) {
      setAppError("사진을 먼저 선택하세요.");
      return;
    }

    if (
      challenge.oneGrapePerDay &&
      challenge.entries.some((entry) => entry.eventDate === draftEntry.eventDate)
    ) {
      setAppError("이 목표는 같은 사건 날짜에 포도알을 하나만 채울 수 있습니다.");
      setSuccessMessage("");
      return;
    }

    setSaving(true);
    setAppError("");
    setSuccessMessage("");

    try {
      const entry = await createGrapeEntry({
        userId: user.id,
        challengeId: challenge.id,
        grapeIndex: nextGrapeIndex,
        file: draftEntry.file,
        content: draftEntry.content,
        eventDate: draftEntry.eventDate,
      });

      if (nextGrapeIndex === challenge.grapeCount) {
        await completeChallenge(challenge.id);
      }
      const completedAt =
        nextGrapeIndex === challenge.grapeCount ? new Date().toISOString() : null;

      setChallenge((current) =>
        current
          ? {
              ...current,
              completedAt: completedAt ?? current.completedAt,
              entries: [...current.entries, entry],
            }
          : current,
      );
      setChallengeSummaries((current) =>
        current.map((item) =>
          item.id === challenge.id
            ? {
                ...item,
                entryCount: item.entryCount + 1,
                completedAt:
                  completedAt ?? item.completedAt,
              }
            : item,
        ),
      );
      setDetailEntry(entry);
      setJustAddedIndex(entry.grapeIndex);
      setSuccessMessage(`${entry.grapeIndex}번째 포도알을 채웠어요.`);
      clearDraftEntry();
      setCaptureOpen(false);

      window.setTimeout(() => setJustAddedIndex(null), 700);
    } catch (error) {
      setAppError(
        getFriendlyErrorMessage(error, "오늘의 포도알을 붙이지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleEntryUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user || !challenge || !editingEntry || saving) return;

    setSaving(true);
    setAppError("");
    setSuccessMessage("");

    try {
      const updatedEntry = await updateGrapeEntry({
        userId: user.id,
        challengeId: challenge.id,
        entry: editingEntry,
        file: draftEntry.file,
        content: draftEntry.content,
        eventDate: draftEntry.eventDate,
      });

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
      setSuccessMessage(`${updatedEntry.grapeIndex}번째 포도알을 고쳤어요.`);
      clearDraftEntry();
    } catch (error) {
      setAppError(
        getFriendlyErrorMessage(error, "포도알을 수정하지 못했습니다."),
      );
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8f3] px-5 text-[#241424]">
        <div className="grid gap-4 text-center">
          <LoadingGrapeCluster />
          <p className="text-sm font-black text-[#6f2c83]">
            포도송이 여는 중
          </p>
        </div>
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

          <div className="mt-8 rounded-[8px] bg-white p-4 shadow-xl">
            <h2 className="text-lg font-black">Google로 시작하기</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-[#604c5a]">
              가입과 로그인은 Google 계정으로만 진행합니다.
            </p>

            {authMessage ? (
              <div className="mt-4 rounded-[8px] bg-[#fff8f3] p-3">
                <p className="text-sm font-bold leading-5 text-[#6f2c83]">
                  {authMessage}
                </p>
              </div>
            ) : null}

            <button
              className="mt-4 flex h-12 w-full items-center justify-center rounded-[8px] border border-[#dec9c0] bg-white text-sm font-black text-[#241424] shadow-sm disabled:text-[#9b8ca2]"
              disabled={authSubmitting}
              onClick={handleGoogleSignIn}
              type="button"
            >
              {authSubmitting ? "Google로 이동 중" : "Google로 계속하기"}
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (dataLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#fff8f3] px-5 text-[#241424]">
        <div className="grid gap-4 text-center">
          <LoadingGrapeCluster />
          <p className="text-sm font-black text-[#6f2c83]">
            내 포도송이 불러오는 중
          </p>
        </div>
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
                포도송이 보관함
              </h1>
            </div>
            <button
              className="h-10 rounded-full bg-[#eee7eb] px-3 text-xs font-black text-[#604c5a] shadow-sm disabled:text-[#a79aa3]"
              disabled={saving || authSubmitting}
              onClick={handleSignOut}
              type="button"
            >
              로그아웃
            </button>
          </header>

          <FeedbackMessage error={appError} success={successMessage} />
          <PwaInstallPrompt />

          <div className="mt-6 grid grid-cols-2 rounded-[8px] bg-[#eee7eb] p-1">
            <button
              className={`h-10 rounded-[7px] text-sm font-black ${
                challengeListFilter === "active"
                  ? "bg-white text-[#6f2c83] shadow-sm"
                  : "text-[#604c5a]"
              }`}
              onClick={() => setChallengeListFilter("active")}
              type="button"
            >
              진행 중 {activeChallengeSummaries.length}
            </button>
            <button
              className={`h-10 rounded-[7px] text-sm font-black ${
                challengeListFilter === "completed"
                  ? "bg-white text-[#6f2c83] shadow-sm"
                  : "text-[#604c5a]"
              }`}
              onClick={() => setChallengeListFilter("completed")}
              type="button"
            >
              완성됨 {completedChallengeSummaries.length}
            </button>
          </div>

          <div className="mt-4 space-y-3">
            {visibleChallengeSummaries.map((summary) => {
              const progress = Math.round(
                (summary.entryCount / summary.grapeCount) * 100,
              );
              const isCompleted =
                Boolean(summary.completedAt) ||
                summary.entryCount >= summary.grapeCount;

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
                        <h2 className="break-words text-lg font-black leading-6">
                          🍇 {summary.title}
                        </h2>
                        <p className="mt-1 text-xs font-bold text-[#86717f]">
                          {summary.createdAt}
                        </p>
                      </div>
                      <span className="rounded-full bg-[#fff8f3] px-3 py-1 text-sm font-black text-[#6f2c83]">
                        {isCompleted
                          ? "완성"
                          : `${summary.entryCount}/${summary.grapeCount}`}
                      </span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-[#ead8d0]">
                      <div
                        className="h-full rounded-full bg-[#6f2c83]"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </button>
                  {managingChallengeId === summary.id ? (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="h-10 rounded-[8px] bg-[#eee7eb] text-sm font-black text-[#4c3f47]"
                        onClick={() => openEditGoal(summary)}
                        type="button"
                      >
                        목표 수정
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
                  ) : (
                    <button
                      className="mt-3 h-10 w-full rounded-[8px] bg-[#f3edf0] text-sm font-black text-[#604c5a]"
                      onClick={() => setManagingChallengeId(summary.id)}
                      type="button"
                    >
                      관리
                    </button>
                  )}
                </article>
              );
            })}
            {visibleChallengeSummaries.length === 0 ? (
              <div className="rounded-[8px] bg-white px-4 py-8 text-center shadow-sm">
                <p className="text-sm font-black text-[#604c5a]">
                  {challengeListFilter === "active"
                    ? "진행 중인 포도송이가 없습니다."
                    : "완성된 포도송이가 없습니다."}
                </p>
              </div>
            ) : null}
          </div>

          <button
            className="mt-5 h-12 rounded-[8px] bg-[#6f2c83] text-sm font-black text-white shadow-[0_12px_22px_rgba(111,44,131,0.18)]"
            onClick={openCreateGoal}
            type="button"
          >
            + 새 목표 만들기
          </button>

          {setupOpen ? (
            <GoalSheet
              editing={Boolean(editingChallengeId)}
              title={draftTitle}
              grapeCount={draftGrapeCount}
              oneGrapePerDay={draftOneGrapePerDay}
              error={appError}
              saving={saving}
              onTitleChange={setDraftTitle}
              onGrapeCountChange={setDraftGrapeCount}
              onOneGrapePerDayChange={setDraftOneGrapePerDay}
              onSubmit={handleGoalSubmit}
              onClose={() => {
                setSetupOpen(false);
                setEditingChallengeId(null);
              }}
            />
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
              첫 포도송이 만들기
            </h1>
            <p className="mt-3 text-sm font-bold leading-6 text-[#604c5a]">
              오늘 채울 목표 하나만 정하세요.
            </p>
          </div>

          <form
            className="mt-8 rounded-[8px] bg-white p-4 shadow-xl"
            onSubmit={handleGoalSubmit}
          >
            <label className="block text-sm font-bold text-[#604c5a]">
              목표
              <input
                className="mt-2 h-12 w-full rounded-[8px] border border-[#dec9c0] px-3 text-base outline-none focus:border-[#6f2c83]"
                maxLength={32}
                onChange={(event) => setDraftTitle(event.target.value)}
                placeholder="운동 30일"
                required
                value={draftTitle}
              />
            </label>
            <GoalTemplatePicker
              onSelect={(template) => {
                setDraftTitle(template.title);
                setDraftGrapeCount(template.grapeCount);
              }}
            />
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
            <label className="mt-4 flex items-start gap-3 rounded-[8px] bg-[#fff8f3] p-3 text-sm font-bold text-[#604c5a] ring-1 ring-[#ead8d0]">
              <input
                checked={draftOneGrapePerDay}
                className="mt-1 size-4 accent-[#6f2c83]"
                onChange={(event) =>
                  setDraftOneGrapePerDay(event.target.checked)
                }
                type="checkbox"
              />
              <span>
                하루 한 알만 채우기
                <span className="mt-1 block text-xs leading-5 text-[#86717f]">
                  같은 사건 날짜에는 포도알을 하나만 등록합니다.
                </span>
              </span>
            </label>
            <FeedbackMessage error={appError} className="mt-3" />
            <button
              className="mt-4 h-12 w-full rounded-[8px] bg-[#6f2c83] text-sm font-black text-white disabled:bg-[#b6a6bd]"
              disabled={saving}
              type="submit"
            >
              {saving ? "포도송이 만드는 중" : "포도송이 시작"}
            </button>
            <button
              className="mt-3 h-10 w-full text-sm font-black text-[#6f2c83]"
              disabled={saving}
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
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1 px-1 py-1">
            <span className="block text-xs font-bold text-[#7c3a5d]">
              PhotoSong-i
            </span>
            <span className="block truncate text-xl font-black tracking-normal">
              {challenge.title}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
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
              onClick={() =>
                openEditGoal({
                  id: challenge.id,
                  title: challenge.title,
                  grapeCount: challenge.grapeCount,
                  entryCount: challenge.entries.length,
                  createdAt: "",
                  completedAt: challenge.completedAt,
                  oneGrapePerDay: challenge.oneGrapePerDay,
                })
              }
              type="button"
            >
              관리
            </button>
          </div>
        </header>

          <FeedbackMessage error={appError} success={successMessage} />
          <PwaInstallPrompt />

        <section className="flex flex-1 flex-col justify-center py-8">
          <GrapeCluster
            rows={rows}
            entries={challenge.entries}
            nextGrapeIndex={nextGrapeIndex}
            complete={complete}
            justAddedIndex={justAddedIndex}
            onEntryClick={setDetailEntry}
            onNextClick={openTodayGrape}
          />

          {complete ? (
            <div className="mt-8 rounded-[8px] bg-[#fff2bd] px-4 py-3 text-center text-sm font-black text-[#614200] shadow-[0_0_28px_rgba(219,178,63,0.35)]">
              포도송이를 완성했습니다!
            </div>
          ) : null}
        </section>

        <button
          className="h-14 w-full rounded-[8px] bg-[#6f2c83] text-base font-black text-white shadow-[0_16px_28px_rgba(111,44,131,0.24)] transition active:scale-[0.99] disabled:bg-[#b6a6bd]"
          disabled={saving}
          onClick={() => {
            if (complete) {
              setAlbumOpen(true);
              return;
            }
            openTodayGrape();
          }}
          type="button"
        >
          {complete ? "완성된 포도송이" : "오늘의 포도알"}
        </button>

        {setupOpen ? (
          <GoalSheet
            editing={Boolean(editingChallengeId)}
            title={draftTitle}
            grapeCount={draftGrapeCount}
            oneGrapePerDay={draftOneGrapePerDay}
            error={appError}
            saving={saving}
            authSubmitting={authSubmitting}
            showDangerActions
            onTitleChange={setDraftTitle}
            onGrapeCountChange={setDraftGrapeCount}
            onOneGrapePerDayChange={setDraftOneGrapePerDay}
            onSubmit={handleGoalSubmit}
            onClose={() => {
              setSetupOpen(false);
              setEditingChallengeId(null);
            }}
            onDelete={
              editingChallengeId
                ? () => void handleDeleteChallenge(editingChallengeId)
                : undefined
            }
            onSignOut={handleSignOut}
          />
        ) : null}

        {captureOpen ? (
          <GrapeEntrySheet
            mode="create"
            grapeIndex={nextGrapeIndex}
            draft={draftEntry}
            error={appError}
            saving={saving}
            onImageChange={handleImageChange}
            onDraftChange={(nextDraft) =>
              setDraftEntry((current) => ({ ...current, ...nextDraft }))
            }
            onSubmit={handleEntrySubmit}
            onClose={() => {
              setCaptureOpen(false);
              clearDraftEntry();
              setAppError("");
            }}
          />
        ) : null}

        {entryEditOpen && editingEntry ? (
          <GrapeEntrySheet
            mode="edit"
            grapeIndex={editingEntry.grapeIndex}
            draft={draftEntry}
            error={appError}
            saving={saving}
            onImageChange={handleImageChange}
            onDraftChange={(nextDraft) =>
              setDraftEntry((current) => ({ ...current, ...nextDraft }))
            }
            onSubmit={handleEntryUpdate}
            onClose={() => {
              setEntryEditOpen(false);
              setEditingEntry(null);
              clearDraftEntry();
              setAppError("");
            }}
          />
        ) : null}

        {albumOpen ? (
          <CompletedGrapeAlbum
            title={challenge.title}
            entries={challenge.entries}
            grapeCount={challenge.grapeCount}
            onEntryClick={(entry) => {
              setDetailEntry(entry);
              setAlbumOpen(false);
            }}
            onClose={() => setAlbumOpen(false)}
          />
        ) : null}

        {detailEntry ? (
          <GrapeEntryDetail
            entry={detailEntry}
            onEdit={openEntryEdit}
            onClose={() => setDetailEntry(null)}
          />
        ) : null}
      </section>
    </main>
  );
}
