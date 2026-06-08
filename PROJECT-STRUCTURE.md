# RAOSS Hub v3.1.3 - Project Structure & Setup Guide

## Tech Stacks

### Backend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Spring Boot | 3.3.5 |
| Language | Java | 21 |
| Build | Maven | 3.9+ |
| Database | PostgreSQL | 15 |
| ORM | Hibernate (JPA) | 6.4 |
| Auth | Spring Security + JWT | 6.x |
| Object Storage | MinIO (S3-compatible) | Latest |
| AI Proxy | Moonshot AI (Kimi) | API v1 |
| Container | Docker | Any |

### Frontend
| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | React | 19 |
| Language | TypeScript | 5.6+ |
| Build | Vite | 6.x |
| Router | React Router | 7.x |
| State | Zustand | 5.x |
| HTTP | Axios | 1.7+ |
| Icons | SVG (custom) | - |
| 3D Viewer | Google Model Viewer | 3.x |
| Container | Docker + NGINX | Latest |

================================================================================

## File Structure

### Backend (Java 21 / Spring Boot)

```
backend/
|-- pom.xml                                          # Maven config
|-- Dockerfile                                       # Backend container
|
|-- src/main/java/com/raosshub/
|   |
|   |-- RaosshubApplication.java                     # Main entry point
|   |
|   |-- config/
|   |   |-- AppProperties.java                       # App-level configuration
|   |   |-- DataInitializer.java                     # Startup seed (admin user, default config)
|   |   |-- S3Config.java                            # MinIO S3 client + presigner beans
|   |
|   |-- controller/                                  # REST API endpoints
|   |   |-- AuditController.java                     # GET /api/audit
|   |   |-- AuthController.java                      # POST /api/auth/*
|   |   |-- ConfigController.java                    # GET/POST /api/config
|   |   |-- FileController.java                      # /api/files/* (upload, download, serve)
|   |   |-- HealthController.java                    # GET /api/health
|   |   |-- I18nController.java                      # /api/languages, /api/ui-strings, /api/locales
|   |   |-- KimiController.java                      # POST /api/kimi (AI proxy)
|   |   |-- TeamController.java                      # GET /api/teams
|   |   |-- UserController.java                      # /api/users/*
|   |
|   |-- dto/                                         # Request/Response objects
|   |   |-- ApiResponse.java                         # Standard API wrapper
|   |   |-- ForgotPasswordRequest.java
|   |   |-- LoginRequest.java
|   |   |-- LoginResponse.java
|   |   |-- ResetPasswordRequest.java
|   |   |-- UserDto.java
|   |
|   |-- entity/                                      # JPA Entities (15 total)
|   |   |-- AuditLog.java
|   |   |-- ChatSummary.java
|   |   |-- GalleryImage.java
|   |   |-- Language.java
|   |   |-- LocaleContent.java
|   |   |-- NdaAgreement.java
|   |   |-- PasswordResetToken.java
|   |   |-- PdfDocument.java
|   |   |-- PdfVersion.java
|   |   |-- ProjectConfig.java                       # Main config JSONB store
|   |   |-- Team.java
|   |   |-- TeamFile.java
|   |   |-- TranslationJob.java
|   |   |-- UiMessage.java
|   |   |-- User.java
|   |
|   |-- repository/                                  # JPA Repositories
|   |   |-- AuditLogRepository.java
|   |   |-- ChatSummaryRepository.java
|   |   |-- GalleryImageRepository.java
|   |   |-- LanguageRepository.java
|   |   |-- LocaleContentRepository.java
|   |   |-- NdaAgreementRepository.java
|   |   |-- PasswordResetTokenRepository.java
|   |   |-- PdfDocumentRepository.java
|   |   |-- PdfVersionRepository.java
|   |   |-- ProjectConfigRepository.java
|   |   |-- TeamFileRepository.java
|   |   |-- TeamRepository.java
|   |   |-- TranslationJobRepository.java
|   |   |-- UiMessageRepository.java
|   |   |-- UserRepository.java
|   |
|   |-- security/                                    # Auth layer
|   |   |-- JwtAuthenticationFilter.java              # JWT request filter
|   |   |-- JwtTokenProvider.java                     # Token create/validate
|   |   |-- SecurityConfig.java                       # Spring Security config
|   |   |-- UserDetailsImpl.java                      # UserDetails adapter
|   |   |-- UserDetailsServiceImpl.java               # Load user by username
|   |
|   |-- service/                                     # Business logic
|   |   |-- AuditLogService.java
|   |   |-- AuthService.java                          # Login, NDA, password reset
|   |   |-- ConfigService.java                        # Config CRUD
|   |   |-- I18nService.java                          # Languages, translations
|   |   |-- S3Service.java                            # MinIO upload/download/presign
|   |   |-- TeamService.java
|   |   |-- UserService.java
|   |
|-- src/main/resources/
|   |-- application.yml                               # Main config (DB, JWT, S3, CORS)
|   |-- schema.sql                                    # DB seed (EN+ZH languages, 7 teams, UI strings)
```

### Frontend (React 19 / TypeScript / Vite)

