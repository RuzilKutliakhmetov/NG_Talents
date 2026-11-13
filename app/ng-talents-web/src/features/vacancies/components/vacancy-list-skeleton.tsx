import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function VacancyListSkeleton() {
  return (
    <div className="space-y-4" aria-label="Загрузка вакансий" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <Card key={index} className="space-y-4 p-5 sm:p-6">
          <div className="flex gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-4 w-2/5" />
        </Card>
      ))}
    </div>
  );
}
