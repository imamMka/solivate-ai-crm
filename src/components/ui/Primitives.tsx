import React from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Inbox,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';
import type { PipelineStage, PriorityLevel } from '../../types/crm.ts';
import { PIPELINE_STAGES } from '../../types/crm.ts';

// 1. PageHeader
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-[#E2E8F0]">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-[#07172A]">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-3 shrink-0">{actions}</div>}
  </div>
);

// 2. Breadcrumbs
export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export const Breadcrumbs: React.FC<{ items: BreadcrumbItem[] }> = ({ items }) => (
  <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#64748B]">
    {items.map((item, idx) => {
      const isLast = idx === items.length - 1;
      return (
        <React.Fragment key={`${item.label}-${idx}`}>
          {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
          {item.onClick && !isLast ? (
            <button
              type="button"
              onClick={item.onClick}
              className="hover:text-[#07172A] transition-colors whitespace-nowrap shrink-0 font-medium"
            >
              {item.label}
            </button>
          ) : (
            <span
              className={`whitespace-nowrap shrink-0 ${
                isLast ? 'text-[#07172A] font-semibold' : ''
              }`}
            >
              {item.label}
            </span>
          )}
        </React.Fragment>
      );
    })}
  </nav>
);

// 3. MetricCard (Single-Elevation Depth, Tabular Numerals, Zero-Pill Metadata)
export interface MetricCardProps {
  label: string;
  value: string | number;
  contextText: string;
  semanticState?: 'neutral' | 'positive' | 'warning' | 'danger';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  contextText,
  semanticState = 'neutral',
  onClick,
}) => {
  const stateColorMap = {
    neutral: 'text-[#64748B]',
    positive: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
  };

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`bg-white border border-[#E2E8F0] rounded-xl p-5 transition-colors ${
        onClick ? 'cursor-pointer hover:border-[#0759A8]' : ''
      }`}
    >
      <div className="text-xs font-medium text-[#64748B]">{label}</div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-[#07172A] font-mono tabular-nums">
        {value}
      </div>
      <div className={`mt-2 text-xs font-medium ${stateColorMap[semanticState]}`}>
        {contextText}
      </div>
    </div>
  );
};

// 4. StatusBadge (Clean unboxed semantic text with icon or typographic indicator — adheres to Zero-Pill & No Hue-Only signaling)
export const StatusBadge: React.FC<{
  stage?: PipelineStage;
  priority?: PriorityLevel;
  customText?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}> = ({ stage, priority, customText, variant = 'default' }) => {
  if (stage) {
    const stageInfo = PIPELINE_STAGES.find((s) => s.id === stage);
    const label = stageInfo?.label ?? stage;
    const toneClass =
      stage === 'won'
        ? 'text-emerald-700 font-semibold'
        : stage === 'lost'
        ? 'text-red-700 font-medium'
        : stage === 'negotiation' || stage === 'proposal'
        ? 'text-[#0759A8] font-semibold'
        : 'text-[#07172A] font-medium';

    return <span className={`text-xs ${toneClass} whitespace-nowrap`}>{label}</span>;
  }

  if (priority) {
    const map = {
      high: 'text-red-700 font-semibold',
      medium: 'text-amber-700 font-medium',
      low: 'text-[#64748B] font-normal',
    };
    const label = priority === 'high' ? 'High Priority' : priority === 'medium' ? 'Medium' : 'Low';
    return <span className={`text-xs ${map[priority]} whitespace-nowrap`}>{label}</span>;
  }

  const variantClasses = {
    default: 'text-[#07172A]',
    success: 'text-emerald-700 font-semibold',
    warning: 'text-amber-700 font-semibold',
    danger: 'text-red-700 font-semibold',
    info: 'text-[#0759A8] font-semibold',
  };

  return (
    <span className={`text-xs ${variantClasses[variant]} whitespace-nowrap`}>
      {customText}
    </span>
  );
};

// 5. EmptyState
export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center max-w-2xl mx-auto my-4">
    <div className="w-10 h-10 rounded-lg bg-[#F4F7FB] border border-[#E2E8F0] flex items-center justify-center mx-auto text-[#0759A8]">
      <Inbox className="w-5 h-5" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-[#07172A]">{title}</h3>
    <p className="mt-1.5 text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
      {description}
    </p>
    {(actionLabel || secondaryActionLabel) && (
      <div className="mt-6 flex items-center justify-center gap-3">
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="px-4 py-2 text-xs font-semibold bg-[#D5FF35] text-[#07172A] rounded-lg hover:bg-[#C4F01E] transition-colors whitespace-nowrap shrink-0"
          >
            {actionLabel}
          </button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            onClick={onSecondaryAction}
            className="px-4 py-2 text-xs font-medium bg-white text-[#07172A] border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    )}
  </div>
);

// 6. LoadingState
export const LoadingState: React.FC<{ label?: string }> = ({
  label = 'Loading Solivate CRM workspace records...',
}) => (
  <div className="bg-white border border-[#E2E8F0] rounded-xl p-8">
    <div className="flex items-center gap-3 text-sm font-medium text-[#07172A]">
      <Loader2 className="w-4 h-4 animate-spin text-[#0759A8]" />
      <span>{label}</span>
    </div>
    <div className="mt-6 space-y-3">
      <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
      <div className="h-9 bg-slate-100 rounded-lg animate-pulse" />
    </div>
  </div>
);

// 7. ErrorState
export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Unable to complete operation', message, onRetry }) => (
  <div
    role="alert"
    className="bg-red-50/70 border border-red-200 rounded-xl p-4 flex items-start justify-between gap-4"
  >
    <div className="flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
      <div>
        <h4 className="text-sm font-semibold text-red-900">{title}</h4>
        <p className="mt-0.5 text-xs text-red-800 leading-relaxed">{message}</p>
      </div>
    </div>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 text-xs font-medium bg-white text-red-900 border border-red-200 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
      >
        Retry
      </button>
    )}
  </div>
);

// 8. ConfirmDialog (Replaces window.alert / window.confirm per iframe rules)
export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: 'primary' | 'danger';
  children?: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'primary',
  children,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#061426]/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-6 shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <h3 id="confirm-dialog-title" className="text-base font-bold text-[#07172A]">
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close dialog"
            className="text-[#64748B] hover:text-[#07172A] p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="mt-2 text-sm text-[#64748B] leading-relaxed">{description}</p>
        {children && <div className="mt-4">{children}</div>}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-xs font-medium text-[#07172A] bg-white border border-[#E2E8F0] rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
              variant === 'danger'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-[#07172A] text-[#D5FF35] hover:bg-[#061426]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

// 9. DataTable (Generic high-density accessible table wrapper)
export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right';
  render: (row: T) => React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  onRowClick,
  emptyTitle = 'No matching records',
  emptyDescription = 'Adjust your search query or filter criteria.',
}: {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E2E8F0] bg-[#F4F7FB]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-4 text-xs font-semibold text-[#64748B] whitespace-nowrap ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E2E8F0] text-sm">
            {data.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-slate-50/90' : 'hover:bg-slate-50/50'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3 px-4 align-middle ${
                      col.align === 'right' ? 'text-right font-mono tabular-nums' : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
