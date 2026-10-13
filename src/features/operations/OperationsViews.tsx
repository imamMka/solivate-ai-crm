import React, { useState } from 'react';
import {
  Megaphone,
  Sparkles,
  ShieldCheck,
  Settings,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Send,
  Loader2,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import type {
  CrmSnapshot,
  Profile,
  AiQualificationResult,
  AiDraftResult,
} from '../../types/crm.ts';
import {
  PageHeader,
  MetricCard,
  EmptyState,
  StatusBadge,
} from '../../components/ui/Primitives.tsx';
import {
  formatIdr,
  formatCompactIdr,
  formatDateTime,
  formatShortDate,
} from '../../lib/formatters.ts';

// =============================================================================
// 1. CAMPAIGNS VIEW (Meta Ads Performance & CRM Attribution — FR-09, FR-10)
// =============================================================================
export const CampaignsView: React.FC<{
  snapshot: CrmSnapshot;
  onSelectLead: (leadId: string) => void;
}> = ({ snapshot, onSelectLead }) => {
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all');

  const totalSpend = snapshot.adInsights.reduce((s, i) => s + i.spendIdr, 0);
  const totalImpressions = snapshot.adInsights.reduce(
    (s, i) => s + i.impressions,
    0
  );
  const totalClicks = snapshot.adInsights.reduce((s, i) => s + i.clicks, 0);
  const totalMetaLeads = snapshot.adInsights.reduce(
    (s, i) => s + i.metaReportedLeads,
    0
  );

  const filteredInsights =
    selectedCampaignId === 'all'
      ? snapshot.adInsights
      : snapshot.adInsights.filter((i) => i.campaignId === selectedCampaignId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Meta Ads Campaigns & Attribution"
        subtitle="Synchronized daily spend, impressions, clicks, and Meta-reported conversions vs. verified CRM pipeline outcomes (FR-10)."
      />

      {/* Explicit Integration Status Banner */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Megaphone className="w-4 h-4 text-[#0759A8] shrink-0 mt-0.5" />
          <div className="text-xs">
            <span className="font-semibold text-[#07172A]">
              Meta Marketing API Status:{' '}
              {snapshot.integrationStatus.metaAdsConfigured
                ? 'Connected'
                : 'Not Connected (Viewing Labeled Demo Fixtures)'}
            </span>
            <p className="text-[#64748B] mt-0.5">
              Per PRD FR-10, Meta-reported lead counts are strictly separated from CRM-verified qualified leads and deals.
            </p>
          </div>
        </div>
        <div className="text-xs font-mono text-[#64748B] shrink-0">
          Reporting Window: 08 Oct – 11 Oct 2026
        </div>
      </div>

      {snapshot.campaigns.length === 0 ? (
        <EmptyState
          title="No Meta Ads campaigns synchronized"
          description="Configure META_APP_ID, META_SYSTEM_USER_ACCESS_TOKEN, and META_AD_ACCOUNT_ID in environment settings or switch back to Demo Fixtures to inspect attribution tables."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Ad Spend (4-Day Window)"
              value={formatCompactIdr(totalSpend)}
              contextText={formatIdr(totalSpend)}
            />
            <MetricCard
              label="Impressions & Clicks"
              value={`${totalImpressions.toLocaleString('id-ID')} / ${totalClicks.toLocaleString('id-ID')}`}
              contextText={`Avg CTR: ${
                totalImpressions > 0
                  ? ((totalClicks / totalImpressions) * 100).toFixed(2)
                  : 0
              }%`}
            />
            <MetricCard
              label="Meta-Reported Leads"
              value={totalMetaLeads}
              contextText={`Avg Meta CPL: ${
                totalMetaLeads > 0
                  ? formatCompactIdr(Math.round(totalSpend / totalMetaLeads))
                  : 'N/A'
              }`}
            />
            <MetricCard
              label="CRM Attributed Leads"
              value={
                snapshot.leads.filter((l) => l.source === 'meta_lead_ads').length
              }
              contextText="Verified records in CRM database"
              semanticState="positive"
            />
          </div>

          {/* Campaign Summary Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-[#07172A]">
                  Campaign Attribution Matrix
                </h2>
                <p className="text-xs text-[#64748B]">
                  Side-by-side comparison of Meta Ad Manager figures vs actual Solivate CRM pipeline value
                </p>
              </div>
              <select
                aria-label="Filter daily insights by campaign"
                value={selectedCampaignId}
                onChange={(e) => setSelectedCampaignId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg text-[#07172A]"
              >
                <option value="all">All Campaigns ({snapshot.campaigns.length})</option>
                {snapshot.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                    <th className="py-3 px-4">Campaign Name & External ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Daily Budget</th>
                    <th className="py-3 px-4 text-right">Spend (Oct 8–11)</th>
                    <th className="py-3 px-4 text-right">Meta Leads</th>
                    <th className="py-3 px-4 text-right">CRM Qualified</th>
                    <th className="py-3 px-4 text-right">CRM Pipeline Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {snapshot.campaigns.map((cmp) => {
                    const cmpInsights = snapshot.adInsights.filter(
                      (i) => i.campaignId === cmp.id
                    );
                    const cmpSpend = cmpInsights.reduce(
                      (s, i) => s + i.spendIdr,
                      0
                    );
                    const cmpMetaLeads = cmpInsights.reduce(
                      (s, i) => s + i.metaReportedLeads,
                      0
                    );
                    const cmpCrmLeads = snapshot.leads.filter(
                      (l) => l.campaignId === cmp.id
                    );
                    const cmpQualified = cmpCrmLeads.filter((l) =>
                      ['qualified', 'proposal', 'negotiation', 'won'].includes(
                        l.stage
                      )
                    );
                    const cmpPipelineIdr = cmpCrmLeads.reduce(
                      (s, l) => s + l.estimatedValueIdr,
                      0
                    );

                    return (
                      <tr key={cmp.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#07172A]">
                            {cmp.name}
                          </div>
                          <div className="font-mono text-[11px] text-[#64748B]">
                            {cmp.externalCampaignId} · Synced{' '}
                            {formatShortDate(cmp.lastSyncedAt)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge
                            customText={cmp.status.toUpperCase()}
                            variant={
                              cmp.status === 'active' ? 'success' : 'default'
                            }
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#64748B]">
                          {formatIdr(cmp.dailyBudgetIdr)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#07172A]">
                          {formatIdr(cmpSpend)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#07172A]">
                          {cmpMetaLeads}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#0759A8]">
                          {cmpQualified.length} / {cmpCrmLeads.length}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold text-[#07172A]">
                          {formatIdr(cmpPipelineIdr)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Ad Insights Log (`ad_insights_daily` entity) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="p-4 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-bold text-[#07172A]">
                Daily Ad Insights Log (ad_insights_daily)
              </h3>
              <p className="text-xs text-[#64748B]">
                Granular daily metrics preserving reporting date and source campaign
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                    <th className="py-2.5 px-4">Reporting Date</th>
                    <th className="py-2.5 px-4">Campaign</th>
                    <th className="py-2.5 px-4 text-right">Spend (IDR)</th>
                    <th className="py-2.5 px-4 text-right">Impressions</th>
                    <th className="py-2.5 px-4 text-right">Clicks</th>
                    <th className="py-2.5 px-4 text-right">
                      Meta-Reported Leads
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {filteredInsights.map((ins) => {
                    const cmp = snapshot.campaigns.find(
                      (c) => c.id === ins.campaignId
                    );
                    return (
                      <tr key={ins.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono tabular-nums text-[#07172A]">
                          {ins.reportingDate}
                        </td>
                        <td className="py-2.5 px-4 text-[#07172A] font-medium">
                          {cmp?.name ?? ins.campaignId}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#07172A]">
                          {formatIdr(ins.spendIdr)}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#64748B]">
                          {ins.impressions.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#64748B]">
                          {ins.clicks.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#0759A8]">
                          {ins.metaReportedLeads}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// =============================================================================
// 2. AI ASSISTANT VIEW (Controlled 4-Agent Copilot & Execution Logs — Section 7)
// =============================================================================
export const AiAssistantView: React.FC<{
  snapshot: CrmSnapshot;
  onRunLeadAssist: (
    leadId: string,
    mode: 'qualify' | 'draft_followup',
    customInstruction?: string
  ) => Promise<{
    qualification?: AiQualificationResult;
    draft?: AiDraftResult;
    error?: string;
  }>;
  onRunBusinessBrief: (prompt?: string) => Promise<{
    headlineSummary: string;
    keyObservations: string[];
    recommendedActions: string[];
    dataDisclaimer: string;
  } | null>;
}> = ({ snapshot, onRunLeadAssist, onRunBusinessBrief }) => {
  const [selectedAgent, setSelectedAgent] = useState<
    'lead_qualification' | 'sales_copilot' | 'marketing_analyst'
  >('sales_copilot');
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    snapshot.leads[0]?.id || ''
  );
  const [customPrompt, setCustomPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [qualOutput, setQualOutput] = useState<AiQualificationResult | null>(
    null
  );
  const [draftOutput, setDraftOutput] = useState<AiDraftResult | null>(null);
  const [briefOutput, setBriefOutput] = useState<{
    headlineSummary: string;
    keyObservations: string[];
    recommendedActions: string[];
    dataDisclaimer: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedLead = snapshot.leads.find((l) => l.id === selectedLeadId);

  const handleExecuteAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    try {
      if (selectedAgent === 'lead_qualification') {
        if (!selectedLeadId) {
          setErrorMsg('Please select a lead to qualify.');
          return;
        }
        const res = await onRunLeadAssist(selectedLeadId, 'qualify');
        if (res.error) setErrorMsg(res.error);
        if (res.qualification) setQualOutput(res.qualification);
      } else if (selectedAgent === 'sales_copilot') {
        if (!selectedLeadId) {
          setErrorMsg('Please select a lead for the Sales Copilot.');
          return;
        }
        const res = await onRunLeadAssist(
          selectedLeadId,
          'draft_followup',
          customPrompt
        );
        if (res.error) setErrorMsg(res.error);
        if (res.draft) setDraftOutput(res.draft);
      } else {
        const res = await onRunBusinessBrief(customPrompt);
        if (res) setBriefOutput(res);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'AI execution failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Sales Copilot & Agent Workspace"
        subtitle="Controlled AI services (Agents A, B, C, D) with structured outputs, service catalog grounding, and strict human governance."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Columns: Interactive Copilot Console */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-[#E2E8F0]">
              <div>
                <h2 className="text-base font-bold text-[#07172A]">
                  Select Controlled AI Agent (PRD Section 7)
                </h2>
                <p className="text-xs text-[#64748B]">
                  All outputs are advisory suggestions and clearly separated from verified CRM data.
                </p>
              </div>
              <span className="text-xs font-mono text-[#0759A8] font-semibold">
                Model: gemini-3.8-flash
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {(
                [
                  {
                    id: 'sales_copilot',
                    title: 'Agent B: Sales Copilot',
                    desc: 'Drafts WhatsApp/Email responses using Service Catalog',
                  },
                  {
                    id: 'lead_qualification',
                    title: 'Agent A: Lead Qualifier',
                    desc: 'Extracts missing info, priority & next step',
                  },
                  {
                    id: 'marketing_analyst',
                    title: 'Agent C: Marketing Analyst',
                    desc: 'Interprets deterministic Meta Ads & pipeline metrics',
                  },
                ] as const
              ).map((ag) => (
                <button
                  key={ag.id}
                  type="button"
                  onClick={() => {
                    setSelectedAgent(ag.id);
                    setErrorMsg(null);
                  }}
                  className={`p-3 rounded-xl border text-left transition-colors ${
                    selectedAgent === ag.id
                      ? 'border-[#07172A] bg-[#07172A] text-white'
                      : 'border-[#E2E8F0] bg-[#F4F7FB] text-[#07172A] hover:bg-slate-100'
                  }`}
                >
                  <div
                    className={`font-bold ${
                      selectedAgent === ag.id ? 'text-[#D5FF35]' : 'text-[#07172A]'
                    }`}
                  >
                    {ag.title}
                  </div>
                  <div
                    className={`mt-1 text-[11px] leading-snug ${
                      selectedAgent === ag.id ? 'text-slate-300' : 'text-[#64748B]'
                    }`}
                  >
                    {ag.desc}
                  </div>
                </button>
              ))}
            </div>

            <form onSubmit={handleExecuteAgent} className="space-y-4 text-xs">
              {selectedAgent !== 'marketing_analyst' && (
                <div>
                  <label className="block font-semibold text-[#07172A] mb-1">
                    Target CRM Lead Context
                  </label>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#07172A] font-medium"
                  >
                    {snapshot.leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullName} ({l.companyName}) — Stage: {l.stage} —{' '}
                        {formatIdr(l.estimatedValueIdr)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {selectedAgent !== 'lead_qualification' && (
                <div>
                  <label className="block font-semibold text-[#07172A] mb-1">
                    Specific Instruction or Question (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={
                      selectedAgent === 'sales_copilot'
                        ? 'e.g., Write a polite Bahasa Indonesia WhatsApp follow-up inviting them to a 20-minute architecture review call...'
                        : 'e.g., Compare our two active Meta Lead Ads campaigns and highlight which one produces higher-value qualified deals...'
                    }
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                  />
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-[#64748B]">
                  Guardrail: AI cannot commit to unapproved discounts or send messages autonomously.
                </span>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#07172A] text-[#D5FF35] font-semibold rounded-lg hover:bg-[#061426] flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Running Agent...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Execute AI Agent</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            {/* Structured Output Display */}
            {selectedAgent === 'lead_qualification' && qualOutput && (
              <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0759A8]">
                    AI Suggestion — Lead Qualification Output
                  </span>
                  <StatusBadge
                    priority={qualOutput.suggestedPriority as any}
                  />
                </div>
                <p className="text-[#07172A] leading-relaxed">
                  {qualOutput.qualificationSummary}
                </p>
                <div>
                  <div className="font-semibold text-[#07172A]">
                    Missing Information:
                  </div>
                  <ul className="list-disc list-inside text-[#64748B] mt-1">
                    {qualOutput.missingInformation.map((m, idx) => (
                      <li key={idx}>{m}</li>
                    ))}
                  </ul>
                </div>
                <div className="pt-2 border-t border-[#E2E8F0] font-semibold text-[#07172A]">
                  Recommended Next Action: {qualOutput.recommendedNextAction}
                </div>
              </div>
            )}

            {selectedAgent === 'sales_copilot' && draftOutput && (
              <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#0759A8]">
                    AI Suggestion — Draft Message ({draftOutput.channel})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(draftOutput.draftBody);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#07172A] hover:text-[#0759A8]"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
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
                <div className="font-semibold text-[#07172A]">
                  {draftOutput.subjectOrHeader}
                </div>
                <pre className="whitespace-pre-wrap font-sans bg-white p-3.5 rounded-lg border border-[#E2E8F0] text-[#07172A] leading-relaxed">
                  {draftOutput.draftBody}
                </pre>
                <div className="text-[11px] text-[#64748B]">
                  Suggested Task: {draftOutput.suggestedFollowupTask}
                </div>
              </div>
            )}

            {selectedAgent === 'marketing_analyst' && briefOutput && (
              <div className="p-4 rounded-xl bg-[#F4F7FB] border border-[#E2E8F0] space-y-3 text-xs">
                <div className="font-bold text-[#0759A8]">
                  AI Interpretation of Deterministic CRM Metrics
                </div>
                <p className="text-[#07172A] font-medium leading-relaxed">
                  {briefOutput.headlineSummary}
                </p>
                <ul className="list-disc list-inside text-[#64748B] space-y-1">
                  {briefOutput.recommendedActions.map((act, i) => (
                    <li key={i}>{act}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Columns: Lead Context Panel & AI Execution Audit Log (ai_runs) */}
        <div className="lg:col-span-5 space-y-6">
          {selectedLead && (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3 text-xs">
              <div className="text-sm font-bold text-[#07172A]">
                Verified CRM Context Panel
              </div>
              <div className="p-3 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] space-y-1.5">
                <div className="font-bold text-[#07172A]">
                  {selectedLead.fullName} · {selectedLead.companyName}
                </div>
                <div className="text-[#64748B]">
                  Service: {selectedLead.serviceInterest}
                </div>
                <div className="font-mono tabular-nums text-[#0759A8] font-semibold">
                  Stage: {selectedLead.stage} · Est.{' '}
                  {formatIdr(selectedLead.estimatedValueIdr)}
                </div>
                <p className="text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                  {selectedLead.notes}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-[#07172A]">
              AI Execution Audit Trail (ai_runs)
            </h3>
            <div className="divide-y divide-[#E2E8F0] text-xs">
              {snapshot.aiRuns.map((run) => (
                <div key={run.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#07172A] uppercase font-mono text-[11px]">
                      {run.agentType.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono tabular-nums text-[11px] text-[#64748B]">
                      {run.latencyMs}ms · {formatDateTime(run.createdAt)}
                    </span>
                  </div>
                  {run.leadName && (
                    <div className="text-[11px] text-[#0759A8] font-medium">
                      Lead: {run.leadName}
                    </div>
                  )}
                  <p className="text-[#64748B] leading-snug">
                    {run.outputSummary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// 3. APPROVALS VIEW (Server-Enforced Governance Queue — FR-12)
// =============================================================================
export const ApprovalsView: React.FC<{
  snapshot: CrmSnapshot;
  currentUser: Profile;
  onReviewApproval: (
    approvalId: string,
    decision: 'approved' | 'rejected',
    reviewNotes: string
  ) => Promise<{ ok: boolean; error?: string }>;
  onSelectLead: (leadId: string) => void;
}> = ({ snapshot, currentUser, onReviewApproval, onSelectLead }) => {
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({});
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const canApprove =
    currentUser.role === 'owner' || currentUser.role === 'admin';

  const handleDecision = async (
    id: string,
    decision: 'approved' | 'rejected'
  ) => {
    setActionError(null);
    const note =
      notesByItem[id]?.trim() ||
      (decision === 'approved'
        ? 'Verified against Solivate Studio commercial policy.'
        : 'Rejected per pricing/communication governance.');

    setProcessingId(id);
    try {
      const res = await onReviewApproval(id, decision, note);
      if (!res.ok) {
        setActionError(res.error || 'Failed to record approval decision.');
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approval Queue & Action Governance"
        subtitle="Human-in-the-loop control for custom payment milestones, outbound WhatsApp automation drafts, and Won deal overrides (FR-12)."
      />

      {/* Role Permission Notice */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-[#0759A8] shrink-0" />
          <span>
            Active Reviewer Session:{' '}
            <strong className="text-[#07172A]">
              {currentUser.fullName} ({currentUser.role.toUpperCase()})
            </strong>
            {' · '}
            {canApprove
              ? 'Authorized to approve or reject queued actions.'
              : 'Read-only access: Switch to Owner or Admin in the top-right profile menu to review items.'}
          </span>
        </div>
        <span className="text-[#64748B]">
          Backend verifies role permissions before recording decisions
        </span>
      </div>

      {actionError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 font-medium"
        >
          {actionError}
        </div>
      )}

      {snapshot.approvals.length === 0 ? (
        <EmptyState
          title="No items in the approval queue"
          description="High-impact sales or automation actions requiring Owner review will appear here."
        />
      ) : (
        <div className="space-y-4">
          {snapshot.approvals.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono uppercase font-bold text-[#0759A8]">
                    {item.actionType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs text-[#64748B]">
                    Requested by {item.requestedByName}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-mono tabular-nums text-[#64748B]">
                    {formatDateTime(item.requestedAt)}
                  </span>
                </div>

                <StatusBadge
                  customText={`STATUS: ${item.status.toUpperCase()}`}
                  variant={
                    item.status === 'approved'
                      ? 'success'
                      : item.status === 'rejected'
                      ? 'danger'
                      : 'warning'
                  }
                />
              </div>

              <div className="space-y-2">
                {item.leadId && item.leadName && (
                  <button
                    type="button"
                    onClick={() => onSelectLead(item.leadId!)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0759A8] hover:underline"
                  >
                    <span>Associated Lead: {item.leadName}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
                <p className="text-sm font-medium text-[#07172A]">
                  {item.payloadSummary}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] text-xs">
                  {Object.entries(item.payloadDetail).map(([k, v]) => (
                    <div key={k} className="truncate">
                      <span className="text-[#64748B]">{k}: </span>
                      <span className="font-mono text-[#07172A] font-medium">
                        {String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {item.status === 'pending' ? (
                <div className="pt-3 border-t border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <input
                    type="text"
                    value={notesByItem[item.id] || ''}
                    onChange={(e) =>
                      setNotesByItem((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    placeholder="Add audit review note (required for approval/rejection)..."
                    className="flex-1 px-3 py-2 text-xs border border-[#E2E8F0] rounded-lg text-[#07172A]"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={processingId === item.id}
                      onClick={() => handleDecision(item.id, 'rejected')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject Action</span>
                    </button>
                    <button
                      type="button"
                      disabled={processingId === item.id}
                      onClick={() => handleDecision(item.id, 'approved')}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#07172A] text-[#D5FF35] rounded-lg hover:bg-[#061426] transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve & Record</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-3 border-t border-[#E2E8F0] text-xs text-[#64748B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>
                    Reviewed by{' '}
                    <strong className="text-[#07172A]">
                      {item.reviewerName}
                    </strong>{' '}
                    on {formatDateTime(item.reviewedAt)} · Note: &ldquo;
                    {item.reviewNotes}&rdquo;
                  </span>
                  <span className="font-mono text-[11px] text-[#0759A8]">
                    {item.executionResult}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// 4. SETTINGS VIEW (Roles, Integrations, Service Catalog & Audit Log — Section 7I)
// =============================================================================
export const SettingsView: React.FC<{
  snapshot: CrmSnapshot;
  currentUser: Profile;
}> = ({ snapshot, currentUser }) => {
  const [activeTab, setActiveTab] = useState<
    'integrations' | 'team' | 'catalog' | 'audit'
  >('integrations');

  const integrationsList = [
    {
      name: 'Supabase PostgreSQL & Auth (RLS)',
      connected: snapshot.integrationStatus.supabaseConfigured,
      envKeys: 'NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY',
      desc: 'Primary relational database and authentication provider. Migration file ready at supabase/migrations/20261012000001_solivate_crm_foundation.sql.',
    },
    {
      name: 'Google Gemini AI Server SDK (@google/genai)',
      connected: snapshot.integrationStatus.geminiConfigured,
      envKeys: 'GEMINI_API_KEY (Server-side only)',
      desc: 'Powers Agent A (Lead Qualification), Agent B (Sales Copilot), and Agent C (Executive Business Brief).',
    },
    {
      name: 'Meta Lead Ads & Marketing API',
      connected: snapshot.integrationStatus.metaAdsConfigured,
      envKeys: 'META_APP_ID, META_SYSTEM_USER_ACCESS_TOKEN, META_AD_ACCOUNT_ID',
      desc: 'Phase 3 webhook ingestion for instant lead capture and daily campaign spend/conversion sync.',
    },
    {
      name: 'n8n Workflow Orchestration',
      connected: snapshot.integrationStatus.n8nConfigured,
      envKeys: 'N8N_WEBHOOK_BASE_URL, N8N_API_SECRET',
      desc: 'Phase 4 scheduled campaign sync, overdue follow-up reminders, and webhook retry processing.',
    },
    {
      name: 'WhatsApp Business Platform (Official API)',
      connected: false,
      envKeys: 'Planned for Phase 2 (Manual WhatsApp logging active in MVP)',
      desc: 'Per PRD Section 9, personal WhatsApp scraping is prohibited. MVP uses structured manual conversation logging.',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workspace Settings & Governance"
        subtitle="Manage internal team roles, verify integration boundaries, inspect the official Service Catalog, and audit webhook events."
      />

      {/* Settings Sub-Navigation */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-white border border-[#E2E8F0] rounded-xl w-fit">
        {(
          [
            { id: 'integrations', label: 'Integration Status' },
            { id: 'team', label: 'Team & RBAC Roles (4)' },
            { id: 'catalog', label: 'Service Catalog & Pricing Rules' },
            { id: 'audit', label: 'Integration & Audit Logs' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-[#07172A] text-[#D5FF35] font-semibold'
                : 'text-[#64748B] hover:text-[#07172A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrationsList.map((intg) => (
            <div
              key={intg.name}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-[#07172A]">
                    {intg.name}
                  </h3>
                  <StatusBadge
                    customText={
                      intg.connected ? 'CONNECTED' : 'NOT CONNECTED'
                    }
                    variant={intg.connected ? 'success' : 'warning'}
                  />
                </div>
                <p className="mt-2 text-xs text-[#64748B] leading-relaxed">
                  {intg.desc}
                </p>
              </div>
              <div className="pt-3 border-t border-[#E2E8F0] text-[11px] font-mono text-[#0759A8]">
                Required Env: {intg.envKeys}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#07172A]">
                Authorized Solivate Studio Team Members (PRD Section 4)
              </h3>
              <p className="text-xs text-[#64748B]">
                Current active session: {currentUser.fullName} ({currentUser.email})
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Title & Responsibilities</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {snapshot.profiles.map((prof) => (
                  <tr key={prof.id}>
                    <td className="py-3.5 px-4 font-semibold text-[#07172A]">
                      {prof.fullName}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[#64748B]">
                      {prof.email}
                    </td>
                    <td className="py-3.5 px-4 font-mono uppercase text-[#0759A8] font-semibold">
                      {prof.role}
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B]">{prof.title}</td>
                    <td className="py-3.5 px-4 text-right">
                      <StatusBadge
                        customText="ACTIVE"
                        variant="success"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'catalog' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {snapshot.serviceCatalog.map((srv) => (
            <div
              key={srv.id}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-2.5 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold text-[#0759A8]">
                    {srv.category}
                  </div>
                  <h3 className="text-sm font-bold text-[#07172A]">
                    {srv.name}
                  </h3>
                </div>
                <span className="font-mono tabular-nums font-bold text-[#07172A] shrink-0">
                  From {formatIdr(srv.startingPriceIdr)}
                </span>
              </div>
              <p className="text-[#64748B] leading-relaxed">
                {srv.deliverablesSummary}
              </p>
              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#07172A]">
                <span>Timeline: {srv.typicalTimelineWeeks}</span>
                <span className="text-[#64748B]">{srv.discountPolicy}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h3 className="text-sm font-bold text-[#07172A]">
              Integration Webhook & Idempotency Log (integration_events)
            </h3>
            <p className="text-xs text-[#64748B]">
              Tracks inbound webhook deliveries, deduplication blocks, and retry status (FR-09, FR-13)
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Provider & Event</th>
                  <th className="py-3 px-4">External Event ID</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Summary / Error Detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {snapshot.integrationEvents.map((evt) => (
                  <tr key={evt.id}>
                    <td className="py-3 px-4 font-mono tabular-nums text-[#64748B] whitespace-nowrap">
                      {formatDateTime(evt.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-medium text-[#07172A] whitespace-nowrap">
                      {evt.provider} · <span className="font-mono">{evt.eventType}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#64748B] whitespace-nowrap">
                      {evt.externalEventId}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge
                        customText={evt.status.toUpperCase()}
                        variant={
                          evt.status === 'processed'
                            ? 'success'
                            : evt.status === 'ignored_duplicate'
                            ? 'info'
                            : 'danger'
                        }
                      />
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      <div>{evt.payloadSummary}</div>
                      {evt.errorMessage && (
                        <div className="text-[11px] font-mono text-amber-800 mt-0.5">
                          {evt.errorMessage}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
