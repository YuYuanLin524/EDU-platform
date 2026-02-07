import { Badge } from "@/components/ui/badge";

interface AlgorithmInfoCardProps {
  name: string;
  complexity: string;
  description: string;
}

export function AlgorithmInfoCard({ name, complexity, description }: AlgorithmInfoCardProps) {
  return (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-foreground">
        当前算法：{name}
        <Badge variant="secondary">{complexity}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
