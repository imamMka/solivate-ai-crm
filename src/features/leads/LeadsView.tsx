import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type {
  CrmSnapshot,
  Lead,
  LeadSource,
  PipelineStage,
  PriorityLevel,
} from '../../types/crm.ts';
import { PIPELINE_STAGES, LEAD_SOURCE_LABELS } from '../../types/crm.ts';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
} from '../../components/ui/Primitives.tsx';
import { formatIdr, formatShortDate } from '../../lib/formatters.ts';
import { createLeadSchema } from '../../lib/validations/crmSchemas.ts';

export interface LeadsViewProps {
  snapshot: CrmSnapshot;
  onSelectLead: (leadId: string) => void;
  onCreateLead: (payload: {
    fullName: string;
    email: string;
    phone: string;
    companyName: string;
    serviceInterest: string;
    source: LeadSource;
    ownerId: string;
    estimatedValueIdr: number;
    priority: PriorityLevel;
    notes: string;
    forceDuplicateOverride?: boolean;
  }) => Promise<{ duplicateLead?: Lead; error?: string; ok: boolean }>;
  isCreateModalOpen: boolean;
  onSetCreateModalOpen: (open: boolean) => void;
}

export const LeadsView: React.FC<LeadsViewProps> = ({
  snapshot,
  onSelectLead,
  onCreateLead,
  isCreateModalOpen,
  onSetCreateModalOpen,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // Create Lead Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [serviceInterest, setServiceInterest] = useState(
    snapshot.serviceCatalog[0]?.name || 'Custom Web Application & Next.js Platform'
  );
  const [source, setSource] = useState<LeadSource>('whatsapp_manual');
  const [ownerId, setOwnerId] = useState(
    snapshot.profiles.find((p) => p.role === 'sales')?.id ||
      snapshot.profiles[0]?.id ||
      'usr-sales-01'
  );
  const [estimatedValueIdr, setEstimatedValueIdr] = useState('45000000');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [duplicateConflictLead, setDuplicateConflictLead] = useState<Lead | null>(
    null
  );
  const [submitting, setSubmitting] = useState(false);

  const activeLeads = useMemo(
    () => snapshot.leads.filter((l) => !l.isArchived),
    [snapshot.leads]
  );

  const filteredLeads = useMemo(() => {
    return activeLeads.filter((lead) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        lead.fullName.toLowerCase().includes(q) ||
        lead.email.toLowerCase().includes(q) ||
        lead.phone.toLowerCase().includes(q) ||
        lead.companyName.toLowerCase().includes(q);

      const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
      const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
      const matchesOwner = ownerFilter === 'all' || lead.ownerId === ownerFilter;

      return matchesSearch && matchesSource && matchesStage && matchesOwner;
    });
  }, [activeLeads, searchQuery, sourceFilter, stageFilter, ownerFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeads = filteredLeads.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPhone('');
    setCompanyName('');
    setEstimatedValueIdr('45000000');
    setPriority('medium');
    setNotes('');
    setFormError(null);
    setDuplicateConflictLead(null);
  };

  const handleSubmitForm = async (
    e: React.FormEvent,
    forceDuplicateOverride = false
  ) => {
    e.preventDefault();
    setFormError(null);

    const numericValue = Number(estimatedValueIdr.replace(/[^0-9]/g, '')) || 0;
    const validation = createLeadSchema.safeParse({
      fullName,
      email,
      phone,
      companyName,
      serviceInterest,
      source,
      ownerId,
      estimatedValueIdr: numericValue,
      priority,
      notes,
    });

    if (!validation.success) {
      setFormError(
        validation.error.issues[0]?.message || 'Please check the form fields.'
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await onCreateLead({
        ...validation.data,
        forceDuplicateOverride,
      });

      if (!res.ok) {
        if (res.duplicateLead) {
          setDuplicateConflictLead(res.duplicateLead);
        }
        setFormError(res.error || 'Unable to create lead.');
      } else {
        resetForm();
        onSetCreateModalOpen(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const getOwnerName = (id: string | null) => {
    if (!id) return 'Unassigned';
    return snapshot.profiles.find((p) => p.id === id)?.fullName ?? 'Unassigned';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leads Management"
        subtitle="Centralized directory across Meta Lead Ads, website forms, WhatsApp manual logs, and referrals with FR-02 deduplication."
        actions={
          <button
            type="button"
            onClick={() => {
              resetForm();
              onSetCreateModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#07172A] text-[#D5FF35] rounded-lg hover:bg-[#061426] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create Lead</span>
          </button>
        }
      />

      {/* Search & Filters Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by lead name, company, email, or phone..."
            aria-label="Search leads"
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#F4F7FB] border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:bg-white focus:border-[#0759A8]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          <select
            aria-label="Filter by source"
            value={sourceFilter}
            onChange={(e) => {
              setSourceFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
          >
            <option value="all">All Sources</option>
            {(
              Object.keys(LEAD_SOURCE_LABELS) as Array<
                keyof typeof LEAD_SOURCE_LABELS
              >
            ).map((k) => (
              <option key={k} value={k}>
                {LEAD_SOURCE_LABELS[k]}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by pipeline stage"
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
          >
            <option value="all">All Stages</option>
            {PIPELINE_STAGES.map((st: { id: PipelineStage; label: string }) => (
              <option key={st.id} value={st.id}>
                {st.label}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter by assigned owner"
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
          >
            <option value="all">All Owners</option>
            {snapshot.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>

          {(searchQuery ||
            sourceFilter !== 'all' ||
            stageFilter !== 'all' ||
            ownerFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSourceFilter('all');
                setStageFilter('all');
                setOwnerFilter('all');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 text-xs font-medium text-[#0759A8] hover:underline whitespace-nowrap"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Leads Table */}
      {filteredLeads.length === 0 ? (
        <EmptyState
          title="No leads match your current criteria"
          description="Try clearing your search filters or log a new prospect into Solivate AI CRM."
          actionLabel="Create New Lead"
          onAction={() => {
            resetForm();
            onSetCreateModalOpen(true);
          }}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                  <th className="py-3 px-4 whitespace-nowrap">Lead & Company</th>
                  <th className="py-3 px-4 whitespace-nowrap">Contact</th>
                  <th className="py-3 px-4 whitespace-nowrap">Interested Service</th>
                  <th className="py-3 px-4 whitespace-nowrap">Source</th>
                  <th className="py-3 px-4 whitespace-nowrap">Stage & Priority</th>
                  <th className="py-3 px-4 whitespace-nowrap">Owner</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">
                    Est. Deal Value
                  </th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {paginatedLeads.map((lead) => (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="cursor-pointer hover:bg-slate-50/90 transition-colors"
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#07172A] text-sm">
                        {lead.fullName}
                      </div>
                      <div className="text-[#64748B] mt-0.5">{lead.companyName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-[#07172A] font-mono">{lead.phone}</div>
                      <div className="text-[#64748B] truncate max-w-[180px]">
                        {lead.email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#07172A] max-w-[220px]">
                      <div className="truncate" title={lead.serviceInterest}>
                        {lead.serviceInterest}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#64748B] whitespace-nowrap">
                      {LEAD_SOURCE_LABELS[lead.source]}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge stage={lead.stage} />
                        <span className="text-slate-300">·</span>
                        <StatusBadge priority={lead.priority} />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#07172A] whitespace-nowrap">
                      {getOwnerName(lead.ownerId)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#07172A] whitespace-nowrap">
                      {formatIdr(lead.estimatedValueIdr)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums text-[#64748B] whitespace-nowrap">
                      {formatShortDate(lead.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-4 py-3 bg-[#F4F7FB] border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
            <div className="font-mono tabular-nums">
              Showing {(safePage - 1) * pageSize + 1}–
              {Math.min(safePage * pageSize, filteredLeads.length)} of{' '}
              {filteredLeads.length} leads
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#07172A] disabled:opacity-40 hover:bg-slate-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono tabular-nums font-medium text-[#07172A]">
                Page {safePage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white text-[#07172A] disabled:opacity-40 hover:bg-slate-50"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lead Modal Dialog with FR-02 Deduplication Alert */}
      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#061426]/65 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-lead-modal-title"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-xl w-full p-6 shadow-xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0]">
              <div>
                <h2
                  id="create-lead-modal-title"
                  className="text-base font-bold text-[#07172A]"
                >
                  Create New CRM Lead
                </h2>
                <p className="text-xs text-[#64748B]">
                  Validates contact schema and checks normalized phone/email for duplicates (FR-01, FR-02).
                </p>
              </div>
              <button
                type="button"
                onClick={() => onSetCreateModalOpen(false)}
                aria-label="Close modal"
                className="p-1 text-[#64748B] hover:text-[#07172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
                <div className="flex items-start gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
                {duplicateConflictLead && (
                  <div className="pt-2 border-t border-red-200 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onSetCreateModalOpen(false);
                        onSelectLead(duplicateConflictLead.id);
                      }}
                      className="text-xs font-semibold text-[#0759A8] hover:underline"
                    >
                      Open Existing Lead ({duplicateConflictLead.fullName})
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleSubmitForm(e, true)}
                      className="px-2.5 py-1 text-xs font-semibold bg-red-800 text-white rounded-md hover:bg-red-900"
                    >
                      Create Anyway (Override Duplicate Warning)
                    </button>
                  </div>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => handleSubmitForm(e, false)}
              className="mt-4 space-y-4 text-xs"
              noValidate
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="lead-full-name"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Full Name *
                  </label>
                  <input
                    id="lead-full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g., Budi Santoso"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lead-company"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Company / Business Name *
                  </label>
                  <input
                    id="lead-company"
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g., PT Nusantara Digital"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="lead-email"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Email Address *
                  </label>
                  <input
                    id="lead-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@nusantaradigital.co.id"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lead-phone"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Phone / WhatsApp Number *
                  </label>
                  <input
                    id="lead-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+62 812-xxxx-xxxx"
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] font-mono focus:outline-none focus:border-[#0759A8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="lead-service"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Interested Service *
                  </label>
                  <select
                    id="lead-service"
                    value={serviceInterest}
                    onChange={(e) => setServiceInterest(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] bg-white focus:outline-none focus:border-[#0759A8]"
                  >
                    {snapshot.serviceCatalog.map((srv) => (
                      <option key={srv.id} value={srv.name}>
                        {srv.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="lead-source"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Lead Source *
                  </label>
                  <select
                    id="lead-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value as LeadSource)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] bg-white focus:outline-none focus:border-[#0759A8]"
                  >
                    {(
                      Object.keys(LEAD_SOURCE_LABELS) as Array<
                        keyof typeof LEAD_SOURCE_LABELS
                      >
                    ).map((k) => (
                      <option key={k} value={k}>
                        {LEAD_SOURCE_LABELS[k]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="lead-owner"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Assigned Owner *
                  </label>
                  <select
                    id="lead-owner"
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] bg-white focus:outline-none focus:border-[#0759A8]"
                  >
                    {snapshot.profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="lead-value"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Estimated Deal Value (IDR)
                  </label>
                  <input
                    id="lead-value"
                    type="number"
                    min={0}
                    step={1000000}
                    value={estimatedValueIdr}
                    onChange={(e) => setEstimatedValueIdr(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] font-mono tabular-nums focus:outline-none focus:border-[#0759A8]"
                  />
                </div>
                <div>
                  <label
                    htmlFor="lead-priority"
                    className="block font-semibold text-[#07172A] mb-1"
                  >
                    Initial Priority
                  </label>
                  <select
                    id="lead-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] bg-white focus:outline-none focus:border-[#0759A8]"
                  >
                    <option value="high">High Priority</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="lead-notes"
                  className="block font-semibold text-[#07172A] mb-1"
                >
                  Qualification Notes & Context
                </label>
                <textarea
                  id="lead-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Summarize project scope, WhatsApp conversation context, or decision timeline..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                />
              </div>

              <div className="pt-4 border-t border-[#E2E8F0] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => onSetCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-[#07172A] bg-white border border-[#E2E8F0] rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-[#07172A] text-[#D5FF35] rounded-lg hover:bg-[#061426] flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Lead to CRM</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
