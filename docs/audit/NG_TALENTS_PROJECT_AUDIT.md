# Комплексный аудит проекта NG Talents

Дата аудита: 24 ноября 2026 года  
Режим работы: только анализ и подготовка рекомендаций

## 1. Executive Summary

NG Talents находится на стадии работоспособного MVP для основного рынка «кандидат — вакансия — отклик — переписка — модерация вакансий». Backend и frontend имеют значительную и в основном согласованную функциональность. Ключевые сценарии регистрации, профиля и резюме кандидата, публикации вакансий работодателем, модерации вакансий, откликов и внутренних сообщений реализованы и имеют unit/e2e-покрытие отдельных уровней.

Основной цикл найма уже частично закрыт: кандидат может найти вакансию, отправить отклик с снимком резюме, отслеживать его статус и вести переписку; работодатель может получать отклики, просматривать резюме-снимок, менять статус отклика и общаться с кандидатом. Модерация вакансий также имеет полноценную очередь с поиском, фильтрацией по статусу, пагинацией, принятием решения, отклонением и историей аудита.

Главные пробелы:

1. Кабинет администратора фактически является заглушкой: нет административных API и UI управления пользователями, ролями, компаниями, модераторами, аудитом и системной аналитикой.
2. Расширенный поиск кандидатов работодателем отсутствует. Сущности профиля и резюме существуют, но не подключены к поисковому API или каталогу.
3. Избранные вакансии и подписки присутствуют в Prisma-схеме, но не реализованы в приложении как API и UI.
4. EMAIL и TELEGRAM существуют только как типы каналов; рабочая доставка реализована только для IN_APP.
5. Тестирование frontend отсутствует. Backend unit-тесты имеют 99 успешных и 2 таймаута в тестах Argon2 при общем timeout 5 секунд.
6. В репозитории нет CI/CD-конфигурации.
7. Docker Compose содержит PostgreSQL и Redis, но не запускает backend и frontend.

Самый логичный следующий модуль — **расширенная система управления откликами и воронка найма**. Она непосредственно завершает уже реализованный цикл найма, использует существующий `ApplicationStatus`, историю статусов, модуль откликов, сообщения и уведомления, и даёт работодателю заметно более сильный инструмент управления кандидатом.

## 2. Фактическая структура проекта

### 2.1. Репозиторий

- Backend: `app/api`
- Frontend: `app/ng-talents-web`
- Docker-инфраструктура: `docker-compose.yml`
- PostgreSQL данные: `data/postgres`
- Redis данные: `data/redis`
- Backend API prefix: `/api/v1`
- Frontend: Next.js App Router

### 2.2. Backend-модули

Подключённые через `app/api/src/app.module.ts` модули:

1. `AuthModule`
2. `CandidateModule`
3. `EmployerModule`
4. `VacancyModule`
5. `ApplicationModule`
6. `ResumeModule`
7. `CandidateDocumentModule`
8. `StorageModule`
9. `NotificationsModule`
10. `MessagesModule`
11. `HealthModule`
12. `PrismaModule`
13. `RedisModule`

Backend использует глобальные `JwtAuthGuard` и `RolesGuard`, глобальный `ValidationPipe`, HTTP exception filter и interceptor логирования в `app/api/src/main.ts`.

### 2.3. Frontend-маршруты

Основные группы маршрутов:

- Публичные: `/`, `/login`, `/register`, `/vacancies`, `/vacancies/[id]`
- Кандидат: `/candidate`, `/candidate/profile`, `/candidate/resumes`, `/candidate/resumes/[id]`, `/candidate/resumes/new`, `/candidate/applications`, `/candidate/applications/[id]`, `/candidate/messages`, `/candidate/messages/[id]`
- Работодатель: `/employer`, `/employer/company`, `/employer/vacancies`, `/employer/vacancies/[id]/edit`, `/employer/vacancies/new`, `/employer/applications`, `/employer/applications/[id]`, `/employer/messages`, `/employer/messages/[id]`
- Модератор: `/moderator`, `/moderator/vacancies`, `/moderator/vacancies/[id]`
- Администратор: `/admin`
- Уведомления: `/notifications`, `/notifications/preferences`

Frontend организован по feature-модулям в `app/ng-talents-web/src/features`.

### 2.4. Инфраструктура

`docker-compose.yml` запускает PostgreSQL 17 и Redis 8:

- PostgreSQL порт 5433 на хосте
- Redis порт 6379 на хосте
- данные сохранены в локальных каталогах `data/postgres` и `data/redis`
- healthcheck присутствует для PostgreSQL и Redis

