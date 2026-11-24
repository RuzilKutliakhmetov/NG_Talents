"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { normalizeApiError } from "@/lib/api/api-error";
import { cn } from "cn";

import {
  useCandidateProfile,
  useCreateStructuredResume,
  useStructuredResume,
  useUpdateStructuredResume,
} from "../hooks";
import type {
  CandidateProfile,
  EmploymentType,
  ResumeCertification,
  ResumeEducation,
  ResumeExperience,
  ResumeLanguage,
  ResumePortfolioLink,
  ResumeSkill,
  StructuredResume,
  StructuredResumeInput,
  WorkFormat,
} from "../types";

interface ResumeEditorPageProps {
  id?: string;
}

export function ResumeEditorPage({ id }: ResumeEditorPageProps) {
  const router = useRouter();
  const resumeQuery = useStructuredResume(id ?? "");
  const profileQuery = useCandidateProfile();
  const create = useCreateStructuredResume();
  const update = useUpdateStructuredResume(id ?? "");

  if ((id && resumeQuery.isPending) || (!id && profileQuery.isPending)) {
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Skeleton className="h-96 rounded-2xl" />
      </main>
    );
  }

  if ((id && resumeQuery.isError) || (!id && profileQuery.isError)) {
    const error = id ? resumeQuery.error : profileQuery.error;
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        <Card className="p-6" role="alert">
          <p className="text-sm text-destructive">
            {normalizeApiError(error).message}
          </p>
        </Card>
      </main>
    );
  }

  return (
    <ResumeEditorForm
      resumeId={id}
      resume={id ? resumeQuery.data : undefined}
      profile={!id ? profileQuery.data : undefined}
      saving={id ? update.isPending : create.isPending}
      onSave={async (input) => {
        try {
          const saved = id
            ? await update.mutateAsync(input)
            : await create.mutateAsync(input);
          toast.success(id ? "Резюме сохранено." : "Черновик создан.");
          router.push(`/candidate/resumes/${saved.id}`);
        } catch (error) {
          toast.error(normalizeApiError(error).message);
        }
      }}
    />
  );
}

