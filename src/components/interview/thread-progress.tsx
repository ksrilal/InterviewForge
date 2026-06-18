interface ThreadProgressProps {
  rootCount: number;
  rootTotal: number;
  followUpDepth: number;
}

export function ThreadProgress({ rootCount, rootTotal, followUpDepth }: ThreadProgressProps) {
  return (
    <p className="text-sm text-muted-foreground">
      Question {rootCount} of {rootTotal}
      {followUpDepth > 0 ? ` · Follow-up ${followUpDepth}` : ""}
    </p>
  );
}
