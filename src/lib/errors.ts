const DEFAULT_ERROR_MESSAGE = "잠시 후 다시 시도하세요.";

export function getFriendlyErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const message = error.message.toLowerCase();

  if (message.includes("network") || message.includes("fetch")) {
    return "연결이 불안정합니다. 잠시 후 다시 시도하세요.";
  }

  if (message.includes("row-level security") || message.includes("policy")) {
    return "권한 확인이 필요합니다. 다시 로그인한 뒤 시도하세요.";
  }

  if (message.includes("event_date")) {
    return "사건 날짜 저장 설정이 필요합니다. Supabase 마이그레이션을 확인하세요.";
  }

  if (message.includes("payload") || message.includes("too large")) {
    return "사진 용량이 큽니다. 5MB 이하 사진을 선택하세요.";
  }

  return error.message || fallback || DEFAULT_ERROR_MESSAGE;
}