Backend и frontend не описаны как сервисы Compose. Отдельной конфигурации CI/CD в репозитории не найдено.

## 3. Инвентаризация backend

### 3.1. Авторизация

Подтверждённые файлы:

- `app/api/src/auth/auth.controller.ts`
- `app/api/src/auth/auth.service.ts`
- `app/api/src/auth/services/session.service.ts`
- `app/api/src/common/guards/jwt-auth.guard.ts`
- `app/api/src/common/guards/roles.guard.ts`

Реализованы регистрация, вход, refresh-ротация, logout, logout-all и `/auth/me`. Refresh-токен хранится в HttpOnly cookie с `secure` в production и `sameSite=lax`. Refresh-токены в БД хранятся только как SHA-256 хеши. При повторном использовании токена сессия аннулируется.

### 3.2. Профиль кандидата

Подтверждено в `candidate.controller.ts`, `candidate.service.ts` и соответствующих unit-тестах.

Реализованы:

- создание и получение профиля;
- редактирование профильных полей;
- опыт работы;
- образование;
- сертификаты;
- языки;
- ссылка на портфолио;
- обновление нескольких секций профиля одной транзакцией;
- проверка дат и дубликатов языков.

### 3.3. Резюме

Подтверждено в `resume.controller.ts`, `resume.service.ts`, DTO и unit-тестах.

Реализованы структурированные резюме, копирование, primary-резюме, статусы `DRAFT/PUBLISHED/ARCHIVED`, публикация/снятие с публикации, архивирование, загрузка данных профиля в снимок резюме, проверка полноты и защита прав владельца.

Архитектурное соглашение соблюдается: поля профиля не редактируются через резюме, желаемая зарплата относится к резюме и нормализуется в RUB.

### 3.4. Компании работодателя

Подтверждено в `employer.controller.ts` и `employer.service.ts`.

Реализованы:

- создание компании;
- получение и редактирование компании;
- члены компании;
- роли владельца, администратора, HR и рекрутера;
- защита последнего владельца;
- статусы верификации и ручное принятие решения модератором/администратором.

### 3.5. Вакансии

Подтверждено в `vacancy.controller.ts` и `vacancy.service.ts`.

Реализованы создание, редактирование, удаление/архивация, жизненный цикл вакансии, публичный каталог, детали публикации, требования и сертификаты. Публичный каталог ограничен статусом `PUBLISHED` и поддерживает поиск по title, региону, городу, типу занятости, формату работы, зарплате и сертификату.

Пагинация, сортировка и фильтрация выполняются сервером.

### 3.6. Модерация

Подтверждено в `moderation.controller.ts` и методах `VacancyService`.

Полноценная очередь теперь реализована:

- `GET /api/v1/moderation/vacancies`;
- фильтр `PENDING_MODERATION/MODERATION`;
- поиск по title и названию компании;
- пагинация;
- запуск модерации;
- одобрение;
- отклонение с обязательным комментарием;
- history/audit модерации;
- повторная отправка отклонённой вакансии со статусом резюме.

История модерации сохраняется в одной транзакции со статусом вакансии.

### 3.7. Отклики

Подтверждено в `application.controller.ts`, `employer-application.controller.ts` и `application.service.ts`.

Реализованы:

- подача отклика кандидатом;
- автосоздание разговора;
- снимок резюме;
- уникальность отклика `(vacancyId, candidateId)`;
- история статусов;
- просмотр откликов кандидатом;
- просмотр откликов работодателем;
- просмотр резюме-снимка;
- статусы и допустимые переходы;
- withdraw кандидата;
- комментарий работодателя;
- уведомления об изменении статуса.

### 3.8. Уведомления

Подтверждено в `notifications.module.ts`, `notifications.controller.ts`, `notifications.service.ts`.

Реализованы IN_APP-уведомления, unread-count, отметка read/read-all, удаление и preferences. Есть Notification Outbox с обработкой интервалом 1 секунда, идемпотентными ключами и retry-счётчиком.

Рабочая доставка настроена только для IN_APP. EMAIL и TELEGRAM пока не доставляются.

### 3.9. Сообщения

Подтверждено в `messages.controller.ts`, `messages.service.ts`, realtime gateway и unit/e2e-тестах.

Реализованы список диалогов, история сообщений, отправка с `clientMessageId`, read receipts, unread-count и доступ только участникам отклика/команды работодателя. Повторная отправка с тем же `clientMessageId` идемпотентна.

### 3.10. Файлы и документы

`CandidateDocumentModule` и `StorageModule` реализованы для локального/S3 хранения. Frontend маршрутов для управления документами нет.

### 3.11. Realtime

