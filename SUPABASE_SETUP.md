# Supabase 설정

포토송이 MVP는 Supabase Auth, PostgreSQL, Storage를 사용합니다.

## 1. 환경변수

로컬 개발용 `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Vercel에도 같은 값을 Project Settings의 Environment Variables에 등록합니다.

## 2. DB와 Storage 생성

Supabase Dashboard에서 아래 파일 내용을 SQL Editor에 붙여넣고 실행합니다.

```text
supabase/migrations/001_initial_schema.sql
```

이 스크립트가 생성하는 항목:

- `public.challenges`
- `public.grape_entries`
- private Storage bucket `grape-photos`
- 사용자별 RLS 정책
- 사용자별 Storage folder 정책

사진은 public URL이 아니라 private bucket에 저장하고, 앱에서 1시간짜리 signed URL을 만들어 표시합니다.

## 3. Auth 설정

MVP는 이메일/비밀번호 로그인을 사용합니다.

Supabase Dashboard에서 확인할 항목:

- Authentication > Providers > Email 활성화
- 로컬 테스트 중 이메일 확인을 생략하려면 Confirm email 옵션 비활성화
- 이메일 확인을 켜둘 경우 가입 후 확인 메일을 눌러야 로그인 가능

## 4. Vercel 배포

Vercel 환경변수:

```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Secret key는 Vercel public 환경변수에 넣지 않습니다.
