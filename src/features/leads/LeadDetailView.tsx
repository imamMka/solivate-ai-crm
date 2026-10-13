import React, { useState } from 'react';
import {
  ArrowLeft,
  MessageSquare,
  Sparkles,
  CheckSquare,
  Plus,
  Copy,
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type {
  CrmSnapshot,
  PipelineStage,
  PriorityLevel,
  AiQualificationResult,
  AiDraftResult,
  Profile,
} from '../../types/crm.ts';
import { PIPELINE_STAGES, LEAD_SOURCE_LABELS } from '../../types/crm.ts';
import { StatusBadge, EmptyState } from '../../components/ui/Primitives.tsx';
import {
  formatIdr,
  formatDateTime,
  formatShortDate,
  isTaskOverdue,
} from '../../lib/formatters.ts';

export interface LeadDetailViewProps {
  leadId: string;
  snapshot: CrmSnapshot;
  currentUser: Profile;
  onBack: () => void;
  onUpdateStage: (
    leadId: string,
    stage: PipelineStage,
    options?: {
      lostReason?: string;
      contractSigned?: boolean;
      depositReceived?: boolean;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onLogActivity: (payload: {
    leadId: string;
    activityType: 'whatsapp_log' | 'note' | 'call_summary' | 'email_summary';
    direction: 'inbound' | 'outbound' | 'internal';
    summary: string;
    nextFollowupDate?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onCreateTask: (payload: {
    title: string;
    leadId: string | null;
    assignedTo: string;
    dueDate: string;
    priority: PriorityLevel;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onToggleTask: (taskId: string) => Promise<void>;
  onRunAiAssist: (
    leadId: string,
    mode: 'qualify' | 'draft_followup',
    customInstruction?: string
  ) => Promise<{
    qualification?: AiQualificationResult;
    draft?: AiDraftResult;
    error?: string;
  }>;
}

export const LeadDetailView: React.FC<LeadDetailViewProps> = ({
  leadId,
  snapshot,
  currentUser,
  onBack,
  onUpdateStage,
  onLogActivity,
  onCreateTask,
  onToggleTask,
  onRunAiAssist,
}) => {
  const lead = snapshot.leads.find((l) => l.id === leadId);

  const [selectedStage, setSelectedStage] = useState<PipelineStage>(
    lead?.stage || 'new_lead'
  );
  const [lostReasonInput, setLostReasonInput] = useState(lead?.lostReason || '');
  const [contractSigned, setContractSigned] = useState(false);
  const [depositReceived, setDepositReceived] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [stageSuccess, setStageSuccess] = useState<string | null>(null);

  // Activity Log Form (Supports Manual WhatsApp Logging per Section 9)
  const [activityType, setActivityType] = useState<
    'whatsapp_log' | 'note' | 'call_summary' | 'email_summary'
  >('whatsapp_log');
  const [direction, setDirection] = useState<'inbound' | 'outbound' | 'internal'>(
    'inbound'
  );
  const [activitySummary, setActivitySummary] = useState('');
  const [nextFollowupDate, setNextFollowupDate] = useState('2026-10-14');
  const [activityError, setActivityError] = useState<string | null>(null);

  // Inline Task Creation Form (Required by Section 12: create a task without navigating away)
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('2026-10-13');
  const [newTaskPriority, setNewTaskPriority] = useState<PriorityLevel>('high');
  const [taskError, setTaskError] = useState<string | null>(null);

  // AI Qualification & Follow-up Draft State
  const [aiLoadingMode, setAiLoadingMode] = useState<
    'qualify' | 'draft_followup' | null
  >(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [qualificationResult, setQualificationResult] =
    useState<AiQualificationResult | null>(null);
  const [draftResult, setDraftResult] = useState<AiDraftResult | null>(null);
  const [copiedDraft, setCopiedDraft] = useState(false);

  if (!lead) {
    return (
      <EmptyState
        title="Lead record not found"
        description="The requested lead ID could not be located in the active workspace."
        actionLabel="Return to Leads Directory"
        onAction={onBack}
      />
    );
  }

  const owner = snapshot.profiles.find((p) => p.id === lead.ownerId);
  const campaign = snapshot.campaigns.find((c) => c.id === lead.campaignId);
  const externalRef = snapshot.externalRefs.find((r) => r.leadId === lead.id);
  const deal = snapshot.deals.find((d) => d.leadId === lead.id);
  const leadActivities = snapshot.activities.filter((a) => a.leadId === lead.id);
  const leadTasks = snapshot.tasks.filter((t) => t.leadId === lead.id);

  const handleApplyStage = async (e: React.FormEvent) => {
    e.preventDefault();
    setStageError(null);
    setStageSuccess(null);

    const res = await onUpdateStage(lead.id, selectedStage, {
      lostReason: lostReasonInput,
      contractSigned,
      depositReceived,
    });

    if (!res.ok) {
      setStageError(res.error || 'Could not update stage.');
    } else {
      setStageSuccess(`Pipeline stage updated to ${selectedStage.replace(/_/g, ' ')}.`);
    }
  };

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivityError(null);
    const res = await onLogActivity({
      leadId: lead.id,
      activityType,
      direction,
      summary: activitySummary,
      nextFollowupDate,
    });
    if (!res.ok) {
      setActivityError(res.error || 'Failed to log activity.');
    } else {
      setActivitySummary('');
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setTaskError(null);
    const res = await onCreateTask({
      title: newTaskTitle,
      leadId: lead.id,
      assignedTo: lead.ownerId || currentUser.id,
      dueDate: newTaskDueDate,
      priority: newTaskPriority,
      notes: `Created from lead detail view for ${lead.fullName}`,
    });
    if (!res.ok) {
      setTaskError(res.error || 'Failed to create follow-up task.');
    } else {
      setNewTaskTitle('');
    }
  };

  const triggerAi = async (mode: 'qualify' | 'draft_followup') => {
    setAiLoadingMode(mode);
    setAiError(null);
    try {
      const res = await onRunAiAssist(lead.id, mode);
      if (res.error) {
        setAiError(res.error);
      } else {
        if (res.qualification) setQualificationResult(res.qualification);
        if (res.draft) setDraftResult(res.draft);
      }
    } finally {
      setAiLoadingMode(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Back Button & Lead Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#E2E8F0]">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0759A8] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Leads Directory</span>
          </button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold text-[#07172A]">{lead.fullName}</h1>
            <span className="text-slate-300">·</span>
            <span className="text-base font-medium text-[#64748B]">
              {lead.companyName}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
            <span>{lead.serviceInterest}</span>
            <span>·</span>
            <StatusBadge stage={lead.stage} />
            <span>·</span>
            <StatusBadge priority={lead.priority} />
            <span>·</span>
            <span className="font-mono tabular-nums font-semibold text-[#07172A]">
              Est. {formatIdr(lead.estimatedValueIdr)}
            </span>
          </div>
        </div>
      </div>

      {/* Main 12-Column Detail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Contact Info, Attribution, Stage Updater, Deal Info (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contact & Attribution Card */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#07172A]">
              Contact & Source Attribution
            </h2>
            <dl className="grid grid-cols-1 gap-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <dt className="text-[#64748B]">Email Address</dt>
                <dd className="font-mono text-[#07172A] font-medium">
                  {lead.email}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <dt className="text-[#64748B]">Phone / WhatsApp</dt>
                <dd className="font-mono text-[#07172A] font-medium">
                  {lead.phone}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <dt className="text-[#64748B]">Assigned Owner</dt>
                <dd className="text-[#07172A] font-semibold">
                  {owner ? `${owner.fullName} (${owner.role})` : 'Unassigned'}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <dt className="text-[#64748B]">Acquisition Source</dt>
                <dd className="text-[#07172A] font-medium">
                  {LEAD_SOURCE_LABELS[lead.source]}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <dt className="text-[#64748B]">Attributed Campaign</dt>
                <dd className="text-[#0759A8] font-mono text-[11px] truncate max-w-[200px]">
                  {campaign ? campaign.name : 'Direct / Unattributed'}
                </dd>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
                <dt className="text-[#64748B]">External Deduplication Ref</dt>
                <dd className="font-mono text-[11px] text-[#64748B]">
                  {externalRef ? externalRef.externalId : 'Internal Manual Entry'}
                </dd>
              </div>
              <div className="flex justify-between py-1.5">
                <dt className="text-[#64748B]">Next Follow-up Scheduled</dt>
                <dd className="font-mono tabular-nums text-[#07172A] font-semibold">
                  {formatShortDate(lead.nextFollowupAt)}
                </dd>
              </div>
            </dl>

            <div className="pt-2">
              <div className="text-xs font-semibold text-[#07172A] mb-1">
                Qualification Notes
              </div>
              <p className="text-xs text-[#64748B] bg-[#F4F7FB] p-3 rounded-lg border border-[#E2E8F0] leading-relaxed">
                {lead.notes || 'No qualification notes recorded yet.'}
              </p>
            </div>
          </div>

          {/* Pipeline Stage & Deal Governance Card (FR-04 & Section 7G) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div>
              <h2 className="text-sm font-bold text-[#07172A]">
                Pipeline Stage & Deal Governance
              </h2>
              <p className="text-xs text-[#64748B]">
                Update sales stage and enforce PRD won/lost validation rules.
              </p>
            </div>

            {stageError && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{stageError}</span>
              </div>
            )}
            {stageSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 font-medium">
                {stageSuccess}
              </div>
            )}

            <form onSubmit={handleApplyStage} className="space-y-3 text-xs">
              <div>
                <label
                  htmlFor="detail-stage-select"
                  className="block font-semibold text-[#07172A] mb-1"
                >
                  Current Sales Stage
                </label>
                <select
                  id="detail-stage-select"
                  value={selectedStage}
                  onChange={(e) => {
                    setSelectedStage(e.target.value as PipelineStage);
                    setStageError(null);
                    setStageSuccess(null);
                  }}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#07172A] font-medium focus:outline-none focus:border-[#0759A8]"
                >
                  {PIPELINE_STAGES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.label} — {st.description}
                    </option>
                  ))}
                </select>
              </div>

              {selectedStage === 'lost' && (
                <div>
                  <label
                    htmlFor="lost-reason-input"
                    className="block font-semibold text-red-800 mb-1"
                  >
                    Lost Reason (Required by PRD FR-04) *
                  </label>
                  <input
                    id="lost-reason-input"
                    type="text"
                    required
                    value={lostReasonInput}
                    onChange={(e) => setLostReasonInput(e.target.value)}
                    placeholder="e.g., Budget ceiling below Rp 25M / Chose in-house build"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg text-[#07172A]"
                  />
                </div>
              )}

              {selectedStage === 'won' && (
                <div className="p-3 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] space-y-2">
                  <div className="font-semibold text-[#07172A]">
                    Won Deal Verification Gate (Section 7G)
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    Moving a card to Won requires confirming both a signed agreement and deposit payment receipt.
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contractSigned || Boolean(deal?.contractSigned)}
                      onChange={(e) => setContractSigned(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Signed MSA / Scope Agreement verified</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={depositReceived || Boolean(deal?.depositReceived)}
                      onChange={(e) => setDepositReceived(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    <span>Down payment deposit cleared in bank</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2 px-4 bg-[#07172A] text-[#D5FF35] font-semibold rounded-lg hover:bg-[#061426] transition-colors"
              >
                Update Pipeline Stage
              </button>
            </form>

            {/* Associated Deal Info */}
            <div className="pt-3 border-t border-[#E2E8F0] text-xs space-y-1.5">
              <div className="font-semibold text-[#07172A]">Deal Record Status</div>
              {deal ? (
                <div className="p-3 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] space-y-1">
                  <div className="font-semibold text-[#07172A]">{deal.title}</div>
                  <div className="font-mono tabular-nums text-[#0759A8] font-bold">
                    {formatIdr(deal.valueIdr)} · Expected Close:{' '}
                    {formatShortDate(deal.expectedCloseDate)}
                  </div>
                  <div className="text-[11px] text-[#64748B]">
                    Contract Signed: {deal.contractSigned ? 'Yes' : 'Pending'} ·
                    Invoice Issued: {deal.invoiceIssued ? 'Yes' : 'No'} · Deposit
                    Received: {deal.depositReceived ? 'Verified' : 'Pending'}
                  </div>
                </div>
              ) : (
                <p className="text-[#64748B]">
                  No formal Deal record created yet (Lead is currently in{' '}
                  {lead.stage.replace(/_/g, ' ')} stage).
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Summary & Follow-up Draft, Tasks, and Activity Timeline (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* AI Qualification & Follow-up Copilot Card (Section 7F, FR-07, FR-08) */}
          <div className="bg-[#07172A] text-white rounded-xl p-5 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#D5FF35] text-[#07172A] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    AI Sales Copilot — Qualification & Follow-up Draft
                  </h2>
                  <p className="text-[11px] text-slate-300">
                    Advisory AI recommendations grounded in Solivate’s Service Catalog (FR-07 & FR-08)
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={aiLoadingMode !== null}
                  onClick={() => triggerAi('qualify')}
                  className="px-3 py-1.5 text-xs font-semibold bg-white/10 text-white hover:bg-white/15 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                >
                  {aiLoadingMode === 'qualify' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Run Qualification</span>
                </button>
                <button
                  type="button"
                  disabled={aiLoadingMode !== null}
                  onClick={() => triggerAi('draft_followup')}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#D5FF35] text-[#07172A] hover:bg-[#C4F01E] rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                >
                  {aiLoadingMode === 'draft_followup' && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  <span>Draft Follow-up</span>
                </button>
              </div>
            </div>

            {aiError && (
              <div className="p-3 rounded-lg bg-red-950/70 border border-red-700 text-xs text-red-200">
                {aiError}
              </div>
            )}

            {!qualificationResult && !draftResult ? (
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 text-xs text-slate-300 space-y-1.5">
                <div className="font-semibold text-white">
                  AI Summary & Follow-up Draft Placeholders Ready
                </div>
                <p className="leading-relaxed">
                  Click <strong className="text-white">Run Qualification</strong> to
                  assess missing scope information and priority (Agent A), or click{' '}
                  <strong className="text-[#D5FF35]">Draft Follow-up</strong> to
                  generate a policy-compliant WhatsApp/Email response (Agent B).
                  No AI calls are triggered automatically during page navigation.
                </p>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                {qualificationResult && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#D5FF35]">
                        Agent A: Structured Lead Qualification (Advisory)
                      </span>
                      <span className="font-mono uppercase text-[11px] text-slate-300">
                        Suggested Priority: {qualificationResult.suggestedPriority}
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed">
                      {qualificationResult.qualificationSummary}
                    </p>
                    <div>
                      <span className="font-semibold text-white">
                        Missing Information to Confirm:
                      </span>
                      <ul className="mt-1 list-disc list-inside text-slate-300 space-y-0.5">
                        {qualificationResult.missingInformation.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-white font-medium">
                        Next Action: {qualificationResult.recommendedNextAction}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {qualificationResult.guardrailNotice}
                      </span>
                    </div>
                  </div>
                )}

                {draftResult && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#D5FF35]">
                        Agent B: Follow-up Message Draft ({draftResult.channel})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(draftResult.draftBody);
                          setCopiedDraft(true);
                          setTimeout(() => setCopiedDraft(false), 2000);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] text-slate-300 hover:text-white"
                      >
                        {copiedDraft ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-[#D5FF35]" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy Draft</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="font-semibold text-white">
                      {draftResult.subjectOrHeader}
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-slate-200 bg-[#061426] p-3 rounded-lg border border-white/10 leading-relaxed">
                      {draftResult.draftBody}
                    </pre>
                    <div className="text-[11px] text-slate-400">
                      Guardrails verified:{' '}
                      {draftResult.policyComplianceChecks.join(' · ')}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Tasks & Next Follow-up Card (Create & complete tasks without leaving page) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#07172A]">
                  Tasks & Follow-up Schedule ({leadTasks.length})
                </h2>
                <p className="text-xs text-[#64748B]">
                  Add or complete follow-up tasks directly from this lead record
                </p>
              </div>
              <CheckSquare className="w-4 h-4 text-[#0759A8]" />
            </div>

            {taskError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {taskError}
              </div>
            )}

            <form
              onSubmit={handleAddTask}
              className="flex flex-col sm:flex-row gap-2 text-xs"
            >
              <input
                type="text"
                required
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New follow-up task title..."
                aria-label="New follow-up task title"
                className="flex-1 px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
              />
              <input
                type="date"
                required
                value={newTaskDueDate}
                onChange={(e) => setNewTaskDueDate(e.target.value)}
                aria-label="Task due date"
                className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] font-mono"
              />
              <select
                value={newTaskPriority}
                onChange={(e) =>
                  setNewTaskPriority(e.target.value as PriorityLevel)
                }
                aria-label="Task priority"
                className="px-2.5 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#07172A]"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <button
                type="submit"
                className="px-3.5 py-2 bg-[#07172A] text-[#D5FF35] font-semibold rounded-lg hover:bg-[#061426] whitespace-nowrap shrink-0 flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Task</span>
              </button>
            </form>

            <div className="divide-y divide-[#E2E8F0] text-xs">
              {leadTasks.length === 0 ? (
                <div className="py-4 text-center text-[#64748B]">
                  No tasks scheduled for this lead yet.
                </div>
              ) : (
                leadTasks.map((t) => {
                  const overdue = isTaskOverdue(t.dueDate, t.status);
                  return (
                    <div
                      key={t.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <label className="flex items-center gap-2.5 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={t.status === 'completed'}
                          onChange={() => onToggleTask(t.id)}
                          className="rounded border-slate-300 text-[#07172A]"
                        />
                        <span
                          className={`truncate ${
                            t.status === 'completed'
                              ? 'line-through text-[#64748B]'
                              : 'font-medium text-[#07172A]'
                          }`}
                        >
                          {t.title}
                        </span>
                      </label>
                      <span
                        className={`font-mono tabular-nums text-[11px] shrink-0 ${
                          overdue
                            ? 'text-red-700 font-semibold'
                            : 'text-[#64748B]'
                        }`}
                      >
                        {overdue ? 'Overdue · ' : ''}
                        {formatShortDate(t.dueDate)}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Activity Timeline & Manual WhatsApp Conversation Logger (Section 9 & FR-05) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#07172A]">
                  Communication History & WhatsApp Log
                </h2>
                <p className="text-xs text-[#64748B]">
                  Log manual WhatsApp chats, call summaries, and internal notes (PRD Section 9)
                </p>
              </div>
              <MessageSquare className="w-4 h-4 text-[#0759A8]" />
            </div>

            {activityError && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {activityError}
              </div>
            )}

            <form
              onSubmit={handleAddActivity}
              className="p-3.5 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-3 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-[#07172A] mb-1">
                    Activity Type
                  </label>
                  <select
                    value={activityType}
                    onChange={(e) =>
                      setActivityType(
                        e.target.value as
                          | 'whatsapp_log'
                          | 'note'
                          | 'call_summary'
                          | 'email_summary'
                      )
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#07172A]"
                  >
                    <option value="whatsapp_log">WhatsApp Conversation Log</option>
                    <option value="call_summary">Discovery / Sales Call</option>
                    <option value="email_summary">Email Summary</option>
                    <option value="note">Internal Note</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#07172A] mb-1">
                    Direction
                  </label>
                  <select
                    value={direction}
                    onChange={(e) =>
                      setDirection(
                        e.target.value as 'inbound' | 'outbound' | 'internal'
                      )
                    }
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#07172A]"
                  >
                    <option value="inbound">Inbound (From Client)</option>
                    <option value="outbound">Outbound (Sent by Solivate)</option>
                    <option value="internal">Internal Note</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#07172A] mb-1">
                    Next Follow-up Date
                  </label>
                  <input
                    type="date"
                    value={nextFollowupDate}
                    onChange={(e) => setNextFollowupDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] font-mono"
                  />
                </div>
              </div>

              <div>
                <textarea
                  rows={2}
                  required
                  value={activitySummary}
                  onChange={(e) => setActivitySummary(e.target.value)}
                  placeholder="Record WhatsApp conversation summary, client questions, or pricing feedback..."
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#07172A] text-[#D5FF35] font-semibold rounded-lg hover:bg-[#061426]"
                >
                  Log Activity
                </button>
              </div>
            </form>

            {/* Timeline List */}
            <div className="divide-y divide-[#E2E8F0] text-xs">
              {leadActivities.map((act) => (
                <div key={act.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span className="font-semibold text-[#07172A]">
                      {act.actorName} ·{' '}
                      <span className="text-[#0759A8] uppercase font-mono">
                        {act.activityType.replace(/_/g, ' ')} ({act.direction})
                      </span>
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatDateTime(act.occurredAt)}
                    </span>
                  </div>
                  <p className="text-[#07172A] leading-relaxed">{act.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
