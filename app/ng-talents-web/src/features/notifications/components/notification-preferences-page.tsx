"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { normalizeApiError } from "@/lib/api/api-error";

import {
  useNotificationPreferences,
  useUpdateNotificationPreference,
} from "../hooks";
import type { NotificationType } from "../types";

const preferenceLabels: Record<
  NotificationType,
  { title: string; description: string }
> = {
  NEW_APPLICATION: {
    title: "Новый отклик",
    description: "Когда кандидат откликается на вакансию.",
  },
  APPLICATION_STATUS_CHANGED: {
    title: "Изменение статуса отклика",
    description: "Когда работодатель обновляет статус вашего отклика.",
  },
  NEW_MESSAGE: {
    title: "Новое сообщение",
    description: "Когда участник диалога отправляет сообщение.",
  },
  VACANCY_PUBLISHED: {
    title: "Публикация вакансии",
    description: "Когда вакансия проходит модерацию и публикуется.",
  },
  VACANCY_REJECTED: {
    title: "Отклонение вакансии",
    description: "Когда вакансия отклонена модерацией.",
  },
  EMPLOYER_VERIFIED: {
    title: "Проверка работодателя",
    description: "Когда меняется результат проверки работодателя.",
  },
  SYSTEM: {
    title: "Системные уведомления",
    description: "Важные сообщения о работе платформы.",
  },
};

export function NotificationPreferencesPage() {
  const preferencesQuery = useNotificationPreferences();
  const updatePreference = useUpdateNotificationPreference();

  const handleChange = async (type: NotificationType, enabled: boolean) => {
    try {
      await updatePreference.mutateAsync({ type, enabled });
      toast.success("Настройки сохранены.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          render={<Link href="/notifications" />}
        >
          <ArrowLeft aria-hidden="true" />
          К уведомлениям
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Настройки уведомлений</CardTitle>
          <CardDescription>
            Управляйте уведомлениями внутри приложения. Внешние каналы доставки
            пока недоступны.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {preferencesQuery.isPending ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }, (_, index) => (
                <Skeleton key={index} className="h-14 w-full" />
              ))}
            </div>
          ) : preferencesQuery.isError ? (
            <div className="text-center">
              <p role="alert" className="text-sm text-destructive">
                {normalizeApiError(preferencesQuery.error).message}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                onClick={() => void preferencesQuery.refetch()}
              >
                Повторить
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {preferencesQuery.data.map((preference) => {
                const label = preferenceLabels[preference.type];
                return (
                  <li
                    key={`${preference.type}-${preference.channel}`}
                    className="flex items-start justify-between gap-5 py-4 first:pt-0 last:pb-0"
                  >
                    <span className="min-w-0">
                      <span className="block font-medium">{label.title}</span>
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {label.description}
                      </span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        Канал: внутри приложения
                      </span>
                    </span>
                    <input
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-primary"
                      checked={preference.enabled}
                      disabled={updatePreference.isPending}
                      aria-label={`Уведомление: ${label.title}`}
                      onChange={(event) =>
                        void handleChange(
                          preference.type,
                          event.currentTarget.checked,
                        )
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
