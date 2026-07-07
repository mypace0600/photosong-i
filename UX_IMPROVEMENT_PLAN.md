# PhotoSong-i UX Improvement Plan

## Goal

Make the core PhotoSong-i loop feel shorter, clearer, and more emotionally rewarding:

1. Open the app.
2. See the active grape cluster.
3. Add today's grape with a photo.
4. Watch the grape attach to the cluster.

The product should stay focused on one behavior: filling one grape today.

## UX Principles

- Prioritize the daily grape flow over account, settings, or management actions.
- Show photos before text whenever a grape entry is opened.
- Keep goal management available, but visually secondary.
- Use service language such as "포도알 붙이는 중" instead of generic system language.
- Avoid statistics-heavy screens in the MVP.

## Phase 1: Streamline The Daily Flow

### Changes

- If the user has exactly one goal, open that grape cluster directly after login.
- If the user has multiple goals, show the goal list.
- Keep "오늘의 포도알" as the strongest action on the grape cluster screen.
- Move goal edit/delete actions behind a smaller management affordance.

### Expected Impact

Users with one active habit can reach the photo registration flow faster.

### Suggested Commit

```text
feat: streamline daily grape flow
```

## Phase 2: Improve Goal List Management

### Changes

- Make each goal card primarily an "open" target.
- Hide edit/delete buttons behind a "관리" action.
- Include the goal title in delete confirmation copy.
- Show a clear message when grape count cannot be reduced below existing entries.

### Expected Impact

The goal list becomes calmer and less destructive by default.

### Suggested Commit

```text
feat: refine challenge management ux
```

## Phase 3: Make Photo Registration Feel Primary

### Changes

- Make the photo area the main visual anchor of the registration sheet.
- Rename empty photo copy to "오늘의 사진 선택".
- Increase touch targets for "사진 찍기" and "앨범에서 선택".
- Keep the one-line record optional and secondary.
- Use "포도알 붙이는 중" while saving.
- After success, show a short success message such as "12번째 포도알을 채웠어요."

### Expected Impact

The registration flow feels like adding a grape, not filling out a form.

### Suggested Commit

```text
feat: polish grape entry capture flow
```

## Phase 4: Strengthen The Grape Cluster Screen

### Changes

- Make the next grape visually distinct with a subtle highlight.
- Reduce photo thumbnail darkness so memories are easier to recognize.
- Make empty grapes feel inactive without drawing too much attention.
- When completed, change the primary action to a completion-oriented state.
- Keep the detail card photo-first, with metadata and edit actions visually quieter.

### Expected Impact

The grape cluster becomes the emotional center of the product.

### Suggested Commit

```text
feat: polish grape cluster experience
```

## Phase 5: Improve Feedback And Empty States

### Changes

- Replace generic loading text with a small grape-cluster skeleton.
- Map common Supabase and upload errors to user-friendly Korean messages.
- Use consistent success, failure, and saving copy.
- Make the first empty state invite one clear action: create the first goal.

### Expected Impact

The app feels more deliberate and less like a technical prototype.

### Suggested Commit

```text
fix: improve feedback and empty states
```

## Recommended Next Step

Start with Phase 1 and Phase 2 together. They directly reduce friction before adding more visual polish.

