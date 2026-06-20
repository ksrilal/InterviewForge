import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CodeLanguage, CodeReviewResult, Evaluation, QuestionType } from "@/types/domain";

export type InterviewScreenStatus = "answering" | "evaluating" | "showing_result" | "session_complete";

interface CurrentQuestion {
  sessionQuestionId: string;
  prompt: string;
  followUpDepth: number;
  // Coding Workspace feature - undefined/null for every pre-existing
  // question (text answer flow unchanged). When questionType is "coding",
  // the screen renders CodeEditor instead of the Textarea.
  questionType?: QuestionType;
  language?: CodeLanguage | null;
}

interface InterviewSessionState {
  sessionId: string | null;
  currentQuestion: CurrentQuestion | null;
  draftAnswer: string;
  // Mirrors draftAnswer for code questions - kept separate so switching the
  // language picker doesn't need to guess whether draftAnswer holds prose
  // or code, and so a future execution engine can read this directly.
  draftLanguage: CodeLanguage | null;
  status: InterviewScreenStatus;
  lastEvaluation: Evaluation | null;
  lastCodeReview: CodeReviewResult | null;
  evaluationError: string | null;
  questionsAnswered: number;

  initSession: (sessionId: string, firstQuestion: CurrentQuestion) => void;
  setDraftAnswer: (text: string) => void;
  setDraftLanguage: (language: CodeLanguage) => void;
  startEvaluating: () => void;
  receiveEvaluation: (evaluation: Evaluation) => void;
  receiveCodeReview: (review: CodeReviewResult) => void;
  setEvaluationError: (error: string) => void;
  advanceToQuestion: (question: CurrentQuestion) => void;
  completeSession: () => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  currentQuestion: null,
  draftAnswer: "",
  draftLanguage: null as CodeLanguage | null,
  status: "answering" as InterviewScreenStatus,
  lastEvaluation: null,
  lastCodeReview: null as CodeReviewResult | null,
  evaluationError: null,
  questionsAnswered: 0,
};

type PersistedSlice = Pick<
  InterviewSessionState,
  "sessionId" | "currentQuestion" | "draftAnswer" | "draftLanguage" | "status" | "questionsAnswered"
>;

export const useInterviewSessionStore = create<InterviewSessionState>()(
  persist<InterviewSessionState, [], [], PersistedSlice>(
    (set) => ({
      ...initialState,

      initSession: (sessionId, firstQuestion) =>
        set({
          ...initialState,
          sessionId,
          currentQuestion: firstQuestion,
          draftLanguage: firstQuestion.language ?? null,
        }),

      setDraftAnswer: (text) => set({ draftAnswer: text }),

      setDraftLanguage: (language) => set({ draftLanguage: language }),

      startEvaluating: () => set({ status: "evaluating", evaluationError: null }),

      receiveEvaluation: (evaluation) =>
        set((state) => ({
          status: "showing_result",
          lastEvaluation: evaluation,
          lastCodeReview: null,
          questionsAnswered: state.questionsAnswered + 1,
        })),

      receiveCodeReview: (review) =>
        set((state) => ({
          status: "showing_result",
          lastCodeReview: review,
          lastEvaluation: null,
          questionsAnswered: state.questionsAnswered + 1,
        })),

      setEvaluationError: (error) => set({ status: "answering", evaluationError: error }),

      advanceToQuestion: (question) =>
        set({
          currentQuestion: question,
          draftAnswer: "",
          draftLanguage: question.language ?? null,
          status: "answering",
          lastEvaluation: null,
          lastCodeReview: null,
          evaluationError: null,
        }),

      completeSession: () => set({ status: "session_complete" }),

      reset: () => set(initialState),
    }),
    {
      // sessionStorage (not localStorage) so a stale draft from a previous
      // session never resumes after the tab closes - see docs/07-state-management.md
      name: "interviewforge-active-session",
      storage: {
        getItem: (name) => {
          if (typeof window === "undefined") return null;
          const value = window.sessionStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: (name, value) => {
          if (typeof window === "undefined") return;
          window.sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => {
          if (typeof window === "undefined") return;
          window.sessionStorage.removeItem(name);
        },
      },
      partialize: (state) => ({
        sessionId: state.sessionId,
        currentQuestion: state.currentQuestion,
        draftAnswer: state.draftAnswer,
        draftLanguage: state.draftLanguage,
        status: state.status,
        questionsAnswered: state.questionsAnswered,
      }),
    }
  )
);
