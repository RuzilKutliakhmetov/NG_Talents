"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authStore } from "@/features/auth/store";
import { getApiErrorStatus } from "@/lib/api/api-error";

import { useEmployerId } from "../company-id";
import { useManagedVacancy } from "../hooks";
import { formatApiError } from "../lib";
import { EmployerPageContainer } from "./employer-company-page";
import { VacancyForm } from "./vacancy-form";

interface VacancyEditorPageProps {
  vacancyId?: string;
}

export function VacancyEditorPage({ vacancyId }: VacancyEditorPageProps) {
  const router = useRouter();
  const userId = authStore(useShallow((state) => state.user?.id));
  const employerId = useEmployerId(userId);
  const vacancyQuery = useManagedVacancy(employerId, vacancyId ?? "");

  if (!employerId) {
    return (
      <EmployerPageContainer title={vacancyId ? "Редактирование" : "Новая вакансия"}>
        <Card className="p-6">
          <h2 className="font-semibold">Сначала подключите компанию</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Без UUID компании backend не принимает операции с вакансиями.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/employer/company")}
          >
            Перейти к компании
          </Button>
        </Card>
      </EmployerPageContainer>
    );
  }

  if (!vacancyId) {
    return (
      <EmployerPageContainer title="Новая вакансия">
        <VacancyForm employerId={employerId} />
      </EmployerPageContainer>
    );
  }

  if (vacancyQuery.isPending) {
    return (
      <EmployerPageContainer title="Редактирование вакансии">
        <Skeleton className="h-[700px] rounded-2xl" />
      </EmployerPageContainer>
    );
  }

  if (vacancyQuery.isError) {
    const status = getApiErrorStatus(vacancyQuery.error);
    return (
      <EmployerPageContainer title="Редактирование вакансии">
        <Card className="p-6" role="alert">
          <h2 className="font-semibold">
            {status === 404
              ? "Вакансия не найдена"
              : status === 403
                ? "Нет доступа к вакансии"
                : "Не удалось загрузить вакансию"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {formatApiError(vacancyQuery.error)}
          </p>
          {status !== 404 && status !== 403 ? (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void vacancyQuery.refetch()}
            >
              Повторить
            </Button>
          ) : null}
          <Link
            href="/employer/vacancies"
            className={`${buttonVariants({ variant: "ghost" })} mt-4`}
          >
            К списку вакансий
          </Link>
        </Card>
      </EmployerPageContainer>
    );
  }

  if (
    vacancyQuery.data.status === "PUBLISHED" ||
    vacancyQuery.data.status === "PAUSED"
  ) {
    return (
      <EmployerPageContainer title="Редактирование вакансии">
        <Card className="p-6">
          <h2 className="font-semibold">Редактирование недоступно</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Backend отклоняет изменение вакансий в статусах «Опубликована» и
            «Приостановлена». В интерфейсе нет автоматического закрытия вакансии,
            поскольку это необратимо меняет её статус.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => router.push("/employer/vacancies")}
          >
            К списку вакансий
          </Button>
        </Card>
      </EmployerPageContainer>
    );
  }

  return (
    <EmployerPageContainer title="Редактирование вакансии">
      <VacancyForm
        key={vacancyQuery.data.id}
        employerId={employerId}
        vacancy={vacancyQuery.data}
      />
    </EmployerPageContainer>
  );
}
