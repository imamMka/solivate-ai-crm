# PRODUCT REQUIREMENTS DOCUMENT (PRD)
## Solivate AI CRM
- **Document Version**: 1.0
- **Status**: Draft for Review
- **Product Type**: Internal Business Application
- **Owner**: Solivate Studio
- **Target Users**: 2–5 internal team members
- **Planned Platform**: Web Application
- **Document Date**: 12 October 2026
- **Source**: [Google Docs PRD](https://docs.google.com/document/d/1vg7074JpzO0PaGmQINWm2Fe_fDcOxm0QDgNoZm9t0cs/edit?usp=sharing)

---

## 1. Executive Summary
Solivate AI CRM adalah sistem Customer Relationship Management berbasis AI yang dikembangkan untuk membantu operasional sales dan marketing Solivate Studio.
Sistem ini dirancang untuk mengintegrasikan pengelolaan leads, aktivitas penjualan, follow-up pelanggan, data performa Meta Ads, dan AI-assisted decision-making dalam satu platform internal.

Saat ini, sebagian besar komunikasi calon klien berlangsung melalui WhatsApp pribadi, sementara sumber leads lainnya berasal dari website, iklan Facebook dan Instagram, referral, serta networking. Kondisi ini berpotensi menyebabkan pencatatan tidak konsisten, follow-up terlewat, dan sulitnya mengukur efektivitas pemasaran terhadap penjualan aktual.

Solivate AI CRM akan berfungsi sebagai pusat data operasional yang membantu tim mengelola prospek secara sistematis, mengotomatisasi pekerjaan berulang, serta menggunakan AI untuk meningkatkan kualitas proses penjualan.

### Product Vision
Membangun sistem operasional internal yang memungkinkan Solivate Studio mengelola seluruh perjalanan calon klien secara terukur, efisien, dan berbasis data, dengan AI sebagai asisten yang mendukung keputusan manusia.

### Core Principle
> **Automate repetitive work, assist important decisions, and keep business-critical actions under control.**

---

## 2. Problem Statement
### 2.1 Current Problems
- **P1 — Fragmented lead management**: Leads berasal dari beberapa channel (terutama WhatsApp pribadi), sehingga informasi tersebar di berbagai percakapan dan catatan.
- **P2 — Inconsistent follow-up**: Peluang hilang karena tidak ada sistem terpusat untuk mengelola jadwal follow-up, status prospek, dan tanggung jawab.
- **P3 — Limited sales visibility**: Belum ada satu sumber data konsisten untuk mengetahui jumlah leads, tahapan penjualan, nilai pipeline, dan closing.
- **P4 — Limited advertising attribution**: Performa Meta Ads perlu dihubungkan dengan kualitas leads dan penjualan aktual.
- **P5 — Repetitive sales administration**: Pencatatan kebutuhan klien, penyusunan pesan follow-up, dan rekap manual memakan banyak waktu.
- **P6 — Lack of centralized business intelligence**: Pemilik bisnis membutuhkan gambaran menyeluruh kondisi sales dan marketing.

### 2.2 Business Impact
Peluang penjualan terlewat, waktu administratif tidak efisien, info pelanggan tidak lengkap, dan kesulitan mengevaluasi campaign.

---

## 3. Product Objectives & Scope
### 3.1 Primary Objectives
1. Memusatkan pencatatan leads dari seluruh sumber utama.
2. Menyediakan pipeline penjualan transparan bagi tim terkait.
3. Mengurangi pekerjaan manual via automation & AI.
4. Meningkatkan konsistensi follow-up.
5. Menghubungkan performa Meta Ads dengan penjualan aktual.
6. Menyediakan dashboard operasional untuk keputusan bisnis.

### 3.2 Non-Goals (MVP)
- Tidak menjadi public multi-tenant SaaS.
- Tidak menggantikan ERP penuh, akuntansi, atau project management eksekusi.
- **Tidak menjalankan autonomous negotiation** (tidak memberikan diskon / kontrak mandiri).
- **Tidak mengubah budget / mematikan iklan Meta Ads secara otomatis tanpa approval**.
- Tidak mengintegrasikan WhatsApp pribadi via scraper/unofficial API ilegal.

---

## 4. Target Users and Roles
1. **Owner**: Monitoring performa, nilai pipeline, tinjau rekomendasi AI, approval tindakan berisiko tinggi.
2. **Sales**: Kelola leads, update pipeline, catat percakapan/WhatsApp, tindak lanjuti follow-up, gunakan AI Copilot.
3. **Marketing**: Pantau campaign Meta, hubungkan campaign dengan leads, evaluasi CPL vs closing.
4. **Admin**: Kelola user, konfigurasi sistem, pantau integrasi/error, katalog layanan, approval rules.

---

## 5. Scope & Functional Requirements (FR)

### 5.1 MVP Modules
- **Module A: Lead Management (FR-01, FR-02, FR-03)**: CRUD lead, sumber lead, kontak, owner assignment, duplicate detection (email & phone normalized).
- **Module B: Sales Pipeline (FR-04, FR-05, FR-06)**: Kanban 8 tahapan (`New Lead`, `Contacted`, `Qualified`, `Proposal`, `Negotiation`, `Won`, `Lost`, `Nurture`), lost reason mandatory, deal value, follow-up tasks & overdue notifications.
- **Module C: AI Sales Copilot (FR-07, FR-08, FR-11)**: Agent A (Lead Qualification), Agent B (Sales Copilot drafting), Agent C/D (Analytics & Follow-up orchestrator). Structured outputs, guardrails (no unapproved discounts/promises).
- **Module D: Meta Ads Integration (FR-09, FR-10)**: Webhook Lead Ads, lead retrieval, daily metrics synchronization (Spend, Impressions, Clicks, Leads), campaign attribution.
- **Module E: Automation & Governance (FR-12, FR-13)**: Approval queue untuk aksi berisiko, audit trail log backend, retry & reconciliation.
- **Module F: Owner Dashboard (FR-11)**: KPI ringkasan, leads per source, pipeline value, Meta ad spend vs CRM closed won.
- **Module G: Security & Access**: Auth, RBAC, RLS di database, auditability.

### 5.2 Phase 2 (Future / Should Have)
- Official WhatsApp Business Platform Cloud API.
- Meta Conversions API (CAPI).
- Advanced revenue forecasting & automatic CRM data enrichment.

---

## 6. Acceptance Criteria for MVP Pilot
1. Authorized users can log in securely.
2. Leads can be created, viewed, edited, assigned, and tracked.
3. Pipeline changes are recorded correctly (with lost reason and won confirmation).
4. Website/manual leads are captured with duplicate detection.
5. Meta Lead Ads & Insights synchronized with clear reporting timestamps.
6. AI produces valid structured qualification & drafts adhering to the service catalog.
7. Follow-up tasks & overdue alerts work reliably.
8. Approval policies are enforced server-side.
9. Integration failures are logged and recoverable.
