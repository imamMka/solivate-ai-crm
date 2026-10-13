import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import * as dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import {
  INITIAL_PROFILES,
  INITIAL_SERVICE_CATALOG,
  INITIAL_CAMPAIGNS,
  INITIAL_AD_INSIGHTS,
  INITIAL_LEADS,
  INITIAL_EXTERNAL_REFS,
  INITIAL_ACTIVITIES,
  INITIAL_DEALS,
  INITIAL_TASKS,
  INITIAL_APPROVALS,
  INITIAL_AI_RUNS,
  INITIAL_INTEGRATION_EVENTS,
} from './src/services/demoFixtures.ts';
import {
  createLeadSchema,
  updateStageSchema,
  logActivitySchema,
  createTaskSchema,
  reviewApprovalSchema,
} from './src/lib/validations/crmSchemas.ts';
import type {
  CrmSnapshot,
  Lead,
  LeadActivity,
  TaskItem,
  ApprovalItem,
  AiRunLog,
  Profile,
  IntegrationEvent,
  LeadExternalRef,
} from './src/types/crm.ts';

dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Server-side in-memory store initialized with clearly labeled Demo Fixtures
// Can be toggled between 'demo_fixtures' and 'empty_workspace' to verify zero-data empty states
let workspaceMode: 'demo_fixtures' | 'empty_workspace' = 'demo_fixtures';

let profiles: Profile[] = structuredClone(INITIAL_PROFILES);
let leads: Lead[] = structuredClone(INITIAL_LEADS);
let externalRefs = structuredClone(INITIAL_EXTERNAL_REFS);
let activities: LeadActivity[] = structuredClone(INITIAL_ACTIVITIES);
let deals = structuredClone(INITIAL_DEALS);
let campaigns = structuredClone(INITIAL_CAMPAIGNS);
let adInsights = structuredClone(INITIAL_AD_INSIGHTS);
let tasks: TaskItem[] = structuredClone(INITIAL_TASKS);
let approvals: ApprovalItem[] = structuredClone(INITIAL_APPROVALS);
let aiRuns: AiRunLog[] = structuredClone(INITIAL_AI_RUNS);
let integrationEvents = structuredClone(INITIAL_INTEGRATION_EVENTS);
const serviceCatalog = structuredClone(INITIAL_SERVICE_CATALOG);

function getIntegrationStatus() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseConfigured = Boolean(
    supabaseUrl &&
      supabaseAnon &&
      !supabaseUrl.includes('your-project-ref') &&
      supabaseUrl.startsWith('https://')
  );

  const metaAppId = process.env.META_APP_ID;
  const metaToken = process.env.META_SYSTEM_USER_ACCESS_TOKEN;
  const metaAdsConfigured = Boolean(
    metaAppId &&
      metaToken &&
      !metaAppId.includes('your-meta-app-id') &&
      metaToken.trim().length > 10
  );

  const n8nUrl = process.env.N8N_WEBHOOK_BASE_URL;
  const n8nSecret = process.env.N8N_API_SECRET;
  const n8nConfigured = Boolean(
    n8nUrl &&
      n8nSecret &&
      !n8nSecret.includes('your-n8n-signing-secret') &&
      n8nUrl.startsWith('http')
  );

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiConfigured = Boolean(
    geminiKey &&
      geminiKey !== 'MY_GEMINI_API_KEY' &&
      geminiKey.trim().length > 10
  );

  return {
    supabaseConfigured,
    metaAdsConfigured,
    n8nConfigured,
    geminiConfigured,
    dataSourceMode: workspaceMode,
  };
}

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
}

