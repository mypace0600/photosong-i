"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminOverview = {
  summary: {
    users: number;
    challenges: number;
    entries: number;
    completedChallenges: number;
  };
  users: Array<{
    id: string;
    email: string;
    name: string;
    createdAt: string;
    lastSignInAt: string | null;
  }>;
  challenges: Array<{
    id: string;
    user_id: string;
    title: string;
    grape_count: number;
    entry_count: number;
    created_at: string;
    completed_at: string | null;
  }>;
  entries: Array<{
    id: string;
    challenge_id: string;
    user_id: string;
    grape_index: number;
    image_path: string;
    image_url: string;
    content: string | null;
    event_date: string;
    created_at: string;
  }>;
};

export default function AdminPage() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOverview() {
      setLoading(true);
      setError("");

      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;

        if (!token) {
          setError("Google 로그인 후 관리자 화면을 볼 수 있습니다.");
          return;
        }

        const response = await fetch("/api/admin/overview", {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const body = await response.json();

        if (!response.ok) {
          throw new Error(body.error ?? "관리자 데이터를 불러오지 못했습니다.");
        }

        setOverview(body as AdminOverview);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "관리자 데이터를 불러오지 못했습니다.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadOverview();
  }, []);

  return (
    <main className="min-h-screen bg-[#fff8f3] px-5 py-6 text-[#241424]">
      <section className="mx-auto w-full max-w-6xl">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#7c3a5d]">PhotoSong-i</p>
            <h1 className="mt-1 text-3xl font-black">관리자</h1>
          </div>
          <a
            className="rounded-[8px] bg-white px-4 py-2 text-sm font-black text-[#6f2c83] shadow-sm"
            href="/"
          >
            앱으로 돌아가기
          </a>
        </header>

        {loading ? (
          <p className="mt-6 rounded-[8px] bg-white p-4 text-sm font-bold text-[#6f2c83] shadow-sm">
            관리자 데이터를 불러오는 중
          </p>
        ) : null}

        {error ? (
          <p className="mt-6 rounded-[8px] bg-[#fff2f2] p-4 text-sm font-bold text-[#a33535]">
            {error}
          </p>
        ) : null}

        {overview ? (
          <>
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                ["사용자", overview.summary.users],
                ["목표", overview.summary.challenges],
                ["포도알", overview.summary.entries],
                ["완성", overview.summary.completedChallenges],
              ].map(([label, value]) => (
                <div className="rounded-[8px] bg-white p-4 shadow-sm" key={label}>
                  <p className="text-xs font-black text-[#86717f]">{label}</p>
                  <p className="mt-2 text-2xl font-black text-[#6f2c83]">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <section className="mt-6 rounded-[8px] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black">사용자</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs text-[#86717f]">
                    <tr>
                      <th className="py-2">이메일</th>
                      <th>이름</th>
                      <th>가입일</th>
                      <th>최근 로그인</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.users.map((user) => (
                      <tr className="border-t border-[#f0e2dc]" key={user.id}>
                        <td className="py-2 font-bold">{user.email}</td>
                        <td>{user.name || "-"}</td>
                        <td>{user.createdAt?.slice(0, 10)}</td>
                        <td>{user.lastSignInAt?.slice(0, 10) ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mt-6 rounded-[8px] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black">목표</h2>
              <div className="mt-3 grid gap-2">
                {overview.challenges.map((challenge) => (
                  <div
                    className="rounded-[8px] bg-[#fff8f3] p-3 text-sm"
                    key={challenge.id}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <p className="font-black">{challenge.title}</p>
                      <p className="font-black text-[#6f2c83]">
                        {challenge.entry_count}/{challenge.grape_count}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-bold text-[#86717f]">
                      {challenge.user_id} · {challenge.created_at.slice(0, 10)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-[8px] bg-white p-4 shadow-sm">
              <h2 className="text-lg font-black">최근 포도알</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {overview.entries.slice(0, 24).map((entry) => (
                  <article
                    className="overflow-hidden rounded-[8px] bg-[#fff8f3]"
                    key={entry.id}
                  >
                    {entry.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        alt=""
                        className="aspect-[4/3] w-full object-cover"
                        src={entry.image_url}
                      />
                    ) : null}
                    <div className="p-3 text-sm">
                      <p className="font-black">
                        {entry.grape_index}번째 포도알
                      </p>
                      <p className="mt-1 line-clamp-2 text-[#604c5a]">
                        {entry.content || "-"}
                      </p>
                      <p className="mt-2 break-all text-xs font-bold text-[#86717f]">
                        {entry.image_path}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </>
        ) : null}
      </section>
    </main>
  );
}
