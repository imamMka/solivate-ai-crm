import React, { useState } from 'react';
import { ArrowRight, AlertCircle } from 'lucide-react';
import type { CrmSnapshot, Lead, PipelineStage } from '../../types/crm.ts';
import { PIPELINE_STAGES, LEAD_SOURCE_LABELS } from '../../types/crm.ts';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
  ConfirmDialog,
} from '../../components/ui/Primitives.tsx';
import { formatCompactIdr, formatIdr } from '../../lib/formatters.ts';

export interface PipelineViewProps {
  snapshot: CrmSnapshot;
  onSelectLead: (leadId: string) => void;
  onUpdateStage: (
    leadId: string,
    stage: PipelineStage,
    options?: {
      lostReason?: string;
      contractSigned?: boolean;
      depositReceived?: boolean;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onOpenNewLeadModal: () => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({
  snapshot,
  onSelectLead,
  onUpdateStage,
  onOpenNewLeadModal,
}) => {
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PipelineStage | null>(
    null
  );
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Modal Gate State for Won (Contract + Deposit Verification) or Lost (Lost Reason)
  const [pendingTransition, setPendingTransition] = useState<{
    lead: Lead;
    targetStage: PipelineStage;
  } | null>(null);
  const [lostReason, setLostReason] = useState('');
  const [contractSigned, setContractSigned] = useState(false);
  const [depositReceived, setDepositReceived] = useState(false);

  const activeLeads = snapshot.leads.filter((l) => !l.isArchived);

  const initiateTransition = async (lead: Lead, targetStage: PipelineStage) => {
    setErrorBanner(null);
    if (lead.stage === targetStage) return;

    if (targetStage === 'lost') {
      setLostReason(lead.lostReason || '');
      setPendingTransition({ lead, targetStage });
      return;
    }

    if (targetStage === 'won') {
      const existingDeal = snapshot.deals.find((d) => d.leadId === lead.id);
      if (existingDeal?.contractSigned && existingDeal?.depositReceived) {
        const res = await onUpdateStage(lead.id, 'won', {
          contractSigned: true,
          depositReceived: true,
        });
        if (!res.ok) setErrorBanner(res.error || 'Failed to update stage.');
        return;
      }
      setContractSigned(Boolean(existingDeal?.contractSigned));
      setDepositReceived(Boolean(existingDeal?.depositReceived));
      setPendingTransition({ lead, targetStage });
      return;
    }

    const res = await onUpdateStage(lead.id, targetStage);
    if (!res.ok) {
      setErrorBanner(res.error || 'Failed to update stage.');
    }
  };

  const confirmModalTransition = async () => {
    if (!pendingTransition) return;
    const { lead, targetStage } = pendingTransition;

    const res = await onUpdateStage(lead.id, targetStage, {
      lostReason,
      contractSigned,
      depositReceived,
    });

    if (!res.ok) {
      setErrorBanner(res.error || 'Failed to validate transition.');
    } else {
      setPendingTransition(null);
    }
  };

  const getOwnerName = (ownerId: string | null) => {
    if (!ownerId) return 'Unassigned';
    return (
      snapshot.profiles.find((p) => p.id === ownerId)?.fullName.split(' ')[0] ??
      'Team'
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Pipeline Kanban"
        subtitle="Drag cards across all 8 PRD stages or use the accessible stage selector. Moving to Won enforces contract & deposit verification."
      />

      {errorBanner && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorBanner(null)}
            className="text-xs font-semibold text-red-800 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeLeads.length === 0 ? (
        <EmptyState
          title="No opportunities in the sales pipeline"
          description="Create a lead to begin tracking stage transitions across New Lead, Contacted, Qualified, Proposal, Negotiation, Won, Lost, and Nurture."
          actionLabel="Create Lead"
          onAction={onOpenNewLeadModal}
        />
      ) : (
        <div className="overflow-x-auto pb-4">
          <div className="inline-flex gap-4 min-w-full">
            {PIPELINE_STAGES.map((stageConfig) => {
              const stageLeads = activeLeads.filter(
                (l) => l.stage === stageConfig.id
              );
              const stageTotalIdr = stageLeads.reduce(
                (sum, l) => sum + l.estimatedValueIdr,
                0
              );
              const isDropTarget = dragOverStage === stageConfig.id;

              return (
                <div
                  key={stageConfig.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(stageConfig.id);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    if (!draggedLeadId) return;
                    const leadObj = activeLeads.find(
                      (l) => l.id === draggedLeadId
                    );
                    setDraggedLeadId(null);
                    if (leadObj) {
                      await initiateTransition(leadObj, stageConfig.id);
                    }
                  }}
                  className={`w-72 shrink-0 rounded-xl border p-3.5 flex flex-col justify-between transition-colors ${
                    isDropTarget
                      ? 'bg-sky-50/70 border-[#0759A8]'
                      : 'bg-white border-[#E2E8F0]'
                  }`}
                >
                  <div>
                    {/* Column Header */}
                    <div className="pb-3 mb-3 border-b border-[#E2E8F0] flex items-center justify-between">
                      <div>
                        <h2 className="text-xs font-bold text-[#07172A]">
                          {stageConfig.label}{' '}
                          <span className="font-mono tabular-nums text-[#64748B] font-normal">
                            ({stageLeads.length})
                          </span>
                        </h2>
                        <p className="text-[11px] text-[#64748B] truncate max-w-[180px]">
                          {stageConfig.description}
                        </p>
                      </div>
                      <span className="text-xs font-mono tabular-nums font-semibold text-[#0759A8]">
                        {formatCompactIdr(stageTotalIdr)}
                      </span>
                    </div>

                    {/* Cards List */}
                    <div className="space-y-3 min-h-[260px]">
                      {stageLeads.map((lead) => (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => setDraggedLeadId(lead.id)}
                          onDragEnd={() => {
                            setDraggedLeadId(null);
                            setDragOverStage(null);
                          }}
                          className="p-3.5 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] hover:border-[#0759A8] transition-colors space-y-2.5 cursor-grab active:cursor-grabbing"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectLead(lead.id)}
                              className="text-left text-xs font-bold text-[#07172A] hover:text-[#0759A8] leading-snug"
                            >
                              {lead.fullName}
                            </button>
                            <StatusBadge priority={lead.priority} />
                          </div>

                          <div className="text-[11px] text-[#64748B]">
                            <div className="font-medium text-[#07172A] truncate">
                              {lead.companyName}
                            </div>
                            <div className="truncate mt-0.5">
                              {lead.serviceInterest}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px]">
                            <span className="font-mono tabular-nums font-bold text-[#07172A]">
                              {formatIdr(lead.estimatedValueIdr)}
                            </span>
                            <span className="text-[#64748B]">
                              {LEAD_SOURCE_LABELS[lead.source].split(' ')[0]} ·{' '}
                              {getOwnerName(lead.ownerId)}
                            </span>
                          </div>

                          {/* Accessible Stage Selector for Keyboard/Non-Drag Users */}
                          <div className="pt-1 flex items-center gap-1.5">
                            <select
                              aria-label={`Change stage for ${lead.fullName}`}
                              value={lead.stage}
                              onChange={(e) =>
                                initiateTransition(
                                  lead,
                                  e.target.value as PipelineStage
                                )
                              }
                              className="w-full px-2 py-1 text-[11px] bg-white border border-[#E2E8F0] rounded text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s.id} value={s.id}>
                                  Move to: {s.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => onSelectLead(lead.id)}
                              title="Open lead details"
                              aria-label={`Open details for ${lead.fullName}`}
                              className="p-1 rounded bg-white border border-[#E2E8F0] text-[#07172A] hover:bg-slate-100 shrink-0"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Business Rule Verification Modal for Won / Lost Transitions */}
      <ConfirmDialog
        isOpen={Boolean(pendingTransition)}
        title={
          pendingTransition?.targetStage === 'won'
            ? 'Verify Won Deal Requirements (PRD Section 7G)'
            : 'Document Lost Reason (PRD FR-04)'
        }
        description={
          pendingTransition?.targetStage === 'won'
            ? `Moving "${pendingTransition.lead.fullName} (${pendingTransition.lead.companyName})" to Won does not automatically prove payment was received. Confirm both requirements below to record the Won transition.`
            : `Please provide a clear reason why "${pendingTransition?.lead.fullName}" was marked Lost so Marketing & Sales can evaluate lead quality.`
        }
        confirmLabel={
          pendingTransition?.targetStage === 'won'
            ? 'Confirm Won & Log Activity'
            : 'Record Lost Stage'
        }
        onCancel={() => setPendingTransition(null)}
        onConfirm={confirmModalTransition}
      >
        {pendingTransition?.targetStage === 'won' ? (
          <div className="space-y-2.5 text-xs bg-[#F4F7FB] p-3.5 rounded-lg border border-[#E2E8F0]">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#07172A]">
              <input
                type="checkbox"
                checked={contractSigned}
                onChange={(e) => setContractSigned(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Signed contract / scope of work received</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#07172A]">
              <input
                type="checkbox"
                checked={depositReceived}
                onChange={(e) => setDepositReceived(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Down payment deposit verified in corporate bank account</span>
            </label>
          </div>
        ) : (
          <div className="text-xs">
            <label className="block font-semibold text-[#07172A] mb-1">
              Lost Reason *
            </label>
            <input
              type="text"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              placeholder="e.g., Selected lower-cost vendor / Project postponed to 2027"
              className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A]"
            />
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
};
