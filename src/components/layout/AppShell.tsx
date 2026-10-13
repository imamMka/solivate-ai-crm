import React, { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Kanban,
  Megaphone,
  CheckSquare,
  Sparkles,
  ShieldCheck,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Menu,
  X,
  Plus,
  ChevronDown,
  UserCheck,
} from 'lucide-react';
import type { Profile, UserRole } from '../../types/crm.ts';
import { Breadcrumbs, type BreadcrumbItem } from '../ui/Primitives.tsx';

export type NavRouteId =
  | 'dashboard'
  | 'leads'
  | 'lead_detail'
  | 'pipeline'
  | 'campaigns'
  | 'tasks'
  | 'ai_assistant'
  | 'approvals'
  | 'settings';

export interface NavItemConfig {
  id: Exclude<NavRouteId, 'lead_detail'>;
  label: string;
  icon: React.FC<{ className?: string }>;
  count?: number;
}

export const PRIMARY_NAV_ITEMS: Omit<NavItemConfig, 'count'>[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'leads', label: 'Leads', icon: Users },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'campaigns', label: 'Campaigns', icon: Megaphone },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'ai_assistant', label: 'AI Assistant', icon: Sparkles },
  { id: 'approvals', label: 'Approvals', icon: ShieldCheck },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// 1. UserMenu
