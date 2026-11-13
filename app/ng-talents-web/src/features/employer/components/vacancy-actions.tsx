"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { normalizeApiError } from "@/lib/api/api-error";

import { useVacancyStatusAction } from "../hooks";
import type { ManagedVacancy, VacancyStatusAction } from "../types";

const actionLabels: Partial<Record<VacancyStatusAction, string>> = {
  submit: "На модерацию",
  pause: "Приостановить",
  resume: "Возобновить",
  close: "Закрыть",
  archive: "В архив",
};

function availableActions(status: ManagedVacancy["status"]) {
  switch (status) {
    case "DRAFT":
    case "REJECTED":
      return ["submit", "archive"] as const;
    case "PUBLISHED":
      return ["pause", "close"] as const;
    case "PAUSED":
      return ["resume", "close"] as const;
    case "CLOSED":
      return ["archive"] as const;
    default:
      return [];
  }
}

export function VacancyActions({
  vacancy,
  employerId,
}: {
  vacancy: ManagedVacancy;
  employerId: string;
}) {
  const mutation = useVacancyStatusAction(employerId, vacancy.id);
  const [pendingAction, setPendingAction] =
    useState<VacancyStatusAction | null>(null);
  const actions = availableActions(vacancy.status);

  if (!actions.length) return null;

  const runAction = async (action: VacancyStatusAction) => {
    const confirmation =
      action === "archive"
        ? "Архивировать вакансию? Она будет закрыта и перемещена в архив."
        : action === "close"
          ? "Закрыть вакансию? После этого возобновить публикацию будет нельзя."
          : action === "submit"
            ? "Отправить вакансию на модерацию?"
            : undefined;
    if (confirmation && !window.confirm(confirmation)) return;

    setPendingAction(action);
    try {
      const updated = await mutation.mutateAsync(action);
      toast.success(
        `Статус вакансии обновлён: ${updated.status}.`,
      );
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <>
      {actions.map((action) => (
        <Button
          key={action}
          size="sm"
          variant={action === "archive" || action === "close" ? "ghost" : "secondary"}
          disabled={mutation.isPending}
          onClick={() => void runAction(action)}
        >
          {pendingAction === action
            ? "Обновляем..."
            : actionLabels[action]}
        </Button>
      ))}
    </>
  );
}
