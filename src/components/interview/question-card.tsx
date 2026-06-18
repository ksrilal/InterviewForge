import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface QuestionCardProps {
  prompt: string;
  category?: string;
  difficulty?: number;
  children?: React.ReactNode;
}

export function QuestionCard({ prompt, category, difficulty, children }: QuestionCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        {(category || difficulty) && (
          <div className="flex items-center gap-2">
            {category && <Badge variant="secondary">{category}</Badge>}
            {difficulty && <Badge variant="outline">Difficulty {difficulty}</Badge>}
          </div>
        )}
        <p className="text-lg leading-relaxed text-foreground">{prompt}</p>
        {children}
      </CardContent>
    </Card>
  );
}