export const UserMenu: React.FC<{
  currentUser: Profile;
  allProfiles: Profile[];
  onSwitchUser: (profile: Profile) => void;
  onSignOut: () => void;
}> = ({ currentUser, allProfiles, onSwitchUser, onSignOut }) => {
  const [open, setOpen] = useState(false);

  const roleLabels: Record<UserRole, string> = {
    owner: 'Owner',
    sales: 'Sales',
    marketing: 'Marketing',
    admin: 'Admin',
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <div className="w-7 h-7 rounded-md bg-[#07172A] text-[#D5FF35] flex items-center justify-center text-xs font-bold shrink-0">
          {currentUser.fullName
            .split(' ')
            .map((n) => n[0])
            .join('')
            .slice(0, 2)}
        </div>
        <div className="hidden sm:block">
          <div className="text-xs font-semibold text-[#07172A] leading-tight whitespace-nowrap">
            {currentUser.fullName}
          </div>
          <div className="text-[11px] text-[#64748B] leading-tight whitespace-nowrap">
            {roleLabels[currentUser.role]}
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute right-0 mt-2 w-64 bg-white border border-[#E2E8F0] rounded-xl shadow-lg z-40 p-2">
            <div className="px-3 py-2 border-b border-[#E2E8F0]">
              <div className="text-xs font-semibold text-[#07172A]">{currentUser.fullName}</div>
              <div className="text-xs text-[#64748B] truncate">{currentUser.email}</div>
              <div className="mt-1 text-[11px] text-[#0759A8] font-medium">
                Active Role: {roleLabels[currentUser.role]} · {currentUser.title}
              </div>
            </div>

            <div className="py-1.5 border-b border-[#E2E8F0]">
              <div className="px-3 py-1 text-[11px] font-medium text-[#64748B]">
                Switch Internal Role (RBAC Test)
              </div>
              {allProfiles.map((prof) => {
                const isSelected = prof.id === currentUser.id;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => {
                      onSwitchUser(prof);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      isSelected
                        ? 'bg-[#F4F7FB] text-[#07172A] font-semibold'
                        : 'text-[#64748B] hover:text-[#07172A] hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{prof.fullName}</span>
                    <span className="text-[11px] font-mono text-[#0759A8]">
                      {roleLabels[prof.role]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onSignOut();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign out of Solivate CRM</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// 2. AppSidebar (Desktop Dark Navy #07172A & Deep Navy #061426 with Lime #D5FF35 active indicator)
export const AppSidebar: React.FC<{
  activeRoute: NavRouteId;
  onNavigate: (route: Exclude<NavRouteId, 'lead_detail'>) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  pendingApprovalsCount: number;
  overdueTasksCount: number;
}> = ({
  activeRoute,
  onNavigate,
  collapsed,
  onToggleCollapse,
  pendingApprovalsCount,
  overdueTasksCount,
}) => {
  const normalizedActive = activeRoute === 'lead_detail' ? 'leads' : activeRoute;

  return (
    <aside
      aria-label="Primary Sidebar Navigation"
      className={`hidden lg:flex flex-col bg-[#07172A] text-white border-r border-slate-800/80 shrink-0 transition-all duration-150 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Lockup */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 bg-[#061426]">
        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none"
        >
          <div className="w-8 h-8 rounded-lg bg-[#D5FF35] text-[#07172A] flex items-center justify-center font-bold text-sm tracking-tight shrink-0">
            S
          </div>
          {!collapsed && (
            <span className="text-base font-bold tracking-tight text-white whitespace-nowrap">
              Solivate CRM
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 py-5 px-3 space-y-1 overflow-y-auto">
        {PRIMARY_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = normalizedActive === item.id;
          const count =
            item.id === 'approvals'
              ? pendingApprovalsCount
              : item.id === 'tasks'
              ? overdueTasksCount
              : 0;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-[#D5FF35] text-[#07172A] font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    isActive ? 'text-[#07172A]' : 'text-slate-400'
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!collapsed && count > 0 && (
                <span
                  className={`font-mono text-[11px] tabular-nums ${
                    isActive ? 'text-[#07172A] font-bold' : 'text-[#D5FF35]'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Workspace Info */}
      <div className="p-4 border-t border-white/10 bg-[#061426]">
        {!collapsed ? (
          <div className="text-[11px] text-slate-400 space-y-1">
            <div className="font-medium text-slate-200">Solivate Studio Internal</div>
            <div>Phase 1 Core Foundation</div>
          </div>
        ) : (
          <div
            className="text-center text-[11px] font-mono text-slate-400"
            title="Solivate Studio Internal v1.0"
          >
            v1.0
          </div>
        )}
      </div>
    </aside>
  );
};

// 3. ResponsiveNavigation (Mobile Drawer Navigation)
export const ResponsiveNavigation: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  activeRoute: NavRouteId;
  onNavigate: (route: Exclude<NavRouteId, 'lead_detail'>) => void;
  pendingApprovalsCount: number;
  overdueTasksCount: number;
}> = ({
  isOpen,
  onClose,
  activeRoute,
  onNavigate,
  pendingApprovalsCount,
  overdueTasksCount,
}) => {
  if (!isOpen) return null;
  const normalizedActive = activeRoute === 'lead_detail' ? 'leads' : activeRoute;

  return (
    <div className="fixed inset-0 z-50 lg:hidden flex">
      <div
        className="fixed inset-0 bg-[#061426]/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-72 max-w-[85vw] bg-[#07172A] text-white flex flex-col h-full z-10">
        <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 bg-[#061426]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#D5FF35] text-[#07172A] flex items-center justify-center font-bold text-sm">
              S
            </div>
            <span className="text-base font-bold tracking-tight text-white">
              Solivate CRM
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation drawer"
            className="p-1.5 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {PRIMARY_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = normalizedActive === item.id;
            const count =
              item.id === 'approvals'
                ? pendingApprovalsCount
                : item.id === 'tasks'
                ? overdueTasksCount
                : 0;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#D5FF35] text-[#07172A] font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {count > 0 && (
                  <span className="font-mono text-[11px] tabular-nums">{count}</span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

// 4. AppHeader (Follows SaaS Top Bar Contract: Breadcrumb trail on left, primary action + account profile on right)
export const AppHeader: React.FC<{
  breadcrumbs: BreadcrumbItem[];
  currentUser: Profile;
  allProfiles: Profile[];
  onSwitchUser: (profile: Profile) => void;
  onSignOut: () => void;
  onOpenMobileMenu: () => void;
  onQuickCreateLead: () => void;
}> = ({
  breadcrumbs,
  currentUser,
  allProfiles,
  onSwitchUser,
  onSignOut,
  onOpenMobileMenu,
  onQuickCreateLead,
}) => {
  return (
    <header className="h-16 bg-white border-b border-[#E2E8F0] px-4 sm:px-8 flex items-center justify-between gap-6 shrink-0">
      {/* Left Zone: Mobile Drawer Trigger + Contextual Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open navigation menu"
          className="lg:hidden p-2 rounded-lg text-[#07172A] hover:bg-slate-100"
        >
          <Menu className="w-5 h-5" />
        </button>
        <Breadcrumbs items={breadcrumbs} />
      </div>

      {/* Right Zone: Primary Action + User Profile Menu */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onQuickCreateLead}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#D5FF35] text-[#07172A] rounded-lg hover:bg-[#C4F01E] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Lead</span>
        </button>

        <UserMenu
          currentUser={currentUser}
          allProfiles={allProfiles}
          onSwitchUser={onSwitchUser}
          onSignOut={onSignOut}
        />
      </div>
    </header>
  );
};
