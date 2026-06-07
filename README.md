# RAOSS Hub v3

**Spring Boot + React + PostgreSQL + MinIO (S3)**

Real multi-language project management dashboard with AI-powered HUB Assist.

---

## Architecture

```
Frontend (React 19 + Vite + Zustand)  <--->  Nginx  <--->  Spring Boot API  <--->  PostgreSQL 15
     Port 3000                              Port 80           Port 8080             Port 5432
                                                                       \
                                                                        -->  MinIO (S3-compatible)
                                                                            Port 9000
```

## Prerequisites

- Java 21 JDK
- Maven 3.9+
- Node.js 20+
- Docker & Docker Compose
- Git

## Quick Start

### 1. Clone & Start Infrastructure

```bash
git clone https://github.com/raosshub/raosshub.com.git RAOSSHUB-v3
cd RAOSSHUB-v3

# Start PostgreSQL and MinIO
docker compose up -d postgres minio

# Create MinIO buckets (first time only)
docker compose exec minio mc alias set local http://localhost:9000 raossminio raossminio2024
docker compose exec minio mc mb local/raosshub-files --ignore-existing
docker compose exec minio mc mb local/raosshub-gallery --ignore-existing
docker compose exec minio mc mb local/raosshub-pdfs --ignore-existing
```

### 2. Start Backend

```bash
cd backend
mvn clean install -DskipTests
mvn spring-boot:run
```

Backend runs on http://localhost:8080

### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### 4. Login

- Username: `admin`
- Password: `RaossAdmin2024!`

---

## Project Structure

```
RAOSSHUB-v3/
├── backend/                          # Spring Boot 3.3
│   ├── src/main/java/com/raosshub/
│   │   ├── config/                   # AppProperties, S3, CORS
│   │   ├── controller/               # 9 REST controllers
│   │   ├── dto/                      # Request/response DTOs
│   │   ├── entity/                   # 15 JPA entities
│   │   ├── repository/               # Spring Data JPA repos
│   │   ├── security/                 # JWT, UserDetails, filters
│   │   └── service/                  # Business logic
│   ├── src/main/resources/
│   │   ├── application.yml           # All configuration
│   │   └── schema.sql                # Full DB schema + seed data
│   └── pom.xml
├── frontend/                         # React 19 + Vite
│   ├── src/
│   │   ├── components/               # Loading, Login, NDA, Layout, Toast, Icons
│   │   ├── pages/                    # Overview, Team, Settings, Assist, Log, Config
│   │   ├── stores/                   # Zustand: auth, i18n, theme, notifications
│   │   ├── types/                    # TypeScript interfaces
│   │   └── utils/api.ts              # API client (Axios)
│   ├── index.html
│   └── vite.config.ts
├── docker-compose.yml                # PostgreSQL, MinIO, Nginx, Backend
├── nginx/default.conf
└── README.md
```

---

## Multi-Language Architecture

### Current: EN + ZH
### Expandable: Any language (AR, UR, FR, etc.)

### Database Schema

| Table | Purpose |
|-------|---------|
| `languages` | Supported languages with RTL flag |
| `ui_messages` | All UI strings (keys → values) per language |
| `locale_content` | Project content (scopes, deliverables, etc.) as JSONB per language |

### Adding a New Language

1. Insert into `languages` table: `INSERT INTO languages (code, name, name_native, is_rtl) VALUES ('ar', 'Arabic', 'العربية', true);`
2. AI-translate all EN `ui_messages` to the new language
3. AI-translate all EN `locale_content` JSONB to the new language
4. The frontend automatically picks up the new language — zero code changes required

### RTL Support

Arabic/Urdu/Hebrew languages set `is_rtl = true` in the DB. The frontend reads this flag and applies:
- `dir="rtl"` on `<html>`
- `text-align: right` for text content
- Layout stays LTR (sidebar on left) per design choice

### Key Files

- `backend/src/main/resources/schema.sql` — Full schema + EN/ZH seed data
- `frontend/src/stores/useI18nStore.ts` — i18n state management
- `frontend/src/utils/api.ts` — i18n API endpoints

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | Public | Login with username/password |
| `/api/auth/me` | GET | Required | Get current user |
| `/api/auth/nda` | POST | Required | Accept NDA |
| `/api/auth/nda/status` | GET | Required | Check NDA status |
| `/api/languages` | GET | Public | List active languages |
| `/api/ui-strings?lang=en` | GET | Public | Get UI strings for language |
| `/api/locales/{lang}` | GET | Public | Get full locale content |
| `/api/teams` | GET | Required | List active teams |
| `/api/config` | GET/POST | Required/Admin | Project configuration |
| `/api/users` | CRUD | Admin | User management |
| `/api/audit` | GET | Admin | Audit log with filters |
| `/api/files/{teamId}/files` | GET/POST | Required | Team file management |
| `/api/files/{teamId}/gallery` | GET/POST | Required | Gallery management |
| `/api/files/{teamId}/pdf` | GET/POST | Required | PDF document management |
| `/api/kimi` | POST | Required | Proxy to Moonshot AI |

---

## Environment Variables

### Backend (application.yml or env vars)

| Variable | Default | Description |
|----------|---------|-------------|
| `SPRING_DATASOURCE_URL` | `jdbc:postgresql://localhost:5432/raosshub` | PostgreSQL connection |
| `APP_JWT_SECRET` | (dev default) | JWT signing secret |
| `APP_KIMI_API_KEY` | (empty) | Moonshot AI API key |
| `APP_S3_ENDPOINT` | `http://localhost:9000` | MinIO/S3 endpoint |

### Frontend (.env)

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `/api` | API base URL |

---

## Git Push to Production Repo

```bash
git remote add origin https://github.com/raosshub/raosshub.com.git
git push -u origin master --force
```

---

## License

RAOSS HK COMPANY LIMITED
