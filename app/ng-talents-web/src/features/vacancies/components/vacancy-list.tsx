import { VacancyCard } from "@/features/vacancies/components/vacancy-card";
import type {
  PublicVacancy,
  VacancyListParams,
} from "@/features/vacancies/types";

interface VacancyListProps {
  vacancies: PublicVacancy[];
  searchContext: VacancyListParams;
}

export function VacancyList({ vacancies, searchContext }: VacancyListProps) {
  return (
    <div className="space-y-4">
      {vacancies.map((vacancy) => (
        <VacancyCard
          key={vacancy.id}
          vacancy={vacancy}
          searchContext={searchContext}
        />
      ))}
    </div>
  );
}