`/events` namespace использует JWT-аутентификацию, проверку active-user и private room `user:<id>`. Redis adapter создаётся при инициализации gateway.

## 4. Инвентаризация frontend

### 4.1. State и API

- TanStack Query используется в feature-hooks;
- Zustand используется для auth store;
- axios API client — `app/ng-talents-web/src/lib/api/client.ts`;
- access token хранится в памяти zustand/store;
- refresh выполняется через HttpOnly cookie;
- Socket.IO provider обрабатывает realtime-события.

### 4.2. Реализованные feature-модули

Полные или почти полные интеграции:

- `auth`
- `candidate`
- `resume`
- `employer`
- `vacancies`
- `applications`
- `moderation`
- `messages`
- `notifications`

Сильные стороны:

- loading/error/empty states;
- pagination;
- форматы ошибок API;
- ролевой AuthGuard;
- TanStack Query query keys;
- дебаунс поиска и фильтров каталога;
- отражение фильтров в URL.

### 4.3. UI_ONLY и неполные области

- `/admin` — заглушка с кнопкой перехода в модерацию.
- Candidate documents не имеют отдельных frontend routes.
- Favorites не имеют frontend/API реализации.
- Subscriptions не имеют frontend/API реализации.
- Public company page отсутствует.
- Vacancy analytics отсутствует.
- Interview/scheduling UI отсутствует.

## 5. Матрица функциональной готовности

| Модуль | Backend API | Frontend UI | Интеграция | Бизнес-логика | Валидация | Права доступа | Ошибки | Тесты | Итог |
|---|---|---|---|---|---|---|---|---|---|
| Авторизация и сессии | DONE | DONE | DONE | DONE | DONE | DONE | DONE | PARTIAL | NEEDS_REVIEW |
| Профиль кандидата | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit | DONE |
| Структурированные резюме | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit | DONE |
| Документы кандидата | DONE | UI_ONLY | PARTIAL | DONE | DONE | DONE | DONE | unit | PARTIAL |
| Публичный каталог вакансий | DONE | DONE | DONE | DONE | DONE | Public | DONE | unit | DONE |
| Управление компанией | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit | DONE |
| Управление вакансиями | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit | DONE |
| Очередь модерации | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit | DONE |
| Отклики кандидата | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit | DONE |
| Управление откликами работодателем | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit | DONE |
| Воронка найма как Kanban/этапы собеседований | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | DONE | DONE | PARTIAL | PARTIAL |
| Уведомления IN_APP | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit/e2e | DONE |
| EMAIL/TELEGRAM уведомления | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | PARTIAL модели | N/A | N/A | N/A | нет | NOT_IMPLEMENTED |
| Переписка | DONE | DONE | DONE | DONE | DONE | DONE | DONE | unit/e2e | DONE |
| WebSocket realtime | DONE | DONE | DONE | DONE | DONE | DONE | PARTIAL | unit | DONE |
| Избранные вакансии | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | модель Prisma | N/A | N/A | N/A | N/A | нет | API_ONLY/неразвернуто |
| Подписки | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | модель Prisma | N/A | N/A | N/A | нет | API_ONLY/неразвернуто |
| Поиск кандидатов работодателем | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | PARTIAL сущности резюме | N/A | не проверено | N/A | нет | NOT_IMPLEMENTED |
| Админка | NOT_IMPLEMENTED | заглушка | NOT_IMPLEMENTED | NOT_IMPLEMENTED | N/A | role guard есть | N/A | нет | UI_ONLY |
| Публичные компании | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | сущность есть | N/A | N/A | N/A | нет | NOT_IMPLEMENTED |
| Аналитика вакансий | NOT_IMPLEMENTED | NOT_IMPLEMENTED | NOT_IMPLEMENTED | частичные counters | N/A | N/A | N/A | нет | NOT_IMPLEMENTED |
| Аудит платформы | модель AuditLog есть | NOT_IMPLEMENTED | NOT_IMPLEMENTED | частично moderation audit | N/A | N/A | N/A | нет | NOT_IMPLEMENTED |

Статусы `NEEDS_REVIEW` используются только там, где нельзя подтвердить реальное окружение, например реальный login/refresh с работающей БД или 5-секундный Argon2 timeout.

## 6. Проверка пользовательских сценариев

### 6.1. Кандидат

Подтверждено или доступно:

