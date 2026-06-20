"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuestionCard } from "@/components/interview/question-card";
import { AnswerInput } from "@/components/interview/answer-input";
import { CodeEditor } from "@/components/interview/code-editor";
import { EvaluationPanel } from "@/components/interview/evaluation-panel";
import { CodeReviewPanel } from "@/components/interview/code-review-panel";
import { ThreadProgress } from "@/components/interview/thread-progress";
import { SessionTimer } from "@/components/interview/session-timer";
import { useInterviewSessionStore } from "@/store/interview-session.store";
import { submitAnswer, submitCodeAnswer } from "@/actions/answer.actions";
import { endSession } from "@/actions/session.actions";
import type { CodeLanguage, InterviewLevel, QuestionType, SessionMode } from "@/types/domain";

interface InterviewScreenProps {
  sessionId: string;
  startedAt: string;
  timeLimitSeconds: number | null;
  initialQuestion: {
    sessionQuestionId: string;
    prompt: string;
    followUpDepth: number;
    questionType?: QuestionType;
    language?: CodeLanguage | null;
  };
  initialCategory: string | null;
  initialDifficulty: number | null;
  initialRootCount: number;
  rootTotal: number;
  level: InterviewLevel;
  mode: SessionMode;
}

export function InterviewScreen({
  sessionId,
  startedAt,
  timeLimitSeconds,
  initialQuestion,
  initialCategory,
  initialDifficulty,
  initialRootCount,
  rootTotal,
}: InterviewScreenProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rootCount, setRootCount] = useState(initialRootCount);

  const {
    sessionId: storedSessionId,
    currentQuestion,
    draftAnswer,
    draftLanguage,
    status,
    lastEvaluation,
    lastCodeReview,
    evaluationError,
    initSession,
    setDraftAnswer,
    setDraftLanguage,
    startEvaluating,
    receiveEvaluation,
    receiveCodeReview,
    setEvaluationError,
    advanceToQuestion,
    completeSession,
  } = useInterviewSessionStore();

  useEffect(() => {
    if (storedSessionId !== sessionId) {
      initSession(sessionId, initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const isCodingQuestion = currentQuestion?.questionType === "coding";

  function applyNextStep(nextStep: { type: "FOLLOW_UP" | "NEW_TOPIC" | "SESSION_COMPLETE"; sessionQuestionId?: string; prompt?: string; depth?: number; questionType?: QuestionType; language?: CodeLanguage | null }) {
    if (nextStep.type === "FOLLOW_UP") {
      setPendingNext({
        sessionQuestionId: nextStep.sessionQuestionId!,
        prompt: nextStep.prompt!,
        followUpDepth: nextStep.depth!,
        questionType: undefined,
        language: null,
      });
    } else if (nextStep.type === "NEW_TOPIC") {
      setRootCount((c) => c + 1);
      setPendingNext({
        sessionQuestionId: nextStep.sessionQuestionId!,
        prompt: nextStep.prompt!,
        followUpDepth: 0,
        questionType: nextStep.questionType,
        language: nextStep.language,
      });
    } else {
      setPendingNext(null);
      setSessionComplete(true);
    }
  }

  function handleSubmit() {
    if (!currentQuestion) return;
    startEvaluating();
    startTransition(async () => {
      const result = await submitAnswer(currentQuestion.sessionQuestionId, draftAnswer);
      if (!result.ok || !result.data) {
        setEvaluationError(result.error ?? "Evaluation failed. Your answer was saved.");
        return;
      }
      receiveEvaluation(result.data.evaluation);
      applyNextStep(result.data.nextStep);
    });
  }

  function handleSubmitCode() {
    if (!currentQuestion || !draftLanguage) return;
    startEvaluating();
    startTransition(async () => {
      const result = await submitCodeAnswer(currentQuestion.sessionQuestionId, draftAnswer, draftLanguage);
      if (!result.ok || !result.data) {
        setEvaluationError(result.error ?? "Code review failed. Your submission was saved.");
        return;
      }
      receiveCodeReview(result.data.codeReview);
      applyNextStep(result.data.nextStep);
    });
  }

  const [pendingNext, setPendingNext] = useState<typeof currentQuestion>(null);
  const [sessionComplete, setSessionComplete] = useState(false);

  function handleContinue() {
    if (sessionComplete) {
      handleEnd();
      return;
    }
    if (pendingNext) {
      advanceToQuestion(pendingNext);
      setPendingNext(null);
    }
  }

  function handleEnd() {
    completeSession();
    startTransition(async () => {
      await endSession(sessionId);
      router.push(`/interview/${sessionId}/summary`);
    });
  }

  function handleTimerExpire() {
    handleEnd();
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <ThreadProgress
          rootCount={rootCount}
          rootTotal={rootTotal}
          followUpDepth={currentQuestion?.followUpDepth ?? 0}
        />
        {timeLimitSeconds && (
          <SessionTimer startedAt={startedAt} timeLimitSeconds={timeLimitSeconds} onExpire={handleTimerExpire} />
        )}
      </div>

      {status === "session_complete" ? (
        // Ending the session still needs to await endSession() before the
        // router.push to /summary resolves - without this branch, status
        // falls through every other check below and the screen sat on the
        // bare last question with no input or evaluation, looking frozen.
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Wrapping up your results…</p>
        </div>
      ) : (
        <>
          {currentQuestion && (
            <QuestionCard
              prompt={currentQuestion.prompt}
              category={currentQuestion.followUpDepth === 0 ? initialCategory ?? undefined : undefined}
              difficulty={currentQuestion.followUpDepth === 0 ? initialDifficulty ?? undefined : undefined}
            />
          )}

          {(status === "answering" || status === "evaluating") &&
            (isCodingQuestion ? (
              <div className="flex flex-col gap-3">
                <CodeEditor
                  value={draftAnswer}
                  onChange={setDraftAnswer}
                  language={draftLanguage ?? "javascript"}
                  onLanguageChange={setDraftLanguage}
                  disabled={status === "evaluating"}
                />
                <Button
                  onClick={handleSubmitCode}
                  size="lg"
                  className="sticky bottom-20 md:bottom-0 w-full"
                  disabled={status === "evaluating" || isPending || draftAnswer.trim().length === 0}
                >
                  {isPending || status === "evaluating" ? "Reviewing..." : "Submit Code"}
                </Button>
              </div>
            ) : (
              <AnswerInput
                value={draftAnswer}
                onChange={setDraftAnswer}
                onSubmit={handleSubmit}
                disabled={status === "evaluating"}
                isPending={isPending || status === "evaluating"}
              />
            ))}

          {evaluationError && <p className="text-sm text-destructive">{evaluationError}</p>}
        </>
      )}

      {status === "showing_result" && (lastEvaluation || lastCodeReview) && (
        <div className="flex flex-col gap-4">
          {lastCodeReview ? (
            <CodeReviewPanel review={lastCodeReview} />
          ) : (
            lastEvaluation && <EvaluationPanel evaluation={lastEvaluation} />
          )}
          <div className="flex flex-col gap-2">
            <Button onClick={handleContinue} size="lg" disabled={isPending}>
              {sessionComplete ? "View Summary" : "Continue"}
            </Button>
            <Dialog>
              <DialogTrigger render={<Button variant="outline" size="lg" />}>
                End Session
              </DialogTrigger>
              <DialogContent closeButtonDisabled={isPending}>
                <DialogHeader>
                  <DialogTitle>End this session?</DialogTitle>
                  <DialogDescription>
                    You&apos;ll see your full summary and scores after ending.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose render={<Button variant="outline" disabled={isPending} />}>
                    Cancel
                  </DialogClose>
                  <Button onClick={handleEnd} disabled={isPending}>
                    End Session
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}
    </div>
  );
}
