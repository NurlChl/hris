# HRIS System Maintenance & Developer Notes

Welcome! This document is the **technical reference and log** of all modifications, architecture design decisions, and system constraints. It is intended for any human developers or AI coding assistants working on this system in the future.

---

## 1. Tech Stack & Environment Configurations

The application is built on:
- **Framework**: Next.js (App Router, dynamic and static rendering).
- **Language**: TypeScript.
- **Database**: MongoDB via Mongoose ODM.
- **Styling**: Tailwind CSS + shadcn/ui + Framer Motion.
- **Authentication**: NextAuth.js / Auth.js.
- **Job/Task Scheduling**: BullMQ + Redis (with in-memory fallback for local development).
- **Storage**: Multi-provider storage abstraction (defaults to local disk storage).

### `.env` Structure
Make sure the following variables are defined in your `.env` or environment variables:
```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/hris

# NextAuth config
NEXTAUTH_SECRET=p9q8n6v4m1x8r3c2y7t6b5n4m3x2z1a0q9w8e7r6t5y4u3i2o1p0a9s8d7f6g5h4
NEXTAUTH_URL=http://localhost:3000

# Storage Provider configurations
# Pilih salah satu: local | cloudinary | supabase | r2 | minio | b2
STORAGE_PROVIDER=local

# --- LOCAL ---
LOCAL_STORAGE_PATH=./public/uploads

# --- CLOUDINARY ---
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# --- SUPABASE STORAGE ---
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_BUCKET=

# --- CLOUDFLARE R2 ---
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=

# --- MINIO ---
MINIO_ENDPOINT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET=

# --- BACKBLAZE B2 ---
B2_KEY_ID=
B2_APPLICATION_KEY=
B2_BUCKET=

# --- NOTIFICATION CREDENTIALS ---
# Email provider: smtp | resend
EMAIL_PROVIDER=smtp
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
RESEND_API_KEY=

# WhatsApp provider: fonnte | twilio | none
WA_PROVIDER=none
FONNTE_TOKEN=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=
```

---

## 2. Key Architecture Details

### 2.1 Multi-Provider Storage Adapter
Located in `src/lib/storage/`.
- All uploads go through the `StorageProvider` interface.
- Changing `STORAGE_PROVIDER` in the env swaps the upload location without changing any logic in the app.

### 2.2 Local Dev Fallbacks
To allow this app to be developed easily on systems without global services:
- **Database**: A connection status monitoring system warns if Mongo is offline, and handles errors gracefully.
- **Redis/BullMQ**: When `REDIS_URL` is omitted, the scheduler falls back to in-memory loops and timeouts to simulate queues without crashing the app.

### 2.3 Polymorphic Approval Workflow Engine
All requests (leave, attendance correction, holiday swap) point to an `ApprovalInstance` with `ref_type` and `ref_id`. This allows a single backend and UI approval interface to handle all dynamic approval stages.

---

## 3. Maintenance Logs

| Date | Type of Change | Description | Impact & Next Steps |
|---|---|---|---|
| 2026-07-06 | System Init | Initialized Next.js 16 (App Router), configured Tailwind, TypeScript, installed base modules. | Next: Setup schemas and auth. |
| 2026-07-06 | Phase 0 Setup | Created DB connection (`db.ts`), Storage Provider (`StorageProvider.ts`, `LocalProvider.ts`), Audit logger (`logger.ts`), and Queue Manager (`scheduler.ts`) with in-memory local fallbacks. | Ready for Phase 1. |
| 2026-07-06 | UI Refinement | Resolved Tailwind v4 CSS utility syntax warnings in login, dashboard layout, and home page. | UI classes fully compliant with Tailwind v4. |
| 2026-07-06 | Phase 1 & 2 Complete | Implemented Master Data CRUD schemas, built Schedules/Shift builder pages, and developed the Geofenced Attendance portal with GPS checks. | Ready for approvals and payroll. |
| 2026-07-06 | Phase 3, 4, 5 Complete | Built Polymorphic Approvals Engine, Recruitment ATS Board, Onboarding automatic employee migration, and Payroll Slip calculator. | Configured & compiled successfully. |
| 2026-07-06 | Notification & Env | Integrated SMTP/Resend emails and Fonnte/Twilio WhatsApp alert options in the system, documented variables in .env. | Fully configurable, system ready. |
| 2026-07-06 | Forgot/Change Pass & theme | Created email OTP verification for forgot & change password flows. Separated Employee Portal and Superadmin logins. Added dynamic Light/Dark mode toggles. | Fully secure, premium Framer-styled portals ready. |