1. Регистрация и вход.
2. Ролевая навигация.
3. Заполнение профиля.
4. Создание резюме и его разделов.
5. Публикация, снятие с публикации, архивирование и копирование.
6. Поиск вакансий с фильтрами и пагинацией.
7. Просмотр детали вакансии.
8. Подача отклика.
9. Просмотр своих откликов и истории статусов.
10. Отзыв отклика.
11. Получение IN_APP-уведомлений.
12. Переписка с работодателем.
13. Настройки IN_APP preference.
14. Управление данными резюме и privacy-профиля.

Недостающие возможности:

- избранные вакансии;
- подписки и сохранённые поиски;
- email/Telegram-уведомления;
- более содержательная история карьерных этапов после отклика;
- расширенная сортировка и персональные рекомендации;
- frontend для документов кандидата.

### 6.2. Работодатель

Подтверждено:

1. Регистрация.
2. Создание и редактирование компании.
3. Создание вакансий.
4. Отправка вакансии на модерацию.
5. Получение решения модератора.
6. Повторная отправка отклонённой вакансии.
7. Управление жизненным циклом вакансии.
8. Получение откликов.
9. Просмотр публичных данных кандидата и снимка резюме.
10. Изменение статусов отклика.
11. Комментарий и история отклика.
12. Переписка.
13. IN_APP-уведомления.

Недостающие возможности:

- Kanban-доска откликов;
- назначение собеседований и ответственных;
- групповые действия над откликами;
- поиск кандидатов вне откликов;
- планирование найма и этапов;
- аналитика конверсии откликов;
- полноценная команда с ролевыми ограничениями в UI для всех ролей.

### 6.3. Модератор

Подтверждено:

1. Список очереди.
2. Фильтр статусов.
3. Поиск по vacancy/company.
4. Просмотр вакансии и компании.
5. Запуск проверки.
6. Одобрение.
7. Отклонение с comment.
8. История решений.
9. Повторная отправка вакансию после отклонения.

Нужны дальнейшие улучшения:

- модерационная статистика и метрики SLA;
- распределение ответственности за вакансии;
- блокировка повторного одобрения и конкурентных решений;
- расширенные фильтры;
- админский аудит модерации.

### 6.4. Администратор

Фактически реализовано:

- роль `ADMIN`;
- защита ролевых routes;
- доступ к модерации;
- доступ к управлению employer verification;
- ограниченное управление компаниями через employer/vacancy сервисы.

Фактически отсутствует:

- управление пользователями;
- блокировка/удаление аккаунтов;
- управление ролями;
- управление модераторами;
- управление компаниями как отдельный административный workflow;
- платформа-wide audit;
- системная статистика;
- справочники;
- системные настройки;
- административный frontend.

`app/ng-talents-web/src/app/admin/page.tsx` подтверждает, что это UI-заглушка.

## 7. Архитектурный и технический аудит

### 7.1. Позитивные стороны

- Модули NestJS разделены по доменам.
- Используются Prisma транзакции для критичных операций: vacancy lifecycle, resume primary, application creation, moderation audit, outbox.
- DTO и global validation используются широко.
- Права проверяются как на уровне guards, так и в сервисах через принадлежность employer member.
- Модели снабжены индексами для частых foreign keys и статусов.
- Outbox реализует идемпотентность и повторную обработку.
- Snapshot резюме сохраняется при подаче отклика.
- Сообщения используют `clientMessageId` для идемпотентности.
- Frontend использует повторно используемые hooks, feature API-клиенты и loading/error/empty states.

### 7.2. Технический долг и риски

#### Критичность: Высокая

- Отсутствие реальных миграционных сценариев на тестовой БД в автоматическом наборе проверок.
- Нет frontend unit/e2e-тестов для auth, forms, route guards и realtime.
- Нет интеграционного тестирования frontend/backend в реальном окружении.

#### Критичность: Средняя

- В unit-тестах Argon2 два теста имеют timeout 5 секунд и завершились таймаутом на машине аудита.
- Нет CI/CD, поэтому build/test могут не выполняться стабильно до релиза.
- Docker Compose не включает backend/frontend.
- Realtime Redis adapter при сбое Redis завершает инициализацию gateway с ошибкой; это осознанная fail-fast интеграция, но требует явно проверяемой инфраструктуры Redis.
- Нет фонового планировщика, кроме `setInterval`, поэтому worker Outbox привязан к одному process instance и теряет независимое масштабирование/monitoring.
- Сущности `FavoriteVacancy`, `Subscription`, `AuditLog` могут создавать впечатление готового модуля, но API отсутствует.
- В employer application routes role ограничен одним `EMPLOYER`; сервисная логика поддерживает дополнительные привилегированные роли, но HTTP API не согласован полностью.

#### Критичность: Низкая