function buildSnapshot(): CrmSnapshot {
  if (workspaceMode === 'empty_workspace') {
    return {
      profiles,
      leads: [],
      externalRefs: [],
      activities: [],
      deals: [],
      campaigns: [],
      adInsights: [],
      tasks: [],
      aiRuns: [],
      approvals: [],
      integrationEvents: [],
      serviceCatalog,
      integrationStatus: getIntegrationStatus(),
    };
  }

  return {
    profiles,
    leads,
    externalRefs,
    activities,
    deals,
    campaigns,
    adInsights,
    tasks,
    aiRuns,
    approvals,
    integrationEvents,
    serviceCatalog,
    integrationStatus: getIntegrationStatus(),
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // 1. GET full CRM snapshot
  app.get('/api/crm/snapshot', (_req: Request, res: Response) => {
    res.json(buildSnapshot());
  });

  // 2. Toggle Workspace Data Mode (Demo Fixtures vs Empty State Verification)
  app.post('/api/crm/workspace-mode', (req: Request, res: Response) => {
    const { mode, resetFixtures } = req.body as {
      mode?: 'demo_fixtures' | 'empty_workspace';
      resetFixtures?: boolean;
    };

    if (resetFixtures) {
      profiles = structuredClone(INITIAL_PROFILES);
      leads = structuredClone(INITIAL_LEADS);
      externalRefs = structuredClone(INITIAL_EXTERNAL_REFS);
      activities = structuredClone(INITIAL_ACTIVITIES);
      deals = structuredClone(INITIAL_DEALS);
      campaigns = structuredClone(INITIAL_CAMPAIGNS);
      adInsights = structuredClone(INITIAL_AD_INSIGHTS);
      tasks = structuredClone(INITIAL_TASKS);
      approvals = structuredClone(INITIAL_APPROVALS);
      aiRuns = structuredClone(INITIAL_AI_RUNS);
      integrationEvents = structuredClone(INITIAL_INTEGRATION_EVENTS);
      workspaceMode = 'demo_fixtures';
    } else if (mode === 'demo_fixtures' || mode === 'empty_workspace') {
      workspaceMode = mode;
    }

    res.json(buildSnapshot());
  });

  // 3. Create Lead with FR-02 Deduplication Check (Normalized Email & Phone)
  app.post('/api/crm/leads', (req: Request, res: Response) => {
    const parsed = createLeadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const data = parsed.data;
    const normalizedEmail = data.email.trim().toLowerCase();
    const normalizedPhone = data.phone.replace(/[^0-9+]/g, '');

    const forceCreate = Boolean(req.body.forceDuplicateOverride);
    const existingDuplicate = leads.find(
      (l) =>
        !l.isArchived &&
        (l.normalizedEmail === normalizedEmail || l.normalizedPhone === normalizedPhone)
    );

    if (existingDuplicate && !forceCreate) {
      return res.status(409).json({
        error: `Potential duplicate detected: ${existingDuplicate.fullName} (${existingDuplicate.companyName}) shares the same email or phone number.`,
        duplicateLead: existingDuplicate,
      });
    }

    if (workspaceMode === 'empty_workspace') {
      workspaceMode = 'demo_fixtures';
    }

    const now = new Date().toISOString();
    const newLead: Lead = {
      id: `lead-${Date.now()}`,
      fullName: data.fullName,
      email: data.email,
      normalizedEmail,
      phone: data.phone,
      normalizedPhone,
      companyName: data.companyName,
      serviceInterest: data.serviceInterest,
      source: data.source,
      stage: 'new_lead',
      priority: data.priority,
      ownerId: data.ownerId,
      campaignId: data.source === 'meta_lead_ads' ? campaigns[0]?.id ?? null : null,
      estimatedValueIdr: data.estimatedValueIdr,
      lostReason: null,
      notes: data.notes,
      isArchived: false,
      lastContactedAt: null,
      nextFollowupAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    leads = [newLead, ...leads];

    const ownerProfile = profiles.find((p) => p.id === data.ownerId);
    const creationActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      leadId: newLead.id,
      actorId: ownerProfile?.id ?? null,
      actorName: ownerProfile?.fullName ?? 'Internal Team',
      activityType: 'note',
      direction: 'internal',
      summary: `Lead created via ${data.source.replace(/_/g, ' ')}. Assigned to ${ownerProfile?.fullName ?? 'Unassigned'}.`,
      occurredAt: now,
    };
    activities = [creationActivity, ...activities];

    return res.status(201).json({ lead: newLead, snapshot: buildSnapshot() });
  });

  // 4. Update Lead Pipeline Stage with PRD Business Rules (FR-04 & Section 7G)
  app.patch('/api/crm/leads/:id/stage', (req: Request, res: Response) => {
    const { id } = req.params;
    const parsed = updateStageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid stage update payload' });
    }

    const leadIndex = leads.findIndex((l) => l.id === id);
    if (leadIndex === -1) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    const lead = leads[leadIndex];
    const { stage, lostReason, contractSigned, depositReceived } = parsed.data;
    const actorName = (req.body.actorName as string) || 'Internal User';

    // PRD Rule: Lost stage requires a lost reason
    if (stage === 'lost' && (!lostReason || lostReason.trim().length < 4)) {
      return res.status(400).json({
        error: 'Business Rule Violation: Moving a lead to Lost requires documenting a clear lost reason (minimum 4 characters).',
      });
    }

    // PRD Rule: Moving to Won does not automatically prove payment was received; verify contract & deposit or existing deal status
    if (stage === 'won') {
      const associatedDeal = deals.find((d) => d.leadId === lead.id);
      const isVerifiedWon =
        (contractSigned && depositReceived) ||
        (associatedDeal?.contractSigned && associatedDeal?.depositReceived);

      if (!isVerifiedWon) {
        return res.status(400).json({
          error:
            'Business Rule Gate: A lead cannot be marked Won without confirming both a signed contract and deposit receipt.',
          requiresWonVerification: true,
        });
      }

      if (associatedDeal) {
        associatedDeal.stage = 'won';
        associatedDeal.contractSigned = true;
        associatedDeal.depositReceived = true;
        associatedDeal.updatedAt = new Date().toISOString();
      } else {
        deals = [
          {
            id: `deal-${Date.now()}`,
            leadId: lead.id,
            title: `${lead.companyName} — ${lead.serviceInterest}`,
            servicePackage: lead.serviceInterest,
            valueIdr: lead.estimatedValueIdr,
            stage: 'won',
            expectedCloseDate: new Date().toISOString().slice(0, 10),
            contractSigned: true,
            invoiceIssued: true,
            depositReceived: true,
            lostReason: null,
            ownerId: lead.ownerId,
            updatedAt: new Date().toISOString(),
          },
          ...deals,
        ];
      }
    }

    const previousStage = lead.stage;
    const now = new Date().toISOString();
    const updatedLead: Lead = {
      ...lead,
      stage,
      lostReason: stage === 'lost' ? lostReason ?? null : lead.lostReason,
      updatedAt: now,
    };

    leads[leadIndex] = updatedLead;

    const stageActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      leadId: lead.id,
      actorId: lead.ownerId,
      actorName,
      activityType: 'stage_change',
      direction: 'internal',
      summary:
        stage === 'lost'
          ? `Stage changed from ${previousStage} to Lost. Reason: ${lostReason}`
          : stage === 'won'
          ? `Stage changed from ${previousStage} to Won (Contract signed & deposit verified).`
          : `Stage updated from ${previousStage.replace(/_/g, ' ')} to ${stage.replace(/_/g, ' ')}.`,
      occurredAt: now,
    };
    activities = [stageActivity, ...activities];

    return res.json({ lead: updatedLead, snapshot: buildSnapshot() });
  });

  // 5. Log Lead Activity / Manual WhatsApp Conversation (Section 9 & FR-05)
  app.post('/api/crm/activities', (req: Request, res: Response) => {
    const parsed = logActivitySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid activity payload',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { leadId, activityType, direction, summary, nextFollowupDate } = parsed.data;
    const actorName = (req.body.actorName as string) || 'Nadia Kusuma';
    const leadIndex = leads.findIndex((l) => l.id === leadId);
    if (leadIndex === -1) {
      return res.status(404).json({ error: 'Associated lead not found' });
    }

    const now = new Date().toISOString();
    const newActivity: LeadActivity = {
      id: `act-${Date.now()}`,
      leadId,
      actorId: leads[leadIndex].ownerId,
      actorName,
      activityType,
      direction,
      summary,
      occurredAt: now,
    };

    activities = [newActivity, ...activities];

    leads[leadIndex] = {
      ...leads[leadIndex],
      lastContactedAt: now,
      nextFollowupAt: nextFollowupDate
        ? new Date(nextFollowupDate).toISOString()
        : leads[leadIndex].nextFollowupAt,
      updatedAt: now,
    };

    return res.status(201).json({ activity: newActivity, snapshot: buildSnapshot() });
  });

  // 6. Create Task (FR-06)
  app.post('/api/crm/tasks', (req: Request, res: Response) => {
    const parsed = createTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parsed.error.flatten().fieldErrors,
      });
    }

    const { title, leadId, assignedTo, dueDate, priority, notes } = parsed.data;
    const assignee = profiles.find((p) => p.id === assignedTo);
    const relatedLead = leadId ? leads.find((l) => l.id === leadId) : null;

    const newTask: TaskItem = {
      id: `tsk-${Date.now()}`,
      title,
      leadId,
      leadName: relatedLead ? `${relatedLead.fullName} (${relatedLead.companyName})` : null,
      assignedTo,
      assignedToName: assignee?.fullName ?? 'Team Member',
      dueDate: new Date(dueDate).toISOString(),
      status: 'pending',
      priority,
      notes,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };

    tasks = [newTask, ...tasks];
    return res.status(201).json({ task: newTask, snapshot: buildSnapshot() });
  });

  // 7. Toggle Task Completion (FR-06)
  app.patch('/api/crm/tasks/:id/toggle', (req: Request, res: Response) => {
    const { id } = req.params;
    const taskIndex = tasks.findIndex((t) => t.id === id);
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const current = tasks[taskIndex];
    const now = new Date().toISOString();
    const nextStatus = current.status === 'completed' ? 'pending' : 'completed';

    tasks[taskIndex] = {
      ...current,
      status: nextStatus,
      completedAt: nextStatus === 'completed' ? now : null,
    };

    if (nextStatus === 'completed' && current.leadId) {
      activities = [
        {
          id: `act-${Date.now()}`,
          leadId: current.leadId,
          actorId: current.assignedTo,
          actorName: current.assignedToName,
          activityType: 'task_completed',
          direction: 'internal',
          summary: `Completed follow-up task: "${current.title}"`,
          occurredAt: now,
        },
        ...activities,
      ];
    }

    return res.json({ task: tasks[taskIndex], snapshot: buildSnapshot() });
  });

  // 8. Review Approval Queue Item (FR-12 Server-Side Role & Execution Gate)
  app.post('/api/crm/approvals/:id/review', (req: Request, res: Response) => {
    const { id } = req.params;
    const { decision, reviewNotes, reviewerRole, reviewerName } = req.body as {
      decision: 'approved' | 'rejected';
      reviewNotes: string;
      reviewerRole: string;
      reviewerName: string;
    };

    // Enforce Owner/Admin role on backend
    if (reviewerRole !== 'owner' && reviewerRole !== 'admin') {
      return res.status(403).json({
        error:
          'Authorization Denied: Only Owner or Admin roles can approve or reject queued governance actions.',
      });
    }

    const parsed = reviewApprovalSchema.safeParse({ decision, reviewNotes });
    if (!parsed.success) {
      return res.status(400).json({
        error: parsed.error.issues[0]?.message || 'Review note is required',
      });
    }

    const index = approvals.findIndex((a) => a.id === id);
    if (index === -1) {
      return res.status(404).json({ error: 'Approval request not found' });
    }

    if (approvals[index].status !== 'pending') {
      return res.status(400).json({
        error: `Approval request has already been ${approvals[index].status}.`,
      });
    }

    const now = new Date().toISOString();
    const item = approvals[index];
    const executionResult =
      decision === 'approved'
        ? `Approved by ${reviewerName}. Recorded in audit trail (External execution pending live integration).`
        : `Rejected by ${reviewerName}. Action halted.`;

    approvals[index] = {
      ...item,
      status: decision,
      reviewerName: reviewerName || 'Raka Pratama',
      reviewedAt: now,
      reviewNotes: parsed.data.reviewNotes,
      executionResult,
    };

    if (item.leadId) {
      activities = [
        {
          id: `act-${Date.now()}`,
          leadId: item.leadId,
          actorId: null,
          actorName: reviewerName || 'Raka Pratama',
          activityType: 'approval_executed',
          direction: 'internal',
          summary: `Approval [${item.actionType}] ${decision.toUpperCase()}: ${parsed.data.reviewNotes}`,
          occurredAt: now,
        },
        ...activities,
      ];
    }

    return res.json({ approval: approvals[index], snapshot: buildSnapshot() });
  });

  // 9. AI Lead Qualification & Copilot Draft Generation (FR-07, FR-08, FR-11 via @google/genai)
  app.post('/api/ai/lead-assist', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { leadId, mode, triggeredByName, customInstruction } = req.body as {
      leadId: string;
      mode: 'qualify' | 'draft_followup';
      triggeredByName?: string;
      customInstruction?: string;
    };

    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found for AI analysis' });
    }

    const leadActivities = activities.filter((a) => a.leadId === lead.id);
    const catalogItem = serviceCatalog.find((s) => s.name === lead.serviceInterest) ?? serviceCatalog[0];

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'AI service is not configured (GEMINI_API_KEY missing). Configure the secret to enable live AI qualification and drafting.',
      });
    }

    try {
      if (mode === 'qualify') {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Analyze this Solivate Studio CRM lead and return a structured qualification assessment.
Lead Details:
- Name: ${lead.fullName}
- Company: ${lead.companyName}
- Service Interest: ${lead.serviceInterest}
- Source: ${lead.source}
- Current Stage: ${lead.stage}
- Estimated Value (IDR): ${lead.estimatedValueIdr}
- Notes: ${lead.notes || 'None'}
- Activity History (${leadActivities.length} logs): ${leadActivities
            .map((a) => `[${a.occurredAt}] (${a.activityType}): ${a.summary}`)
            .join(' | ')}
- Official Service Catalog Entry: ${catalogItem.name} (Starting IDR ${catalogItem.startingPriceIdr}, Timeline: ${catalogItem.typicalTimelineWeeks}, Policy: ${catalogItem.discountPolicy})`,
          config: {
            systemInstruction:
              'You are Agent A (Lead Qualification Assistant) for Solivate Studio CRM. Do NOT fabricate missing client facts. Treat priority as a recommendation only. Never commit to unapproved discounts or binding contract deadlines.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                serviceInterest: { type: Type.STRING },
                qualificationSummary: { type: Type.STRING },
                missingInformation: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                suggestedPriority: {
                  type: Type.STRING,
                  description: 'Must be one of: high, medium, low',
                },
                recommendedNextAction: { type: Type.STRING },
                guardrailNotice: { type: Type.STRING },
              },
              required: [
                'serviceInterest',
                'qualificationSummary',
                'missingInformation',
                'suggestedPriority',
                'recommendedNextAction',
                'guardrailNotice',
              ],
            },
          },
        });

        const parsedOutput = JSON.parse(response.text || '{}');
        const latencyMs = Date.now() - startTime;

        const runLog: AiRunLog = {
          id: `air-${Date.now()}`,
          agentType: 'lead_qualification',
          leadId: lead.id,
          leadName: `${lead.fullName} (${lead.companyName})`,
          triggeredByName: triggeredByName || 'Internal User',
          modelName: GEMINI_MODEL,
          inputSummary: `Lead ${lead.fullName} + ${leadActivities.length} activity logs`,
          outputSummary: parsedOutput.qualificationSummary || 'Qualification completed',
          status: 'succeeded',
          latencyMs,
          createdAt: new Date().toISOString(),
        };
        aiRuns = [runLog, ...aiRuns];

        return res.json({
          qualification: parsedOutput,
          runLog,
          snapshot: buildSnapshot(),
        });
      } else {
        const response = await ai.models.generateContent({
          model: GEMINI_MODEL,
          contents: `Draft a professional, consultative follow-up message for this Solivate Studio prospect.
Lead Details:
- Name: ${lead.fullName}
- Company: ${lead.companyName}
- Service Interest: ${lead.serviceInterest}
- Current Stage: ${lead.stage}
- Notes: ${lead.notes}
- Recent Activities: ${leadActivities.map((a) => a.summary).join(' | ')}
- Approved Service Catalog Reference: ${catalogItem.name}, Starting Price Rp ${catalogItem.startingPriceIdr.toLocaleString('id-ID')}, Typical Timeline ${catalogItem.typicalTimelineWeeks}.
- Custom User Direction: ${customInstruction || 'Write a concise, polite WhatsApp follow-up in professional Bahasa Indonesia or English matching the lead context.'}`,
          config: {
            systemInstruction:
              'You are Agent B (Sales Copilot) for Solivate Studio. Draft helpful client messages grounded strictly in the approved service catalog and lead history. Never invent discounts, binding delivery dates, or contract guarantees.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                channel: { type: Type.STRING, description: 'whatsapp or email' },
                subjectOrHeader: { type: Type.STRING },
                draftBody: { type: Type.STRING },
                suggestedFollowupTask: { type: Type.STRING },
                policyComplianceChecks: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
              },
              required: [
                'channel',
                'subjectOrHeader',
                'draftBody',
                'suggestedFollowupTask',
                'policyComplianceChecks',
              ],
            },
          },
        });

        const parsedDraft = JSON.parse(response.text || '{}');
        const latencyMs = Date.now() - startTime;

        const runLog: AiRunLog = {
          id: `air-${Date.now()}`,
          agentType: 'sales_copilot',
          leadId: lead.id,
          leadName: `${lead.fullName} (${lead.companyName})`,
          triggeredByName: triggeredByName || 'Internal User',
          modelName: GEMINI_MODEL,
          inputSummary: `Follow-up draft for ${lead.fullName} (${lead.stage})`,
          outputSummary: parsedDraft.subjectOrHeader || 'Generated sales follow-up draft',
          status: 'succeeded',
          latencyMs,
          createdAt: new Date().toISOString(),
        };
        aiRuns = [runLog, ...aiRuns];

        return res.json({
          draft: parsedDraft,
          runLog,
          snapshot: buildSnapshot(),
        });
      }
    } catch (error: any) {
      console.error('AI Lead Assist Error:', error);
      return res.status(500).json({
        error: error?.message || 'Failed to execute AI sales assistant request.',
      });
    }
  });

  // 10. AI Executive Business Brief & Copilot Query (FR-11 Deterministic SQL/App Metrics + AI Interpretation)
  app.post('/api/ai/business-brief', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { prompt, triggeredByName } = req.body as {
      prompt?: string;
      triggeredByName?: string;
    };

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        error:
          'GEMINI_API_KEY is not configured on the server. AI interpretation requires an active Gemini API key.',
      });
    }

    const activeLeads = workspaceMode === 'empty_workspace' ? [] : leads.filter((l) => !l.isArchived);
    const totalPipelineIdr = activeLeads
      .filter((l) => !['won', 'lost'].includes(l.stage))
      .reduce((acc, l) => acc + l.estimatedValueIdr, 0);
    const wonValueIdr = activeLeads
      .filter((l) => l.stage === 'won')
      .reduce((acc, l) => acc + l.estimatedValueIdr, 0);
    const overdueTaskCount =
      workspaceMode === 'empty_workspace'
        ? 0
        : tasks.filter((t) => t.status === 'pending' && new Date(t.dueDate) < new Date('2026-10-12T12:00:00Z'))
            .length;
    const totalMetaSpendIdr =
      workspaceMode === 'empty_workspace'
        ? 0
        : adInsights.reduce((acc, i) => acc + i.spendIdr, 0);
    const totalMetaLeads =
      workspaceMode === 'empty_workspace'
        ? 0
        : adInsights.reduce((acc, i) => acc + i.metaReportedLeads, 0);

    try {
      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: `Interpret these deterministic Solivate AI CRM operational metrics (Reporting Date: 12 Oct 2026, Data Mode: ${workspaceMode}):
- Total Active Leads: ${activeLeads.length}
- Active Open Pipeline Value: Rp ${totalPipelineIdr.toLocaleString('id-ID')}
- Closed Won Value: Rp ${wonValueIdr.toLocaleString('id-ID')}
- Overdue Follow-up Tasks: ${overdueTaskCount}
- Meta Ads Total Spend (Oct 8–11): Rp ${totalMetaSpendIdr.toLocaleString('id-ID')}
- Meta-Reported Conversions: ${totalMetaLeads}
- CRM-Attributed Meta Leads: ${activeLeads.filter((l) => l.source === 'meta_lead_ads').length}
- User Question / Focus: ${prompt || 'Provide a concise executive brief highlighting immediate bottlenecks, overdue follow-ups, and Meta Ads attribution quality.'}`,
        config: {
          systemInstruction:
            'You are the Solivate Studio AI Operations & Marketing Analyst (Agent C & D). You must ONLY interpret the deterministic numbers provided. Never invent metrics, never promise autonomous budget changes, and clearly separate AI recommendations from verified CRM records.',
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headlineSummary: { type: Type.STRING },
              keyObservations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              recommendedActions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              dataDisclaimer: { type: Type.STRING },
            },
            required: [
              'headlineSummary',
              'keyObservations',
              'recommendedActions',
              'dataDisclaimer',
            ],
          },
        },
      });

      const parsedBrief = JSON.parse(response.text || '{}');
      const latencyMs = Date.now() - startTime;

      const runLog: AiRunLog = {
        id: `air-${Date.now()}`,
        agentType: 'marketing_analyst',
        leadId: null,
        leadName: null,
        triggeredByName: triggeredByName || 'Raka Pratama',
        modelName: GEMINI_MODEL,
        inputSummary: prompt || 'Executive Business Brief generation',
        outputSummary: parsedBrief.headlineSummary || 'Generated executive brief',
        status: 'succeeded',
        latencyMs,
        createdAt: new Date().toISOString(),
      };
      aiRuns = [runLog, ...aiRuns];

      return res.json({
        brief: parsedBrief,
        runLog,
        snapshot: buildSnapshot(),
      });
    } catch (error: any) {
      console.error('AI Business Brief Error:', error);
      return res.status(500).json({
        error: error?.message || 'Failed to generate AI business brief.',
      });
    }
  });

  // 11. Meta Ads Webhook Verification (FR-09)
  app.get('/api/webhooks/meta', (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN;

    if (mode === 'subscribe' && verifyToken && token === verifyToken) {
      console.log('[Meta Webhook] Verification successful');
      return res.status(200).send(challenge);
    }
    return res.status(403).json({ error: 'Webhook verification token mismatch' });
  });

  // 12. Meta Lead Ads Inbound Event Receiver (FR-09 & FR-13)
  app.post('/api/webhooks/meta', (req: Request, res: Response) => {
    const eventId = `evt-${Date.now()}`;
    const payload = req.body;

    let leadCreated: Lead | null = null;
    let duplicateDetected = false;

    // Support direct JSON test fields, Meta test tool, or Meta entry structure
    const fullName =
      payload?.fullName ||
      payload?.name ||
      payload?.full_name ||
      payload?.entry?.[0]?.changes?.[0]?.value?.field_data?.find((f: any) => f.name === 'full_name')?.values?.[0];
    const email =
      payload?.email ||
      payload?.entry?.[0]?.changes?.[0]?.value?.field_data?.find((f: any) => f.name === 'email')?.values?.[0];
    const phone =
      payload?.phone ||
      payload?.phone_number ||
      payload?.entry?.[0]?.changes?.[0]?.value?.field_data?.find((f: any) => f.name === 'phone_number')?.values?.[0];
    const companyName =
      payload?.companyName ||
      payload?.company ||
      payload?.entry?.[0]?.changes?.[0]?.value?.field_data?.find((f: any) => f.name === 'company_name')?.values?.[0] ||
      'Meta Ads Prospect';
    const serviceInterest =
      payload?.serviceInterest ||
      payload?.service ||
      'Design System & Brand Portal';
    const formId = (payload?.form_id || payload?.formId || 'form-meta-lead-gen') as string;
    const adId = (payload?.ad_id || payload?.adId || 'ad-creative-meta-01') as string;
    const externalLeadId = (payload?.leadgen_id ||
      payload?.entry?.[0]?.changes?.[0]?.value?.leadgen_id ||
      payload?.entry?.[0]?.id ||
      `leadgen-${Date.now()}`) as string;

    if (fullName && (email || phone)) {
      const normalizedEmail = (email || '').trim().toLowerCase();
      const normalizedPhone = (phone || '').replace(/[^0-9+]/g, '');

      // Check deduplication per FR-02
      const existingDuplicate = leads.find(
        (l) =>
          !l.isArchived &&
          ((normalizedEmail && l.normalizedEmail === normalizedEmail) ||
            (normalizedPhone && l.normalizedPhone === normalizedPhone))
      );

      if (existingDuplicate) {
        duplicateDetected = true;
      } else {
        const now = new Date().toISOString();
        const salesOwner = profiles.find((p) => p.role === 'sales') || profiles[0];
        leadCreated = {
          id: `lead-${Date.now()}`,
          fullName,
          email: email || '',
          normalizedEmail,
          phone: phone || '',
          normalizedPhone,
          companyName,
          serviceInterest,
          source: 'meta_lead_ads',
          stage: 'new_lead',
          priority: 'high',
          ownerId: salesOwner?.id || null,
          campaignId: campaigns[0]?.id || null,
          estimatedValueIdr: 45000000,
          lostReason: null,
          notes: `Ingested automatically via Meta Lead Ads Webhook (Form ID: ${formId}, Ad ID: ${adId}).`,
          isArchived: false,
          lastContactedAt: null,
          nextFollowupAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          createdAt: now,
          updatedAt: now,
        };

        leads = [leadCreated, ...leads];

        // Add activity
        const act: LeadActivity = {
          id: `act-${Date.now()}`,
          leadId: leadCreated.id,
          actorId: salesOwner?.id || null,
          actorName: 'Meta Lead Ads Webhook',
          activityType: 'note',
          direction: 'inbound',
          summary: `Lead automatically captured from Meta Lead Ads campaign "${campaigns[0]?.name || 'Active Campaign'}". Assigned to ${salesOwner?.fullName || 'Sales'}.`,
          occurredAt: now,
        };
        activities = [act, ...activities];

        // Add external ref
        const extRef: LeadExternalRef = {
          id: `ext-${Date.now()}`,
          leadId: leadCreated.id,
          provider: 'meta_lead_ads',
          externalId: externalLeadId,
          formId,
          adId,
          campaignExternalId: campaigns[0]?.externalCampaignId || '12020492819280111',
          createdAt: now,
        };
        externalRefs = [extRef, ...externalRefs];
      }
    }

    const eventLog: IntegrationEvent = {
      id: eventId,
      provider: 'meta_lead_ads',
      externalEventId: externalLeadId,
      eventType: 'leadgen_received',
      status: duplicateDetected ? 'ignored_duplicate' : 'processed',
      errorMessage: duplicateDetected ? 'Duplicate contact info detected; record skipped merge' : null,
      payloadSummary: leadCreated
        ? `Captured new Meta Lead: ${leadCreated.fullName} (${leadCreated.companyName})`
        : duplicateDetected
        ? `Ignored duplicate Meta lead submission for ${email || phone}`
        : `Inbound Meta Webhook notification (${payload?.entry?.length || 0} entries)`,
      createdAt: new Date().toISOString(),
    };
    integrationEvents = [eventLog, ...integrationEvents];

    return res.status(200).json({
      received: true,
      eventId,
      leadCreated: leadCreated ? { id: leadCreated.id, name: leadCreated.fullName } : null,
      duplicateDetected,
      snapshot: buildSnapshot(),
    });
  });

  // 13. n8n Automation Webhook Receiver (FR-12 & FR-13)
  app.post('/api/webhooks/n8n', (req: Request, res: Response) => {
    const authHeader = req.headers['x-n8n-secret'] || req.headers['authorization'];
    const expectedSecret = process.env.N8N_API_SECRET;

    if (expectedSecret && authHeader !== expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
      return res.status(401).json({ error: 'Unauthorized: n8n secret mismatch' });
    }

    const { actionType, payloadSummary } = req.body as {
      actionType?: string;
      payloadSummary?: string;
    };

    const eventLog: IntegrationEvent = {
      id: `evt-${Date.now()}`,
      provider: 'n8n_workflow',
      externalEventId: `n8n-${Date.now()}`,
      eventType: actionType || 'scheduled_sync',
      status: 'processed',
      errorMessage: null,
      payloadSummary: payloadSummary || 'n8n automation trigger processed successfully',
      createdAt: new Date().toISOString(),
    };
    integrationEvents = [eventLog, ...integrationEvents];

    return res.status(200).json({ success: true, eventId: eventLog.id });
  });

  // Vite middleware for development or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Solivate AI CRM server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
