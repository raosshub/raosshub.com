# RAOSS Hub v3.1.0

Complete product development portal with Spring Boot 3.3 + React 19 + PostgreSQL 15.

## What Was Fixed (v3.1.0)

1. **Config Save 500 Error** - Fixed JPA JSONB mapping issue
   - `ProjectConfig.config`: Changed from `Object` to `String` + ObjectMapper serialization
   - `LocaleContent.content`: Same fix applied
   - `PdfVersion.currentSections`: Same fix applied

2. **ProjectIdentityTab Frontend Bugs**
   - Removed all emojis (replaced with Icons components)
   - Fixed `handleSave` hoisting bug (defined before `useImperativeHandle`)

3. **I18nService** - Added ObjectMapper for JSON serialize/deserialize

4. **I18nController** - Updated `getLocaleSection` to parse JSON string back to object

## Prerequisites

- Java 21
- Node.js 20+
- PostgreSQL 15 (running on localhost:5432)
- Maven 3.9+

## Database Setup

```bash
# Create database and user
psql -U postgres -c "CREATE USER raoss WITH PASSWORD 'raoss_dev_2024';"
psql -U postgres -c "CREATE DATABASE raosshub OWNER raoss;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE raosshub TO raoss;"
```

Or use the provided docker-compose for MinIO only:
```bash
docker-compose -f docker-compose.dev.yml up -d
```

## Backend Setup

```bash
cd backend

# Build
mvn clean compile

# Run
mvn spring-boot:run
```

Backend runs on http://localhost:8080

API docs: All endpoints under `/api/*`

## Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs on http://localhost:3000

Proxies API calls to localhost:8080 automatically.

## Default Login Credentials

| Username | Password         | Role       |
|----------|------------------|------------|
| admin    | RaossAdmin2024!  | superadmin |
| rizan    | RaossUser2024!   | user       |

## Features

- **Login** with JWT auth (15-minute tokens)
- **NDA acceptance** required on every login
- **Multi-language** support (EN + ZH seeded, expandable)
- **7 Configurable Teams**: React, PCBA, Firmware, TFT, Router, Charger, Shell
- **Admin Setup** page with Project Identity & Branding tab
- **File uploads** to MinIO (S3-compatible)
- **Image gallery** with thumbnails
- **3D model viewer** (.glb files via Google Model Viewer)
- **HUB Assist** AI chat powered by Moonshot AI
- **Activity Log** with CSV export
- **RTL support** for Arabic/Urdu expansion

## API Endpoints

| Endpoint | Access | Description |
|----------|--------|-------------|
| POST /api/auth/login | Public | Login |
| GET /api/auth/me | Authenticated | Current user |
| POST /api/auth/nda | Authenticated | Accept NDA |
| GET /api/auth/nda/status | Authenticated | Check NDA status |
| GET /api/health | Public | Health check |
| GET /api/config | Authenticated | Get project config |
| POST /api/config | SuperAdmin | Save project config |
| GET /api/languages | Public | List languages |
| GET /api/ui-strings | Public | UI translations |
| GET /api/locales/{lang} | Authenticated | Locale content |
| GET /api/teams | Authenticated | List teams |
| GET /api/users | Admin+ | List users |
| GET /api/audit | Admin+ | Audit logs |
| POST /api/kimi | Authenticated | AI chat proxy |

## Environment Variables (Backend)

| Variable | Default | Description |
|----------|---------|-------------|
| SPRING_DATASOURCE_URL | jdbc:postgresql://localhost:5432/raosshub | DB URL |
| SPRING_DATASOURCE_USERNAME | raoss | DB user |
| SPRING_DATASOURCE_PASSWORD | raoss_dev_2024 | DB password |
| APP_JWT_SECRET | raosshub-jwt-secret-key-change-in-production-2024 | JWT secret |
| APP_JWT_EXPIRATION_MS | 900000 | Token expiry (15 min) |
| APP_S3_ENDPOINT | http://localhost:9000 | MinIO endpoint |
| APP_KIMI_API_KEY | (empty) | Moonshot AI API key |

## Version History

- v3.1.0 - Fixed config save, JSONB mapping, removed emojis, stable release
- v3.0.0 - Initial complete rewrite with Spring Boot + React
