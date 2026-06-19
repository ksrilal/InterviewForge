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
import { setUserDisabled } from "@/actions/admin.actions";

interface DisableUserButtonProps {
  userId: string;
  email: string | null;
  disabled: boolean;
}

export function DisableUserButton({ userId, email, disabled }: DisableUserButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await setUserDisabled(userId, !disabled);
      if (!result.ok) {
        setError(result.error ?? "Failed to update account status.");
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={disabled ? "outline" : "destructive"} size="sm" />}>
        {disabled ? "Re-enable account" : "Disable account"}
      </DialogTrigger>
      <DialogContent closeButtonDisabled={isPending}>
        <DialogHeader>
          <DialogTitle>
            {disabled ? "Re-enable" : "Disable"} {email ?? "this account"}?
          </DialogTitle>
          <DialogDescription>
            {disabled
              ? "This restores their ability to log in."
              : "This immediately blocks them from logging in (real Supabase Auth ban, not just an app-level flag) and signs out any still-active session."}
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button variant={disabled ? "default" : "destructive"} onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Saving..." : disabled ? "Yes, re-enable" : "Yes, disable"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
