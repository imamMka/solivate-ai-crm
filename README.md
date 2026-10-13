# Solivate AI CRM

> **Internal Operating System & AI-Assisted Sales-Marketing CRM for Solivate Studio**  
> Mengintegrasikan manajemen leads multi-channel, sales pipeline, pelacakan follow-up, performa Meta Ads, dan AI Copilot dalam satu platform terpusat.  
> *Sesuai dengan dokumen spesifikasi resmi: [PRD.md](./PRD.md) (Product Requirements Document v1.0).*

---

## 📌 Daftar Isi
- [Tentang Project](#-tentang-project)
- [Tech Stack](#-tech-stack)
- [Modul & Fitur Utama](#-modul--fitur-utama)
- [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
- [Konfigurasi Environment (.env)](#-konfigurasi-environment-env)
- [Pengujian Webhook Meta Ads](#-pengujian-webhook-meta-ads)
- [Database & Migrasi Supabase](#-database--migrasi-supabase)
- [📅 Jadwal Roadmap & Pekerjaan Selanjutnya](#-jadwal-roadmap--pekerjaan-selanjutnya)

---

## 🎯 Tentang Project

Solivate AI CRM dirancang untuk mengatasi fragmentasi operasional sales & marketing di Solivate Studio:
- **Pencatatan Leads Terpusat**: Menggabungkan leads dari Meta Lead Ads (Facebook & Instagram), Website Form, WhatsApp, Referral, dan Organic.
- **Deduplikasi Cerdas (FR-02)**: Mencegah duplikasi data lead berdasarkan normalisasi nomor telepon dan email.
- **Pipeline Governance (FR-04)**: Pipeline Kanban 8 tahapan dengan aturan bisnis ketat (wajib menyertakan *Lost Reason* dan verifikasi *Signed Contract + Deposit* sebelum masuk status *Won*).
- **Atribusi Meta Ads Riil (FR-10)**: Memisahkan metrik laporan klik/spend Meta dengan hasil closing penjualan aktual di CRM.
- **AI Sales & Operations Copilot (FR-07, FR-08, FR-11)**: Asisten AI terpandu berbasis katalog layanan dan riwayat aktivitas prospek tanpa halusinasi diskon liar.

---

## 🛠 Tech Stack

| Layer | Teknologi |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Motion |
| **Backend / Server** | Express.js, Node.js (ESM), tsx, Vite v8 Middleware |
| **Database & Auth** | Supabase PostgreSQL + Row Level Security (RLS) |
| **AI Engine** | Google Gen AI SDK (`@google/genai`) |
| **Integrasi Eksternal** | Meta Graph & Marketing API Webhooks, n8n Automation Workflows |

---

## 🚀 Modul & Fitur Utama

### 1. Lead Management (Module A)
- CRUD Leads lengkap dengan pelacakan *source attribution*.
- Deteksi duplikasi otomatis berbasis normalisasi email dan nomor HP.
- Penugasan penanggung jawab (*Sales Owner Assignment*).
- Riwayat linimasa percakapan & catatan aktivitas.

### 2. Sales Pipeline (Module B)
- Tampilan visual Kanban dengan 8 tahap resmi:
  1. `New Lead`
  2. `Contacted`
  3. `Qualified`
  4. `Proposal`
  5. `Negotiation`
  6. `Won` *(memerlukan verifikasi kontrak & pembayaran deposit)*
  7. `Lost` *(wajib mengisi alasan penolakan / lost reason)*
  8. `Nurture`

### 3. Follow-up & Task Management (Module B & FR-06)
- Pembuatan task berkala dengan batas waktu (*Due Date*).
- Indikator peringatan visual untuk task yang terlambat (*Overdue Tasks*).
- Form pencatatan manual komunikasi WhatsApp tim (PRD Section 9).

### 4. Meta Ads Webhook & Attribution (Module D & FR-09, FR-10)
- Endpoint verifikasi handshake resmi Meta: `GET /api/webhooks/meta`.
- Endpoint penerima lead masuk otomatis: `POST /api/webhooks/meta`.
- Dashboard analitik atribusi iklan: Ad Spend, Impressions, Clicks, vs. Closed Won Deals.

### 5. Approval Queue & Governance (Module E & FR-12)
- Antrean persetujuan (*human-in-the-loop*) untuk tindakan berisiko tinggi.
- Kontrol hak akses berbasis role server-side (hanya role Owner & Admin yang dapat menyetujui).
- Audit trail log transaksi webhook dan automasi (`integration_events`).

---

## 💻 Panduan Instalasi & Menjalankan

### Prasyarat
- Node.js versi 20+ / 22+
- npm versi 10+

### Langkah Menjalankan:
```bash
# 1. Clone repository & masuk ke folder project
cd solivate-ai-crm

# 2. Install dependensi
npm install

# 3. Salin dan sesuaikan konfigurasi environment
cp .env.example .env

# 4. Jalankan development server
npm run dev
```

Buka browser di **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Konfigurasi Environment (`.env`)

File `.env` otomatis diabaikan oleh Git demi keamanan kredensial:

```env
# SERVER
PORT=3000
NODE_ENV=development

# AI ASSISTANT
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-3.8-flash"

# SUPABASE POSTGRESQL & AUTH
NEXT_PUBLIC_SUPABASE_URL="https://your-project-id.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# META MARKETING & LEAD ADS API
META_APP_ID="your-meta-app-id"
META_APP_SECRET="your-meta-app-secret"
META_WEBHOOK_VERIFY_TOKEN="your-custom-webhook-verify-token"
META_SYSTEM_USER_ACCESS_TOKEN="your-system-user-token"
META_AD_ACCOUNT_ID="act_1234567890"

# N8N AUTOMATION
N8N_WEBHOOK_BASE_URL="https://n8n.yourdomain.com/webhook"
N8N_API_SECRET="your-n8n-signing-secret"
```

---

## 🧪 Pengujian Webhook Meta Ads

Untuk memverifikasi sistem penerimaan calon klien baru dari Meta Lead Ads ke CRM, Anda dapat menjalankan perintah uji coba di PowerShell:

```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/meta" -Method Post -ContentType "application/json" -Body '{"fullName":"Budi Santoso","email":"budi.meta@example.com","phone":"081298765432","companyName":"PT Maju Bersama","serviceInterest":"Custom Web App & Client Portal","form_id":"form_fb_123","ad_id":"ad_ig_999"}'
```

Setelah perintah dijalankan:
1. Prospek baru langsung muncul di menu **Leads** berlabel `Meta Lead Ads`.
2. Kartu deals langsung bertengger di menu **Pipeline** kolom `New Lead`.
3. Audit log tercatat di menu **Settings** -> **Integration & Audit Logs**.

---

## 🗄 Database & Migrasi Supabase

Skema relasional lengkap telah tersedia di file:
[`supabase/migrations/20261012000001_solivate_crm_foundation.sql`](./supabase/migrations/20261012000001_solivate_crm_foundation.sql)

Skema mencakup tabel:
- `profiles` *(Pengguna internal & RBAC)*
- `leads` *(Data prospek & deduplikasi)*
- `lead_external_refs` *(Pemetaan ID Facebook/Meta Lead Ads)*
- `lead_activities` *(Linimasa aktivitas, log WA, dan task)*
- `deals` *(Peluang penjualan & milestone)*
- `campaigns` & `daily_ad_insights` *(Metrik Meta Marketing API)*
- `tasks` *(Tindak lanjut follow-up)*
- `approval_queue` *(Tata kelola aksi berisiko)*
- `integration_events` *(Log audit idempotensi webhook)*

---

## 📅 Jadwal Roadmap & Pekerjaan Selanjutnya

Berikut daftar prioritas pengembangan lanjutan untuk membawa sistem dari status purwarupa ke produksi penuh:

- [ ] **Task 1: Migrasi Penyimpanan dari In-Memory ke Supabase Cloud (Prioritas Utama)**
  - Mengubah fungsi CRUD di `server.ts` agar membaca dan menulis langsung ke Supabase client (`src/lib/supabase.ts`).
  - Menghubungkan webhook Meta Ads agar otomatis `INSERT` ke tabel `public.leads` dan `public.integration_events`.
  - *Manfaat: Data tidak akan hilang saat server laptop dimatikan atau di-restart.*
- [ ] **Task 2: Integrasi Provider AI Fleksibel / Penggantian AI Engine**
  - Menyiapkan adapter AI multi-provider (OpenAI GPT-4o / Anthropic Claude / DeepSeek / Gemini alternatif).
  - Menyempurnakan prompt Agent A (Kualifikasi), Agent B (Draf Pesan WhatsApp), dan Agent C (Executive Business Brief).
- [ ] **Task 3: Koneksi Webhook Meta Ads Live ke Internet Publik**
  - Mengonfigurasi Cloudflare Tunnel / VPS domain production untuk URL webhook Meta resmi.
  - Verifikasi Lead Ads Webhook di Meta for Developers dashboard.
- [ ] **Task 4: Integrasi Automasi n8n (Phase 4)**
  - Setup workflow pengingat otomatis follow-up task yang jatuh tempo.
  - Sinkronisasi terjadwal performa kampanye harian dari Meta Marketing API.
- [ ] **Task 5: Deployment 24/7 ke Cloud Hosting**
  - Deploy backend & frontend ke platform cloud (Railway / Vercel / Render / VPS).
  - Setup environment variable produksi untuk keamanan maksimal.
