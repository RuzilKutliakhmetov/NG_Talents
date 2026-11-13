"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  CERTIFICATION_TYPES,
  EMPLOYMENT_TYPES,
  VACANCY_REGIONS,
  WORK_FORMATS,
  type VacancyListParams,
} from "../types";

interface VacancyFiltersProps {
  filters: VacancyListParams;
  onChange: (updates: Partial<VacancyListParams>) => void;
  onReset: () => void;
  invalidSalaryFromUrl: boolean;
}

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

const employmentLabels: Record<(typeof EMPLOYMENT_TYPES)[number], string> = {
  SHIFT: "Вахта",
  PERMANENT: "Постоянная работа",
  PROJECT: "Проектная работа",
  PART_TIME: "Частичная занятость",
  TEMPORARY: "Временная работа",
};

const regionLabels: Record<(typeof VACANCY_REGIONS)[number], string> = {
  BASHKORTOSTAN: "Башкортостан",
  KHMAO: "ХМАО",
  YANAO: "ЯНАО",
  TATARSTAN: "Татарстан",
  OTHER: "Другой регион",
};

const workFormatLabels: Record<(typeof WORK_FORMATS)[number], string> = {
  ONSITE: "На месте",
  HYBRID: "Гибридный",
  REMOTE: "Удалённый",
};

const certificationLabels: Record<
  (typeof CERTIFICATION_TYPES)[number],
  string
> = {
  A1: "A1",
  B1_1: "B1.1",
  ELECTRICAL_SAFETY: "Электробезопасность",
  NAKS: "НАКС",
  OTHER: "Другой",
};

