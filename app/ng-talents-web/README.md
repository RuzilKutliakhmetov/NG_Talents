# NG Talents Web

Frontend NG Talents на Next.js App Router, TypeScript и Tailwind CSS.

## Локальная разработка

Перед запуском задайте переменную `NEXT_PUBLIC_API_URL` в `.env.local` в
каталоге `app/ng-talents-web`:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
```

Это публичный адрес API, а не секрет. Не добавляйте во frontend секреты или
refresh token: refresh token хранится backend только в HttpOnly cookie.

Команды из `app/ng-talents-web`:

```bash
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

Откройте [http://localhost:3001](http://localhost:3001).

## Публичный каталог вакансий

- `/vacancies` — публичный каталог с поиском, фильтрами и пагинацией через API.
- `/vacancies/{id}` — публичная страница вакансии; `{id}` — UUID из API.

Каталог использует `GET /vacancies` и `GET /vacancies/{id}`. Фильтры и
пагинация синхронизируются с query-параметрами адресной строки; отдельная
авторизация для просмотра вакансий не требуется.

## Кабинет работодателя

Кабинет использует существующие `POST /employer`, `GET /employer/{id}` и
`PATCH /employer/{id}`, а также `GET/POST/PATCH/DELETE
/employer/{employerId}/vacancies` и действия `/submit`, `/pause`, `/resume`,
`/close`, `/archive`. Он доступен только для роли `EMPLOYER`; backend остаётся
источником проверки членства и прав.

Backend пока не предоставляет endpoint поиска компаний текущего пользователя,
а `GET /auth/me` не включает членства. Поэтому после создания ID компании
сохраняется локально в браузере, отдельно для текущего user ID. Для ранее
созданной компании можно ввести её UUID вручную; сервер проверит права. Не
передавайте ID компании из недоверенных источников.

Загрузка логотипа в API не реализована. DTO создания/обновления вакансии также
не принимает `responsibilities` или `expiresAt`, а оплату перелёта и проезда
представляет единым `travelProvided`; форма использует только доступные поля.
Список требований в backend DTO содержит только текст и признак обязательности;
при сохранении тип существующих требований преобразуется backend в `OTHER`.
Созданная вакансия сначала имеет статус `DRAFT`, отправка на модерацию —
отдельное действие. Backend запрещает редактировать вакансии в статусах
`PUBLISHED` и `PAUSED`.

## Модерация вакансий

Раздел `/moderator` доступен ролям `MODERATOR` и `ADMIN`. Очередь получает
вакансии через защищённый `GET /moderation/vacancies` с серверными фильтрами
`status` (`PENDING_MODERATION`/`MODERATION`), `search`, `page` и `limit`.
Для управленческих сведений вакансии использует
`GET /employer/{employerId}/vacancies/{vacancyId}`,
`POST /moderation/vacancies/{vacancyId}/start`,
`POST /moderation/vacancies/{vacancyId}/approve`,
`POST /moderation/vacancies/{vacancyId}/reject` и
`GET /moderation/vacancies/{vacancyId}/audit`. Все действия статуса и права
проверяются backend; отклонение требует комментарий не короче 3 символов и
длиной не более 2000 символов. После решений обновляются кеши кабинета
работодателя, публичного каталога и аудита.

Очередь включает ожидающие начала проверки и уже взятые в работу вакансии.
Backend не предоставляет агрегаты для главной сводки и отдельный GET деталей
модерации по одному vacancy ID; детальная страница использует существующий
управленческий GET с employer ID, полученным из записи очереди.

Публичный API каталога возвращает только вакансии со статусом `PUBLISHED`;
публичный GET вакансии также ограничивает результат этим статусом. Одобрение
через backend переводит вакансию из `MODERATION` в `PUBLISHED`, отклонение —
в `REJECTED` с комментарием. Работодатель может повторно отправить отклонённую
вакансию через существующее действие `submit`.

Сервис обновления запрещает менять вакансии только в статусах `PUBLISHED` и
`PAUSED`, поэтому текущий backend допускает редактирование во время
`PENDING_MODERATION` и `MODERATION` без автоматического возврата в очередь.
Серверного блокирования/сброса статуса при редактировании на проверке нет.
Также обновление одобренной вакансии блокируется и в `PAUSED`, несмотря на
сообщение API об обязательной приостановке.

## Отклики

Кандидатский кабинет предоставляет `/candidate/applications` и страницу
деталей отклика. На публичной вакансии кандидат может отправить
`POST /applications` с `vacancyId` и необязательными `resumeId`,
`coverLetter` (до 2000 символов) и `candidateComment` (до 1000). Резюме
выбирается из `GET /candidate/resumes`; загрузка файлов в форме отклика не
имитируется. Повторные отклики сервер запрещает.

Список кандидата использует `GET /applications/my`, детали и историю —
`GET /applications/{id}` и `/applications/{id}/history`; незавершённый отклик
можно отозвать через `POST /applications/{id}/withdraw`. Для входа с публичной
страницы вакансии сохраняется безопасный внутренний возврат к ней после
аутентификации.

Работодательский кабинет добавляет `/employer/applications` и детали отклика.
Используются `GET /employer/{employerId}/applications`,
`GET /employer/{employerId}/applications/{applicationId}`,
`POST .../{applicationId}/view`, `POST .../{applicationId}/status` и
`GET .../{applicationId}/history`. Доступ ограничен текущей компанией и
проверяется backend. UI предоставляет только разрешённые контрактом переходы
статусов. В API работодателя нет данных резюме кандидата, поэтому файл не
отображается и не скачивается.

Статусы: `NEW`, `VIEWED`, `IN_REVIEW`, `INTERVIEW`, `OFFER`, `HIRED`,
`REJECTED`, `WITHDRAWN`. Список кандидата и работодателя пагинируется на
сервере и может фильтроваться по статусу. Уведомления, приглашения в календарь,
переписка и резюме для работодателя требуют отдельных возможностей backend.

## Backend и CORS

Backend запускается на `http://localhost:3000`; frontend отправляет запросы
на `NEXT_PUBLIC_API_URL` с `withCredentials: true`. Значение backend-переменной
`CORS_ORIGIN` должно точно совпадать с origin frontend — локально
`http://localhost:3001`. Backend должен разрешать credentials. При credentialed
CORS нельзя использовать `Access-Control-Allow-Origin: *`.

Актуальная конфигурация CORS задаётся в `app/api`; frontend не управляет CORS
на стороне backend.
