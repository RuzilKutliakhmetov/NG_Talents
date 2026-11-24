# NG Talents Backend — справочник для разработки веб-части

Документ описывает реализованный backend API и его текущие ограничения. Он предназначен для передачи другой нейросети или frontend-разработчику как исходный контекст для планирования веб-приложения. Если документ расходится с работающим API, приоритет имеют исходники NestJS и схема Prisma.

## 1. Кратко о проекте

- Backend: NestJS 12, TypeScript, REST API.
- Базовый URL локального API: `http://localhost:3000/api/v1`.
- Документация Swagger генерируется приложением при запуске и доступна по `http://localhost:3000/docs`.
- База данных: PostgreSQL, доступ через Prisma.
- Redis используется для ограничения частоты запросов; также подключено локальное файловое хранилище.
- Основные роли: `CANDIDATE`, `EMPLOYER`, `ADMIN`, `MODERATOR`.
- API покрывает регистрацию/вход, профили кандидатов и работодателей, вакансии, модерацию, отклики, резюме и документы кандидата.

## 2. Запуск и конфигурация

API-пакет расположен в `app/api`. Основные команды из этой папки:

```sh
npm install
npm run start:dev
npm run build
npm run test
npm run test:e2e
```

Файл `docker-compose.yml` в корне репозитория поднимает PostgreSQL и Redis. Текущая конфигурация проекта предусматривает локальное хранение файлов в `./storage` и по умолчанию не требует MinIO/S3.

Переменные окружения:

| Переменная | Назначение | Значение по умолчанию / требование |
|---|---|---|
| `NODE_ENV` | Режим запуска | `development` |
| `PORT` | Порт HTTP API | `3000` |
| `DATABASE_URL` | Строка подключения PostgreSQL | Обязательна |
| `JWT_ACCESS_SECRET` | Секрет подписи access JWT | Обязателен |
| `JWT_ACCESS_EXPIRES_IN` | Срок действия access JWT | `15m` |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `CORS_ORIGIN` | Разрешённый frontend origin | `http://localhost:3000`; credentials включены |
| `AUTH_REFRESH_COOKIE_NAME` | Имя refresh-cookie | `ng_refresh` |
| `AUTH_REFRESH_EXPIRES_IN_DAYS` | Срок refresh-сессии | `30` |
| `STORAGE_PROVIDER` | Драйвер файлов | `local` |
| `STORAGE_LOCAL_PATH` | Локальная папка файлов | `./storage` |
| `STORAGE_PUBLIC_BASE_URL` | Базовый URL в download-ответе | `http://localhost:3000/storage` |
| `STORAGE_PRESIGNED_URL_EXPIRES_SECONDS` | Срок ссылки в download-ответе | `300` |
| `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, `STORAGE_BUCKET` | Конфигурация S3/MinIO | Нужны только при `STORAGE_PROVIDER=s3` или `minio` |

Не помещать реальные секреты в frontend или в документацию. Файл `.env.example` содержит шаблон настроек.

## 3. Общие правила API

### HTTP и JSON

- Все controller-маршруты, кроме Swagger UI, имеют префикс `/api/v1`.
- JSON тела запросов проверяются глобальным `ValidationPipe`: неизвестные поля запрещены (`whitelist` + `forbidNonWhitelisted`), типы DTO преобразуются.
- UUID-параметры проверяются `ParseUUIDPipe`.
- Успешные ответы обычно возвращают объект/массив непосредственно, если отдельно не описана обёртка.
- Ошибки имеют общий формат:

```json
{
  "statusCode": 400,
  "code": "VALIDATION_ERROR",
  "message": "Описание ошибки",
  "timestamp": "ISO-8601",
  "path": "/api/v1/...",
  "..."
}
```

`code` зависит от ошибки. Валидационные ошибки обычно имеют `VALIDATION_ERROR`; бизнес-ошибки возвращают специфичный код. Для некоторых NestJS ошибок `message` может быть массивом сообщений валидации.

### Аутентификация и авторизация

- Access token передавать в заголовке `Authorization: Bearer <accessToken>`.
- Все маршруты закрыты JWT guard по умолчанию. Публичные маршруты помечены `@Public()` и перечислены ниже.
- Авторизационные проверки ролей выполняются по роли из JWT. Для работодателя дополнительно проверяется членство пользователя в конкретной компании и права участника.
- Ролевые ошибки обычно дают `403`; отсутствующий/невалидный access token — `401`.
- Login/refresh также устанавливают HttpOnly refresh-cookie. Для credentialed CORS frontend должен отправлять запросы с cookie (`credentials: 'include'` / `withCredentials: true`) и корректным разрешённым origin.
- Cookie имеет `SameSite=Lax`, путь `/api/v1/auth`; `Secure` включается в `NODE_ENV=production`.
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh` ограничены Redis rate limiter: максимум 5 запросов с IP на маршрут за 15 минут.

### Пагинация

Списки вакансий и откликов используют `page` и `limit` (по умолчанию `1` и `20`, максимум `50`). Ответ вакансий содержит `meta`, ответы откликов — `pagination`; обе обёртки имеют `page`, `limit`, `total`, `totalPages`.

## 4. Роли и основные сценарии

### Кандидат

1. Зарегистрироваться и войти.
2. Заполнить профиль: опыт, образование, сертификаты и курсы, языки и портфолио.
3. Заполнить профиль и сохранить его одной кнопкой; данные профиля копируются в резюме и доступны там только для чтения. Желаемая зарплата задаётся в резюме в рублях.
4. Найти опубликованную вакансию и отправить отклик.
5. Смотреть отклики и их историю; скачать собственные файлы.

### Работодатель

1. Войти как пользователь с ролью `EMPLOYER`.
2. Создать компанию; создатель становится её владельцем.
3. Создавать/редактировать вакансии и отправлять их на модерацию.
4. После публикации управлять вакансиями и просматривать отклики компании.

### Модератор / администратор

- Проверять вакансии, утверждать/отклонять их и читать журнал модерации.
- Имеют доступ к части операций работодателя в обход членства в компании.
- Просматривать и создавать записи проверки работодателей.

## 5. Каталог маршрутов

В таблице указан путь относительно `http://localhost:3000/api/v1`. Все указанные ниже маршруты требуют Bearer JWT, если не помечены **Публичный**. `{id}`/`{...Id}` в параметрах — UUID.

### 5.1 Аутентификация — `/auth`

