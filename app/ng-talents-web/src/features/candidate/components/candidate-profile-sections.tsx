"use client";

import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type {
  CandidateCertification,
  CandidateCertificationType,
  CandidateEducation,
  CandidateExperience,
  CandidateProfileLanguage,
  CandidateProfilePortfolioLink,
  LanguageLevel,
} from "../types";

export function validateCandidateProfileSections({
  experiences,
  educations,
  certifications,
  languages,
  portfolioLinks,
}: {
  experiences: CandidateExperience[];
  educations: CandidateEducation[];
  certifications: CandidateCertification[];
  languages: CandidateProfileLanguage[];
  portfolioLinks: CandidateProfilePortfolioLink[];
}): string | null {
  if (
    !experiences.every(
      (item) =>
        item.companyName.trim() &&
        item.position.trim() &&
        item.startDate &&
        (!item.endDate || new Date(item.endDate) >= new Date(item.startDate)) &&
        (!item.isCurrent || !item.endDate),
    )
  ) {
    return "Заполните компанию, должность и корректный период работы.";
  }
  if (
    !educations.every(
      (item) =>
        item.institution.trim() &&
        item.specialization.trim() &&
        Boolean(item.startDate) &&
        (item.isIncomplete
          ? !item.endDate
          : Boolean(item.endDate) &&
            (!item.startDate ||
              new Date(item.endDate!) >= new Date(item.startDate))),
    )
  ) {
    return "Заполните учебное заведение, специальность и проверьте даты обучения.";
  }
  if (
    !certifications.every(
      (item) =>
        item.name.trim() &&
        (!item.issuedAt ||
          !item.expiresAt ||
          new Date(item.expiresAt) >= new Date(item.issuedAt)),
    )
  ) {
    return "Укажите название сертификата или курса и проверьте даты.";
  }
  if (
    !languages.every((item) => item.name.trim()) ||
    new Set(languages.map((item) => item.name.trim().toLowerCase())).size !==
      languages.length
  ) {
    return "Укажите языки и удалите дубликаты.";
  }
  if (
    !portfolioLinks.every((item) => {
      if (!item.title.trim()) return false;
      try {
        return new URL(item.url).protocol.startsWith("http");
      } catch {
        return false;
      }
    })
  ) {
    return "Укажите название проекта и корректную ссылку, начинающуюся с http:// или https://.";
  }
  return null;
}

export function CandidateProfileSections({
  experiences,
  setExperiences,
  educations,
  setEducations,
  certifications,
  setCertifications,
  languages,
  setLanguages,
  portfolioLinks,
  setPortfolioLinks,
}: {
  experiences: CandidateExperience[];
  setExperiences: Dispatch<SetStateAction<CandidateExperience[]>>;
  educations: CandidateEducation[];
  setEducations: Dispatch<SetStateAction<CandidateEducation[]>>;
  certifications: CandidateCertification[];
  setCertifications: Dispatch<SetStateAction<CandidateCertification[]>>;
  languages: CandidateProfileLanguage[];
  setLanguages: Dispatch<SetStateAction<CandidateProfileLanguage[]>>;
  portfolioLinks: CandidateProfilePortfolioLink[];
  setPortfolioLinks: Dispatch<SetStateAction<CandidateProfilePortfolioLink[]>>;
}) {
  return (
    <div className="space-y-5">
      <ExperienceSection items={experiences} setItems={setExperiences} />
      <EducationSection items={educations} setItems={setEducations} />
      <CertificationSection
        items={certifications}
        setItems={setCertifications}
      />
      <LanguageSection items={languages} setItems={setLanguages} />
      <PortfolioSection items={portfolioLinks} setItems={setPortfolioLinks} />
    </div>
  );
}

