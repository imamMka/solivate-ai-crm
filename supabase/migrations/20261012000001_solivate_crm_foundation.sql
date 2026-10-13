-- =============================================================================
-- SOLIVATE AI CRM — Phase 1 Database Migration
-- File: supabase/migrations/20261012000001_solivate_crm_foundation.sql
-- Purpose: Core relational schema, indexes, deduplication constraints, and Row Level Security (RLS)
-- =============================================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- 1. PROFILES (Internal Team Members & Role-Based Access)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role text not null check (role in ('owner', 'sales', 'marketing', 'admin')),
  title text not null default 'Team Member',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. LEADS (Centralized Lead Capture & Qualification)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  normalized_email text generated always as (lower(trim(email))) stored,
  phone text not null,
  normalized_phone text generated always as (regexp_replace(phone, '[^0-9+]', '', 'g')) stored,
  company_name text not null,
  service_interest text not null,
  source text not null check (source in ('meta_lead_ads', 'website_form', 'whatsapp_manual', 'referral', 'organic')),
  stage text not null default 'new_lead' check (stage in (
    'new_lead',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
    'nurture'
  )),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  owner_id uuid references public.profiles(id) on delete set null,
  campaign_id uuid,
  estimated_value_idr bigint not null default 0,
  lost_reason text,
  notes text not null default '',
  is_archived boolean not null default false,
  last_contacted_at timestamptz,
  next_followup_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_stage on public.leads(stage) where not is_archived;
create index if not exists idx_leads_owner on public.leads(owner_id);
create index if not exists idx_leads_source on public.leads(source);
create index if not exists idx_leads_normalized_email on public.leads(normalized_email);
create index if not exists idx_leads_normalized_phone on public.leads(normalized_phone);

-- 3. LEAD EXTERNAL REFERENCES (Idempotent Deduplication per Provider)
create table if not exists public.lead_external_refs (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  provider text not null check (provider in ('meta_lead_ads', 'website_form', 'whatsapp_business', 'manual_import')),
  external_id text not null,
  form_id text,
  ad_id text,
  adset_id text,
  campaign_external_id text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (provider, external_id)
);

create index if not exists idx_lead_external_refs_lead_id on public.lead_external_refs(lead_id);

-- 4. LEAD ACTIVITIES (Communication History, WhatsApp Manual Logs, Stage Transitions, AI Logs)
create table if not exists public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  activity_type text not null check (activity_type in (
    'whatsapp_log',
    'note',
    'stage_change',
    'call_summary',
    'email_summary',
    'task_completed',
    'ai_recommendation',
    'approval_executed'
  )),
  direction text check (direction in ('inbound', 'outbound', 'internal')),
  summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_activities_lead_id on public.lead_activities(lead_id, occurred_at desc);

-- 5. DEALS (Pipeline Deal Value, Closing Forecast & Contract Validation)
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  title text not null,
  service_package text not null,
  value_idr bigint not null default 0,
  stage text not null check (stage in ('proposal', 'negotiation', 'won', 'lost')),
  expected_close_date date,
  contract_signed boolean not null default false,
  invoice_issued boolean not null default false,
  deposit_received boolean not null default false,
  lost_reason text,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_deals_lead_id on public.deals(lead_id);
create index if not exists idx_deals_stage on public.deals(stage);

-- 6. CAMPAIGNS (Meta Ads & Marketing Campaigns)
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  external_campaign_id text not null unique,
  name text not null,
  platform text not null default 'meta_ads' check (platform in ('meta_ads', 'google_ads', 'organic_initiative')),
  objective text not null,
  status text not null check (status in ('active', 'paused', 'archived')),
  daily_budget_idr bigint not null default 0,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. AD INSIGHTS DAILY (Meta-Reported Spend vs CRM Outcomes Attribution)
create table if not exists public.ad_insights_daily (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  reporting_date date not null,
  spend_idr bigint not null default 0,
  impressions integer not null default 0,
  clicks integer not null default 0,
  meta_reported_leads integer not null default 0,
  created_at timestamptz not null default now(),
  unique (campaign_id, reporting_date)
);

create index if not exists idx_ad_insights_date on public.ad_insights_daily(reporting_date desc);

-- 8. TASKS (Follow-up Reminders & Sales Execution)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  lead_id uuid references public.leads(id) on delete cascade,
  assigned_to uuid references public.profiles(id) on delete set null,
  due_date timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  priority text not null default 'medium' check (priority in ('high', 'medium', 'low')),
  notes text not null default '',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tasks_due_status on public.tasks(status, due_date);
