import axios from "axios";
import { toast } from "sonner";

import type { ApiErrorResponse } from "@/types/api";

export interface ApiError {
  statusCode?: number;
  code?: string;
  message: string;
  messages: string[];
  timestamp?: string;
  path?: string;
}

export function normalizeApiError(error: unknown): ApiError {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const response = error.response;
    const data = response?.data;
    const messages = Array.isArray(data?.message)
      ? data.message
      : typeof data?.message === "string"
        ? [data.message]
        : [response ? "Не удалось выполнить запрос." : "Не удалось связаться с сервером."];

    return {
      statusCode: data?.statusCode ?? response?.status,
      code: data?.code,
      message: messages.join(" "),
      messages,
      timestamp: data?.timestamp,
      path: data?.path,
    };
  }

  const message =
    error instanceof Error ? error.message : "Произошла непредвиденная ошибка.";

  return { message, messages: [message] };
}

export function getApiErrorStatus(error: unknown): number | undefined {
  return normalizeApiError(error).statusCode;
}

export function notifyApiError(error: unknown): void {
  toast.error(normalizeApiError(error).message);
}