function parseSalaryDraft(value: string): number | undefined | null {
  if (!value.trim()) return undefined;
  if (!/^\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function VacancyFilters({
  filters,
  onChange,
  onReset,
  invalidSalaryFromUrl,
}: VacancyFiltersProps) {
  const [title, setTitle] = useState(filters.title ?? "");
  const [city, setCity] = useState(filters.locationCity ?? "");
  const [salaryMin, setSalaryMin] = useState(
    filters.salaryMin === undefined ? "" : String(filters.salaryMin),
  );
  const [salaryMax, setSalaryMax] = useState(
    filters.salaryMax === undefined ? "" : String(filters.salaryMax),
  );

  useEffect(() => {
    const normalized = title.trim();
    if (normalized === (filters.title ?? "")) return;
    const timeout = window.setTimeout(
      () => onChange({ title: normalized || undefined }),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [filters.title, onChange, title]);

  useEffect(() => {
    const normalized = city.trim();
    if (normalized === (filters.locationCity ?? "")) return;
    const timeout = window.setTimeout(
      () => onChange({ locationCity: normalized || undefined }),
      350,
    );
    return () => window.clearTimeout(timeout);
  }, [city, filters.locationCity, onChange]);

  const minValue = parseSalaryDraft(salaryMin);
  const maxValue = parseSalaryDraft(salaryMax);
  const salaryError =
    minValue === null || maxValue === null
      ? "Введите неотрицательное целое число."
      : minValue !== undefined &&
          maxValue !== undefined &&
          minValue > maxValue
        ? "Минимальная зарплата не может быть выше максимальной."
        : invalidSalaryFromUrl
          ? "Некорректный диапазон из адресной строки не применён."
          : undefined;

  function changeSalary(which: "min" | "max", value: string) {
    const nextMinText = which === "min" ? value : salaryMin;
    const nextMaxText = which === "max" ? value : salaryMax;
    const nextMin = parseSalaryDraft(nextMinText);
    const nextMax = parseSalaryDraft(nextMaxText);

    if (which === "min") setSalaryMin(value);
    else setSalaryMax(value);

    if (
      nextMin === null ||
      nextMax === null ||
      (nextMin !== undefined &&
        nextMax !== undefined &&
        nextMin > nextMax)
    ) {
      return;
    }

    onChange({ salaryMin: nextMin, salaryMax: nextMax });
  }

  return (
    <section
      aria-label="Фильтры вакансий"
      className="rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Поиск и фильтры</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Уточните запрос, чтобы найти подходящую работу.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="gap-2"
        >
          <RotateCcw aria-hidden="true" />
          Сбросить
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="space-y-1.5 text-sm font-medium sm:col-span-2 lg:col-span-3">
          <span>Название вакансии</span>
          <span className="relative block">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например, инженер-энергетик"
              className="pl-9"
              aria-label="Поиск по названию вакансии"
            />
          </span>
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          Город
          <Input
            value={city}
            onChange={(event) => setCity(event.target.value)}
            placeholder="Любой город"
          />
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          Регион
          <select
            className={selectClassName}
            value={filters.locationRegion ?? ""}
            onChange={(event) =>
              onChange({
                locationRegion: (event.target.value || undefined) as
                  | VacancyListParams["locationRegion"]
                  | undefined,
              })
            }
          >
            <option value="">Все регионы</option>
            {VACANCY_REGIONS.map((region) => (
              <option key={region} value={region}>
                {regionLabels[region]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          Тип занятости
          <select
            className={selectClassName}
            value={filters.employmentType ?? ""}
            onChange={(event) =>
              onChange({
                employmentType: (event.target.value || undefined) as
                  | VacancyListParams["employmentType"]
                  | undefined,
              })
            }
          >
            <option value="">Любой тип</option>
            {EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {employmentLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          Формат работы
          <select
            className={selectClassName}
            value={filters.workFormat ?? ""}
            onChange={(event) =>
              onChange({
                workFormat: (event.target.value || undefined) as
                  | VacancyListParams["workFormat"]
                  | undefined,
              })
            }
          >
            <option value="">Любой формат</option>
            {WORK_FORMATS.map((format) => (
              <option key={format} value={format}>
                {workFormatLabels[format]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="space-y-1.5">
          <legend className="mb-1.5 text-sm font-medium">Зарплата</legend>
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="text"
              inputMode="numeric"
              value={salaryMin}
              onChange={(event) => changeSalary("min", event.target.value)}
              placeholder="От"
              aria-label="Минимальная зарплата"
              aria-invalid={Boolean(salaryError)}
            />
            <Input
              type="text"
              inputMode="numeric"
              value={salaryMax}
              onChange={(event) => changeSalary("max", event.target.value)}
              placeholder="До"
              aria-label="Максимальная зарплата"
              aria-invalid={Boolean(salaryError)}
            />
          </div>
          {salaryError ? (
            <p className="text-xs text-destructive" role="alert">
              {salaryError}
            </p>
          ) : null}
        </fieldset>

        <label className="space-y-1.5 text-sm font-medium">
          Сертификат
          <select
            className={selectClassName}
            value={filters.certification ?? ""}
            onChange={(event) =>
              onChange({
                certification: (event.target.value || undefined) as
                  | VacancyListParams["certification"]
                  | undefined,
              })
            }
          >
            <option value="">Любой сертификат</option>
            {CERTIFICATION_TYPES.map((type) => (
              <option key={type} value={type}>
                {certificationLabels[type]}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          Сортировка
          <select
            className={selectClassName}
            value={filters.sort}
            onChange={(event) =>
              onChange({ sort: event.target.value as VacancyListParams["sort"] })
            }
          >
            <option value="createdAt">Сначала новые</option>
            <option value="salaryMin">По минимальной зарплате</option>
            <option value="salaryMax">По максимальной зарплате</option>
          </select>
        </label>

        <label className="space-y-1.5 text-sm font-medium">
          Направление
          <select
            className={selectClassName}
            value={filters.direction}
            onChange={(event) =>
              onChange({
                direction: event.target.value as VacancyListParams["direction"],
              })
            }
          >
            <option value="desc">По убыванию</option>
            <option value="asc">По возрастанию</option>
          </select>
        </label>
      </div>
    </section>
  );
}
