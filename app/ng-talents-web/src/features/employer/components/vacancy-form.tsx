"use client";

import {
  cloneElement,
  type ReactElement,
} from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeApiError } from "@/lib/api/api-error";

import {
  CERTIFICATION_TYPES,
  EMPLOYMENT_TYPES,
  VACANCY_REGIONS,
  WORK_FORMATS,
  type ManagedVacancy,
  type VacancyWriteInput,
} from "../types";
import { useCreateManagedVacancy, useUpdateManagedVacancy } from "../hooks";
import { useUnsavedChanges } from "../use-unsaved-changes";

const employmentSchema = z
  .union([z.literal(""), z.enum(EMPLOYMENT_TYPES)])
  .refine((value) => value !== "", "Выберите тип занятости.")
  .transform((value) => value as (typeof EMPLOYMENT_TYPES)[number]);
const regionSchema = z
  .union([z.literal(""), z.enum(VACANCY_REGIONS)])
  .refine((value) => value !== "", "Выберите регион.")
  .transform((value) => value as (typeof VACANCY_REGIONS)[number]);
const workFormatSchema = z
  .union([z.literal(""), z.enum(WORK_FORMATS)])
  .transform((value) =>
    value === "" ? undefined : (value as (typeof WORK_FORMATS)[number]),
  );
const certificationSchema = z
  .union([z.literal(""), z.enum(CERTIFICATION_TYPES)])
  .refine((value) => value !== "", "Выберите тип сертификата.")
  .transform((value) => value as (typeof CERTIFICATION_TYPES)[number]);

const salarySchema = z
  .string()
  .refine(
    (value) => value === "" || (/^\d+$/.test(value) && Number.isSafeInteger(Number(value))),
    "Укажите неотрицательное целое число.",
  );

const vacancyFormSchema = z
  .object({
    title: z.string().trim().min(1, "Укажите название вакансии.").max(200),
    description: z
      .string()
      .trim()
      .min(1, "Добавьте описание вакансии.")
      .max(20000, "Максимум 20 000 символов."),
    employmentType: employmentSchema,
    workFormat: workFormatSchema,
    locationRegion: regionSchema,
    locationCity: z.string().trim().max(200, "Максимум 200 символов."),
    locationAddress: z.string().trim().max(500, "Максимум 500 символов."),
    schedule: z.string().trim().max(300, "Максимум 300 символов."),
    salaryMin: salarySchema,
    salaryMax: salarySchema,
    salaryCurrency: z.string().trim().max(8, "Максимум 8 символов."),
    salaryGross: z
      .enum(["", "gross", "net"])
      .transform((value) =>
        value === "" ? undefined : value === "gross",
      ),
    requirements: z.string().trim().max(10000, "Максимум 10 000 символов."),
    conditions: z.string().trim().max(10000, "Максимум 10 000 символов."),
    housingProvided: z.boolean(),
    travelProvided: z.boolean(),
    medicalInsurance: z.boolean(),
    requirementsList: z.array(
      z.object({
        text: z
          .string()
          .trim()
          .min(1, "Укажите требование.")
          .max(1000, "Максимум 1000 символов."),
        isRequired: z.boolean(),
      }),
    ),
    certifications: z.array(
      z.object({
        type: certificationSchema,
        name: z.string().trim().max(300, "Максимум 300 символов."),
        isRequired: z.boolean(),
      }),
    ),
  })
  .superRefine((values, context) => {
    if (
      values.salaryMin !== "" &&
      values.salaryMax !== "" &&
      Number(values.salaryMin) > Number(values.salaryMax)
    ) {
      context.addIssue({
        code: "custom",
        message: "Минимальная зарплата не может быть выше максимальной.",
        path: ["salaryMax"],
      });
    }
  });

type VacancyFormInput = z.input<typeof vacancyFormSchema>;
type VacancyFormOutput = z.output<typeof vacancyFormSchema>;

