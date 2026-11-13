"use client";

import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { authStore } from "@/features/auth/store";
import { normalizeApiError } from "@/lib/api/api-error";

import { useEmployerId } from "../company-id";
import { useEmployerCompany } from "../hooks";
import { EmployerPageContainer } from "./employer-company-page";

export function EmployerDashboard() {
  const router = useRouter();
  const user = authStore(
    useShallow((state) => ({
      id: state.user?.id,
      firstName: state.user?.firstName,
    })),
  );
  const employerId = useEmployerId(user.id);
  const companyQuery = useEmployerCompany(employerId);

  return (
    <EmployerPageContainer title="Обзор">
      <div className="mb-6">
        <p className="text-muted-foreground">
          {user.firstName ? `Здравствуйте, ${user.firstName}. ` : ""}
          Управляйте профилем компании и вакансиями.
        </p>
      </div>
      {employerId && companyQuery.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : employerId && companyQuery.isError ? (
        <Card className="p-6" role="alert">
          <h2 className="font-semibold">Не удалось загрузить компанию</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {normalizeApiError(companyQuery.error).message}
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void companyQuery.refetch()}
          >
            Повторить
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <DashboardCard
            title="Профиль компании"
            description={
              companyQuery.data
                ? companyQuery.data.shortName || companyQuery.data.legalName
                : "Создайте или подключите профиль компании, чтобы начать работу."
            }
            action={companyQuery.data ? "Открыть профиль" : "Создать профиль"}
            onClick={() => router.push("/employer/company")}
          />
          <DashboardCard
            title="Вакансии"
            description={
              employerId
                ? "Создавайте вакансии и управляйте публикацией."
                : "Для работы с вакансиями сначала требуется компания."
            }
            action="Перейти к вакансиям"
            onClick={() => router.push("/employer/vacancies")}
          />
          <DashboardCard
            title="Отклики"
            description={
              employerId
                ? "Просматривайте отклики на вакансии компании и меняйте их статусы."
                : "Сначала подключите компанию, чтобы открыть отклики."
            }
            action="Перейти к откликам"
            onClick={() => router.push("/employer/applications")}
          />
        </div>
      )}
    </EmployerPageContainer>
  );
}

function DashboardCard({
  title,
  description,
  action,
  onClick,
}: {
  title: string;
  description: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <Card className="flex flex-col justify-between gap-5 p-6">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      <Button variant="outline" className="self-start" onClick={onClick}>
        {action}
      </Button>
    </Card>
  );
}
