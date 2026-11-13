"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { authStore } from "@/features/auth/store";
import { getApiErrorStatus, normalizeApiError } from "@/lib/api/api-error";

import { clearEmployerId, saveEmployerId, useEmployerId } from "../company-id";
import { useEmployerCompany } from "../hooks";
import { EmployerCompanyForm } from "./employer-company-form";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function EmployerCompanyPage() {
  const router = useRouter();
  const userId = authStore(useShallow((state) => state.user?.id));
  const employerId = useEmployerId(userId);
  const companyQuery = useEmployerCompany(employerId);
  const [enteredEmployerId, setEnteredEmployerId] = useState("");
  const [showExistingCompany, setShowExistingCompany] = useState(false);

  if (!userId) {
    return <EmployerPageMessage message="Не удалось определить пользователя." />;
  }

  if (employerId && companyQuery.isPending) {
    return (
      <EmployerPageContainer title="Профиль компании">
        <Card className="space-y-5 p-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </Card>
      </EmployerPageContainer>
    );
  }

  if (employerId && companyQuery.isError) {
    const status = getApiErrorStatus(companyQuery.error);
    const description =
      status === 403
        ? "У вашей учётной записи нет доступа к этой компании."
        : status === 404
          ? "Компания с сохранённым идентификатором не найдена."
          : normalizeApiError(companyQuery.error).message;

    return (
      <EmployerPageContainer title="Профиль компании">
        <Card className="p-6" role="alert">
          <h2 className="text-lg font-semibold">Не удалось загрузить компанию</h2>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => void companyQuery.refetch()}>
              Повторить
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearEmployerId(userId);
                toast.info("Введите другой ID или создайте новую компанию.");
              }}
            >
              Сменить компанию
            </Button>
          </div>
        </Card>
      </EmployerPageContainer>
    );
  }

  const attachExistingCompany = () => {
    const id = enteredEmployerId.trim();
    if (!uuidPattern.test(id)) {
      toast.error("Введите корректный UUID компании.");
      return;
    }
    saveEmployerId(userId, id);
    setShowExistingCompany(false);
  };

  const company = companyQuery.data;

  if (company) {
    return (
      <EmployerPageContainer title="Профиль компании">
        <Card className="mb-5 p-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">Данные компании</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Контактные и регистрационные сведения доступны в рамках API.
            </p>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
              ID компании: {company.id}
            </p>
          </div>
          <EmployerCompanyForm
            key={company.id}
            userId={userId}
            company={company}
          />
        </Card>
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="font-semibold">Перейти к вакансиям</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Создавайте предложения и отслеживайте их статусы.
            </p>
          </div>
          <Button onClick={() => router.push("/employer/vacancies")}>
            Управление вакансиями
          </Button>
        </Card>
      </EmployerPageContainer>
    );
  }

  return (
    <EmployerPageContainer title="Профиль компании">
      <Card className="p-5 sm:p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold">Компания ещё не подключена</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Создайте профиль компании, чтобы управлять вакансиями. После создания
            компания будет связана с вашей учётной записью на backend.
          </p>
        </div>
        <EmployerCompanyForm userId={userId} />
        <div className="mt-7 border-t pt-5">
          <Button
            variant="link"
            className="px-0"
            onClick={() => setShowExistingCompany((visible) => !visible)}
          >
            {showExistingCompany
              ? "Скрыть привязку существующей компании"
              : "Уже есть компания? Указать её ID"}
          </Button>
          {showExistingCompany ? (
            <div className="mt-3 max-w-xl space-y-3">
              <p className="text-sm text-muted-foreground">
                Backend не предоставляет поиск компаний текущего пользователя.
                Если компания создана ранее, введите её UUID; сервер проверит
                доступ при загрузке.
              </p>
              <Label htmlFor="existing-employer-id">UUID компании</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="existing-employer-id"
                  value={enteredEmployerId}
                  onChange={(event) => setEnteredEmployerId(event.target.value)}
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  autoComplete="off"
                />
                <Button onClick={attachExistingCompany}>Открыть</Button>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </EmployerPageContainer>
  );
}

export function EmployerPageContainer({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">
            Кабинет работодателя
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
        <Link href="/" className={buttonVariants({ variant: "ghost", size: "sm" })}>
          На главную
        </Link>
      </header>
      {children}
    </main>
  );
}

function EmployerPageMessage({ message }: { message: string }) {
  return (
    <EmployerPageContainer title="Кабинет">
      <Card className="p-6 text-sm text-muted-foreground">{message}</Card>
    </EmployerPageContainer>
  );
}