function ExperienceSection({
  items,
  setItems,
}: {
  items: CandidateExperience[];
  setItems: Dispatch<SetStateAction<CandidateExperience[]>>;
}) {
  const update = (index: number, patch: Partial<CandidateExperience>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
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
          Добавить
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
                  update(index, { companyName: event.currentTarget.value })
                }
              />
              <Input
                value={item.position}
                placeholder="Должность"
                onChange={(event) =>
                  update(index, { position: event.currentTarget.value })
                }
              />
              <Input
                type="date"
                value={item.startDate.slice(0, 10)}
                onChange={(event) =>
                  update(index, { startDate: event.currentTarget.value })
                }
              />
              <Input
                type="date"
                value={item.endDate?.slice(0, 10) ?? ""}
                disabled={item.isCurrent}
                onChange={(event) =>
                  update(index, {
                    endDate: event.currentTarget.value || null,
                  })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.isCurrent}
                onCheckedChange={(checked) =>
                  update(index, {
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
                update(index, { description: event.currentTarget.value })
              }
            />
            <Textarea
              value={item.achievements ?? ""}
              placeholder="Достижения"
              onChange={(event) =>
                update(index, { achievements: event.currentTarget.value })
              }
            />
            <Input
              value={item.technologies.join(", ")}
              placeholder="Технологии через запятую"
              onChange={(event) =>
                update(index, {
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
          <p className="text-sm text-muted-foreground">Опыт не добавлен.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EducationSection({
  items,
  setItems,
}: {
  items: CandidateEducation[];
  setItems: Dispatch<SetStateAction<CandidateEducation[]>>;
}) {
  const update = (index: number, patch: Partial<CandidateEducation>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
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
          Добавить
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
                  update(index, { institution: event.currentTarget.value })
                }
              />
              <Input
                value={item.faculty ?? ""}
                placeholder="Факультет"
                onChange={(event) =>
                  update(index, { faculty: event.currentTarget.value || null })
                }
              />
              <Input
                value={item.specialization}
                placeholder="Специальность"
                onChange={(event) =>
                  update(index, { specialization: event.currentTarget.value })
                }
              />
              <Input
                value={item.degree ?? ""}
                placeholder="Уровень образования"
                onChange={(event) =>
                  update(index, { degree: event.currentTarget.value || null })
                }
              />
              <Input
                type="date"
                value={item.startDate?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  update(index, {
                    startDate: event.currentTarget.value || null,
                  })
                }
              />
              <Input
                type="date"
                value={item.endDate?.slice(0, 10) ?? ""}
                disabled={item.isIncomplete}
                onChange={(event) =>
                  update(index, { endDate: event.currentTarget.value || null })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={item.isIncomplete}
                onCheckedChange={(checked) =>
                  update(index, {
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
                update(index, { description: event.currentTarget.value })
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
      </CardContent>
    </Card>
  );
}

function CertificationSection({
  items,
  setItems,
}: {
  items: CandidateCertification[];
  setItems: Dispatch<SetStateAction<CandidateCertification[]>>;
}) {
  const update = (index: number, patch: Partial<CandidateCertification>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
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
                type: "COURSE",
                name: "",
                number: null,
                issuedAt: null,
                expiresAt: null,
                issuer: null,
              },
            ])
          }
        >
          Добавить
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="grid gap-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={item.type}
                onChange={(event) =>
                  update(index, {
                    type: event.currentTarget
                      .value as CandidateCertificationType,
                  })
                }
              >
                <option value="COURSE">Курс</option>
                <option value="OTHER">Сертификат</option>
                <option value="A1">A1</option>
                <option value="B1_1">B1.1</option>
                <option value="ELECTRICAL_SAFETY">Электробезопасность</option>
                <option value="NAKS">НАКС</option>
              </select>
              <Input
                value={item.name}
                placeholder="Название"
                onChange={(event) =>
                  update(index, { name: event.currentTarget.value })
                }
              />
              <Input
                value={item.issuer ?? ""}
                placeholder="Организация"
                onChange={(event) =>
                  update(index, { issuer: event.currentTarget.value || null })
                }
              />
              <Input
                value={item.number ?? ""}
                placeholder="Номер сертификата"
                onChange={(event) =>
                  update(index, { number: event.currentTarget.value || null })
                }
              />
              <Input
                type="date"
                value={item.issuedAt?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  update(index, { issuedAt: event.currentTarget.value || null })
                }
              />
              <Input
                type="date"
                value={item.expiresAt?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  update(index, {
                    expiresAt: event.currentTarget.value || null,
                  })
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
            Сертификаты и курсы не добавлены.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function LanguageSection({
  items,
  setItems,
}: {
  items: CandidateProfileLanguage[];
  setItems: Dispatch<SetStateAction<CandidateProfileLanguage[]>>;
}) {
  const update = (index: number, patch: Partial<CandidateProfileLanguage>) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Иностранные языки</CardTitle>
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
                level: "B1",
                sortOrder: current.length,
              },
            ])
          }
        >
          Добавить
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item, index) => (
          <div
            key={item.id}
            className="grid gap-2 rounded-md border p-3 sm:grid-cols-[1fr_12rem_auto]"
          >
            <Input
              value={item.name}
              placeholder="Язык"
              onChange={(event) =>
                update(index, { name: event.currentTarget.value })
              }
            />
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              value={item.level}
              onChange={(event) =>
                update(index, {
                  level: event.currentTarget.value as LanguageLevel,
                })
              }
            >
              {["A1", "A2", "B1", "B2", "C1", "C2", "NATIVE"].map((level) => (
                <option key={level} value={level}>
                  {level}
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
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Иностранные языки не добавлены.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function PortfolioSection({
  items,
  setItems,
}: {
  items: CandidateProfilePortfolioLink[];
  setItems: Dispatch<SetStateAction<CandidateProfilePortfolioLink[]>>;
}) {
  const update = (
    index: number,
    patch: Partial<CandidateProfilePortfolioLink>,
  ) =>
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
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
                  update(index, { title: event.currentTarget.value })
                }
              />
              <Input
                type="url"
                value={item.url}
                placeholder="URL проекта"
                onChange={(event) =>
                  update(index, { url: event.currentTarget.value })
                }
              />
            </div>
            <Textarea
              value={item.description ?? ""}
              placeholder="Описание проекта"
              onChange={(event) =>
                update(index, {
                  description: event.currentTarget.value || null,
                })
              }
            />
            <Input
              value={item.technologies.join(", ")}
              placeholder="Используемые технологии"
              onChange={(event) =>
                update(index, {
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
          <p className="text-sm text-muted-foreground">
            Проекты портфолио не добавлены.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