| Метод и путь | Доступ | Запрос | Результат / назначение |
|---|---|---|---|
| `POST /auth/register` | Публичный | JSON: `email`, `password`, `firstName`, `lastName`; опционально `phone`, `middleName` | Публичные данные созданного пользователя без password hash. Роль нового пользователя по умолчанию — кандидат. |
| `POST /auth/login` | Публичный, rate limit | JSON: `email`, `password` | `{ accessToken }`; refresh token устанавливается HttpOnly cookie. |
| `POST /auth/refresh` | Публичный, rate limit | Refresh cookie | `{ accessToken }`; cookie refresh-токена обновляется ротацией. |
| `POST /auth/logout` | Любой вошедший пользователь | Тело не требуется | `{ success: true }`; удаляется refresh cookie и инвалидируется текущая сессия, если cookie передана. |
| `POST /auth/logout-all` | Любой вошедший пользователь | Тело не требуется | `{ success: true }`; инвалидирует все сессии пользователя. |
| `GET /auth/me` | Любой вошедший пользователь | — | Текущий пользователь без password hash; использовать для начальной загрузки сессии и определения роли. |

Ошибки auth включают `USER_ALREADY_EXISTS`, `AUTH_INVALID_CREDENTIALS`, `AUTH_SESSION_REUSED`, `AUTH_SESSION_EXPIRED`, `AUTH_INVALID_REFRESH_TOKEN`, `AUTH_UNAUTHORIZED`.

### 5.2 Кандидат — `/candidate`

Требуется роль `CANDIDATE`. Все данные относятся к пользователю из access token; передавать user ID в теле/URL не нужно.

| Метод и путь | Тело | Результат / назначение |
|---|---|---|
| `GET /candidate/profile` | — | Профиль с `experiences`, `educations`, `certifications`, `languages`, `portfolioLinks`; для существующего кандидата без профиля создаётся пустой профиль. |
| `POST /candidate/profile` | Профильные поля, например `readyForShiftWork?`, `about?` | Создание профиля. Зарплата задаётся только в резюме. |
| `PATCH /candidate/profile` | Профильные поля и/или массивы профильных разделов, все необязательные | Атомарно обновляет профиль и переданные разделы; отсутствие массива не меняет соответствующий раздел. Frontend отправляет все профильные разделы одной формой. |
| `PATCH /candidate/profile/sections` | Любое подмножество массивов `experiences`, `educations`, `certifications`, `languages`, `portfolioLinks` | Атомарно заменяет только переданные разделы; отсутствие массива не меняет соответствующий раздел. |
| `GET /candidate/experience` | — | Опыт работы, сортировка от нового к старому. |
| `POST /candidate/experience` | `companyName`, `position`, `startDate`; опционально `endDate`, `isCurrent`, `description` | Создание записи опыта. `startDate`/`endDate` — date-time/date-совместимая ISO-строка. |
| `PATCH /candidate/experience/{id}` | Любые поля создания, необязательные | Обновление своей записи. Для текущей позиции `endDate` очищается. |
| `DELETE /candidate/experience/{id}` | — | Удаление своей записи; `{ success: true }`. |
| `GET /candidate/education` | — | Образование, сортировка по `startDate` по убыванию. |
| `POST /candidate/education` | `institution`, `specialization`; опционально `degree`, `startDate`, `endDate`, `description` | Создание записи. Даты — ISO date строки. |
| `PATCH /candidate/education/{id}` | Те же поля, необязательные | Обновление своей записи. |
| `DELETE /candidate/education/{id}` | — | Удаление своей записи; `{ success: true }`. |
| `GET /candidate/certifications` | — | Сертификаты, сортировка по дате истечения. |
| `POST /candidate/certifications` | `type`, `name`; опционально `number`, `issuedAt`, `expiresAt`, `issuer` | Создание сертификата. |
| `PATCH /candidate/certifications/{id}` | Те же поля, необязательные | Обновление своего сертификата. |
| `DELETE /candidate/certifications/{id}` | — | Удаление своего сертификата; `{ success: true }`. |
Опыт, образование, сертификаты/курсы, языки и портфолио хранятся в профиле. Опыт и образование используют одинаковые `startDate`/`endDate`; дата окончания не может быть раньше даты начала, текущая работа и незавершённое образование не имеют даты окончания. Зарплата задаётся только в резюме одним целым значением в рублях.

Миграция `20261123160000_stage83_resume_salary_and_education_dates` переводит прежние годы образования в даты 1 января соответствующего года и приводит валюту резюме к RUB. Перед запуском сначала примените предыдущие миграции Stage 8. Не выполняйте миграцию вручную или на production без резервной копии и предварительной проверки на тестовой базе.

Для старых резюме с диапазоном зарплаты API выдаёт `desiredSalary` по нижней границе; оба legacy-значения сохраняются в БД до следующего сохранения резюме. При сохранении новой суммы backend записывает её в оба legacy-поля, чтобы не потерять историю диапазонов без пользовательского изменения.

### 5.3 Резюме и документы кандидата

Обе группы доступны только роли `CANDIDATE`; файлы загружаются через `multipart/form-data`, поле файла называется `file`. Принимаются только PDF (`application/pdf`) и DOCX (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), максимум 10 MiB; расширение имени должно соответствовать MIME type.

**Резюме — `/candidate/resumes`:**

| Метод и путь | Запрос | Результат / назначение |
|---|---|---|
| `GET /candidate/resumes` | — | Список своих резюме; сначала primary, затем по дате создания. |
| `POST /candidate/resumes` | multipart: `file`, `title` (до 200 символов), опционально `isPrimary` | Создать резюме. При `isPrimary=true` прежнее основное резюме снимается. |
| `GET /candidate/resumes/{id}` | — | Метаданные своего резюме. |
| `GET /candidate/resumes/{id}/download` | — | `{ downloadUrl, expiresIn, originalName, mimeType, sizeBytes }`. |
| `PATCH /candidate/resumes/{id}` | JSON: опционально `title` | Изменить заголовок. |
| `DELETE /candidate/resumes/{id}` | — | Удалить файл и метаданные; `{ success: true }`. |
| `POST /candidate/resumes/{id}/primary` | — | Назначить основным; у профиля может быть только одно primary-резюме. |

**Структурированное резюме:** `POST /candidate/resumes/structured` создаёт черновик без пользовательского поля «Название резюме»; основная роль называется «Профессия». При создании данные опыта, образования, сертификатов/курсов, языков и портфолио копируются из профиля. Эти разделы отображаются в резюме только для чтения и изменяются через профиль. Обновление резюме принимает его основные поля, желаемую зарплату (`desiredSalary`, целое число в рублях) и навыки; публикация/снятие/архивация — `POST /candidate/resumes/{id}/publish`, `/unpublish`, `/archive`.

**Документы — `/candidate/documents`:**

| Метод и путь | Запрос | Результат / назначение |
|---|---|---|
| `GET /candidate/documents` | — | Список своих документов, новые первыми. |
| `POST /candidate/documents` | multipart: `file`, `type`, `title`; опционально `issuedAt`, `expiresAt` | Создать документ. |
| `GET /candidate/documents/{id}` | — | Метаданные своего документа. |
| `GET /candidate/documents/{id}/download` | — | `{ downloadUrl, expiresIn, originalName, mimeType, sizeBytes }`. |
| `PATCH /candidate/documents/{id}` | JSON: опционально `type`, `title`, `issuedAt`, `expiresAt` | Изменить метаданные. |
| `DELETE /candidate/documents/{id}` | — | Удалить файл и метаданные; `{ success: true }`. |

