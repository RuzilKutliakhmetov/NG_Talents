import { Button } from "@/components/ui/button";

interface VacancyErrorStateProps {
  status?: number;
  onRetry: () => void;
}

export function VacancyErrorState({ status, onRetry }: VacancyErrorStateProps) {
  let description = "Не удалось загрузить данные. Проверьте подключение и попробуйте ещё раз.";
  if (status === 401) {
    description = "Сервер не разрешил доступ к публичному каталогу (401).";
  } else if (status === 403) {
    description = "Сервер запретил доступ к публичному каталогу (403).";
  } else if (status && status >= 500) {
    description = "На сервере произошла ошибка. Попробуйте повторить запрос позже.";
  }

  return (
    <section
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
      role="alert"
    >
      <h2 className="text-lg font-semibold">Не удалось загрузить вакансии</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
        {description}
      </p>
      <Button className="mt-4" variant="outline" onClick={onRetry}>
        Повторить запрос
      </Button>
    </section>
  );
}

interface VacancyEmptyStateProps {
  onReset: () => void;
}

export function VacancyEmptyState({ onReset }: VacancyEmptyStateProps) {
  return (
    <section className="rounded-2xl border bg-card px-6 py-12 text-center">
      <h2 className="text-xl font-semibold">Вакансии не найдены</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        По вашему запросу вакансии не найдены. Измените условия поиска или сбросьте фильтры.
      </p>
      <Button className="mt-5" variant="outline" onClick={onReset}>
        Сбросить фильтры
      </Button>
    </section>
  );
}