create index if not exists idx_tasks_lead_id on public.tasks(lead_id);

-- 9. AI RUNS (Structured AI Execution Audit Log)
create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  agent_type text not null check (agent_type in (
    'lead_qualification',
    'sales_copilot',
    'marketing_analyst',
    'followup_orchestrator'
  )),
  lead_id uuid references public.leads(id) on delete set null,
  triggered_by uuid references public.profiles(id) on delete set null,
  model_name text not null,
  input_summary text not null,
  structured_output jsonb not null default '{}'::jsonb,
  status text not null check (status in ('succeeded', 'failed')),
  latency_ms integer,
  created_at timestamptz not null default now()
);

-- 10. APPROVAL QUEUE (Human-in-the-Loop Governance for High-Impact Actions)
create table if not exists public.approval_queue (
  id uuid primary key default gen_random_uuid(),
  action_type text not null check (action_type in (
    'send_whatsapp_followup',
    'custom_pricing_proposal',
    'mark_deal_won_override',
    'archive_high_value_lead'
  )),
  lead_id uuid references public.leads(id) on delete cascade,
  requested_by_name text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  reviewer_id uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  execution_result text,
  requested_at timestamptz not null default now()
);

create index if not exists idx_approval_queue_status on public.approval_queue(status, requested_at desc);

-- 11. INTEGRATION EVENTS (Webhook Idempotency & Error Recovery Log)
create table if not exists public.integration_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('meta_lead_ads', 'meta_marketing_api', 'n8n_workflow', 'website_webhook')),
  external_event_id text not null,
  event_type text not null,
  status text not null check (status in ('processed', 'failed', 'retrying', 'ignored_duplicate')),
  error_message text,
  payload_summary text not null,
  created_at timestamptz not null default now(),
  unique (provider, external_event_id)
);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_external_refs enable row level security;
alter table public.lead_activities enable row level security;
alter table public.deals enable row level security;
alter table public.campaigns enable row level security;
alter table public.ad_insights_daily enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_runs enable row level security;
alter table public.approval_queue enable row level security;
alter table public.integration_events enable row level security;

-- Helper function to verify active internal team membership and role
create or replace function public.has_crm_role(allowed_roles text[])
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and is_active = true
      and role = any(allowed_roles)
  );
$$;

-- Profiles: All active internal users can view team profiles; only owner/admin can modify roles
create policy "Active team can view profiles"
  on public.profiles for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

create policy "Owner and admin manage profiles"
  on public.profiles for all
  using (public.has_crm_role(array['owner', 'admin']));

-- Leads & Activities & Tasks & Deals: Accessible to active internal team; editable by Owner, Admin, Sales
create policy "Internal team can read leads"
  on public.leads for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

create policy "Sales, Owner, Admin can write leads"
  on public.leads for all
  using (public.has_crm_role(array['owner', 'sales', 'admin']));

create policy "Internal team can read activities"
  on public.lead_activities for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

create policy "Sales, Owner, Admin can insert activities"
  on public.lead_activities for insert
  with check (public.has_crm_role(array['owner', 'sales', 'admin']));

create policy "Internal team can read deals"
  on public.deals for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

create policy "Sales, Owner, Admin can manage deals"
  on public.deals for all
  using (public.has_crm_role(array['owner', 'sales', 'admin']));

create policy "Internal team can read tasks"
  on public.tasks for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

create policy "Sales, Owner, Admin can manage tasks"
  on public.tasks for all
  using (public.has_crm_role(array['owner', 'sales', 'admin']));

-- Campaigns & Ad Insights: Read by all; managed by Marketing, Owner, Admin
create policy "Internal team can read campaigns"
  on public.campaigns for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

create policy "Marketing, Owner, Admin manage campaigns"
  on public.campaigns for all
  using (public.has_crm_role(array['owner', 'marketing', 'admin']));

create policy "Internal team can read ad insights"
  on public.ad_insights_daily for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

-- Approval Queue: Read by all; reviewed ONLY by Owner or Admin
create policy "Internal team can view approval queue"
  on public.approval_queue for select
  using (public.has_crm_role(array['owner', 'sales', 'marketing', 'admin']));

create policy "Owner and Admin can approve or reject"
  on public.approval_queue for update
  using (public.has_crm_role(array['owner', 'admin']));