- В разных местах используются повторные проверки пользователя/члена компании, но без глобальной вынесенной policy helper.
- В frontend есть много локальной нормализации статусов и меток, потенциально требующей общего source of truth.
- Не найдены явные e2e-тесты frontend, миграции и realtime-клиента.

### 7.3. Производительность и база данных

Схема содержит индексы по foreign keys, статусам, датам и composite-индексам откликов/сообщений/уведомлений. Пагинация и count выполняются параллельно через `prisma.$transaction`.

Негативные риски:

- большие JSON-снимки резюме не имеют отдельного storage lifecycle policy;
- нет Redis caching для публичного каталога;
- нет rate limiting на большинство endpoint кроме auth register/login/refresh;
- нет фоновых cleanup-политик для сессий, outbox и audit.

### 7.4. Проблемы согласованности

- `VacancyModerationAudit` хранит действия модерации и используется полноценно.
- Общий `AuditLog` для платформы не используется функциональными API.
- Статусы отклика реализованы как enum и status history.
- Для расширенной воронки потребуются дополнительные сущности этапа/собеседования, но нельзя заменить уже существующий `ApplicationStatus`.

## 8. Аудит безопасности

### 8.1. Подтвержденные меры защиты

- Глобальные JWT и role guards.
- Проверка active status для пользователей в auth и realtime.
- Refresh-ротация с обнаружением reuse.
- IDOR-защита в resume, applications, messages и employer resources.
- Проверка employer membership в vacancy/application сервисах.
- Запрет moderator access для сообщения.
- Проверка privacy профиля при выдаче candidate/application employer resume.
- Широкая whitelist-валидация входных DTO с `forbidNonWhitelisted`.
- CORS ограничен configured origin с credentials.
- Helmet включён.
- WebSocket авторизуется access token и проверяет user/role/status.

### 8.2. Найденные риски

| Уровень | Файл | Описание | Последствия | Рекомендация |
|---|---|---|---|---|
| Средний | `app/api/src/auth/auth.controller.ts` | Refresh cookie имеет `sameSite=lax`; production secure зависит от точной env конфигурации. | При ошибочной production настройке cookie может быть передан незащищённо. | Проверять production env, добавить CSRF policy при cross-site сценариях. |
| Средний | `app/api/src/application/employer-application.controller.ts` | Employer routes требуют только role `EMPLOYER`, хотя сервис допускает ADMIN/MODERATOR. | Несогласованность HTTP и service RBAC, возможная путаница при расширении админки. | Унифицировать endpoint policy и явно описать привилегированные роли. |
| Средний | `app/api/src/vacancy/vacancy.controller.ts` | MANAGEMENT endpoints разрешают role MODERATOR для employer path, а service bypass может создавать управленческий доступ. | Повышенная поверхность привилегированного доступа. | Проверить, нужен ли moderator bypass; разнести moderation и employer management endpoints. |
| Средний | `app/api/src/realtime/realtime.gateway.ts` | WebSocket принимает только handshake auth token и не проверяет исходящий payload от пользователя. | Клиентские события могут быть ограничены только event emission на сервере, но входящие handlers отсутствуют. | Сохранять server-side authorization для всех будущих incoming client events. |
| Средний | `app/api/src/common/guards/rate-limit.guard.ts` | Guard ограничивает только Redis/in-memory несколько endpoint auth. | Возможен brute-force и abuse public API. | Расширить точечно для public search/register/application endpoints. |
| Низкий | `app/api/src/notifications/notifications.service.ts` | Outbox worker логирует ошибки и повторяет запись только через field attempts/availableAt; нет отдельной retry policy. | Устойчивость outbox зависит от process uptime. | Выделить worker и увеличить observability. |

No confirmed High/Critical IDOR issue was found in audited owned-resource paths.

## 9. Результаты тестов и сборки

### 9.1. Backend lint

Команда: `npm run lint`

Результат: успешно.

### 9.2. Backend build

Команда: `npm run build`

Результат: успешно. Prisma Client был сгенерирован, NestJS build завершён.

### 9.3. Backend unit tests

Команда: `npm test -- --reporter=verbose`

Результат: 99 успешных из 101.

Два теста в `app/api/src/auth/services/password.service.spec.ts` завершились timeout:

- `hashes and verifies a password with Argon2id`
- `rejects a wrong password`

Причина: тестовый timeout 5000ms, операции Argon2 не успели завершиться в среде аудита.

### 9.4. Backend e2e

Команда: `npm run test:e2e`

Результат: 5 из 5 успешно в `messages.controller.e2e-spec.ts`. Это HTTP integration-тест с моками сервисов, а не тест реальной базы данных.

### 9.5. Prisma

