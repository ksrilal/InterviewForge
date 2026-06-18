# State Management Design

## The core rule

**Postgres is the source of truth for everything durable. Zustand holds only ephemeral, client-only state that would be annoying to re-fetch or that must survive a re-render without a round trip.** If a value matters after a page refresh or to any other screen, it belongs in the DB, fetched via Server Component or Server Action — not in a global client store.

This matters because it's tempting (especially copying patterns from SPA-era apps) to mirror server data into Zustand "for convenience." For a single-user app with no real-time multi-client sync problem, that mirroring only adds a cache-invalidation problem with no corresponding benefit.

## Stores

### `store/interview-session.store.ts`

The one substantive store. Holds state for the *currently active* interview screen only:

```ts
interface InterviewSessionState {
  sessionId: string;
  currentQuestion: { id: string; prompt: string; followUpDepth: number } | null;
  draftAnswer: string;                 // textarea contents, so a re-render/navigation-back doesn't lose typing
  status: 'answering' | 'evaluating' | 'showing_result' | 'session_complete';
  lastEvaluation: Evaluation | null;
  setDraftAnswer: (text: string) => void;
  startEvaluating: () => void;
  receiveEvaluation: (evaluation: Evaluation, next: NextStep) => void;
  reset: () => void;
}
```

- Initialized from server-rendered props when `/interview/[sessionId]` first loads.
- `draftAnswer` is the only piece worth persisting across an accidental refresh — done via Zustand's `persist` middleware scoped to `sessionStorage` (not `localStorage`, so it clears when the tab closes — a stale draft from a different session resuming later would be confusing).
- Cleared (`reset()`) when the session ends or the user navigates away to a different session id.

### `store/ui.store.ts`

Pure ephemeral UI: active dialog/confirm state (e.g., "end session?" confirmation), toast queue if not fully handled by the ShadCN/sonner toaster already. Deliberately tiny.

## What is explicitly NOT in Zustand

- Skill radar data, session history, question bank contents, training plan — all Server Component reads straight from Supabase.
- Auth state — handled by the httpOnly session cookie + middleware, never duplicated into client state (a client-readable "am I logged in" flag would be redundant and a minor info leak surface).
- The full interview transcript/thread — reconstructed from `session_questions` + `answers` on the summary page via a server fetch, not accumulated client-side as the session progresses. The client only needs to know the *current* question, not the whole history, to render the live screen.

## React Hook Form + Zod

Used for the two real forms in the app:
- `InterviewSetupForm` (level/type/mode selection) — Zod schema validates the enum combination is sane (e.g., `behavioral` type pairs with any level; mode determines `time_limit_seconds`).
- `LoginForm` — Zod validates non-empty username/password before the Server Action call, so obviously-invalid submissions don't round-trip.

Form state lives entirely inside RHF's internal state, not lifted into Zustand — it's local to the form component and discarded on submit/unmount, exactly the kind of state that shouldn't leak into a global store.

## Server Action → UI feedback pattern

For the interview screen's submit flow:

```ts
const [isPending, startTransition] = useTransition();

function onSubmit(answerText: string) {
  startEvaluating(); // Zustand: status -> 'evaluating'
  startTransition(async () => {
    const result = await submitAnswerAction(sessionQuestionId, answerText);
    if (result.ok) {
      receiveEvaluation(result.evaluation, result.nextStep);
    } else {
      setEvaluationError(result.error); // local component state, not global — it's a retry affordance for this one answer
    }
  });
}
```

`useTransition` (React, not Zustand) drives the pending spinner; Zustand drives what's substantively displayed once the result lands. Keeping these separate avoids conflating "is a network call in flight" with "what is the current step of the interview."