```
frontend/
|-- index.html                                        # Entry HTML, fonts, model-viewer script
|-- package.json                                      # NPM dependencies
|-- tsconfig.json                                     # TypeScript config
|-- vite.config.ts                                    # Vite config + proxy
|-- Dockerfile                                        # Frontend container (nginx)
|-- nginx.conf                                        # NGINX spa routing
|-- .env.example                                      # Env var template
|
|-- src/
|   |-- main.tsx                                      # Entry point (React root + router)
|   |-- App.tsx                                       # Routes + auth guard + layout
|   |-- vite-env.d.ts                                # Type declarations
|   |
|   |-- components/
|   |   |-- AppLayout.tsx                             # Sidebar + topbar + main layout
|   |   |-- icons.tsx                                 # 40+ SVG icon components
|   |   |-- LoadingScreen.tsx                         # Initial loading spinner
|   |   |-- LoginScreen.tsx                           # Login form + MFA
|   |   |-- ModelViewer.tsx                           # Google Model Viewer wrapper
|   |   |-- NDAModal.tsx                              # NDA acceptance dialog
|   |   |-- ToastContainer.tsx                        # Toast notifications
|   |
|   |-- pages/
|   |   |-- OverviewPage.tsx                          # Dashboard (v2 layout: KPI, 3D, milestones, actions, gallery, versions)
|   |   |-- TeamPage.tsx                              # Team detail (scope, deliverables, files, PDF, gallery)
|   |   |-- HubAssistPage.tsx                         # AI chat interface
|   |   |-- ActivityLogPage.tsx                       # Activity log + CSV export
|   |   |-- SettingsPage.tsx                          # User settings
|   |   |-- ProjectConfigPage.tsx                     # Legacy config page
|   |   |
|   |   |-- admin/
|   |       |-- AdminSetupPage.tsx                    # Admin setup shell (4 tabs, unified save, unsaved warning)
|   |       |-- ProjectIdentityTab.tsx                # Tab 1: Identity, branding, visuals, contact, ICP
|   |
|   |-- stores/                                       # Zustand state management
|   |   |-- useAuthStore.ts                           # Auth state (login, logout, token)
|   |   |-- useConfigStore.ts                         # Project config (identity, breadcrumb, title, favicon)
|   |   |-- useI18nStore.ts                           # i18n (language, translations, RTL)
|   |   |-- useNotificationStore.ts                   # Toast notifications
|   |   |-- useThemeStore.ts                          # Dark/light theme, sidebar state
|   |
|   |-- styles/
|   |   |-- global.css                                # CSS variables (dark/light), resets, utilities
|   |
|   |-- types/
|   |   |-- index.ts                                  # Shared TypeScript types
|   |
|   |-- utils/
|   |   |-- api.ts                                    # Axios instance + API wrappers (auth, i18n, config, files, etc.)
```

### Infrastructure

```
RAOSSHUB-v3/
|-- docker-compose.yml                                # Full stack (backend + frontend + DB + MinIO)
|-- docker-compose.dev.yml                            # Dev only (DB + MinIO)
|-- nginx/
|   |-- default.conf                                  # NGINX reverse proxy config
|-- .gitignore
|-- README.md
|-- I18N-GUIDE.md                                     # i18n implementation guide
```

================================================================================

## API Endpoints

| Method | Path | Access | Description |
|--------|------|--------|-------------|
| POST | /api/auth/login | Public | Login, returns JWT |
| GET | /api/auth/me | Auth | Current user info |
| POST | /api/auth/refresh | Auth | Refresh access token |
| POST | /api/auth/nda | Auth | Accept NDA |
| GET | /api/auth/nda/status | Auth | Check NDA status |
| POST | /api/auth/forgot-password | Public | Password reset request |
| POST | /api/auth/reset-password | Public | Reset password with token |
| GET | /api/config | Auth | Get full project config |
| POST | /api/config | SuperAdmin | Save project config |
| GET | /api/languages | Public | List active languages |
| GET | /api/ui-strings | Public | Get UI translations |
| GET | /api/locales/{lang} | Auth | Get locale content |
| GET | /api/locales/{lang}/{section} | Auth | Get locale section |
| POST | /api/locales/{lang} | Admin+ | Save locale content |
| GET | /api/teams | Auth | List teams |
| GET | /api/users | Admin+ | List users |
| GET | /api/audit | Admin+ | Audit logs |
| POST | /api/kimi | Auth | AI chat proxy |
| POST | /api/files/upload | Auth | Generic file upload |
| GET | /api/files/serve/{bucket} | Public | Serve file (images, models) |
| GET | /api/health | Public | Health check |

================================================================================

## LOCAL SETUP (Windows / macOS / Linux)

### Prerequisites
- Java 21
- Maven 3.9+
- Node.js 20+
- PostgreSQL 15 (running locally)
- Docker (optional, for MinIO only)

### Step 1: Database
```bash
psql -U postgres
```
```sql
CREATE USER raoss WITH PASSWORD 'raoss_dev_2024';
CREATE DATABASE raosshub OWNER raoss;
GRANT ALL PRIVILEGES ON DATABASE raosshub TO raoss;
```