Команда: `npx prisma validate`

Результат: схема валидна.

### 9.6. Frontend lint

Команда: `npm run lint`

Результат: успешно.

### 9.7. Frontend TypeScript

Команда: `npx tsc --noEmit`

Результат: успешно.

### 9.8. Frontend production build

Команда: `npm run build`

Результат: успешно. Next.js собрал все маршруты.

### 9.9. Покрытие тестами

Подтверждено:

- unit-тесты сервисов auth, candidate, resume, employer, vacancy, application, messages, notifications, realtime, storage;
- HTTP e2e/integration для messages/notifications;
- unit-тесты конфигурации и storage.

Не найдено:

- frontend тестов;
- real-database integration/e2e;
- migration tests;
- websocket client integration test;
- e2e для vacancy/application/resume flows;
- privacy/IDOR HTTP suite вне unit-тестов.

## 10. Список незавершённых возможностей

1. Административное управление платформой.
2. Поиск кандидатов работодателем.
3. Расширенная воронка найма.
4. Назначение собеседований и этапов найма.
5. Избранные вакансии.
6. Подписки и сохранённый поиск.
7. Email/Telegram channels.
8. Публичные страницы компаний.
9. Аналитика вакансий и работодателей.
10. Рейтинги и отзывы.
11. Рекомендации вакансий и кандидатов.
12. Candidate documents в frontend.
13. Platform audit/dashboard.
14. Управление справочниками.

## 11. Список технического долга

- 2 timeout-теста Argon2.
- отсутствует CI/CD;
- нет frontend test suite;
- нет real-DB integration suite;
- нет backend/frontend сервисов в Docker Compose;
- Outbox worker привязан к in-process interval;
- Redis adapter не имеет отдельного restart/health policy;
- общий `AuditLog` не используется;
- favorites/subscriptions созданы в schema, но не развернуты как feature;
- `/admin` — placeholder;
- часть role rules не полностью согласована между HTTP controller и service;
- нет явного frontend error boundary и централизованных websocket retry policy для всех сценариев.

## 12. Сравнение потенциальных следующих модулей

### 12.1. Расширенная система откликов и воронка найма

Текущая готовность: частичная, backend statuses и history готовы.

Сущности: `Application`, `ApplicationStatusHistory`, `Conversation`, `NotificationOutbox`.

Что добавить: Kanban или pipeline view, явные этапы работодателя, собеседования, ответственные, комментарии и групповые действия.

Затронутые модули: application, messages, notifications, frontend employer/candidate.

Зависимости: модуль откликов и роли компании уже готовы.

Бизнес-ценность: высокая.

Сложность: средняя.

Риски: расширение статусов/переходов должно сохранить совместимость и audit history.

### 12.2. Полноценная система модерации

Текущая готовность: высокая. Очередь уже реализована.

Осталось: статистика, SLA, распределение задач, anti-race, расширенный аудит.

Бизнес-ценность: средняя-высокая.

Сложность: низкая-средняя.

Риски: повторное решение и модерация в нескольких process instances требуют атомарных правил.

### 12.3. Расширенный поиск кандидатов

Текущая готовность: низкая на API/UI, высокая на данных профиля и резюме.

Необходимо: consent/privacy policy, search API, filters, ranking и employer UI.

Бизнес-ценность: высокая.

Сложность: высокая.

Риски: утечка приватных данных, performance и качество ранжирования.

### 12.4. Админка и аналитика

Текущая готовность: низкая.

Необходимо: user/role management, moderation controls, platform metrics, audit.

Бизнес-ценность: средняя.

Сложность: средняя-высокая.

Риски: широкие привилегии и irreversibility административных действий.

### 12.5. Email/Telegram

Текущая готовность: низкая.

Необходимо: providers, templates, secrets, retries и доставка.

Бизнес-ценность: средняя.

Сложность: средняя.

Риски: внешние сервисы, consent, доставляемость.

## 13. Выбор следующего модуля

Основная рекомендация: **расширенная система управления откликами и воронка найма**.

Оценка вариантов (1–10):

| Направление | Бизнес-ценность 25% | Пользовательская необходимость 20% | Готовность архитектуры 20% | Зависимости 15% | Простота 10% | Снижение рисков 10% | Weighted result |
|---|---:|---:|---:|---:|---:|---:|---:|
| Воронка найма | 9 | 9 | 9 | 9 | 6 | 8 | 8.55 |
| Полноценная модерация | 8 | 8 | 9 | 9 | 8 | 8 | 8.30 |
| Поиск кандидатов | 9 | 8 | 7 | 7 | 5 | 7 | 7.40 |
| Админка/аналитика | 7 | 6 | 5 | 6 | 6 | 7 | 6.15 |
| Email/Telegram | 7 | 7 | 6 | 5 | 6 | 6 | 6.35 |
| Избранное/подписки | 6 | 7 | 8 | 8 | 9 | 7 | 7.25 |

