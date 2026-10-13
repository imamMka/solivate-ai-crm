import React, { useState } from 'react';
import { Plus, ExternalLink, X } from 'lucide-react';
import type { CrmSnapshot, PriorityLevel, Profile } from '../../types/crm.ts';
import {
  PageHeader,
  StatusBadge,
  EmptyState,
} from '../../components/ui/Primitives.tsx';
import { formatShortDate, isTaskOverdue } from '../../lib/formatters.ts';

export interface TasksViewProps {
  snapshot: CrmSnapshot;
  currentUser: Profile;
  onToggleTask: (taskId: string) => Promise<void>;
  onCreateTask: (payload: {
    title: string;
    leadId: string | null;
    assignedTo: string;
    dueDate: string;
    priority: PriorityLevel;
    notes: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  onSelectLead: (leadId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  snapshot,
  currentUser,
  onToggleTask,
  onCreateTask,
  onSelectLead,
}) => {
  const [filterMode, setFilterMode] = useState<
    'all_pending' | 'overdue' | 'upcoming' | 'completed'
  >('all_pending');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [title, setTitle] = useState('');
  const [leadId, setLeadId] = useState<string>('');
  const [assignedTo, setAssignedTo] = useState(currentUser.id);
  const [dueDate, setDueDate] = useState('2026-10-13');
  const [priority, setPriority] = useState<PriorityLevel>('high');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const overdueCount = snapshot.tasks.filter((t) =>
    isTaskOverdue(t.dueDate, t.status)
  ).length;
  const upcomingCount = snapshot.tasks.filter(
    (t) => t.status === 'pending' && !isTaskOverdue(t.dueDate, t.status)
  ).length;
  const completedCount = snapshot.tasks.filter(
    (t) => t.status === 'completed'
  ).length;

  const filteredTasks = snapshot.tasks.filter((t) => {
    const overdue = isTaskOverdue(t.dueDate, t.status);
    if (filterMode === 'overdue') return overdue;
    if (filterMode === 'upcoming') return t.status === 'pending' && !overdue;
    if (filterMode === 'completed') return t.status === 'completed';
    return t.status === 'pending';
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const res = await onCreateTask({
      title,
      leadId: leadId || null,
      assignedTo,
      dueDate,
      priority,
      notes,
    });
    if (!res.ok) {
      setFormError(res.error || 'Failed to create task.');
    } else {
      setTitle('');
      setNotes('');
      setShowCreateModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Follow-up Tasks & Reminders"
        subtitle="Manage sales follow-up schedules, prevent missed client touchpoints, and navigate directly to associated leads (FR-06)."
        actions={
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#07172A] text-[#D5FF35] rounded-lg hover:bg-[#061426] transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        }
      />

      {/* Interactive Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-[#E2E8F0] rounded-xl p-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F4F7FB] rounded-lg">
          {(
            [
              {
                id: 'all_pending',
                label: `All Pending (${overdueCount + upcomingCount})`,
              },
              { id: 'overdue', label: `Overdue (${overdueCount})` },
              { id: 'upcoming', label: `Upcoming (${upcomingCount})` },
              { id: 'completed', label: `Completed (${completedCount})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterMode(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filterMode === tab.id
                  ? 'bg-white text-[#07172A] shadow-xs font-semibold'
                  : 'text-[#64748B] hover:text-[#07172A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-[#64748B]">
          Reference Date: <span className="font-mono">12 Oct 2026</span>
        </div>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <EmptyState
          title="No tasks in this view"
          description="All follow-up items for the selected filter are clear, or you can schedule a new sales reminder."
          actionLabel="Schedule Follow-up Task"
          onAction={() => setShowCreateModal(true)}
        />
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F7FB] border-b border-[#E2E8F0] text-xs font-semibold text-[#64748B]">
                  <th className="py-3 px-4 w-10">Done</th>
                  <th className="py-3 px-4">Task Title & Notes</th>
                  <th className="py-3 px-4">Related Lead</th>
                  <th className="py-3 px-4">Assigned User</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4 text-right">Due Date & Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] text-xs">
                {filteredTasks.map((task) => {
                  const overdue = isTaskOverdue(task.dueDate, task.status);
                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="py-3.5 px-4 align-top">
                        <input
                          type="checkbox"
                          checked={task.status === 'completed'}
                          onChange={() => onToggleTask(task.id)}
                          aria-label={`Mark "${task.title}" complete`}
                          className="mt-0.5 rounded border-slate-300 text-[#07172A] cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          className={`text-sm font-semibold ${
                            task.status === 'completed'
                              ? 'line-through text-[#64748B]'
                              : 'text-[#07172A]'
                          }`}
                        >
                          {task.title}
                        </div>
                        {task.notes && (
                          <div className="mt-0.5 text-[#64748B]">
                            {task.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.leadId && task.leadName ? (
                          <button
                            type="button"
                            onClick={() => onSelectLead(task.leadId!)}
                            className="inline-flex items-center gap-1 font-medium text-[#0759A8] hover:underline"
                          >
                            <span>{task.leadName}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-[#64748B]">
                            General Operations
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#07172A] whitespace-nowrap">
                        {task.assignedToName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge priority={task.priority} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <span
                          className={
                            overdue
                              ? 'text-red-700 font-semibold'
                              : task.status === 'completed'
                              ? 'text-emerald-700 font-medium'
                              : 'text-[#07172A]'
                          }
                        >
                          {overdue
                            ? 'Overdue · '
                            : task.status === 'completed'
                            ? 'Completed · '
                            : ''}
                          {formatShortDate(task.dueDate)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#061426]/65 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-task-modal-title"
        >
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <h3
                id="new-task-modal-title"
                className="text-base font-bold text-[#07172A]"
              >
                Create Follow-up Task
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Close modal"
                className="p-1 text-[#64748B] hover:text-[#07172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#07172A] mb-1">
                  Task Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Follow up on proposal SLA terms"
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#07172A] mb-1">
                  Related Lead (Optional)
                </label>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#07172A]"
                >
                  <option value="">None (General Operational Task)</option>
                  {snapshot.leads
                    .filter((l) => !l.isArchived)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.fullName} — {l.companyName}
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#07172A] mb-1">
                    Assigned To *
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#07172A]"
                  >
                    {snapshot.profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#07172A] mb-1">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg font-mono text-[#07172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#07172A] mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg bg-white text-[#07172A]"
                >
                  <option value="high">High Priority</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#07172A] mb-1">
                  Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Context or prerequisites before contacting the lead..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-[#07172A]"
                />
              </div>

              <div className="pt-3 border-t border-[#E2E8F0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium bg-white border border-[#E2E8F0] rounded-lg text-[#07172A]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-[#07172A] text-[#D5FF35] rounded-lg hover:bg-[#061426]"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
