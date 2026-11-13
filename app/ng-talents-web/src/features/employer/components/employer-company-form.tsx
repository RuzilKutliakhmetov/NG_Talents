"use client";

import { cloneElement, type ReactElement } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { normalizeApiError } from "@/lib/api/api-error";

import { useCreateEmployerCompany, useUpdateEmployerCompany } from "../hooks";
import { saveEmployerId } from "../company-id";
import { useUnsavedChanges } from "../use-unsaved-changes";
import type { EmployerCompany } from "../types";

const companySchema = z.object({
  inn: z
    .string()
    .trim()
    .regex(/^(\d{10}|\d{12})$/, "ИНН должен содержать 10 или 12 цифр."),
  legalName: z
    .string()
    .trim()
    .min(1, "Укажите юридическое наименование.")
    .max(300, "Максимум 300 символов."),
  shortName: z.string().trim().max(300, "Максимум 300 символов."),
  description: z.string().trim().max(5000, "Максимум 5000 символов."),
  website: z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" ||
        z.string().url().safeParse(value).success ||
        /^https?:\/\/localhost(?::\d+)?(?:\/.*)?$/i.test(value),
      "Укажите корректный URL, например https://example.com.",
    ),
  email: z
    .string()
    .trim()
    .refine(
      (value) => value === "" || z.string().email().safeParse(value).success,
      "Укажите корректный email.",
    ),
  phone: z.string().trim().max(32, "Максимум 32 символа."),
  address: z.string().trim().max(500, "Максимум 500 символов."),
});

type CompanyFormValues = z.infer<typeof companySchema>;

interface EmployerCompanyFormProps {
  userId: string;
  company?: EmployerCompany;
}

function formValues(company?: EmployerCompany): CompanyFormValues {
  return {
    inn: company?.inn ?? "",
    legalName: company?.legalName ?? "",
    shortName: company?.shortName ?? "",
    description: company?.description ?? "",
    website: company?.website ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    address: company?.address ?? "",
  };
}

export function EmployerCompanyForm({
  userId,
  company,
}: EmployerCompanyFormProps) {
  const createMutation = useCreateEmployerCompany();
  const updateMutation = useUpdateEmployerCompany(company?.id ?? "");
  const mutation = company ? updateMutation : createMutation;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: formValues(company),
  });
  useUnsavedChanges(isDirty);

  const onSubmit = async (values: CompanyFormValues) => {
    const optionalFields = {
      shortName: values.shortName || undefined,
      description: values.description || undefined,
      website: values.website || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
    };
    try {
      if (company) {
        const updated = await updateMutation.mutateAsync({
          legalName: values.legalName,
          ...optionalFields,
        });
        reset(formValues(updated));
        toast.success("Профиль компании обновлён.");
      } else {
        const created = await createMutation.mutateAsync({
          inn: values.inn,
          legalName: values.legalName,
          ...optionalFields,
        });
        saveEmployerId(userId, created.id);
        reset(formValues(created));
        toast.success("Компания создана.");
      }
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  const pending = mutation.isPending || isSubmitting;

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit(onSubmit)}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {!company ? (
          <FormField
            label="ИНН"
            error={errors.inn?.message}
            required
            hint="10 цифр для организации или 12 цифр для ИП."
          >
            <Input
              inputMode="numeric"
              maxLength={12}
              aria-invalid={Boolean(errors.inn)}
              {...register("inn")}
            />
          </FormField>
        ) : null}
        <FormField
          label="Юридическое наименование"
          error={errors.legalName?.message}
          required
          className={!company ? "" : "sm:col-span-2"}
        >
          <Input
            maxLength={300}
            aria-invalid={Boolean(errors.legalName)}
            {...register("legalName")}
          />
        </FormField>
        <FormField label="Краткое наименование" error={errors.shortName?.message}>
          <Input
            maxLength={300}
            aria-invalid={Boolean(errors.shortName)}
            {...register("shortName")}
          />
        </FormField>
        <FormField label="Сайт" error={errors.website?.message}>
          <Input
            type="url"
            placeholder="https://example.com"
            aria-invalid={Boolean(errors.website)}
            {...register("website")}
          />
        </FormField>
        <FormField label="Email компании" error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            {...register("email")}
          />
        </FormField>
        <FormField label="Телефон" error={errors.phone?.message}>
          <Input
            type="tel"
            maxLength={32}
            autoComplete="tel"
            aria-invalid={Boolean(errors.phone)}
            {...register("phone")}
          />
        </FormField>
        <FormField label="Адрес" error={errors.address?.message} className="sm:col-span-2">
          <Input
            maxLength={500}
            aria-invalid={Boolean(errors.address)}
            {...register("address")}
          />
        </FormField>
        <FormField
          label="Описание компании"
          error={errors.description?.message}
          className="sm:col-span-2"
        >
          <Textarea
            rows={5}
            maxLength={5000}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
        </FormField>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t pt-5">
        <Button type="submit" disabled={pending}>
          {pending
            ? "Сохраняем..."
            : company
              ? "Сохранить изменения"
              : "Создать компанию"}
        </Button>
        <p className="text-xs text-muted-foreground">
        ИНН нельзя изменить после создания. Пустые необязательные поля при
        редактировании не очищают сохранённые значения.
        </p>
      </div>
    </form>
  );
}

function FormField({
  label,
  error,
  required = false,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactElement<{ id?: string }>;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
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