Результаты ранжирования основаны на фактически существующей базе:

- модуль откликов уже реализует основной status lifecycle;
- employer/candidate UI уже существует;
- conversation и notification механизмы готовы;
- status history уже является audit trail;
- дополнения можно сделать, не создавая повторяющийся workflow;
- модерация уже устранена как известное ограничение предыдущего этапа;
- поиск кандидатов имеет высокий потенциал, но требует новой privacy/search architecture.

Альтернативы:

1. **Полноценная модерация со статистикой и SLA** — приоритетна, если публикация вакансий является основным текущим bottleneck или требуется операционная среда модераторов.
2. **Поиск кандидатов работодателем** — приоритетен после стабилизации воронки и明确ной политики privacy, если ключевой бизнес-сценарий — proactive sourcing.

Избранное и подписки становятся приоритетными для роста engagement, но не закрывают основную проблему уже начатого найма.

## 14. Подробный план расширенной воронки найма

### 14.1. Цель

Дать работодателю управлять откликами как последовательностью этапов найма, а кандидату — получать прозрачные и актуальные обновления. Модуль должен использовать существующие статусы отклика и историю, не создавая параллельную систему статусов.

### 14.2. Функциональные требования

Кандидат:

- видеть текущий этап отклика;
- видеть timeline статусов;
- получать уведомления о назначенном собеседовании;
- подтверждать/отменять доступное действие собеседования, только если это принято в scope.

Работодатель:

- видеть pipeline или Kanban с колонками по `ApplicationStatus`;
- фильтровать отклики по вакансии и статусу;
- назначать ответственного рекрутера;
- создавать собеседование с датой/форматом;
- переводить отклик по допустимым переходам;
- добавлять внутренний комментарий;
- выполнять просмотр резюме без изменения immutable snapshot;
- получать агрегаты по количеству откликов и этапам.

Модератор/администратор:

- не участвуют в штатном отклике без отдельного привилегированного сценария;
- могут просматривать только audit-данные при необходимости отдельного админского модуля.

### 14.3. Backend

Изменяемые модели:

- переиспользовать `ApplicationStatus`;
- переиспользовать `ApplicationStatusHistory`;
- переиспользовать `Application.employerComment`;
- переиспользовать `NotificationOutbox`;
- переиспользовать `AuditLog` только для platform actions, не для истории отклика.

Возможная новая модель только если после product discovery подтвердится необходимость:

- `Interview`
  - applicationId
  - organizerId
  - scheduledAt
  - durationMinutes
  - format
  - locationOrLink
  - status
  - comment

Не вводить отдельный stage enum, пока он дублирует `ApplicationStatus`.

Изменения:

- добавить backend endpoint для агрегированных pipeline count;
- добавить paginated/filterable list в employer application API;
- добавить endpoint назначения ответственного, если принято product requirement;
- добавить interview endpoints только после design согласования;
- добавить deadline/конфликтные правила для interview scheduling;
- сохранять все переводы статусов в `ApplicationStatusHistory`;
- сохранинуть одну транзакцию для status, history и notification;
- проверить каждое действие через employer membership.

Ожидаемые endpoints:

- `GET /employer/:employerId/applications/pipeline`
- `GET /employer/:employerId/applications/summary`
- existing status endpoint remains canonical for stage transitions
- optional `POST/PATCH /employer/:employerId/applications/:id/interviews`

Точное имя модели и API определяется на этапе implementation planning, но после отдельного согласования.

### 14.4. Frontend

Новые или изменяемые routes:

- employer applications list becomes pipeline view;
- сохранить detail route `/employer/applications/[id]`;
- добавить tabs/list/board без дублирования API.

Компоненты:

- pipeline columns;
- application cards;
- status transition dialog;
- history timeline;
- interview form/calendar summary;
- responsible recruiter selector;
- bulk actions только после решения о scope.

Hooks/API:

- reuse existing `applications/hooks.ts`;
- add pipeline summary query;
- invalidate application list/detail/history/status queries after mutations;
- preserve optimistic update only after server confirmation or rollback;
- maintain loading/error/empty states.

### 14.5. Тестирование

Backend unit:

- допустимые transitions;
- запрет недопустимых transitions;
- role and employer ownership;
- interview timezone/interval validation;
- immutable resume snapshot;
- notification idempotency;
- concurrent status updates;
- final status rules.

