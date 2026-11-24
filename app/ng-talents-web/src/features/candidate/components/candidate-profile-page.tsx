"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { normalizeApiError } from "@/lib/api/api-error";

import { useCandidateProfile, useSaveCandidateProfile } from "../hooks";
import type {
  CandidateCertification,
  CandidateEducation,
  CandidateExperience,
  CandidateProfile,
  CandidateProfileLanguage,
  CandidateProfilePortfolioLink,
  EmploymentType,
  WorkFormat,
} from "../types";
import {
  CandidateProfileSections,
  validateCandidateProfileSections,
} from "./candidate-profile-sections";

export function CandidateProfilePage() {
  const profileQuery = useCandidateProfile();

  if (profileQuery.isPending) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <Skeleton className="h-96 rounded-2xl" />
      </main>
    );
  }

  if (profileQuery.isError) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-6" role="alert">
          <p className="text-sm text-destructive">
            {normalizeApiError(profileQuery.error).message}
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void profileQuery.refetch()}
          >
            Повторить
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <CandidateProfileForm
      key={profileQuery.data.updatedAt}
      profile={profileQuery.data}
    />
  );
}

function CandidateProfileForm({ profile }: { profile: CandidateProfile }) {
  const save = useSaveCandidateProfile();
  const [values, setValues] = useState(() => ({
    desiredPosition: profile.desiredPosition ?? "",
    city: profile.city ?? "",
    about: profile.about ?? "",
    employmentType: (profile.employmentType ?? "") as EmploymentType | "",
    workFormat: (profile.workFormat ?? "") as WorkFormat | "",
    readyToRelocate: profile.readyToRelocate,
    readyForTrips: profile.readyForTrips,
    isPublic: profile.isPublic,
    showContacts: profile.showContacts,
    hideFromEmployers: profile.hideFromEmployers,
  }));
  const [experiences, setExperiences] = useState<CandidateExperience[]>(
    profile.experiences,
  );
  const [educations, setEducations] = useState<CandidateEducation[]>(
    profile.educations,
  );
  const [certifications, setCertifications] = useState<
    CandidateCertification[]
  >(profile.certifications);
  const [languages, setLanguages] = useState<CandidateProfileLanguage[]>(
    profile.languages,
  );
  const [portfolioLinks, setPortfolioLinks] = useState<
    CandidateProfilePortfolioLink[]
  >(profile.portfolioLinks);

  const initialValue = useMemo(
    () =>
      JSON.stringify({
        values: {
          desiredPosition: profile.desiredPosition ?? "",
          city: profile.city ?? "",
          about: profile.about ?? "",
          employmentType: profile.employmentType ?? "",
          workFormat: profile.workFormat ?? "",
          readyToRelocate: profile.readyToRelocate,
          readyForTrips: profile.readyForTrips,
          isPublic: profile.isPublic,
          showContacts: profile.showContacts,
          hideFromEmployers: profile.hideFromEmployers,
        },
        experiences: profile.experiences,
        educations: profile.educations,
        certifications: profile.certifications,
        languages: profile.languages,
        portfolioLinks: profile.portfolioLinks,
      }),
    [profile],
  );
  const currentValue = JSON.stringify({
    values,
    experiences,
    educations,
    certifications,
    languages,
    portfolioLinks,
  });
  const dirty = currentValue !== initialValue;

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const setValue = <K extends keyof typeof values>(
    key: K,
    value: (typeof values)[K],
  ) => setValues((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateCandidateProfileSections({
      experiences,
      educations,
      certifications,
      languages,
      portfolioLinks,
    });
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const stripIds = <T extends { id: string }>(items: T[]) =>
      items.map((item) => {
        const copy = { ...item };
        delete (copy as Partial<T>).id;
        return copy;
      });
    try {
      await save.mutateAsync({
        desiredPosition: values.desiredPosition,
        city: values.city,
        about: values.about,
        employmentType: values.employmentType || null,
        workFormat: values.workFormat || null,
        readyToRelocate: values.readyToRelocate,
        readyForTrips: values.readyForTrips,
        isPublic: values.isPublic,
        showContacts: values.showContacts,
        hideFromEmployers: values.hideFromEmployers,
        experiences: stripIds(experiences),
        educations: stripIds(educations),
        certifications: stripIds(certifications),
        languages: stripIds(languages),
        portfolioLinks: stripIds(portfolioLinks),
      });
      toast.success("Профиль сохранён.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
      <form className="space-y-5" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Профиль кандидата</CardTitle>
            {dirty ? (
              <p className="text-sm text-amber-700">
                Есть несохранённые изменения
              </p>
            ) : null}
          </CardHeader>
          <CardContent>
            <div className="grid gap-5">
              <label className="grid gap-2 text-sm font-medium">
                Профессия
                <Input
                  value={values.desiredPosition}
                  maxLength={200}
                  onChange={(event) =>
                    setValue("desiredPosition", event.currentTarget.value)
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Город проживания
                <Input
                  value={values.city}
                  maxLength={100}
                  onChange={(event) =>
                    setValue("city", event.currentTarget.value)
                  }
                />
              </label>
              <label className="grid gap-2 text-sm font-medium">
                О себе
                <Textarea
                  value={values.about}
                  maxLength={5000}
                  onChange={(event) =>
                    setValue("about", event.currentTarget.value)
                  }
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium">
                  Тип занятости
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={values.employmentType}
                    onChange={(event) =>
                      setValue(
                        "employmentType",
                        event.currentTarget.value as EmploymentType | "",
                      )
                    }
                  >
                    <option value="">Не указано</option>
                    <option value="SHIFT">Сменный график</option>
                    <option value="PERMANENT">Постоянная</option>
                    <option value="PROJECT">Проектная</option>
                    <option value="PART_TIME">Частичная</option>
                    <option value="TEMPORARY">Временная</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium">
                  Формат работы
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={values.workFormat}
                    onChange={(event) =>
                      setValue(
                        "workFormat",
                        event.currentTarget.value as WorkFormat | "",
                      )
                    }
                  >
                    <option value="">Не указано</option>
                    <option value="ONSITE">Офис</option>
                    <option value="HYBRID">Гибридный</option>
                    <option value="REMOTE">Удалённый</option>
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.readyToRelocate}
                    onCheckedChange={(checked) =>
                      setValue("readyToRelocate", Boolean(checked))
                    }
                  />
                  Готов к переезду
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.readyForTrips}
                    onCheckedChange={(checked) =>
                      setValue("readyForTrips", Boolean(checked))
                    }
                  />
                  Готов к командировкам
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.isPublic}
                    onCheckedChange={(checked) =>
                      setValue("isPublic", Boolean(checked))
                    }
                  />
                  Профиль виден работодателям
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={values.showContacts}
                    onCheckedChange={(checked) =>
                      setValue("showContacts", Boolean(checked))
                    }
                  />
                  Показывать контакты
                </label>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                  <Checkbox
                    checked={values.hideFromEmployers}
                    onCheckedChange={(checked) =>
                      setValue("hideFromEmployers", Boolean(checked))
                    }
                  />
                  Скрыть профиль от работодателей
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
        <CandidateProfileSections
          experiences={experiences}
          setExperiences={setExperiences}
          educations={educations}
          setEducations={setEducations}
          certifications={certifications}
          setCertifications={setCertifications}
          languages={languages}
          setLanguages={setLanguages}
          portfolioLinks={portfolioLinks}
          setPortfolioLinks={setPortfolioLinks}
        />
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? "Сохраняем…" : "Сохранить профиль"}
          </Button>
        </div>
      </form>
    </main>
  );
}
