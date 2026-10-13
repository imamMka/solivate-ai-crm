import React, { useState } from 'react';
import {
  RefreshCw,
  Sparkles,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Database,
  Loader2,
} from 'lucide-react';
import type { CrmSnapshot, Lead, Profile } from '../../types/crm.ts';
import { PIPELINE_STAGES, LEAD_SOURCE_LABELS } from '../../types/crm.ts';
import {
  PageHeader,
  MetricCard,
  EmptyState,
  StatusBadge,
} from '../../components/ui/Primitives.tsx';
import {
  formatCompactIdr,
  formatIdr,
  formatShortDate,
  isTaskOverdue,
} from '../../lib/formatters.ts';

export interface DashboardViewProps {
  snapshot: CrmSnapshot;
  currentUser: Profile;
  onSelectLead: (leadId: string) => void;
  onNavigate: (
    route:
      | 'dashboard'
      | 'leads'
      | 'pipeline'
      | 'campaigns'
      | 'tasks'
      | 'ai_assistant'
      | 'approvals'
      | 'settings'
  ) => void;
  onToggleTask: (taskId: string) => Promise<void>;
  onSwitchWorkspaceMode: (
    mode: 'demo_fixtures' | 'empty_workspace',
    resetFixtures?: boolean
  ) => Promise<void>;
  onOpenNewLeadModal: () => void;
  onGenerateAiBrief: (prompt?: string) => Promise<{
    headlineSummary: string;
    keyObservations: string[];
    recommendedActions: string[];
    dataDisclaimer: string;
  } | null>;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  snapshot,
  currentUser,
  onSelectLead,
  onNavigate,
  onToggleTask,
  onSwitchWorkspaceMode,
  onOpenNewLeadModal,
  onGenerateAiBrief,
}) => {
  const [period, setPeriod] = useState<'7d' | '30d' | 'q4'>('30d');
  const [aiBriefLoading, setAiBriefLoading] = useState(false);
  const [aiBriefError, setAiBriefError] = useState<string | null>(null);
  const [aiBriefData, setAiBriefData] = useState<{
    headlineSummary: string;
    keyObservations: string[];
    recommendedActions: string[];
    dataDisclaimer: string;
  } | null>(null);

  const activeLeads = snapshot.leads.filter((l) => !l.isArchived);

  // Deterministic KPI Calculations from actual records in snapshot
  const newLeadsCount = activeLeads.filter((l) => l.stage === 'new_lead').length;
  const qualifiedLeadsCount = activeLeads.filter((l) =>
    ['qualified', 'proposal', 'negotiation', 'won'].includes(l.stage)
  ).length;
  const activePipelineValue = activeLeads
    .filter((l) => !['won', 'lost'].includes(l.stage))
    .reduce((sum, l) => sum + l.estimatedValueIdr, 0);
  const wonLeads = activeLeads.filter((l) => l.stage === 'won');
  const wonDealsValue = wonLeads.reduce((sum, l) => sum + l.estimatedValueIdr, 0);

  const overdueTasks = snapshot.tasks.filter((t) =>
    isTaskOverdue(t.dueDate, t.status)
  );
  const pendingTasks = snapshot.tasks.filter((t) => t.status === 'pending');

  // Leads requiring attention: New leads not yet contacted OR high priority with overdue follow-up
  const leadsRequiringAttention = activeLeads.filter(
    (l) =>
      l.stage === 'new_lead' ||
      (l.priority === 'high' && !['won', 'lost'].includes(l.stage))
  );

  // Lead source breakdown
  const sourceCounts = (
    Object.keys(LEAD_SOURCE_LABELS) as Array<keyof typeof LEAD_SOURCE_LABELS>
  ).map((sourceKey) => {
    const count = activeLeads.filter((l) => l.source === sourceKey).length;
    const valueIdr = activeLeads
      .filter((l) => l.source === sourceKey)
      .reduce((acc, l) => acc + l.estimatedValueIdr, 0);
    return {
      sourceKey,
      label: LEAD_SOURCE_LABELS[sourceKey],
      count,
      valueIdr,
      percentage:
        activeLeads.length > 0 ? Math.round((count / activeLeads.length) * 100) : 0,
    };
  });

  // Meta Ads campaign attribution summary
  const totalMetaSpend = snapshot.adInsights.reduce((s, i) => s + i.spendIdr, 0);
  const totalMetaReportedLeads = snapshot.adInsights.reduce(
    (s, i) => s + i.metaReportedLeads,
    0
  );
  const crmMetaLeads = activeLeads.filter((l) => l.source === 'meta_lead_ads');
  const crmMetaQualified = crmMetaLeads.filter((l) =>
    ['qualified', 'proposal', 'negotiation', 'won'].includes(l.stage)
  );

  const handleRunBrief = async () => {
    setAiBriefLoading(true);
    setAiBriefError(null);
    try {
      const result = await onGenerateAiBrief();
      if (result) {
        setAiBriefData(result);
      }
    } catch (err: any) {
      setAiBriefError(err?.message || 'Failed to generate AI Business Brief.');
    } finally {
      setAiBriefLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Data Source & Fixture Transparency Banner (Required by Section 7D) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <Database className="w-4 h-4 text-[#0759A8] shrink-0 mt-0.5 sm:mt-0" />
          <div className="text-xs text-[#07172A]">
            <span className="font-semibold">
              Data Source:{' '}
              {snapshot.integrationStatus.dataSourceMode === 'demo_fixtures'
                ? 'Solivate Demo Fixtures (Explicitly Labeled)'
                : 'Empty Workspace State'}
            </span>
            <span className="text-[#64748B] ml-2">
              · All KPIs and charts below are calculated deterministically from the active data store.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg shrink-0">
          <button
            type="button"
            onClick={() => onSwitchWorkspaceMode('demo_fixtures')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              snapshot.integrationStatus.dataSourceMode === 'demo_fixtures'
                ? 'bg-white text-[#07172A] shadow-xs font-semibold'
                : 'text-[#64748B] hover:text-[#07172A]'
            }`}
          >
            Demo Fixtures ({snapshot.leads.length})
          </button>
          <button
            type="button"
            onClick={() => onSwitchWorkspaceMode('empty_workspace')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              snapshot.integrationStatus.dataSourceMode === 'empty_workspace'
                ? 'bg-white text-[#07172A] shadow-xs font-semibold'
                : 'text-[#64748B] hover:text-[#07172A]'
            }`}
          >
            Verify Empty State (0)
          </button>
        </div>
      </div>

      {/* Page Header */}
      <PageHeader
        title={`Operational Overview — ${currentUser.fullName.split(' ')[0]}`}
        subtitle="Deterministic sales pipeline, follow-up velocity, and Meta Ads lead attribution for Solivate Studio."
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-white border border-[#E2E8F0] rounded-lg">
              {(
                [
                  { id: '7d', label: 'Last 7 Days' },
                  { id: '30d', label: 'Last 30 Days' },
                  { id: 'q4', label: 'Q4 2026' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPeriod(item.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    period === item.id
                      ? 'bg-[#07172A] text-white'
                      : 'text-[#64748B] hover:text-[#07172A]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onSwitchWorkspaceMode('demo_fixtures', true)}
              title="Reset fixture state"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Reset Data</span>
            </button>
          </div>
        }
      />

      {/* 5 Required KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          label="New Leads (Uncontacted)"
          value={newLeadsCount}
          contextText={`${activeLeads.length} total active leads in CRM`}
          semanticState={newLeadsCount > 0 ? 'warning' : 'neutral'}
          onClick={() => onNavigate('leads')}
        />
        <MetricCard
          label="Qualified Leads"
          value={qualifiedLeadsCount}
          contextText={
            activeLeads.length > 0
              ? `${Math.round((qualifiedLeadsCount / activeLeads.length) * 100)}% qualification rate`
              : 'No leads recorded'
          }
          semanticState="positive"
          onClick={() => onNavigate('leads')}
        />
        <MetricCard
          label="Active Pipeline Value"
          value={formatCompactIdr(activePipelineValue)}
          contextText={`Across ${
            activeLeads.filter((l) => !['won', 'lost'].includes(l.stage)).length
          } open opportunities`}
          semanticState="neutral"
          onClick={() => onNavigate('pipeline')}
        />
        <MetricCard
          label="Won Deals"
          value={`${wonLeads.length} (${formatCompactIdr(wonDealsValue)})`}
          contextText="Signed contract & verified deposit"
          semanticState="positive"
          onClick={() => onNavigate('pipeline')}
        />
        <MetricCard
          label="Overdue Follow-ups"
          value={overdueTasks.length}
          contextText={`${pendingTasks.length} total pending tasks`}
          semanticState={overdueTasks.length > 0 ? 'danger' : 'positive'}
          onClick={() => onNavigate('tasks')}
        />
      </div>

      {/* Empty Workspace Check */}
      {activeLeads.length === 0 ? (
        <EmptyState
          title="No CRM records in active workspace"
          description="You are currently viewing the zero-data Empty State mode. Create your first lead manually or load the labeled Solivate Studio Demo Fixtures to inspect pipeline analytics and Meta Ads attribution."
          actionLabel="Create First Lead"
          onAction={onOpenNewLeadModal}
          secondaryActionLabel="Load Demo Fixtures"
          onSecondaryAction={() => onSwitchWorkspaceMode('demo_fixtures')}
        />
      ) : (
        <>
          {/* Analytics Section: Sales Pipeline Overview & Lead Sources Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Sales Pipeline Distribution (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-bold text-[#07172A]">
                      Sales Pipeline Overview
                    </h2>
                    <p className="text-xs text-[#64748B]">
                      Lead count and estimated contract value across all 8 PRD stages
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('pipeline')}
                    className="text-xs font-semibold text-[#0759A8] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <span>Open Kanban</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {PIPELINE_STAGES.map((st) => {
                    const stageLeads = activeLeads.filter((l) => l.stage === st.id);
                    const stageVal = stageLeads.reduce(
                      (s, l) => s + l.estimatedValueIdr,
                      0
                    );
                    const maxVal = Math.max(
                      ...PIPELINE_STAGES.map((stageItem) =>
                        activeLeads
                          .filter((l) => l.stage === stageItem.id)
                          .reduce((s, l) => s + l.estimatedValueIdr, 0)
                      ),
                      1
                    );
                    const widthPct = Math.max(
                      stageLeads.length > 0 ? 6 : 0,
                      Math.round((stageVal / maxVal) * 100)
                    );

                    return (
                      <div key={st.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#07172A]">
                            {st.label}{' '}
                            <span className="text-[#64748B] font-mono tabular-nums">
                              ({stageLeads.length})
                            </span>
                          </span>
                          <span className="font-mono tabular-nums text-[#07172A] font-medium">
                            {formatIdr(stageVal)}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#F4F7FB] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              st.id === 'won'
                                ? 'bg-emerald-600'
                                : st.id === 'lost'
                                ? 'bg-slate-400'
                                : 'bg-[#0759A8]'
                            }`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
                <span> Reporting Period: {period.toUpperCase()}</span>
                <span className="font-mono tabular-nums">
                  Total Tracked Value:{' '}
                  {formatIdr(
                    activeLeads.reduce((s, l) => s + l.estimatedValueIdr, 0)
                  )}
                </span>
              </div>
            </div>

            {/* Lead Sources & Campaign Attribution Summary (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6 flex flex-col justify-between space-y-6">
              <div>
                <h2 className="text-base font-bold text-[#07172A]">
                  Lead Sources Distribution
                </h2>
                <p className="text-xs text-[#64748B]">
                  Inbound acquisition channels and pipeline contribution
                </p>

                <div className="mt-4 divide-y divide-[#E2E8F0]">
                  {sourceCounts.map((src) => (
                    <div
                      key={src.sourceKey}
                      className="py-2.5 flex items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <div className="font-medium text-[#07172A]">{src.label}</div>
                        <div className="text-[11px] text-[#64748B] font-mono tabular-nums">
                          {src.count} leads · {src.percentage}% share
                        </div>
                      </div>
                      <div className="font-mono tabular-nums font-semibold text-[#07172A]">
                        {formatCompactIdr(src.valueIdr)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Campaign Performance Summary (Distinguishing Meta-reported vs CRM outcomes per FR-10) */}
              <div className="pt-4 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#07172A]">
                    Meta Ads vs CRM Attribution (Oct 8–11)
                  </h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('campaigns')}
                    className="text-xs font-semibold text-[#0759A8] hover:underline"
                  >
                    Campaigns
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 bg-[#F4F7FB] p-3 rounded-lg border border-[#E2E8F0]">
                  <div>
                    <div className="text-[11px] text-[#64748B]">Meta Spend</div>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#07172A] mt-0.5">
                      {formatCompactIdr(totalMetaSpend)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B]">Meta Reported</div>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#07172A] mt-0.5">
                      {totalMetaReportedLeads} leads
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-[#64748B]">CRM Qualified</div>
                    <div className="text-xs font-bold font-mono tabular-nums text-[#0759A8] mt-0.5">
                      {crmMetaQualified.length} / {crmMetaLeads.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Operational Sections: Leads Requiring Attention & Upcoming/Overdue Tasks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Leads Requiring Attention & Recent Leads (7 cols) */}
            <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#07172A]">
                    Leads Requiring Immediate Attention
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Uncontacted inbound leads and high-priority active negotiations
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('leads')}
                  className="text-xs font-semibold text-[#0759A8] hover:underline whitespace-nowrap shrink-0"
                >
                  View All Leads ({activeLeads.length})
                </button>
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {leadsRequiringAttention.slice(0, 5).map((lead: Lead) => (
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 px-2 -mx-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-[#07172A]">
                        <span className="truncate">{lead.fullName}</span>
                        <span className="text-[#64748B] font-normal">·</span>
                        <span className="text-xs font-medium text-[#64748B] truncate">
                          {lead.companyName}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                        <span>{lead.serviceInterest}</span>
                        <span>·</span>
                        <span>{LEAD_SOURCE_LABELS[lead.source]}</span>
                        <span>·</span>
                        <StatusBadge stage={lead.stage} />
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 shrink-0">
                      <div className="text-xs font-mono tabular-nums font-bold text-[#07172A]">
                        {formatIdr(lead.estimatedValueIdr)}
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono tabular-nums">
                        Next: {formatShortDate(lead.nextFollowupAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Overdue & Upcoming Tasks (5 cols) */}
            <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div>
                  <h2 className="text-base font-bold text-[#07172A]">
                    Follow-up Tasks Queue
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Overdue and due-soon sales actions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('tasks')}
                  className="text-xs font-semibold text-[#0759A8] hover:underline whitespace-nowrap shrink-0"
                >
                  Manage Tasks
                </button>
              </div>

              <div className="divide-y divide-[#E2E8F0]">
                {pendingTasks.slice(0, 5).map((task) => {
                  const overdue = isTaskOverdue(task.dueDate, task.status);
                  return (
                    <div
                      key={task.id}
                      className="py-3 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => onToggleTask(task.id)}
                          aria-label={`Mark "${task.title}" complete`}
                          className="mt-1 rounded border-slate-300 text-[#07172A] focus:ring-[#0759A8] cursor-pointer"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#07172A] leading-snug">
                            {task.title}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#64748B]">
                            <span>{task.assignedToName}</span>
                            {task.leadId && task.leadName && (
                              <>
                                <span>·</span>
                                <button
                                  type="button"
                                  onClick={() => onSelectLead(task.leadId!)}
                                  className="text-[#0759A8] hover:underline truncate"
                                >
                                  {task.leadName}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`text-[11px] font-mono tabular-nums font-semibold ${
                            overdue ? 'text-red-700' : 'text-[#64748B]'
                          }`}
                        >
                          {overdue ? 'Overdue · ' : ''}
                          {formatShortDate(task.dueDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* AI Business Brief Section (FR-11: Deterministic metrics + AI interpretation or explanatory placeholder) */}
          <div className="bg-[#07172A] text-white rounded-xl p-6 border border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#D5FF35] text-[#07172A] flex items-center justify-center shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      AI Executive Business Brief
                    </h2>
                    <span className="text-xs text-slate-400">
                      · Advisory Interpretation Only (FR-11)
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Interprets deterministic SQL/CRM metrics without fabricating numbers or altering campaign budgets.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRunBrief}
                disabled={aiBriefLoading}
                className="px-4 py-2 text-xs font-semibold bg-[#D5FF35] text-[#07172A] rounded-lg hover:bg-[#C4F01E] transition-colors flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {aiBriefLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing CRM Metrics...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Live Brief</span>
                  </>
                )}
              </button>
            </div>

            {aiBriefError && (
              <div className="mt-4 p-3 rounded-lg bg-red-950/60 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{aiBriefError}</span>
              </div>
            )}

            {!aiBriefData ? (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-300">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="font-semibold text-white">
                    Deterministic Metric Baseline
                  </div>
                  <p className="mt-1 text-slate-300 leading-relaxed">
                    All business numbers ({activeLeads.length} active leads,{' '}
                    {formatCompactIdr(activePipelineValue)} open pipeline,{' '}
                    {overdueTasks.length} overdue tasks) are computed in application logic first.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="font-semibold text-white">
                    Strict AI Guardrails Active
                  </div>
                  <p className="mt-1 text-slate-300 leading-relaxed">
                    AI Agents cannot alter Meta Ads budgets, commit to unapproved discounts, or close deals autonomously.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="font-semibold text-[#D5FF35]">
                    Ready for On-Demand Analysis
                  </div>
                  <p className="mt-1 text-slate-300 leading-relaxed">
                    Click &ldquo;Generate Live Brief&rdquo; above to run Agent C & D via the server-side Gemini API on current snapshot metrics.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4 text-xs">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-[#D5FF35] font-semibold">Executive Summary</div>
                  <p className="mt-1 text-sm text-white leading-relaxed">
                    {aiBriefData.headlineSummary}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="font-semibold text-white mb-2">
                      Key Operational Observations
                    </div>
                    <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
                      {aiBriefData.keyObservations.map((obs, i) => (
                        <li key={i}>{obs}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                    <div className="font-semibold text-[#D5FF35] mb-2">
                      Recommended Next Actions (Requires Human Review)
                    </div>
                    <ul className="space-y-1.5 text-slate-200 list-disc list-inside">
                      {aiBriefData.recommendedActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">
                  Verification Notice: {aiBriefData.dataDisclaimer}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