Backend integration:

- pipeline query isolation by employer;
- status + history + notification transaction;
- interview + status consistency;
- real Redis outbox behavior.

HTTP/e2e:

- candidate can only see own applications;
- employer can only manage own member employer;
- moderator/admin are denied unless explicit business rule exists;
- invalid transition returns 400;
- privacy hiding returns 404.

Frontend:

- candidate/employer role guards;
- board rendering;
- drag and status update;
- race and error rollback;
- pagination/filters;
- loading/empty/error states.

### 14.6. Этапы реализации

1. **Зафиксировать product rules**
   - Цель: определить stages, interview scope и responsible recruiter.
   - Затрагивает: application types, UX docs.
   - Критерий: согласованная transition matrix.

2. **Расширить backend pipeline API**
   - Цель: вернуть summary/pipeline с pagination.
   - Затрагивает: `application.service.ts`, DTO/controller.
   - Критерий: isolated data and stable pagination.

3. **Добавить interview model только при подтверждённом scope**
   - Цель: model interview scheduling.
   - Затрагивает: Prisma schema/migration/service/controller.
   - Критерий: migration and validation pass.

4. **Обновить frontend employer board**
   - Цель: показать application pipeline.
   - Затрагивает: applications feature.
   - Критерий: stable query cache and mutations.

5. **Расширить candidate and notification UX**
   - Цель: show current stage/timeline.
   - Затрагивает: candidate detail/list and notification links.
   - Критерий: notifications route to correct application.

6. **Security and concurrency pass**
   - Цель: verify ownership and atomic transitions.
   - Затрагивает: application services/tests.
   - Критерий: IDOR tests pass.

7. **Build, lint, tests and real-DB smoke test**
   - Цель: validate complete module.
   - Критерий: existing checks pass and live scenario confirmed.

### 14.7. Definition of Done

- Работодатель видит pipeline своих вакансий.
- Кандидат видит актуальный status/timeline.
- Все переходы используют допустимую transition matrix.
- History, notification и status сохраняются атомарно.
- Employer IDOR и resume privacy covered tests.
- Candidate cannot change application status.
- Moderator/admin have explicit and tested behavior.
- Loading/error/empty states exist.
- Frontend and backend lint/build/tests pass.
- Real PostgreSQL migration and smoke scenario pass.
- Не добавлены повторяющиеся stage/status entities.

## 15. Риски и зависимости

Перед реализацией необходимо:

1. Исправить или поднять timeout двух Argon2 unit-тестов до стабильного уровня.
2. Решить, включать ли interviews на первом этапе модуля.
3. Решить, нужна ли назначения ответственного рекрутера.
4. Согласовать финальные transition rules для статусов.
5. Настроить реальную PostgreSQL test environment.
6. Добавить frontend test tooling и хотя бы smoke e2e.
7. Уточнить модульную RBAC модель для ADMIN/MODERATOR/EMPLOYER.

Основные риски:

- бизнес-согласованность статусов;
- race conditions при одновременном обновлении одного отклика;
- утечка резюме при расширении employer UI;
- деградация UI при high application count;
- расширение scope на interviews до stabilization core pipeline.

## 16. Задачи перед началом реализации

1. Зафиксировать KPI модуля и список обязательных сценариев.
2. Подтвердить используемую таблицу статусов.
3. Решить scope: board only или board + interviews.
4. Уточнить ролевая матрица employer team.
5. Подготовить реальную тестовую БД.
6. Исправить flaky unit timeout.
7. Получить отдельное согласование перед реализацией.

## Итоговое резюме

- **На каком этапе находится NG Talents:** работающий MVP с завершённым кандидатом, резюме, вакансиями, откликами, модерацией, messaging и notifications.
- **Ключевые возможности:** профиль и резюме кандидата, публичный каталог, employer company/vacancy management, moderation queue, application lifecycle, immutable resume snapshot, IN_APP notifications и realtime messages.
- **Критические пробелы:** отсутствие реальной админки, отсутствующий поиск кандидатов, UI_ONLY документы/placeholder admin, отсутствующие email/Telegram delivery и insufficient frontend/real-DB test automation.
- **Рекомендуемый следующий модуль:** расширенная система управления откликами и воронка найма.
- **Почему именно он:** закрывает центральный незавершённый marketplace workflow, использует уже готовые ApplicationStatus, history, privacy, notifications и messaging и имеет высокую practical value для работодателя.
- **Перед реализацией:** согласовать pipeline/interviews/role rules, стабилизировать Argon2 tests, подготовить real-DB integration environment и начать без broad module duplication.