### Step 2: MinIO (optional, for file upload)
```bash
docker-compose -f docker-compose.dev.yml up -d
```
Or use your own MinIO instance at localhost:9000.

### Step 3: Backend
```bash
cd backend
mvn spring-boot:run
# Runs on http://localhost:8080
```

### Step 4: Frontend
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:3000
# Proxies /api to localhost:8080 automatically
```

### Step 5: Login
Open http://localhost:3000
- Username: admin
- Password: RaossAdmin2024!

### Environment Variables (override in application.yml or env)
```
SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5432/raosshub
SPRING_DATASOURCE_USERNAME=raoss
SPRING_DATASOURCE_PASSWORD=raoss_dev_2024
APP_JWT_SECRET=your-secret-key
APP_JWT_EXPIRATION_MS=900000
APP_S3_ENDPOINT=http://localhost:9000
APP_S3_ACCESS_KEY=raossminio
APP_S3_SECRET_KEY=raossminio2024
APP_KIMI_API_KEY=your-moonshot-api-key
```

================================================================================

## ECS DEPLOYMENT

### Architecture (AWS ECS + Fargate)
```
                    [CloudFront CDN]
                          |
                    [ALB :443]
                    /         \
            [Frontend]    [Backend]
            :3000         :8080
                            |
                      [RDS PostgreSQL]
                            |
                      [S3 / MinIO]
```

### Step 1: Build Docker Images
```bash
# Backend
cd backend
mvn clean package -DskipTests
docker build -t raosshub/backend:v3.1.3 .

# Frontend
cd frontend
npm install && npm run build
docker build -t raosshub/frontend:v3.1.3 .
```

### Step 2: Push to ECR
```bash
aws ecr create-repository --repository-name raosshub-backend
aws ecr create-repository --repository-name raosshub-frontend

aws ecr get-login-password | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com

docker tag raosshub/backend:v3.1.3 YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/raosshub-backend:v3.1.3
docker tag raosshub/frontend:v3.1.3 YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/raosshub-frontend:v3.1.3

docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/raosshub-backend:v3.1.3
docker push YOUR_ACCOUNT.dkr.ecr.REGION.amazonaws.com/raosshub-frontend:v3.1.3
```

### Step 3: Create RDS PostgreSQL
```bash
aws rds create-db-instance \
  --db-instance-identifier raosshub-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 15.4 \
  --allocated-storage 20 \
  --master-username raoss \
  --master-user-password YOUR_DB_PASSWORD \
  --vpc-security-group-ids sg-xxxxx \
  --db-subnet-group-name your-subnet-group
```

### Step 4: Create ECS Cluster & Services
```bash
# Create cluster
aws ecs create-cluster --cluster-name raosshub-cluster

# Create task definitions (backend + frontend)
# Use the provided task-definition-backend.json and task-definition-frontend.json templates

# Create services
aws ecs create-service \
  --cluster raosshub-cluster \
  --service-name raosshub-backend \
  --task-definition raosshub-backend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"

aws ecs create-service \
  --cluster raosshub-cluster \
  --service-name raosshub-frontend \
  --task-definition raosshub-frontend \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}"
```

### Step 5: ALB + CloudFront
```bash
# Create Application Load Balancer with two target groups:
# - /api/* -> backend service
# - /* -> frontend service

# Create CloudFront distribution pointing to ALB
# Enable HTTPS, cache static assets
```

### ECS Environment Variables
```
# Backend (task definition env)
SPRING_DATASOURCE_URL=jdbc:postgresql://RDS_ENDPOINT:5432/raosshub
SPRING_DATASOURCE_USERNAME=raoss
SPRING_DATASOURCE_PASSWORD=YOUR_DB_PASSWORD
SPRING_JPA_HIBERNATE_DDL_AUTO=update
APP_JWT_SECRET=YOUR_PRODUCTION_SECRET
APP_JWT_EXPIRATION_MS=900000
APP_S3_ENDPOINT=https://s3.amazonaws.com
APP_S3_ACCESS_KEY=YOUR_AWS_ACCESS_KEY
APP_S3_SECRET_KEY=YOUR_AWS_SECRET_KEY
APP_S3_BUCKET_FILES=raosshub-files-prod
APP_S3_BUCKET_GALLERY=raosshub-gallery-prod
APP_S3_BUCKET_PDFS=raosshub-pdfs-prod
APP_KIMI_API_KEY=YOUR_MOONSHOT_KEY
APP_CORS_ALLOWED_ORIGINS=https://raosshub.com,https://www.raosshub.com

# Frontend (build args / env)
VITE_API_URL=/api
```

================================================================================

## File Count Summary

| Component | Files |
|-----------|-------|
| Backend Java | 61 files (10 controllers, 7 services, 15 entities, 15 repositories, 5 security, 6 DTO, 3 config) |
| Frontend TSX/TS | 28 files (8 pages, 8 components, 5 stores, 1 styles, 1 types, 1 utils, 3 config, 1 main) |
| Infrastructure | 5 files (2 docker-compose, 2 Dockerfile, 1 nginx conf) |
| **Total** | **94 files** |