`DocumentType`: `RESUME`, `CERTIFICATE`, `LICENSE`, `ID_CARD`, `DIPLOMA`, `OTHER`.

### 5.4 Работодатель — `/employer`

| Метод и путь | Доступ | Запрос | Результат / назначение |
|---|---|---|---|
| `POST /employer` | `EMPLOYER` | `inn`, `legalName`; опционально `shortName`, `description`, `website`, `email`, `phone`, `address` | Создать компанию; создатель становится `OWNER`. ИНН уникален. |
| `GET /employer/{id}` | `EMPLOYER`, `ADMIN`, `MODERATOR` | — | Данные компании; участник должен иметь членство в компании. |
| `PATCH /employer/{id}` | Те же | Поля обновления компании: `legalName?`, `shortName?`, `description?`, `website?`, `email?`, `phone?`, `address?` | Обновить; работодатель должен быть owner/admin компании. |
| `GET /employer/{id}/members` | Те же | — | Участники компании и ограниченные публичные поля пользователя. |
| `POST /employer/{id}/members` | Те же | `userId`, `role` | Добавить участника (`OWNER`, `ADMIN`, `HR`, `RECRUITER`); управление — owner/admin. |
| `PATCH /employer/{id}/members/{memberId}` | Те же | `role` | Сменить роль участника. Нельзя лишить последнего owner роли. |
| `DELETE /employer/{id}/members/{memberId}` | Те же | — | Удалить участника; последнего owner удалить нельзя; `{ success: true }`. |
| `GET /employer/{id}/verification` | `ADMIN`, `MODERATOR` | — | История/список проверки компании. |
| `POST /employer/{id}/verification` | `ADMIN`, `MODERATOR` | `status`, `method`; опционально `comment` | Создать запись проверки и обновить статус компании. |

Права работодателя проверяются на сервере по членству. Наличие кнопки в интерфейсе не заменяет серверную авторизацию.

### 5.5 Публичный поиск вакансий — `/vacancies`

| Метод и путь | Доступ | Запрос | Результат |
|---|---|---|---|
| `GET /vacancies` | Публичный | Query-фильтры ниже | `{ items: [...], meta: { page, limit, total, totalPages } }`. В выдаче только вакансии `PUBLISHED`. |
| `GET /vacancies/{id}` | Публичный | UUID вакансии | Публичная вакансия с работодателем, требованиями и сертификатами. Служебные поля модерации и статус скрыты. |

Поддерживаемые query-параметры списка:

| Параметр | Значение |
|---|---|
| `title` | Поиск по названию, подстрока без учёта регистра |
| `employmentType` | `SHIFT`, `PERMANENT`, `PROJECT`, `PART_TIME`, `TEMPORARY` |
| `locationRegion` | `BASHKORTOSTAN`, `KHMAO`, `YANAO`, `TATARSTAN`, `OTHER` |
| `locationCity` | Поиск по городу, подстрока без учёта регистра |
| `workFormat` | `ONSITE`, `HYBRID`, `REMOTE` |
| `salaryMin`, `salaryMax` | Целое число ≥ 0; используются для пересечения зарплатных диапазонов |
| `certification` | `A1`, `B1_1`, `ELECTRICAL_SAFETY`, `NAKS`, `OTHER` |
| `page`, `limit` | Пагинация; по умолчанию `1`, `20`; максимум `50` |
| `sort` | `createdAt`, `salaryMin`, `salaryMax`; по умолчанию `createdAt` |
| `direction` | `asc` / `desc`; по умолчанию `desc` |

### 5.6 Управление вакансиями работодателя

Базовый путь `/employer/{employerId}/vacancies`. Доступ: `EMPLOYER`, `ADMIN`, `MODERATOR`; компания должна быть доступна пользователю. Для обычного работодателя управлять вакансиями могут членские роли `OWNER`, `ADMIN`, `HR`, `RECRUITER`.

**Поля создания/обновления вакансии** (для `PATCH` все необязательные):

- Обязательные при создании: `title`, `description`, `employmentType`, `locationRegion`.
- Текстовые/числовые/enum поля: `salaryMin?`, `salaryMax?`, `salaryCurrency?`, `salaryGross?`, `workFormat?`, `locationCity?`, `locationAddress?`, `schedule?`, `requirements?`, `conditions?`.
- Флаги: `housingProvided?`, `travelProvided?`, `medicalInsurance?`.
- `requirementsList?`: массив `{ text, isRequired?, sortOrder? }`.
- `certifications?`: массив `{ type, name, isRequired? }`.
- `salaryMin` не может превышать `salaryMax`.

| Метод и путь | Назначение |
|---|---|
| `POST /employer/{employerId}/vacancies` | Создать вакансию, начальный статус — `DRAFT`. |
| `GET /employer/{employerId}/vacancies` | Список вакансий работодателя; фильтры/сортировка/пагинация аналогичны публичному списку, дополнительно допускается `status`. Ответ `{ items, meta }`. |
| `GET /employer/{employerId}/vacancies/{vacancyId}` | Получить вакансию в представлении управления. |
| `PATCH /employer/{employerId}/vacancies/{vacancyId}` | Обновить только в редактируемом статусе. `PUBLISHED`/`PAUSED` сначала нужно приостановить/изменить состояние в соответствии с правилами API. |
| `DELETE /employer/{employerId}/vacancies/{vacancyId}` | Это не физическое удаление: перевод в `ARCHIVED` (для опубликованной/приостановленной сначала закрывает). |
| `POST /employer/{employerId}/vacancies/{vacancyId}/submit` | Отправить на модерацию. |
| `POST /employer/{employerId}/vacancies/{vacancyId}/pause` | Приостановить опубликованную вакансию. |
| `POST /employer/{employerId}/vacancies/{vacancyId}/resume` | Возобновить приостановленную вакансию. |
| `POST /employer/{employerId}/vacancies/{vacancyId}/close` | Закрыть опубликованную/приостановленную вакансию. |
| `POST /employer/{employerId}/vacancies/{vacancyId}/archive` | Архивировать закрытую вакансию. |

Состояния вакансии: `DRAFT`, `PENDING_MODERATION`, `MODERATION`, `PUBLISHED`, `PAUSED`, `CLOSED`, `REJECTED`, `ARCHIVED`.

Поддерживаемые переходы работодателя: `DRAFT`/`REJECTED` → `PENDING_MODERATION`; `PUBLISHED` → `PAUSED`; `PAUSED` → `PUBLISHED` или `CLOSED`; `PUBLISHED` → `CLOSED`; `CLOSED` → `ARCHIVED`. После отклонения повторная отправка фиксируется в аудите.

