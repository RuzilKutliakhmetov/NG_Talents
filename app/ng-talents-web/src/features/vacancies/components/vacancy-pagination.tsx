"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { VacancyListResponse } from "@/features/vacancies/types";

interface VacancyPaginationProps {
  meta: VacancyListResponse["meta"];
  onPageChange: (page: number) => void;
}

export function VacancyPagination({
  meta,
  onPageChange,
}: VacancyPaginationProps) {
  const totalPages = Math.max(meta.totalPages, 1);
  const currentPage = Math.min(meta.page, totalPages);
  const firstItem = meta.total === 0 ? 0 : (currentPage - 1) * meta.limit + 1;
  const lastItem = Math.min(currentPage * meta.limit, meta.total);

  return (
    <nav
      aria-label="Страницы вакансий"
      className="flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="text-sm text-muted-foreground">
        {meta.total > 0
          ? `Показаны ${firstItem}–${lastItem} из ${meta.total}`
          : "Найдено 0 вакансий"}
        {meta.totalPages > 0 ? ` · Страница ${currentPage} из ${meta.totalPages}` : ""}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft aria-hidden="true" />
          Назад
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={meta.totalPages === 0 || currentPage >= meta.totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Далее
          <ChevronRight aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