function emptyValues(): VacancyFormInput {
  return {
    title: "",
    description: "",
    employmentType: "",
    workFormat: "",
    locationRegion: "",
    locationCity: "",
    locationAddress: "",
    schedule: "",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "RUB",
    salaryGross: "",
    requirements: "",
    conditions: "",
    housingProvided: false,
    travelProvided: false,
    medicalInsurance: false,
    requirementsList: [],
    certifications: [],
  };
}

function vacancyValues(vacancy: ManagedVacancy): VacancyFormInput {
  return {
    title: vacancy.title,
    description: vacancy.description,
    employmentType: vacancy.employmentType,
    workFormat: vacancy.workFormat,
    locationRegion: vacancy.locationRegion,
    locationCity: vacancy.locationCity ?? "",
    locationAddress: vacancy.locationAddress ?? "",
    schedule: vacancy.schedule ?? "",
    salaryMin: vacancy.salaryMin === null ? "" : String(vacancy.salaryMin),
    salaryMax: vacancy.salaryMax === null ? "" : String(vacancy.salaryMax),
    salaryCurrency: vacancy.currency ?? "",
    salaryGross:
      vacancy.salaryGross === null
        ? ""
        : vacancy.salaryGross
          ? "gross"
          : "net",
    requirements: vacancy.requirementsText ?? "",
    conditions: vacancy.conditions ?? "",
    housingProvided: vacancy.housingProvided,
    travelProvided: vacancy.travelProvided,
    medicalInsurance: vacancy.medicalInsurance,
    requirementsList: (vacancy.requirements ?? []).map((requirement) => ({
      text: requirement.name,
      isRequired: requirement.required,
    })),
    certifications: (vacancy.certifications ?? []).map((certification) => ({
      type: certification.type,
      name: certification.name ?? "",
      isRequired: certification.required,
    })),
  };
}

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

interface VacancyFormProps {
  employerId: string;
  vacancy?: ManagedVacancy;
}

