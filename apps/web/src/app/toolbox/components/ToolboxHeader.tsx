import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ToolboxHeader() {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="mb-2 text-sm text-muted-foreground">SocraticCode 算法实验室</p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">排序算法可视化实验室</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          手动输入数字，选择算法后点击“一键运行排序”，观察每一步如何变化。
        </p>
      </div>

      <Button variant="outline" asChild>
        <Link href="/">
          <ArrowLeft className="size-4" />
          返回首页
        </Link>
      </Button>
    </div>
  );
}