### 5.7 Модерация вакансий

Все маршруты доступны только `ADMIN` и `MODERATOR`; базовый путь `/moderation/vacancies`.

| Метод и путь | Запрос | Назначение |
|---|---|---|
| `GET /moderation/vacancies` | Query: `status?` (`PENDING_MODERATION`/`MODERATION`), `search?`, `page?`, `limit?` (максимум 50) | Очередь вакансий, ожидающих/проходящих проверку; `{ items, meta }`, по дате создания от старых к новым. Доступ `ADMIN` и `MODERATOR`. |
| `POST /moderation/vacancies/{vacancyId}/start` | — | Начать модерацию: `PENDING_MODERATION` → `MODERATION`. |
| `POST /moderation/vacancies/{vacancyId}/approve` | — | Одобрить: `MODERATION` → `PUBLISHED`. |
| `POST /moderation/vacancies/{vacancyId}/reject` | JSON: `comment` | Отклонить: `MODERATION` → `REJECTED`; комментарий обязателен и должен быть не короче 3 символов после trim. |
| `GET /moderation/vacancies/{vacancyId}/audit` | Query: `page?`, `limit?` (максимум 50) | `{ items, meta }`; в записи есть действие, статусы до/после, комментарий, actor `{ id, role }`, дата. |

`VacancyModerationAction`: `START_MODERATION`, `APPROVE`, `REJECT`, `RESUBMIT`.

### 5.8 Отклики

**Кандидат — `/applications`**, роль `CANDIDATE`:

| Метод и путь | Запрос | Результат / назначение |
|---|---|---|
| `POST /applications` | `vacancyId` (UUID); опционально `resumeId` (UUID), `coverLetter` (≤ 2000), `candidateComment` (≤ 1000) | Создать отклик только на опубликованную вакансию. `resumeId` должен принадлежать текущему кандидату. Повторный отклик на ту же вакансию запрещён. Начальный статус `NEW`. |
| `GET /applications/my` | Query: `status?`, `vacancyId?`, `page?`, `limit?`, `sort?`, `direction?` | `{ items, pagination }`; включает краткие данные вакансии/работодателя и выбранное резюме. |
| `GET /applications/{id}` | — | Детали своего отклика с вакансией и резюме. |
| `POST /applications/{id}/withdraw` | — | Отозвать незавершённый отклик; возвращает обновлённый отклик. |
| `GET /applications/{id}/history` | — | История изменения статусов по возрастанию времени. |