export function VacancyForm({ employerId, vacancy }: VacancyFormProps) {
  const router = useRouter();
  const createMutation = useCreateManagedVacancy(employerId);
  const updateMutation = useUpdateManagedVacancy(
    employerId,
    vacancy?.id ?? "",
  );
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<VacancyFormInput, unknown, VacancyFormOutput>({
    resolver: zodResolver(vacancyFormSchema),
    defaultValues: vacancy ? vacancyValues(vacancy) : emptyValues(),
  });
  const requirementsArray = useFieldArray({ control, name: "requirementsList" });
  const certificationsArray = useFieldArray({ control, name: "certifications" });
  const mutation = vacancy ? updateMutation : createMutation;
  useUnsavedChanges(isDirty);

  const onSubmit = async (values: VacancyFormOutput) => {
    const input: VacancyWriteInput = {
      title: values.title,
      description: values.description,
      employmentType: values.employmentType,
      locationRegion: values.locationRegion,
      ...(values.workFormat ? { workFormat: values.workFormat } : {}),
      ...(values.salaryMin !== ""
        ? { salaryMin: Number(values.salaryMin) }
        : {}),
      ...(values.salaryMax !== ""
        ? { salaryMax: Number(values.salaryMax) }
        : {}),
      ...(values.salaryCurrency
        ? { salaryCurrency: values.salaryCurrency }
        : {}),
      ...(typeof values.salaryGross === "boolean"
        ? { salaryGross: values.salaryGross }
        : {}),
      ...(values.locationCity ? { locationCity: values.locationCity } : {}),
      ...(values.locationAddress
        ? { locationAddress: values.locationAddress }
        : {}),
      ...(values.schedule ? { schedule: values.schedule } : {}),
      ...(values.requirements ? { requirements: values.requirements } : {}),
      ...(values.conditions ? { conditions: values.conditions } : {}),
      housingProvided: values.housingProvided,
      travelProvided: values.travelProvided,
      medicalInsurance: values.medicalInsurance,
      requirementsList: values.requirementsList.map((requirement, index) => ({
        text: requirement.text,
        isRequired: requirement.isRequired,
        sortOrder: index,
      })),
      certifications: values.certifications.map((certification) => ({
        type: certification.type,
        ...(certification.name ? { name: certification.name } : {}),
        isRequired: certification.isRequired,
      })),
    };

    try {
      const saved = vacancy
        ? await updateMutation.mutateAsync(input)
        : await createMutation.mutateAsync(input);
      const statusMessage =
        saved.status === "DRAFT"
          ? "Черновик"
          : saved.status === "PENDING_MODERATION"
            ? "Ожидает модерации"
            : saved.status === "PUBLISHED"
              ? "Опубликована"
              : saved.status === "REJECTED"
                ? "Отклонена"
                : saved.status === "PAUSED"
                  ? "Приостановлена"
                  : saved.status === "CLOSED"
                    ? "Закрыта"
                    : saved.status === "ARCHIVED"
                      ? "В архиве"
                      : "На модерации";
      toast.success(
        vacancy
          ? `Вакансия обновлена. Статус: ${statusMessage}.`
          : `Вакансия создана. Статус: ${statusMessage}.`,
      );
      router.replace("/employer/vacancies");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const pending = mutation.isPending || isSubmitting;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <Card className="gap-5 p-5 sm:p-6">
        <SectionHeading
          title="Основная информация"
          description="Название, описание и условия вакансии."
        />
        <Field label="Название вакансии" required error={errors.title?.message}>
          <Input
            maxLength={200}
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
        </Field>
        <Field
          label="Описание"
          required
          hint="До 20 000 символов."
          error={errors.description?.message}
        >
          <Textarea
            rows={7}
            maxLength={20000}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Тип занятости"
            required
            error={errors.employmentType?.message}
          >
            <select className={selectClassName} {...register("employmentType")}>
              <option value="">Выберите тип</option>
              {EMPLOYMENT_TYPES.map((type) => (
                <option value={type} key={type}>
                  {employmentLabels[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Формат работы" error={errors.workFormat?.message}>
            <select className={selectClassName} {...register("workFormat")}>
              <option value="">Не указан</option>
              {WORK_FORMATS.map((format) => (
                <option value={format} key={format}>
                  {workFormatLabels[format]}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      <Card className="gap-5 p-5 sm:p-6">
        <SectionHeading
          title="Зарплата и место работы"
          description="Заполните доступные условия оплаты и место работы."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Зарплата от" error={errors.salaryMin?.message}>
            <Input
              type="text"
              inputMode="numeric"
              aria-invalid={Boolean(errors.salaryMin)}
              {...register("salaryMin")}
            />
          </Field>
          <Field
            label="Зарплата до"
            error={errors.salaryMax?.message}
          >
            <Input
              type="text"
              inputMode="numeric"
              aria-invalid={Boolean(errors.salaryMax)}
              {...register("salaryMax")}
            />
          </Field>
          <Field
            label="Валюта"
            error={errors.salaryCurrency?.message}
            hint="Код валюты, например RUB."
          >
            <Input maxLength={8} {...register("salaryCurrency")} />
          </Field>
          <Field label="Регион" required error={errors.locationRegion?.message}>
            <select className={selectClassName} {...register("locationRegion")}>
              <option value="">Выберите регион</option>
              {VACANCY_REGIONS.map((region) => (
                <option key={region} value={region}>
                  {regionLabels[region]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Город" error={errors.locationCity?.message}>
            <Input maxLength={200} {...register("locationCity")} />
          </Field>
          <Field label="Адрес" error={errors.locationAddress?.message}>
            <Input maxLength={500} {...register("locationAddress")} />
          </Field>
          <Field label="График" error={errors.schedule?.message}>
            <Input maxLength={300} placeholder="Например, 30/30" {...register("schedule")} />
          </Field>
        </div>
          <Field label="Указание зарплаты">
            <select className={selectClassName} {...register("salaryGross")}>
              <option value="">Не указано</option>
              <option value="gross">До вычета налогов</option>
              <option value="net">На руки</option>
            </select>
          </Field>
      </Card>

      <Card className="gap-5 p-5 sm:p-6">
        <SectionHeading title="Требования и условия" />
        <Field label="Требования к кандидату" error={errors.requirements?.message}>
          <Textarea
            rows={4}
            maxLength={10000}
            {...register("requirements")}
          />
        </Field>
        <Field label="Условия работы" error={errors.conditions?.message}>
          <Textarea rows={4} maxLength={10000} {...register("conditions")} />
        </Field>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Список требований</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                requirementsArray.append({ text: "", isRequired: true })
              }
            >
              Добавить требование
            </Button>
          </div>
          {requirementsArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto]"
            >
              <div>
                <Label htmlFor={`requirement-${index}`}>Требование</Label>
                <Input
                  id={`requirement-${index}`}
                  maxLength={1000}
                  {...register(`requirementsList.${index}.text`)}
                  aria-invalid={Boolean(
                    errors.requirementsList?.[index]?.text,
                  )}
                />
                {errors.requirementsList?.[index]?.text?.message ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.requirementsList[index]?.text?.message}
                  </p>
                ) : null}
              </div>
              <CheckboxField
                label="Обязательное"
                id={`requirement-required-${index}`}
                {...register(`requirementsList.${index}.isRequired`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => requirementsArray.remove(index)}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
        <div className="space-y-3 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">Сертификаты</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                certificationsArray.append({
                  type: "",
                  name: "",
                  isRequired: true,
                })
              }
            >
              Добавить сертификат
            </Button>
          </div>
          {certificationsArray.fields.map((field, index) => (
            <div
              key={field.id}
              className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1fr_1fr_auto_auto]"
            >
              <div>
                <Label htmlFor={`certification-${index}`}>Тип</Label>
                <select
                  id={`certification-${index}`}
                  className={selectClassName}
                  {...register(`certifications.${index}.type`)}
                >
                  <option value="">Выберите тип</option>
                  {CERTIFICATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {certificationLabels[type]}
                    </option>
                  ))}
                </select>
                {errors.certifications?.[index]?.type?.message ? (
                  <p className="mt-1 text-xs text-destructive">
                    {errors.certifications[index]?.type?.message}
                  </p>
                ) : null}
              </div>
              <div>
                <Label htmlFor={`certification-name-${index}`}>Название</Label>
                <Input
                  id={`certification-name-${index}`}
                  maxLength={300}
                  {...register(`certifications.${index}.name`)}
                />
              </div>
              <CheckboxField
                label="Обязательный"
                id={`certification-required-${index}`}
                {...register(`certifications.${index}.isRequired`)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => certificationsArray.remove(index)}
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="gap-4 p-5 sm:p-6">
        <SectionHeading title="Дополнительные преимущества" />
        <CheckboxField
          label="Предоставляется жильё"
          {...register("housingProvided")}
        />
        <CheckboxField
          label="Оплачивается перелёт и проезд"
          {...register("travelProvided")}
        />
        <p className="pl-6 text-xs text-muted-foreground">
          API принимает единый параметр travelProvided; backend сохраняет его
          также как признак оплачиваемого перелёта.
        </p>
        <CheckboxField
          label="Предоставляется медицинская страховка"
          {...register("medicalInsurance")}
        />
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Сохраняем..."
            : vacancy
              ? "Сохранить изменения"
              : "Сохранить черновик"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => {
            if (
              !isDirty ||
              window.confirm("Есть несохранённые изменения. Покинуть страницу?")
            ) {
              router.push("/employer/vacancies");
            }
          }}
        >
          Отмена
        </Button>
        {!vacancy ? (
          <p className="text-xs text-muted-foreground">
            После создания вакансия получает статус «Черновик». Отправка на
            модерацию выполняется отдельно.
          </p>
        ) : null}
      </div>
    </form>
  );
}

const selectClassName =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </header>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = `vacancy-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required ? " *" : ""}
      </Label>
      {cloneElement(children, { id })}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CheckboxField({
  label,
  id,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const fieldId =
    id ?? `check-${label.toLowerCase().replaceAll(" ", "-")}`;
  return (
    <div className="flex items-center gap-2 self-end">
      <input
        id={fieldId}
        type="checkbox"
        className="size-4 rounded border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        {...props}
      />
      <Label htmlFor={fieldId} className="font-normal">
        {label}
      </Label>
    </div>
  );
}
