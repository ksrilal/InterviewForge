"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteSession } from "@/actions/session.actions";
import { Trash2Icon } from "lucide-react";

interface DeleteSessionButtonProps {
  sessionId: string;
}

export function DeleteSessionButton({ sessionId }: DeleteSessionButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await deleteSession(sessionId);
      if (!result.ok) {
        setError(result.error ?? "Failed to delete session.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="mr-2 text-muted-foreground hover:text-destructive"
          />
        }
      >
        <Trash2Icon className="size-4" />
        <span className="sr-only">Delete session</span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this session?</DialogTitle>
          <DialogDescription>
            This permanently deletes the session, its questions, answers, and any skill score
            history tied to it. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
