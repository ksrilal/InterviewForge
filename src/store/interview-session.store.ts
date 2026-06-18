import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Evaluation } from "@/types/domain";

export type InterviewScreenStatus = "answering" | "evaluating" | "showing_result" | "session_complete";

interface CurrentQuestion {
  sessionQuestionId: string;
  prompt: string;
  followUpDepth: number;
}

interface InterviewSessionState {
  sessionId: string | null;
  currentQuestion: CurrentQuestion | null;
  draftAnswer: string;
  status: InterviewScreenStatus;
  lastEvaluation: Evaluation | null;
  evaluationError: string | null;
  questionsAnswered: number;

  initSession: (sessionId: string, firstQuestion: CurrentQuestion) => void;
  setDraftAnswer: (text: string) => void;
  startEvaluating: () => void;
  receiveEvaluation: (evaluation: Evaluation) => void;
  setEvaluationError: (error: string) => void;
  advanceToQuestion: (question: CurrentQuestion) => void;
  completeSession: () => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  currentQuestion: null,
  draftAnswer: "",
  status: "answering" as InterviewScreenStatus,
  lastEvaluation: null,
  evaluationError: null,
  questionsAnswered: 0,
};

type PersistedSlice = Pick<
  InterviewSessionState,
  "sessionId" | "currentQuestion" | "draftAnswer" | "status" | "questionsAnswered"
>;

export const useInterviewSessionStore = create<InterviewSessionState>()(
  persist<InterviewSessionState, [], [], PersistedSlice>(
    (set) => ({
      ...initialState,

      initSession: (sessionId, firstQuestion) =>
        set({ ...initialState, sessionId, currentQuestion: firstQuestion }),

      setDraftAnswer: (text) => set({ draftAnswer: text }),

      startEvaluating: () => set({ status: "evaluating", evaluationError: null }),

      receiveEvaluation: (evaluation) =>
        set((state) => ({
          status: "showing_result",
          lastEvaluation: evaluation,
          questionsAnswered: state.questionsAnswered + 1,
        })),

      setEvaluationError: (error) => set({ status: "answering", evaluationError: error }),

      advanceToQuestion: (question) =>
        set({
          currentQuestion: question,
          draftAnswer: "",
          status: "answering",
          lastEvaluation: null,
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
        status: state.status,
        questionsAnswered: state.questionsAnswered,
      }),
    }
  )
);
