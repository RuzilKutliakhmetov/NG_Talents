import { getApiErrorStatus, normalizeApiError } from "@/lib/api/api-error";

export function formatApiError(error: unknown) {
  const status = getApiErrorStatus(error);
  if (status === 401) return "Сессия истекла. Войдите в систему снова.";
  if (status === 403) return "Недостаточно прав для выполнения операции.";
  if (status === 404) return "Компания или вакансия не найдена.";
  return normalizeApiError(error).message;
}