Статусы отклика: `NEW`, `VIEWED`, `IN_REVIEW`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`, `WITHDRAWN`. Разрешённые переходы:

- `NEW` → `VIEWED`, `IN_REVIEW`, `WITHDRAWN`.
- `VIEWED` → `NEW`, `IN_REVIEW`, `WITHDRAWN`.
- `IN_REVIEW` → `VIEWED`, `INTERVIEW`, `REJECTED`, `WITHDRAWN`.
- `INTERVIEW` → `OFFER`, `REJECTED`, `WITHDRAWN`.
- `OFFER` → `HIRED`, `REJECTED`, `WITHDRAWN`.
- `HIRED`, `REJECTED`, `WITHDRAWN` — конечные статусы.

**Работодатель — `/employer/{employerId}/applications`**, роль `EMPLOYER`; доступ проверяется по членству компании:

| Метод и путь | Запрос | Результат / назначение |
|---|---|---|
| `GET /employer/{employerId}/applications` | Query: `vacancyId?`, `candidateId?`, `status?`, `page?`, `limit?`, `sort?`, `direction?` | `{ items, pagination }`; включает краткие данные кандидата и вакансии. |
| `GET /employer/{employerId}/applications/{applicationId}` | — | Детали отклика с вакансией и краткими данными кандидата. |
| `POST /employer/{employerId}/applications/{applicationId}/view` | — | Перевести `NEW` в `VIEWED`, записать `viewedAt` и историю. Иначе возвращает текущее состояние. |
| `POST /employer/{employerId}/applications/{applicationId}/status` | `status`; опционально `comment` (до 1000 символов) | Изменить статус только разрешённым переходом и добавить запись истории. |
| `PATCH /employer/{employerId}/applications/{applicationId}/comment` | JSON: `comment` | Установить/очистить внутренний комментарий работодателя. |
| `GET /employer/{employerId}/applications/{applicationId}/history` | — | История статусов отклика. |

Query списка кандидата: `status`, `page` (1), `limit` (20, max 50), `sort`=`createdAt|appliedAt|updatedAt` (по умолчанию `appliedAt`), `direction`=`asc|desc` (по умолчанию `desc`), `vacancyId`. Для списка работодателя `sort` дополнительно принимает `status`, также доступны фильтры `candidateId` и `vacancyId`.

### 5.9 Health checks

Все маршруты публичные:

| Метод и путь | Назначение |
|---|---|
| `GET /health` | Liveness, `{ status: "ok" }`. |
| `GET /health/live` | То же liveness-представление. |
| `GET /health/ready` | Проверяет PostgreSQL, Redis и storage. При успехе отдаёт все компоненты со статусом `ok`; иначе HTTP 503. |

### 5.10 Раздача локальных файлов

Файловые объекты хранятся под `STORAGE_LOCAL_PATH` (по умолчанию `./storage`) с ключами вида `candidates/{userId}/{resume|candidate-document}/{uuid}.{pdf|docx}`. Удаление файла выполняется вместе с удалением его метаданных.

Контроллер предоставляет публичный GET-маршрут `/api/v1/storage/*`; он возвращает бинарное содержимое (`application/octet-stream`). Эндпоинт download у резюме/документа сначала проверяет владение по JWT и затем возвращает URL на этот маршрут. Сам файловый GET публичный, поэтому frontend должен использовать выданный URL, а не строить его из пользовательского ввода.

**Важно проверить перед frontend-интеграцией:** стандартный `STORAGE_PUBLIC_BASE_URL` в текущей конфигурации равен `http://localhost:3000/storage`, тогда как глобальный префикс NestJS добавляет `/api/v1` и фактический контроллер находится по `/api/v1/storage/...`. Для локальных ссылок значение базы URL, вероятно, должно включать `/api/v1/storage`; подтвердить после запуска и согласовать конфигурацию, не зашивать URL в UI.

### 5.11 Структуры запросов и ответов

Ниже приведены типы и JSON-примеры для непосредственной интеграции frontend. `?` означает, что поле можно не отправлять; `| null` означает, что поле присутствует в ответе, но может иметь значение `null`. Все даты в JSON сериализуются в ISO 8601 строки, UUID передаются как строки. Числовые значения зарплат, размеров файлов и годов — JSON `number`, булевы флаги — JSON `boolean`. Поля запроса не из DTO будут отклонены.

#### Аутентификация

`POST /auth/register` принимает:

```json
{
  "email": "candidate@example.com",
  "password": "Password123!",
  "firstName": "Иван",
  "lastName": "Иванов",
  "middleName": "Иванович",
  "phone": "+79991234567"
}
```

`email` — валидный email; `password` — строка 8–128 символов; `firstName` и `lastName` — строки 1–100 символов; `middleName` — строка до 100 символов; `phone` — строка до 32 символов. `middleName` и `phone` можно не передавать. Регистрация не принимает `role`: backend сам создаёт пользователя с `CANDIDATE`.

Успешная регистрация возвращает запись пользователя, а не `{ user: ... }`:

```json
{
  "id": "uuid",
  "email": "candidate@example.com",
  "phone": "+79991234567",
  "firstName": "Иван",
  "lastName": "Иванов",
  "middleName": "Иванович",
  "role": "CANDIDATE",
  "status": "ACTIVE",
  "telegramId": null,
  "telegramUsername": null,
  "emailVerifiedAt": null,
  "phoneVerifiedAt": null,
  "lastLoginAt": null,
  "createdAt": "2026-10-13T10:00:00.000Z",
  "updatedAt": "2026-10-13T10:00:00.000Z"
}
```

`passwordHash` исключён. Отсутствующие необязательные значения могут быть `null`.

`POST /auth/login` принимает `{ "email": "candidate@example.com", "password": "Password123!" }`; `POST /auth/refresh` не требует JSON тела. Оба возвращают `{ "accessToken": "<JWT>" }`; refresh token находится только в `Set-Cookie`. `GET /auth/me` возвращает объект пользователя той же формы, что и регистрация, кроме того, что `lastLoginAt` уже может быть установлен.

#### Профиль кандидата и дочерние записи

Тело `POST` и `PATCH /candidate/profile` (все поля необязательные):

```json
{
  "readyForShiftWork": true,
  "about": "Опытный инженер, открыт к вахтовой работе."
}
```

`readyForShiftWork`: boolean; `about`: string до 5000 символов. У `PATCH` отсутствие поля означает «не менять».

Ответ `GET /candidate/profile` имеет базовые поля:

```ts
{
  id: string;
  userId: string;
  birthDate: string | null;
  citizenship: string | null;
  city: string | null;
  region: string | null;
  desiredPosition: string | null;
  readyForShift: boolean;
  readyForShiftWork: boolean;
  shiftSchedule: string | null;
  about: string | null;
  experienceYears: number | null;
  education: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  experiences: CandidateExperience[];
  educations: CandidateEducation[];
  certifications: CandidateCertification[];
  languages: CandidateProfileLanguage[];
  portfolioLinks: CandidateProfilePortfolioLink[];
}
```

CRUD дочерних записей возвращает модель записи; `GET` коллекции возвращает массив таких записей, `DELETE` — `{ "success": true }`.

```ts
type CandidateExperience = {
  id: string; candidateProfileId: string; companyName: string; position: string;
  startDate: string; endDate: string | null; isCurrent: boolean;
  description: string | null; createdAt: string; updatedAt: string;
};
type CandidateEducation = {
  id: string; candidateProfileId: string; institution: string; specialization: string;
  degree: string | null; startDate: string | null; endDate: string | null;
  description: string | null; createdAt: string; updatedAt: string;
};
type CandidateCertification = {
  id: string; candidateProfileId: string;
  type: "A1" | "B1_1" | "ELECTRICAL_SAFETY" | "NAKS" | "COURSE" | "OTHER";
  name: string; number: string | null; issuedAt: string | null; expiresAt: string | null;
  issuer: string | null; createdAt: string; updatedAt: string;
};
type CandidateProfileLanguage = {
  id: string; name: string; level: "A1" | "A2" | "B1" | "B2" | "C1" | "C2" | "NATIVE";
  sortOrder: number;
};
type CandidateProfilePortfolioLink = {
  id: string; title: string; description: string | null; url: string;
  technologies: string[]; sortOrder: number;
};
```

Создание опыта принимает `companyName` (≤200), `position` (≤200), `startDate` (ISO date string) и опциональные `endDate` (ISO date string), `isCurrent` (boolean), `description` (≤5000). Образование: обязательны `institution` и `specialization` (до 300 символов каждое), дополнительные `degree` (≤150), `startDate`/`endDate` (ISO date strings), `description` (≤5000). Сертификат: обязательны `type` и `name` (≤300); дополнительные `number` (≤100), `issuedAt`, `expiresAt` (ISO date strings), `issuer` (≤300).

`PATCH /candidate/profile/sections` атомарно заменяет только переданные массивы. Пустой массив очищает соответствующий раздел; чтобы оставить раздел без изменений, не передавайте его. Курсы используют `CandidateCertificationType.COURSE`.

#### Компания и участники работодателя

`POST /employer` принимает JSON:

```json
{
  "inn": "7701234567",
  "legalName": "ООО ТехноПром",
  "shortName": "ТехноПром",
  "description": "Описание компании",
  "website": "https://example.com",
  "email": "hr@example.com",
  "phone": "+79001234567",
  "address": "г. Москва, ул. Ленина, 10"
}
```

Обязательны `inn` (10 или 12 цифр) и `legalName` (1–300); остальные поля необязательны. Ограничения: `shortName` ≤300, `description` ≤5000, `phone` ≤32, `address` ≤500; website должен быть URL, email — валидный email. Ответ создания — объект Employer с `id`, переданными полями, дополнительными полями схемы (`ogrn`, `kpp`, `legalAddress`, `logoStorageKey`, `verificationStatus`, `verifiedAt`, `verifiedById`, `dadataData`, `createdAt`, `updatedAt`); отсутствующие nullable поля — `null`.

`PATCH /employer/{id}` принимает те же обновляемые поля кроме `inn`; все необязательные. `GET /employer/{id}` возвращает запись Employer. Членство при создании возвращается как запись с `id`, `employerId`, `userId`, `role`, `memberRole`, `createdAt`, `updatedAt`. Создание участника принимает `{ "userId": "uuid", "role": "OWNER|ADMIN|HR|RECRUITER" }`; обновление — `{ "role": "..." }`. `GET members` возвращает массив записей членства с вложенным ограниченным объектом `user: { id, email, firstName, lastName, role }`.

Проверка компании принимает:

```json
{
  "status": "PENDING",
  "method": "DADATA",
  "comment": "Проверка ожидает подтверждения"
}
```

`status`: `NOT_VERIFIED|PENDING|VERIFIED|REQUIRES_ATTENTION|REJECTED`; `method`: `MANUAL|DADATA|MIXED`; `comment` необязателен (≤5000). Ответ — запись проверки с идентификаторами работодателя/проверяющего, статусами, методом, комментарием и датами.

#### Вакансия

Пример тела создания вакансии (обновление принимает любое подмножество тех же полей):

```json
{
  "title": "Инженер-энергетик",
  "description": "Обслуживание электрооборудования предприятия.",
  "salaryMin": 150000,
  "salaryMax": 220000,
  "salaryCurrency": "RUB",
  "salaryGross": true,
  "employmentType": "SHIFT",
  "workFormat": "ONSITE",
  "locationRegion": "TATARSTAN",
  "locationCity": "Казань",
  "locationAddress": "Промышленная зона",
  "schedule": "вахта 30/30",
  "requirements": "Опыт от 3 лет",
  "conditions": "Проживание и питание",
  "housingProvided": true,
  "travelProvided": true,
  "medicalInsurance": false,
  "requirementsList": [
    { "text": "Опыт работы от 3 лет", "isRequired": true, "sortOrder": 1 }
  ],
  "certifications": [
    { "type": "ELECTRICAL_SAFETY", "name": "IV группа", "isRequired": true }
  ]
}
```

`title` — string ≤200; `description` — string ≤20000; зарплаты — integer ≥0; `salaryCurrency` — string ≤8; `salaryGross` — boolean; `employmentType` — `SHIFT|PERMANENT|PROJECT|PART_TIME|TEMPORARY`; `workFormat` — `ONSITE|HYBRID|REMOTE`; `locationRegion` — `BASHKORTOSTAN|KHMAO|YANAO|TATARSTAN|OTHER`; `locationCity` ≤200; `locationAddress` ≤500; `schedule` ≤300; `requirements` и `conditions` ≤10000; флаги — boolean. `requirementsList` — массив `{ text: string (≤1000), isRequired?: boolean, sortOrder?: integer ≥0 }`. `certifications` — массив `{ type: CandidateCertificationType, name?: string (≤300), isRequired?: boolean }`. При замене массива в `PATCH` передаётся новый полный массив соответствующего вида.

Представление вакансии в ответе — объект с полями модели (даты как ISO strings, nullable-поля могут быть `null`) и вложенными отношениями. Основные поля:

```ts
{
  id: string; employerId: string; createdById: string; updatedById: string | null;
  title: string; slug: string | null; description: string;
  responsibilities: string | null; requirementsText: string | null; conditions: string | null;
  salaryMin: number | null; salaryMax: number | null; currency: string;
  salaryGross: boolean | null; employmentType: EmploymentType; workFormat: WorkFormat;
  locationRegion: VacancyRegion; locationCity: string | null; locationAddress: string | null;
  schedule: string | null; housingProvided: boolean; flightProvided: boolean;
  travelProvided: boolean; medicalInsurance: boolean; status?: VacancyStatus;
  moderationComment?: string | null; publishedAt: string | null; closedAt: string | null;
  expiresAt: string | null; viewsCount: number; createdAt: string; updatedAt: string;
  employer: { id: string; legalName: string; shortName: string | null };
  requirements: Array<{ id: string; vacancyId: string; type: RequirementType;
    name: string; description: string | null; required: boolean; sortOrder: number;
    createdAt: string }>;
  certifications: Array<{ id: string; vacancyId: string; type: CandidateCertificationType;
    name: string | null; required: boolean; createdAt: string }>;
}
```

Публичный ответ дополнительно скрывает `status`, `moderationComment` и `createdBy` relation; управленческие ответы содержат служебные поля и relation `createdBy: { id, email, firstName, lastName }`. Поля `responsibilities` и `requirementsText` существуют в модели, хотя текущий DTO создания не принимает `responsibilities`, а входное поле `requirements` сохраняется в `requirementsText`.

#### Отклик и история статусов

Пример создания отклика:

```json
{
  "vacancyId": "uuid-вакансии",
  "resumeId": "uuid-резюме",
  "coverLetter": "Здравствуйте! Прошу рассмотреть мою кандидатуру.",
  "candidateComment": "Готов приступить с 1 ноября."
}
```

`vacancyId` обязателен и должен быть UUID; `resumeId` необязателен и должен принадлежать текущему кандидату; `coverLetter` ≤2000, `candidateComment` ≤1000. В ответе создания возвращается модель `Application`:

```ts
{
  id: string; vacancyId: string; candidateId: string; resumeId: string | null;
  status: ApplicationStatus; coverLetter: string | null; candidateComment: string | null;
  employerComment: string | null; appliedAt: string; viewedAt: string | null;
  createdAt: string; updatedAt: string;
}
```

`GET /applications/my` возвращает `{ items: ApplicationWithCandidateRelations[], pagination }`. Каждая запись включает `vacancy` (полную выбранную модель вакансии с relation работодателя `{ id, legalName, shortName }`) и `resume` (если есть: `{ id, title, originalName, mimeType, sizeBytes, isPrimary, createdAt, updatedAt }`). `GET /applications/{id}` включает полную вакансию и ту же безопасную выборку резюме. История — массив `{ id, applicationId, actorId, actorRole, fromStatus, toStatus, comment, createdAt, actor: { id, role, firstName, lastName } }`; nullable поля `fromStatus`/`comment` допускают `null`.

Список работодателя возвращает `{ items, pagination }`. У каждого отклика есть `candidate: { id, firstName, lastName, email, role }` и `vacancy: { id, title, employerId }`. Статусный PATCH/POST принимает `{ "status": "IN_REVIEW", "comment": "Связаться на следующей неделе" }`, `comment` необязателен (до 1000 символов). История работодателя также возвращается массивом записей истории, включая ограниченную информацию об actor.

#### Резюме и документ: multipart и ответы

Запросы загрузки — не JSON. Отправлять `FormData`:

```ts
const form = new FormData();
form.append("file", selectedFile);
form.append("title", "Основное резюме");
form.append("isPrimary", "true"); // резюме; необязательно
// Для документа вместо isPrimary:
form.append("type", "CERTIFICATE");
form.append("issuedAt", "2024-01-10"); // необязательно
form.append("expiresAt", "2029-01-10"); // необязательно
```

Для резюме обязательны `file` и `title` (непустой string ≤200); `isPrimary` опциональный boolean. Для документа обязательны `file`, `type`, `title` (непустой string ≤300); `issuedAt`/`expiresAt` опциональные ISO date strings; `issuedAt` не может быть позже `expiresAt`. Не задавать `Content-Type` вручную при использовании `FormData`: браузер должен добавить multipart boundary.

Списки и успешное создание возвращают безопасные метаданные:

```ts
type Resume = {
  id: string; title: string; originalName: string; mimeType: string; sizeBytes: number;
  isPrimary: boolean; createdAt: string; updatedAt: string;
};
type CandidateDocument = {
  id: string; type: DocumentType; title: string; originalName: string;
  mimeType: string; sizeBytes: number; issuedAt: string | null; expiresAt: string | null;
  verificationStatus: VerificationStatus; verifiedAt: string | null;
  createdAt: string; updatedAt: string;
};
```

`GET .../{id}/download` возвращает JSON, а не бинарный файл:

```json
{
  "downloadUrl": "http://localhost:3000/api/v1/storage/candidates/...",
  "expiresIn": 300,
  "originalName": "resume.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 245760
}
```

После этого файл загружается отдельным GET по `downloadUrl`. Важно: текущие `GET .../{id}` используют выборку с `storageKey`, `userId` и `candidateProfileId`; `GET` списка резюме тоже возвращает полную Prisma запись. Это отличается от безопасной формы списка документов и от download-ответа; фронтенду не следует использовать эти служебные поля.

#### Ошибки и списки

Пример бизнес-ошибки:

```json
{
  "statusCode": 409,
  "code": "APPLICATION_ALREADY_EXISTS",
  "message": "Application already exists for this vacancy",
  "timestamp": "2026-10-13T10:00:00.000Z",
  "path": "/api/v1/applications"
}
```

При страницах ответ имеет следующую структуру (числа могут отличаться):

```json
{
  "items": [],
  "meta": { "page": 1, "limit": 20, "total": 0, "totalPages": 0 }
}
```

Для откликов вместо `meta` используется ключ `pagination`. У одиночных CRUD-ответов обёртки вроде `{ "data": ... }` нет.

## 6. Сущности и модель данных

Основной источник истины — `app/api/prisma/schema.prisma`. Ниже сгруппированы сущности, относящиеся к пользовательским сценариям.

| Область | Сущности и связи |
|---|---|
| Пользователи и сессии | `User` хранит email, password hash, телефон/ФИО, роль и статус; один user владеет сессиями. `Session` хранит hash refresh token, сроки, user agent/IP и время использования. |
| Профиль кандидата | `CandidateProfile` — один к одному с `User`; содержит личные профессиональные сведения, город, занятость, описание и настройки видимости. Опыт, образование, сертификаты/курсы, языки и портфолио хранятся в дочерних коллекциях. Зарплата хранится только в `Resume`. |
| Работодатель | `Employer` содержит ИНН, юридическое/короткое наименование, контакты, описание, сайт, адрес и состояние проверки. `EmployerMember` связывает работодателя и пользователя, хранит роль. `EmployerVerification` — история проверки. |
| Вакансии | `Vacancy` принадлежит работодателю и создателю; содержит текст, зарплату, занятость/формат/локацию, условия, статус и даты публикации/закрытия. Связанные сущности: `VacancyRequirement`, `VacancyCertification`, `VacancyModerationAudit`. |
| Отклики | `Application` связывает вакансию и кандидата, может ссылаться на резюме; хранит статус, письма/комментарии и даты. `ApplicationStatusHistory` — журнал переходов и actor. |
| Прочие сущности схемы | `FavoriteVacancy`, `Notification`, `NotificationPreference`, `Subscription`, `AuditLog`. Наличие моделей в БД само по себе не означает, что соответствующие HTTP-маршруты уже реализованы. |

Важные ограничения:

- У пользователя уникальны email, а также заполненные phone и Telegram ID; у работодателя уникален ИНН.
- Для профиля кандидата — максимум один профиль на пользователя.
- Пара employer/user уникальна в членстве; пара candidate/vacancy уникальна в откликах.
- Пара user/vacancy уникальна для избранных вакансий; комбинация user/type/channel уникальна для предпочтений уведомлений.
- В миграции есть частичный уникальный индекс, запрещающий более одного primary-резюме у профиля.
- Большинство дочерних сущностей каскадно удаляются с владельцем; у некоторых исторических/связанных записей применяются `Restrict` или `SetNull`. Перед проектированием удаления учитывать реальные FK-правила в Prisma schema.

### Основные enum

- `UserRole`: `CANDIDATE`, `EMPLOYER`, `ADMIN`, `MODERATOR`.
- `UserStatus`: `ACTIVE`, `BLOCKED`, `DELETED`.
- `EmploymentType`: `SHIFT`, `PERMANENT`, `PROJECT`, `PART_TIME`, `TEMPORARY`.
- `WorkFormat`: `ONSITE`, `HYBRID`, `REMOTE`.
- `VacancyRegion`: `BASHKORTOSTAN`, `KHMAO`, `YANAO`, `TATARSTAN`, `OTHER`.
- `VacancyStatus`: `DRAFT`, `PENDING_MODERATION`, `MODERATION`, `PUBLISHED`, `PAUSED`, `CLOSED`, `REJECTED`, `ARCHIVED`.
- `ApplicationStatus`: `NEW`, `VIEWED`, `IN_REVIEW`, `INTERVIEW`, `OFFER`, `HIRED`, `REJECTED`, `WITHDRAWN`.
- `CandidateCertificationType`: `A1`, `B1_1`, `ELECTRICAL_SAFETY`, `NAKS`, `COURSE`, `OTHER`.
- `DocumentType`: `RESUME`, `CERTIFICATE`, `LICENSE`, `ID_CARD`, `DIPLOMA`, `OTHER`.
- `EmployerMemberRole`: `OWNER`, `ADMIN`, `HR`, `RECRUITER`.
- `VerificationStatus` / `EmployerVerificationStatus`: `NOT_VERIFIED`, `PENDING`, `VERIFIED`, `REQUIRES_ATTENTION`, `REJECTED`.
- `EmployerVerificationMethod`: `MANUAL`, `DADATA`, `MIXED`.
- `VacancyModerationAction`: `START_MODERATION`, `APPROVE`, `REJECT`, `RESUBMIT`.
- `RequirementType`: `EXPERIENCE`, `EDUCATION`, `CERTIFICATE`, `LICENSE`, `SAFETY`, `SKILL`, `OTHER`.
- Уведомления в схеме: `NotificationType` (`NEW_APPLICATION`, `APPLICATION_STATUS_CHANGED`, `VACANCY_PUBLISHED`, `VACANCY_REJECTED`, `EMPLOYER_VERIFIED`, `SYSTEM`), `NotificationChannel` (`EMAIL`, `TELEGRAM`, `IN_APP`), `NotificationStatus` (`PENDING`, `SENT`, `FAILED`).

## 7. Что учесть при разработке frontend

1. Реализовать слой API с базовым URL `/api/v1`, bearer access token и cookie credentials. Не помещать refresh token в `localStorage`: сервер устанавливает его как HttpOnly cookie.
2. После входа/обновления хранить access token согласно выбранной модели frontend и при старте приложения проверять `GET /auth/me`; при `401` пробовать `POST /auth/refresh` один раз, затем сбрасывать сессию.
3. Роутинг и меню строить по `user.role`, но права для работодателя также зависят от членства и его `memberRole`; серверный ответ может быть `403`.
4. `GET /candidate/profile` создаёт пустой профиль для ранее зарегистрированного кандидата; профиль и все его разделы можно сохранить одним запросом `PATCH /candidate/profile`. Endpoint `/candidate/profile/sections` остаётся доступен для частичного обновления.
5. Передавать upload именно как `multipart/form-data`, не задавая вручную boundary. Отображать ошибки `FILE_REQUIRED`, `FILE_TOO_LARGE`, `FILE_MIME_TYPE_NOT_ALLOWED`, `FILE_EXTENSION_NOT_ALLOWED`, `STORAGE_UPLOAD_FAILED`.
6. Для списков обрабатывать пагинацию и enum-фильтры, сохранять фильтры в URL страницы при необходимости. Пустой результат — это пустой `items`, а не ошибка.
7. Вакансии, отклики и модерация имеют state transitions. UI должен показывать только подходящие действия, но также отображать возвращённый backend `code/message` при гонках/устаревших состояниях.
8. Не считать модели `FavoriteVacancy`, уведомлений или подписок готовыми функциями: в текущих контроллерах API для них нет.
9. Не полагаться исключительно на сохранённый `swagger.json`: этот файл может отставать от контроллеров. Проверять актуальную runtime-спецификацию по `/docs` и DTO в исходниках.

## 8. Не реализовано как отдельный API на текущем backend

В исходниках контроллеров нет маршрутов для избранного, подписок на поиск, публичных профилей/поиска кандидатов, смены пароля, подтверждения email/телефона и восстановления пароля. Каналы EMAIL и TELEGRAM для уведомлений не реализованы; доступен только IN_APP.

## 9. Основные файлы-источники

- HTTP bootstrap, глобальный prefix, CORS, Swagger: `app/api/src/main.ts`.
- Роуты и права доступа: `app/api/src/*/*.controller.ts`.
- DTO и правила валидации: `app/api/src/*/dto/*.ts`.
- Бизнес-логика: соответствующие `*.service.ts`.
- Модель данных и enum: `app/api/prisma/schema.prisma`, миграции — `app/api/prisma/migrations/`.
- Переменные окружения: `app/api/src/config/configuration.ts`, `app/api/src/config/env.validation.ts`, шаблон — корневой `.env.example`.
- Загрузка файлов: `app/api/src/storage/`, `app/api/src/resume/`, `app/api/src/candidate-document/`.

## 10. Уведомления и переписка (этап 7A)

### Уведомления

Все маршруты доступны авторизованному пользователю и используют `sub` из access token как владельца данных. Получатель не задаётся клиентом.

| Метод и путь | Назначение |
|---|---|
| `GET /api/v1/notifications?page=1&limit=20&unreadOnly=false` | Список IN_APP уведомлений и серверная пагинация `{ items, pagination }`. |
| `GET /api/v1/notifications/unread-count` | `{ count }` непрочитанных IN_APP уведомлений. |
| `PATCH /api/v1/notifications/:id/read` | Прочитать своё уведомление; возвращает уведомление с `readAt`. |
| `PATCH /api/v1/notifications/read-all` | Прочитать все свои IN_APP уведомления; `{ updated, unreadCount }`. |
| `DELETE /api/v1/notifications/:id` | Удалить своё IN_APP уведомление; `204 No Content`. |
| `GET /api/v1/notifications/preferences` | Настройки каждого `NotificationType` для канала IN_APP. |
| `PATCH /api/v1/notifications/preferences` | `{ type, enabled }`; канал всегда IN_APP. Для EMAIL/TELEGRAM API не создаётся. |

У `Notification` добавлены `readAt` и nullable `eventKey`; для непрочитанных записей создан составной индекс. Генераторы создают записи `NotificationOutbox` в той же транзакции, что отклик, переход статуса или решение модерации. Worker обрабатывает outbox с повторными попытками и уникальными ключами события; сбой доставки не отменяет сохранённое бизнес-событие. Настройка IN_APP по умолчанию включена, явное `enabled: false` пропускает доставку.

Автоматические события:

- новый отклик — участникам работодателя вакансии;
- изменение статуса отклика, включая первый просмотр работодателем, — кандидату;
- одобрение и отклонение вакансии — участникам работодателя.

`RESUBMIT` сам по себе не создаёт уведомление: это переход работодателя, для которого в текущей бизнес-логике нет отдельного подтверждённого события-уведомления. EMAIL и TELEGRAM остаются только значениями существующего enum и не доставляются.

### Переписка

`Conversation` связан отношением один-к-одному с `Application`; произвольный API создания диалога отсутствует. Диалог создаётся при успешном отклике, а миграция создаёт диалоги для уже существовавших откликов. `Message` содержит автора, текст до 5000 символов, серверное время, `readAt` и обязательный client-generated UUID `clientMessageId` для безопасного повтора отправки. Вложения и API загрузки файлов для сообщений не реализованы.

| Метод и путь | Назначение |
|---|---|
| `GET /api/v1/messages/conversations?page=1&limit=20` | Диалоги текущего кандидата или работодателя, последнее сообщение, собеседник и unread count. |
| `GET /api/v1/messages/unread-count` | Количество непрочитанных сообщений для текущего участника. |
| `GET /api/v1/messages/conversations/:id` | Контекст отклика и собеседник. |
| `GET /api/v1/messages/conversations/:id/messages?page=1&limit=50` | История сообщений с пагинацией. |
| `POST /api/v1/messages/conversations/:id/messages` | `{ body, clientMessageId }`; повтор того же ключа и текста возвращает исходное сообщение. |
| `POST /api/v1/messages/conversations/:id/read` | Отметить входящие сообщения контекста прочитанными. |

Каждая операция проверяет актуальный статус и роль пользователя, принадлежность отклика кандидату либо членство работодателя (OWNER, ADMIN, HR, RECRUITER). Недоступный/чужой диалог возвращает `404 CONVERSATION_NOT_FOUND`, чтобы не раскрывать факт его существования. Модератор и администратор не получают доступ к сообщениям только по своей роли. Сообщения и outbox уведомлений записываются в одной транзакции.

### Реальное время

NestJS Socket.IO Gateway использует namespace `/events`. Клиент передаёт access token в `handshake.auth.token`; token проверяется по JWT, а пользователь повторно сверяется с активной записью БД. Сервер присоединяет соединение только к закрытой комнате `user:<id>`; произвольное подключение клиента к комнатам не поддерживается.

Серверные события:

- `notifications:new`;
- `notifications:unread_count`;
- `messages:new`;
- `messages:unread_count`;
- `messages:read`.

Для доставки между экземплярами API используется `@socket.io/redis-adapter` и текущие `REDIS_HOST`/`REDIS_PORT`. HTTP API остаётся источником истории; Socket.IO передаёт только оперативные обновления. Клиенту следует переподключаться с актуальным access token после его обновления.
