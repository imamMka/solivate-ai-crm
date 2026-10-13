// =============================================================================
// SOLIVATE AI CRM — Core Domain Types & PRD Contracts
// =============================================================================

export type UserRole = 'owner' | 'sales' | 'marketing' | 'admin';

export type PipelineStage =
  | 'new_lead'
  | 'contacted'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost'
  | 'nurture';

export type LeadSource =
  | 'meta_lead_ads'
  | 'website_form'
  | 'whatsapp_manual'
  | 'referral'
  | 'organic';

export type PriorityLevel = 'high' | 'medium' | 'low';

export interface Profile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  title: string;
  isActive: boolean;
  createdAt: string;
}

export interface Lead {
  id: string;
  fullName: string;
  email: string;
  normalizedEmail: string;
  phone: string;
  normalizedPhone: string;
  companyName: string;
  serviceInterest: string;
  source: LeadSource;
  stage: PipelineStage;
  priority: PriorityLevel;
  ownerId: string | null;
  campaignId: string | null;
  estimatedValueIdr: number;
  lostReason: string | null;
  notes: string;
  isArchived: boolean;
  lastContactedAt: string | null;
  nextFollowupAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadExternalRef {
  id: string;
  leadId: string;
  provider: 'meta_lead_ads' | 'website_form' | 'whatsapp_business' | 'manual_import';
  externalId: string;
  formId: string | null;
  adId: string | null;
  campaignExternalId: string | null;
  createdAt: string;
}

export type ActivityType =
  | 'whatsapp_log'
  | 'note'
  | 'stage_change'
  | 'call_summary'
  | 'email_summary'
  | 'task_completed'
  | 'ai_recommendation'
  | 'approval_executed';

export interface LeadActivity {
  id: string;
  leadId: string;
  actorId: string | null;
  actorName: string;
  activityType: ActivityType;
  direction: 'inbound' | 'outbound' | 'internal';
  summary: string;
  occurredAt: string;
}

export interface Deal {
  id: string;
  leadId: string;
  title: string;
  servicePackage: string;
  valueIdr: number;
  stage: 'proposal' | 'negotiation' | 'won' | 'lost';
  expectedCloseDate: string;
  contractSigned: boolean;
  invoiceIssued: boolean;
  depositReceived: boolean;
  lostReason: string | null;
  ownerId: string | null;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  externalCampaignId: string;
  name: string;
  platform: 'meta_ads' | 'google_ads' | 'organic_initiative';
  objective: string;
  status: 'active' | 'paused' | 'archived';
  dailyBudgetIdr: number;
  lastSyncedAt: string;
}

export interface AdInsightDaily {
  id: string;
  campaignId: string;
  reportingDate: string;
  spendIdr: number;
  impressions: number;
  clicks: number;
  metaReportedLeads: number;
}

export interface TaskItem {
  id: string;
  title: string;
  leadId: string | null;
  leadName: string | null;
  assignedTo: string;
  assignedToName: string;
  dueDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: PriorityLevel;
  notes: string;
  completedAt: string | null;
  createdAt: string;
}

export interface AiQualificationResult {
  serviceInterest: string;
  qualificationSummary: string;
  missingInformation: string[];
  suggestedPriority: PriorityLevel;
  recommendedNextAction: string;
  guardrailNotice: string;
}

export interface AiDraftResult {
  channel: 'whatsapp' | 'email';
  subjectOrHeader: string;
  draftBody: string;
  suggestedFollowupTask: string;
  policyComplianceChecks: string[];
}

export interface AiRunLog {
  id: string;
  agentType: 'lead_qualification' | 'sales_copilot' | 'marketing_analyst' | 'followup_orchestrator';
  leadId: string | null;
  leadName: string | null;
  triggeredByName: string;
  modelName: string;
  inputSummary: string;
  outputSummary: string;
  status: 'succeeded' | 'failed';
  latencyMs: number;
  createdAt: string;
}

export interface ApprovalItem {
  id: string;
  actionType:
    | 'send_whatsapp_followup'
    | 'custom_pricing_proposal'
    | 'mark_deal_won_override'
    | 'archive_high_value_lead';
  leadId: string | null;
  leadName: string | null;
  requestedByName: string;
  payloadSummary: string;
  payloadDetail: Record<string, string | number | boolean>;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  reviewerName: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  executionResult: string | null;
  requestedAt: string;
}

export interface IntegrationEvent {
  id: string;
  provider: 'meta_lead_ads' | 'meta_marketing_api' | 'n8n_workflow' | 'website_webhook';
  externalEventId: string;
  eventType: string;
  status: 'processed' | 'failed' | 'retrying' | 'ignored_duplicate';
  errorMessage: string | null;
  payloadSummary: string;
  createdAt: string;
}

export interface ServiceCatalogItem {
  id: string;
  name: string;
  category: string;
  startingPriceIdr: number;
  typicalTimelineWeeks: string;
  deliverablesSummary: string;
  discountPolicy: string;
}

export interface IntegrationStatusInfo {
  supabaseConfigured: boolean;
  metaAdsConfigured: boolean;
  n8nConfigured: boolean;
  geminiConfigured: boolean;
  dataSourceMode: 'demo_fixtures' | 'empty_workspace';
}

export interface CrmSnapshot {
  profiles: Profile[];
  leads: Lead[];
  externalRefs: LeadExternalRef[];
  activities: LeadActivity[];
  deals: Deal[];
  campaigns: Campaign[];
  adInsights: AdInsightDaily[];
  tasks: TaskItem[];
  aiRuns: AiRunLog[];
  approvals: ApprovalItem[];
  integrationEvents: IntegrationEvent[];
  serviceCatalog: ServiceCatalogItem[];
  integrationStatus: IntegrationStatusInfo;
}

export const PIPELINE_STAGES: { id: PipelineStage; label: string; description: string }[] = [
  { id: 'new_lead', label: 'New Lead', description: 'Uncontacted inbound or logged prospect' },
  { id: 'contacted', label: 'Contacted', description: 'Initial outreach or WhatsApp reply logged' },
  { id: 'qualified', label: 'Qualified', description: 'Scope, budget & decision timeline verified' },
  { id: 'proposal', label: 'Proposal', description: 'Architecture & scope proposal delivered' },
  { id: 'negotiation', label: 'Negotiation', description: 'Reviewing SLA, deliverables, or terms' },
  { id: 'won', label: 'Won', description: 'Signed agreement & deposit verified' },
  { id: 'lost', label: 'Lost', description: 'Closed without conversion (requires reason)' },
  { id: 'nurture', label: 'Nurture', description: 'Long-term follow-up for future cycle' },
];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  meta_lead_ads: 'Meta Lead Ads',
  website_form: 'Website Form',
  whatsapp_manual: 'WhatsApp (Manual Log)',
  referral: 'Client Referral',
  organic: 'Organic / LinkedIn',
};
