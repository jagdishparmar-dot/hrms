import Link from "next/link";
import { ArrowRightIcon, BookOpenIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { HelpModule } from "@/lib/help/types";

export function HelpModuleCard({ module }: { module: HelpModule }) {
  return (
    <Card className="flex flex-col shadow-xs transition-colors hover:border-indigo-500/30">
      <CardHeader className="pb-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <BookOpenIcon className="size-4" />
        </div>
        <CardTitle className="text-base">{module.title}</CardTitle>
        <CardDescription>{module.summary}</CardDescription>
      </CardHeader>
      <CardContent className="mt-auto pt-0">
        <Button
          size="sm"
          variant="outline"
          nativeButton={false}
          className="w-full"
          render={<Link href={`/help/${module.slug}`} />}
        >
          Open guide
          <ArrowRightIcon className="size-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