function ResumeEditorForm({
  resumeId,
  resume,
  profile,
  saving,
  onSave,
}: {
  resumeId?: string;
  resume?: StructuredResume;
  profile?: CandidateProfile;
  saving: boolean;
  onSave: (input: StructuredResumeInput) => Promise<void>;
}) {
  const update = useUpdateStructuredResume(resumeId ?? "");
  const [desiredPosition, setDesiredPosition] = useState(
    resume?.desiredPosition ?? profile?.desiredPosition ?? "",
  );
  const [specialization, setSpecialization] = useState(
    resume?.specialization ?? profile?.specialization ?? "",
  );
  const [summary, setSummary] = useState(
    resume?.summary ?? profile?.about ?? "",
  );
  const [desiredSalary, setDesiredSalary] = useState(
    resume?.desiredSalary?.toString() ?? "",
  );
  const [employmentType, setEmploymentType] = useState<EmploymentType | "">(
    resume?.employmentType ?? profile?.employmentType ?? "",
  );
  const [workFormat, setWorkFormat] = useState<WorkFormat | "">(
    resume?.workFormat ?? profile?.workFormat ?? "",
  );
  const [workSchedule, setWorkSchedule] = useState(
    resume?.workSchedule ?? profile?.preferredSchedule ?? "",
  );
  const [city, setCity] = useState(resume?.city ?? profile?.city ?? "");
  const [isPublic, setIsPublic] = useState(resume?.isPublic ?? true);

  const profileExperiences = (profile?.experiences ?? []).map((item) => ({
    ...item,
    startDate: item.startDate,
    endDate: item.endDate,
  }));
  const profileEducations = (profile?.educations ?? []).map((item) => ({
    ...item,
  }));
  const profileCertifications = (profile?.certifications ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    issuer: item.issuer,
    issuedAt: item.issuedAt,
    expiresAt: item.expiresAt,
    url: null,
    sortOrder: 0,
  }));
  const profileLanguages = (profile?.languages ?? []).map((item) => ({
    ...item,
  }));
  const profilePortfolio = (profile?.portfolioLinks ?? []).map((item) => ({
    ...item,
  }));
  const [experiences, setExperiences] = useState<ResumeExperience[]>(
    resume?.experiences ?? profileExperiences,
  );
  const [educations, setEducations] = useState<ResumeEducation[]>(
    resume?.educations ?? profileEducations,
  );
  const [skills, setSkills] = useState<ResumeSkill[]>(resume?.skills ?? []);
  const [languages, setLanguages] = useState<ResumeLanguage[]>(
    resume?.languages ?? profileLanguages,
  );
  const [certifications, setCertifications] = useState<ResumeCertification[]>(
    resume?.certifications ?? profileCertifications,
  );
  const [portfolioLinks, setPortfolioLinks] = useState<ResumePortfolioLink[]>(
    resume?.portfolioLinks ?? profilePortfolio,
  );
  const [skillDraft, setSkillDraft] = useState("");
  const [languageDraft, setLanguageDraft] = useState("");
  const [languageLevel, setLanguageLevel] =
    useState<ResumeLanguage["level"]>("B1");

  const currentValue = useMemo(
    () =>
      JSON.stringify({
        desiredPosition,
        specialization,
        summary,
        desiredSalary,
        employmentType,
        workFormat,
        workSchedule,
        city,
        isPublic,
        skills,
      }),
    [
      desiredPosition,
      specialization,
      summary,
      desiredSalary,
      employmentType,
      workFormat,
      workSchedule,
      city,
      isPublic,
      skills,
    ],
  );
  const initialValue = JSON.stringify({
    desiredPosition: resume?.desiredPosition ?? profile?.desiredPosition ?? "",
    specialization: resume?.specialization ?? profile?.specialization ?? "",
    summary: resume?.summary ?? profile?.about ?? "",
    desiredSalary: resume?.desiredSalary?.toString() ?? "",
    employmentType: resume?.employmentType ?? profile?.employmentType ?? "",
    workFormat: resume?.workFormat ?? profile?.workFormat ?? "",
    workSchedule: resume?.workSchedule ?? profile?.preferredSchedule ?? "",
    city: resume?.city ?? profile?.city ?? "",
    isPublic: resume?.isPublic ?? true,
    skills: resume?.skills ?? [],
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

  const mainInput = (): StructuredResumeInput => ({
    desiredPosition,
    specialization,
    summary,
    desiredSalary: desiredSalary ? Number(desiredSalary) : null,
    employmentType: employmentType || null,
    workFormat: workFormat || null,
    workSchedule,
    city,
    isPublic,
  });

  const saveSection = async (input: StructuredResumeInput) => {
    if (!resumeId) {
      toast.info("Сначала сохраните основную информацию резюме.");
      return;
    }
    try {
      await update.mutateAsync(input);
      toast.success("Раздел сохранён.");
    } catch (error) {
      toast.error(normalizeApiError(error).message);
    }
  };
  const notifyProfileEditLocation = () =>
    toast.info("Измените эти данные в разделе «Профиль».");

  const stripIds = <T extends { id: string }>(items: T[]) =>
    items.map((item) => {
      const copy = { ...item };
      delete (copy as Partial<T>).id;
      return copy;
    });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (
      desiredSalary &&
      (!Number.isSafeInteger(Number(desiredSalary)) ||
        Number(desiredSalary) < 1)
    ) {
      toast.error("Укажите целую сумму зарплаты больше нуля.");
      return;
    }
    void onSave({
      ...mainInput(),
      skills: stripIds(skills),
    });
  };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-8 sm:px-6">
      <Link
        href="/candidate/resumes"
        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
      >
        К моим резюме
      </Link>

      <Card>
        <CardHeader>
          <CardTitle>
            {resume ? "Редактирование резюме" : "Новое резюме"}
          </CardTitle>
          {dirty ? (
            <p className="text-sm text-amber-700">
              Есть несохранённые изменения
            </p>
          ) : null}
        </CardHeader>
        <CardContent>
          <form className="grid gap-5" onSubmit={submit}>
            <Field label="Профессия">
              <Input
                value={desiredPosition}
                maxLength={200}
                onChange={(event) =>
                  setDesiredPosition(event.currentTarget.value)
                }
              />
            </Field>
            <Field label="Специализация">
              <Input
                value={specialization}
                maxLength={300}
                onChange={(event) =>
                  setSpecialization(event.currentTarget.value)
                }
              />
            </Field>
            <Field label="Профессиональное описание">
              <Textarea
                value={summary}
                maxLength={10000}
                onChange={(event) => setSummary(event.currentTarget.value)}
              />
            </Field>
            <div className="max-w-sm">
              <Field label="Желаемая зарплата">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={desiredSalary}
                    onChange={(event) =>
                      setDesiredSalary(event.currentTarget.value)
                    }
                  />
                  <span className="text-sm text-muted-foreground">₽</span>
                </div>
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Тип занятости">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={employmentType}
                  onChange={(event) =>
                    setEmploymentType(
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
              </Field>
              <Field label="Формат работы">
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={workFormat}
                  onChange={(event) =>
                    setWorkFormat(event.currentTarget.value as WorkFormat | "")
                  }
                >
                  <option value="">Не указано</option>
                  <option value="ONSITE">Офис</option>
                  <option value="HYBRID">Гибридный</option>
                  <option value="REMOTE">Удалённый</option>
                </select>
              </Field>
              <Field label="Город">
                <Input
                  value={city}
                  maxLength={100}
                  onChange={(event) => setCity(event.currentTarget.value)}
                />
              </Field>
              <Field label="График работы">
                <Input
                  value={workSchedule}
                  maxLength={300}
                  onChange={(event) =>
                    setWorkSchedule(event.currentTarget.value)
                  }
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(Boolean(checked))}
              />
              Показывать резюме работодателям
            </label>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Сохраняем…" : "Сохранить основную информацию"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {resume?.completion ? (
        <Card>
          <CardHeader>
            <CardTitle>Заполненность резюме</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${resume.completion.percent}%` }}
                />
              </div>
              <strong>{resume.completion.percent}%</strong>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {resume.completion.sections.map((section) => (
                <div
                  key={section.key}
                  className="rounded-md border p-3 text-sm"
                >
                  {section.complete ? "✓ " : "○ "} {section.title}
                </div>
              ))}
            </div>
            {resume.completion.missing.length ? (
              <p className="mt-3 text-sm text-amber-700">
                Для публикации требуется: {resume.completion.missing.join(", ")}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <fieldset
        disabled
        className="space-y-5 rounded-lg border p-4"
        aria-label="Информация профиля только для чтения"
      >
        <legend className="px-2 text-sm font-medium">
          Данные из профиля — редактируются в разделе «Профиль»
        </legend>
        <ExperienceSection
          items={experiences}
          setItems={setExperiences}
          onSave={notifyProfileEditLocation}
          pending={update.isPending}
        />
        <EducationSection
          items={educations}
          setItems={setEducations}
          onSave={notifyProfileEditLocation}
          pending={update.isPending}
        />
        <LanguagesSection
          items={languages}
          setItems={setLanguages}
          draft={languageDraft}
          setDraft={setLanguageDraft}
          level={languageLevel}
          setLevel={setLanguageLevel}
          onSave={notifyProfileEditLocation}
          pending={update.isPending}
        />
        <CertificationSection
          items={certifications}
          setItems={setCertifications}
          onSave={notifyProfileEditLocation}
          pending={update.isPending}
        />
        <PortfolioSection
          items={portfolioLinks}
          setItems={setPortfolioLinks}
          onSave={notifyProfileEditLocation}
          pending={update.isPending}
        />
      </fieldset>
      <SkillsSection
        items={skills}
        setItems={setSkills}
        draft={skillDraft}
        setDraft={setSkillDraft}
        onSave={() => saveSection({ skills: stripIds(skills) })}
        pending={update.isPending}
      />
    </main>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-2 text-sm font-medium">
      {label}
      {children}
    </label>
  );
}

function ExperienceSection({
  items,
  setItems,
  onSave,
  pending,
}: {
  items: ResumeExperience[];
  setItems: Dispatch<SetStateAction<ResumeExperience[]>>;
  onSave: () => void;
  pending: boolean;
}) {
  const updateItem = (index: number, patch: Partial<ResumeExperience>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Опыт работы</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                companyName: "",
                position: "",
                startDate: "",
                endDate: null,
                isCurrent: false,
                description: null,
                achievements: null,
                technologies: [],
                sortOrder: current.length,
              },
            ])
          }
        >
          Добавить опыт
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={item.companyName}
                placeholder="Компания"
                onChange={(event) =>
                  updateItem(index, { companyName: event.currentTarget.value })
                }
              />
              <Input
                value={item.position}
                placeholder="Должность"
                onChange={(event) =>
                  updateItem(index, { position: event.currentTarget.value })
                }
              />
              <Input
                type="date"
                value={item.startDate.slice(0, 10)}
                onChange={(event) =>
                  updateItem(index, { startDate: event.currentTarget.value })
                }
              />
              <Input
                type="date"
                value={item.endDate?.slice(0, 10) ?? ""}
                disabled={item.isCurrent}
                onChange={(event) =>
                  updateItem(index, {
                    endDate: event.currentTarget.value || null,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.isCurrent}
                onCheckedChange={(checked) =>
                  updateItem(index, {
                    isCurrent: Boolean(checked),
                    endDate: checked ? null : item.endDate,
                  })
                }
              />
              Текущее место работы
            </label>
            <Textarea
              value={item.description ?? ""}
              placeholder="Обязанности"
              onChange={(event) =>
                updateItem(index, { description: event.currentTarget.value })
              }
            />
            <Textarea
              value={item.achievements ?? ""}
              placeholder="Достижения"
              onChange={(event) =>
                updateItem(index, { achievements: event.currentTarget.value })
              }
            />
            <Input
              value={item.technologies.join(", ")}
              placeholder="Технологии через запятую"
              onChange={(event) =>
                updateItem(index, {
                  technologies: event.currentTarget.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() =>
                  setItems((current) => {
                    const next = [...current];
                    [next[index - 1], next[index]] = [
                      next[index],
                      next[index - 1],
                    ];
                    return next.map((entry, sortOrder) => ({
                      ...entry,
                      sortOrder,
                    }));
                  })
                }
              >
                Выше
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === items.length - 1}
                onClick={() =>
                  setItems((current) => {
                    const next = [...current];
                    [next[index], next[index + 1]] = [
                      next[index + 1],
                      next[index],
                    ];
                    return next.map((entry, sortOrder) => ({
                      ...entry,
                      sortOrder,
                    }));
                  })
                }
              >
                Ниже
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Удалить
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Опыт работы не добавлен.
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" disabled={pending} onClick={onSave}>
            Сохранить опыт
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function EducationSection({
  items,
  setItems,
  onSave,
  pending,
}: {
  items: ResumeEducation[];
  setItems: Dispatch<SetStateAction<ResumeEducation[]>>;
  onSave: () => void;
  pending: boolean;
}) {
  const updateItem = (index: number, patch: Partial<ResumeEducation>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Образование</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                institution: "",
                faculty: null,
                specialization: "",
                degree: null,
                startDate: null,
                endDate: null,
                isIncomplete: false,
                description: null,
                sortOrder: current.length,
              },
            ])
          }
        >
          Добавить образование
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={item.institution}
                placeholder="Учебное заведение"
                onChange={(event) =>
                  updateItem(index, { institution: event.currentTarget.value })
                }
              />
              <Input
                value={item.faculty ?? ""}
                placeholder="Факультет"
                onChange={(event) =>
                  updateItem(index, { faculty: event.currentTarget.value })
                }
              />
              <Input
                value={item.specialization}
                placeholder="Специальность"
                onChange={(event) =>
                  updateItem(index, {
                    specialization: event.currentTarget.value,
                  })
                }
              />
              <Input
                value={item.degree ?? ""}
                placeholder="Уровень образования"
                onChange={(event) =>
                  updateItem(index, { degree: event.currentTarget.value })
                }
              />
              <Input
                type="date"
                value={item.startDate?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  updateItem(index, {
                    startDate: event.currentTarget.value || null,
                  })
                }
              />
              <Input
                type="date"
                value={item.endDate?.slice(0, 10) ?? ""}
                disabled={item.isIncomplete}
                onChange={(event) =>
                  updateItem(index, {
                    endDate: event.currentTarget.value || null,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.isIncomplete}
                onCheckedChange={(checked) =>
                  updateItem(index, {
                    isIncomplete: Boolean(checked),
                    endDate: checked ? null : item.endDate,
                  })
                }
              />
              Незавершённое образование
            </label>
            <Textarea
              value={item.description ?? ""}
              placeholder="Дополнительная информация"
              onChange={(event) =>
                updateItem(index, { description: event.currentTarget.value })
              }
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Удалить
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Образование не добавлено.
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" disabled={pending} onClick={onSave}>
            Сохранить образование
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SkillsSection({
  items,
  setItems,
  draft,
  setDraft,
  onSave,
  pending,
}: {
  items: ResumeSkill[];
  setItems: Dispatch<SetStateAction<ResumeSkill[]>>;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  onSave: () => void;
  pending: boolean;
}) {
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Такой навык уже добавлен.");
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        category: null,
        level: null,
        sortOrder: current.length,
      },
    ]);
    setDraft("");
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Навыки</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder="Название навыка"
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <Button type="button" onClick={add}>
            Добавить
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
            <span
              key={item.id}
              className="flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
            >
              {item.name}
              <select
                aria-label={`Уровень навыка ${item.name}`}
                className="h-7 rounded border bg-background px-1 text-xs"
                value={item.level ?? ""}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...entry,
                            level: event.currentTarget.value || null,
                          }
                        : entry,
                    ),
                  )
                }
              >
                <option value="">Уровень</option>
                <option value="BEGINNER">Начальный</option>
                <option value="INTERMEDIATE">Средний</option>
                <option value="ADVANCED">Продвинутый</option>
                <option value="EXPERT">Эксперт</option>
              </select>
              <button
                type="button"
                aria-label={`Удалить навык ${item.name}`}
                className="text-destructive"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="button" disabled={pending} onClick={onSave}>
            Сохранить навыки
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function LanguagesSection({
  items,
  setItems,
  draft,
  setDraft,
  level,
  setLevel,
  onSave,
  pending,
}: {
  items: ResumeLanguage[];
  setItems: Dispatch<SetStateAction<ResumeLanguage[]>>;
  draft: string;
  setDraft: Dispatch<SetStateAction<string>>;
  level: ResumeLanguage["level"];
  setLevel: Dispatch<SetStateAction<ResumeLanguage["level"]>>;
  onSave: () => void;
  pending: boolean;
}) {
  const add = () => {
    const name = draft.trim();
    if (!name) return;
    if (items.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Такой язык уже добавлен.");
      return;
    }
    setItems((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        name,
        level,
        sortOrder: current.length,
      },
    ]);
    setDraft("");
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle>Иностранные языки</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_12rem_auto]">
          <Input
            value={draft}
            placeholder="Язык"
            onChange={(event) => setDraft(event.currentTarget.value)}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={level}
            onChange={(event) =>
              setLevel(event.currentTarget.value as ResumeLanguage["level"])
            }
          >
            {["A1", "A2", "B1", "B2", "C1", "C2", "NATIVE"].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <Button type="button" onClick={add}>
            Добавить
          </Button>
        </div>
        <div className="space-y-2">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <Input
                className="max-w-xs"
                value={item.name}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index
                        ? { ...entry, name: event.currentTarget.value }
                        : entry,
                    ),
                  )
                }
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={item.level}
                onChange={(event) =>
                  setItems((current) =>
                    current.map((entry, itemIndex) =>
                      itemIndex === index
                        ? {
                            ...entry,
                            level: event.currentTarget
                              .value as ResumeLanguage["level"],
                          }
                        : entry,
                    ),
                  )
                }
              >
                {["A1", "A2", "B1", "B2", "C1", "C2", "NATIVE"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button type="button" disabled={pending} onClick={onSave}>
            Сохранить языки
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CertificationSection({
  items,
  setItems,
  onSave,
  pending,
}: {
  items: ResumeCertification[];
  setItems: Dispatch<SetStateAction<ResumeCertification[]>>;
  onSave: () => void;
  pending: boolean;
}) {
  const updateItem = (index: number, patch: Partial<ResumeCertification>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Сертификаты и курсы</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                name: "",
                issuer: null,
                issuedAt: null,
                expiresAt: null,
                url: null,
                sortOrder: current.length,
              },
            ])
          }
        >
          Добавить сертификат
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={item.name}
                placeholder="Название"
                onChange={(event) =>
                  updateItem(index, { name: event.currentTarget.value })
                }
              />
              <Input
                value={item.issuer ?? ""}
                placeholder="Организация"
                onChange={(event) =>
                  updateItem(index, { issuer: event.currentTarget.value })
                }
              />
              <Input
                type="date"
                value={item.issuedAt?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  updateItem(index, {
                    issuedAt: event.currentTarget.value || null,
                  })
                }
              />
              <Input
                type="date"
                value={item.expiresAt?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  updateItem(index, {
                    expiresAt: event.currentTarget.value || null,
                  })
                }
              />
              <Input
                value={item.url ?? ""}
                placeholder="Ссылка"
                onChange={(event) =>
                  updateItem(index, { url: event.currentTarget.value })
                }
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Удалить
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Сертификаты не добавлены.
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" disabled={pending} onClick={onSave}>
            Сохранить сертификаты
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function PortfolioSection({
  items,
  setItems,
  onSave,
  pending,
}: {
  items: ResumePortfolioLink[];
  setItems: Dispatch<SetStateAction<ResumePortfolioLink[]>>;
  onSave: () => void;
  pending: boolean;
}) {
  const updateItem = (index: number, patch: Partial<ResumePortfolioLink>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Портфолио</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setItems((current) => [
              ...current,
              {
                id: crypto.randomUUID(),
                title: "",
                description: null,
                url: "",
                technologies: [],
                sortOrder: current.length,
              },
            ])
          }
        >
          Добавить проект
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                value={item.title}
                placeholder="Название проекта"
                onChange={(event) =>
                  updateItem(index, { title: event.currentTarget.value })
                }
              />
              <Input
                value={item.url}
                placeholder="URL проекта"
                onChange={(event) =>
                  updateItem(index, { url: event.currentTarget.value })
                }
              />
            </div>
            <Textarea
              value={item.description ?? ""}
              placeholder="Описание проекта"
              onChange={(event) =>
                updateItem(index, { description: event.currentTarget.value })
              }
            />
            <Input
              value={item.technologies.join(", ")}
              placeholder="Используемые технологии"
              onChange={(event) =>
                updateItem(index, {
                  technologies: event.currentTarget.value
                    .split(",")
                    .map((value) => value.trim())
                    .filter(Boolean),
                })
              }
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  setItems((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                Удалить
              </Button>
            </div>
          </div>
        ))}
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Проекты не добавлены.</p>
        ) : null}
        <div className="flex justify-end">
          <Button type="button" disabled={pending} onClick={onSave}>
            Сохранить портфолио
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
