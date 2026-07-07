import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getBearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  const [type, token] = authorization.split(" ");

  if (type?.toLowerCase() !== "bearer" || !token) return "";
  return token;
}

function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing Supabase admin environment variables.");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function verifyAdmin(request: NextRequest) {
  if (!supabaseUrl || !supabasePublishableKey) {
    return { ok: false, status: 500, message: "Supabase env is missing." };
  }

  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, message: "Missing access token." };
  }

  const authClient = createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user?.email) {
    return { ok: false, status: 401, message: "Invalid access token." };
  }

  const adminEmails = getAdminEmails();
  if (!adminEmails.includes(data.user.email.toLowerCase())) {
    return { ok: false, status: 403, message: "Admin access required." };
  }

  return { ok: true, status: 200, message: "" };
}

export async function GET(request: NextRequest) {
  const admin = await verifyAdmin(request);
  if (!admin.ok) {
    return NextResponse.json(
      { error: admin.message },
      { status: admin.status },
    );
  }

  try {
    const supabase = createAdminClient();
    const [usersResult, challengesResult, entriesResult] = await Promise.all([
      supabase.auth.admin.listUsers({ page: 1, perPage: 50 }),
      supabase
        .from("challenges")
        .select("id,user_id,title,grape_count,created_at,completed_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("grape_entries")
        .select(
          "id,user_id,challenge_id,grape_index,image_path,content,event_date,created_at",
        )
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    if (usersResult.error) throw usersResult.error;
    if (challengesResult.error) throw challengesResult.error;
    if (entriesResult.error) throw entriesResult.error;

    const challenges = challengesResult.data ?? [];
    const entries = entriesResult.data ?? [];
    const entryCountByChallenge = new Map<string, number>();
    entries.forEach((entry) => {
      entryCountByChallenge.set(
        entry.challenge_id,
        (entryCountByChallenge.get(entry.challenge_id) ?? 0) + 1,
      );
    });

    const recentImagePaths = entries
      .map((entry) => entry.image_path)
      .filter(Boolean)
      .slice(0, 20);
    const { data: signedUrls } =
      recentImagePaths.length > 0
        ? await supabase.storage
            .from("grape-photos")
            .createSignedUrls(recentImagePaths, 60 * 10)
        : { data: [] };
    const signedUrlByPath = new Map(
      (signedUrls ?? []).map((item) => [item.path, item.signedUrl]),
    );

    return NextResponse.json({
      summary: {
        users: usersResult.data.users.length,
        challenges: challenges.length,
        entries: entries.length,
        completedChallenges: challenges.filter((item) => item.completed_at)
          .length,
      },
      users: usersResult.data.users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? "",
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
      })),
      challenges: challenges.map((challenge) => ({
        ...challenge,
        entry_count: entryCountByChallenge.get(challenge.id) ?? 0,
      })),
      entries: entries.map((entry) => ({
        ...entry,
        image_url: signedUrlByPath.get(entry.image_path) ?? "",
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Admin overview fetch failed.",
      },
      { status: 500 },
    );
  }
}
