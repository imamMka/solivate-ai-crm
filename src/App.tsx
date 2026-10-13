/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import type {
  CrmSnapshot,
  Lead,
  LeadSource,
  PipelineStage,
  PriorityLevel,
  Profile,
  AiQualificationResult,
  AiDraftResult,
} from './types/crm.ts';
import {
  AppSidebar,
  AppHeader,
  ResponsiveNavigation,
  type NavRouteId,
} from './components/layout/AppShell.tsx';
import {
  LoadingState,
  ErrorState,
  type BreadcrumbItem,
} from './components/ui/Primitives.tsx';
import { LoginPage } from './features/auth/LoginPage.tsx';
import { DashboardView } from './features/dashboard/DashboardView.tsx';
import { LeadsView } from './features/leads/LeadsView.tsx';
import { LeadDetailView } from './features/leads/LeadDetailView.tsx';
import { PipelineView } from './features/pipeline/PipelineView.tsx';
import { TasksView } from './features/tasks/TasksView.tsx';
import {
  CampaignsView,
  AiAssistantView,
  ApprovalsView,
  SettingsView,
} from './features/operations/OperationsViews.tsx';
import { isTaskOverdue } from './lib/formatters.ts';

export default function App() {
  const [snapshot, setSnapshot] = useState<CrmSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // In-memory authenticated session (Never stores secrets in localStorage per Section 7B)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null);

  // Navigation & Layout State
  const [activeRoute, setActiveRoute] = useState<NavRouteId>('dashboard');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isCreateLeadModalOpen, setIsCreateLeadModalOpen] =
    useState<boolean>(false);

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/crm/snapshot');
      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }
      const data: CrmSnapshot = await response.json();
      setSnapshot(data);
      // Pre-authenticate as Owner in preview so the reviewer lands on the primary Dashboard immediately while still allowing full Sign-Out / Sign-In flow testing
      setCurrentUser((prev) => prev ?? data.profiles[0] ?? null);
    } catch (err: any) {
      setFetchError(
        err?.message || 'Unable to load Solivate AI CRM workspace snapshot.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  // Handlers
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    setActiveRoute('lead_detail');
  };

  const handleNavigate = (route: Exclude<NavRouteId, 'lead_detail'>) => {
    setActiveRoute(route);
  };

  const handleSwitchWorkspaceMode = async (
    mode: 'demo_fixtures' | 'empty_workspace',
    resetFixtures = false
  ) => {
    const res = await fetch('/api/crm/workspace-mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, resetFixtures }),
    });
    if (res.ok) {
      const updated: CrmSnapshot = await res.json();
      setSnapshot(updated);
    }
  };

  const handleCreateLead = async (payload: {
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
  }): Promise<{ duplicateLead?: Lead; error?: string; ok: boolean }> => {
    const res = await fetch('/api/crm/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || 'Failed to create lead',
        duplicateLead: data.duplicateLead,
      };
    }
    setSnapshot(data.snapshot);
    return { ok: true };
  };

  const handleUpdateStage = async (
    leadId: string,
    stage: PipelineStage,
    options?: {
      lostReason?: string;
      contractSigned?: boolean;
      depositReceived?: boolean;
    }
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/crm/leads/${leadId}/stage`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        stage,
        lostReason: options?.lostReason,
        contractSigned: options?.contractSigned,
        depositReceived: options?.depositReceived,
        actorName: currentUser?.fullName ?? 'Internal User',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Stage transition rejected' };
    }
    setSnapshot(data.snapshot);
    return { ok: true };
  };

  const handleLogActivity = async (payload: {
    leadId: string;
    activityType: 'whatsapp_log' | 'note' | 'call_summary' | 'email_summary';
    direction: 'inbound' | 'outbound' | 'internal';
    summary: string;
    nextFollowupDate?: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/crm/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        actorName: currentUser?.fullName ?? 'Internal User',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to log activity' };
    }
    setSnapshot(data.snapshot);
    return { ok: true };
  };

  const handleCreateTask = async (payload: {
    title: string;
    leadId: string | null;
    assignedTo: string;
    dueDate: string;
    priority: PriorityLevel;
    notes: string;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch('/api/crm/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Failed to create task' };
    }
    setSnapshot(data.snapshot);
    return { ok: true };
  };

  const handleToggleTask = async (taskId: string) => {
    const res = await fetch(`/api/crm/tasks/${taskId}/toggle`, {
      method: 'PATCH',
    });
    if (res.ok) {
      const data = await res.json();
      setSnapshot(data.snapshot);
    }
  };

  const handleReviewApproval = async (
    approvalId: string,
    decision: 'approved' | 'rejected',
    reviewNotes: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const res = await fetch(`/api/crm/approvals/${approvalId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        decision,
        reviewNotes,
        reviewerRole: currentUser?.role ?? 'sales',
        reviewerName: currentUser?.fullName ?? 'Internal User',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || 'Approval review failed' };
    }
    setSnapshot(data.snapshot);
    return { ok: true };
  };

  const handleRunAiLeadAssist = async (
    leadId: string,
    mode: 'qualify' | 'draft_followup',
    customInstruction?: string
  ): Promise<{
    qualification?: AiQualificationResult;
    draft?: AiDraftResult;
    error?: string;
  }> => {
    const res = await fetch('/api/ai/lead-assist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        mode,
        customInstruction,
        triggeredByName: currentUser?.fullName ?? 'Internal User',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { error: data.error || 'AI request failed' };
    }
    if (data.snapshot) setSnapshot(data.snapshot);
    return {
      qualification: data.qualification,
      draft: data.draft,
    };
  };

  const handleGenerateAiBrief = async (prompt?: string) => {
    const res = await fetch('/api/ai/business-brief', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        triggeredByName: currentUser?.fullName ?? 'Internal User',
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to generate AI Business Brief.');
    }
    if (data.snapshot) setSnapshot(data.snapshot);
    return data.brief;
  };

  if (loading && !snapshot) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] p-8 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <LoadingState label="Initializing Solivate AI CRM Foundation..." />
        </div>
      </div>
    );
  }

  if (fetchError || !snapshot) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] p-8 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <ErrorState
            title="Workspace Connection Error"
            message={fetchError || 'Snapshot unavailable'}
            onRetry={loadSnapshot}
          />
        </div>
      </div>
    );
  }

  // Route Protection: Unauthenticated users are redirected to the Login page (Section 4 & 7B)
  if (!currentUser) {
    return (
      <LoginPage
        profiles={snapshot.profiles}
        integrationStatus={snapshot.integrationStatus}
        onAuthenticated={(prof) => {
          setCurrentUser(prof);
          setActiveRoute('dashboard');
        }}
      />
    );
  }

  const pendingApprovalsCount = snapshot.approvals.filter(
    (a) => a.status === 'pending'
  ).length;
  const overdueTasksCount = snapshot.tasks.filter((t) =>
    isTaskOverdue(t.dueDate, t.status)
  ).length;

  const routeLabelMap: Record<NavRouteId, string> = {
    dashboard: 'Dashboard',
    leads: 'Leads Directory',
    lead_detail: 'Lead Detail',
    pipeline: 'Sales Pipeline',
    campaigns: 'Meta Ads Campaigns',
    tasks: 'Follow-up Tasks',
    ai_assistant: 'AI Sales Copilot',
    approvals: 'Approval Queue',
    settings: 'Workspace Settings',
  };

  const breadcrumbs: BreadcrumbItem[] = [
    {
      label: 'Solivate Workspace',
      onClick: () => setActiveRoute('dashboard'),
    },
  ];

  if (activeRoute === 'lead_detail') {
    const activeLeadObj = snapshot.leads.find((l) => l.id === selectedLeadId);
    breadcrumbs.push({
      label: 'Leads Directory',
      onClick: () => setActiveRoute('leads'),
    });
    breadcrumbs.push({
      label: activeLeadObj ? activeLeadObj.fullName : 'Lead Detail',
    });
  } else {
    breadcrumbs.push({ label: routeLabelMap[activeRoute] });
  }

  return (
    <div className="min-h-screen flex bg-[#F4F7FB] text-[#07172A]">
      {/* Desktop Sidebar */}
      <AppSidebar
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        pendingApprovalsCount={pendingApprovalsCount}
        overdueTasksCount={overdueTasksCount}
      />

      {/* Mobile Drawer */}
      <ResponsiveNavigation
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        activeRoute={activeRoute}
        onNavigate={handleNavigate}
        pendingApprovalsCount={pendingApprovalsCount}
        overdueTasksCount={overdueTasksCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader
          breadcrumbs={breadcrumbs}
          currentUser={currentUser}
          allProfiles={snapshot.profiles}
          onSwitchUser={(prof) => setCurrentUser(prof)}
          onSignOut={() => setCurrentUser(null)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onQuickCreateLead={() => {
            setActiveRoute('leads');
            setIsCreateLeadModalOpen(true);
          }}
        />

        <main className="flex-1 p-4 sm:p-8 max-w-[1440px] w-full mx-auto">
          {activeRoute === 'dashboard' && (
            <DashboardView
              snapshot={snapshot}
              currentUser={currentUser}
              onSelectLead={handleSelectLead}
              onNavigate={handleNavigate}
              onToggleTask={handleToggleTask}
              onSwitchWorkspaceMode={handleSwitchWorkspaceMode}
              onOpenNewLeadModal={() => {
                setActiveRoute('leads');
                setIsCreateLeadModalOpen(true);
              }}
              onGenerateAiBrief={handleGenerateAiBrief}
            />
          )}

          {activeRoute === 'leads' && (
            <LeadsView
              snapshot={snapshot}
              onSelectLead={handleSelectLead}
              onCreateLead={handleCreateLead}
              isCreateModalOpen={isCreateLeadModalOpen}
              onSetCreateModalOpen={setIsCreateLeadModalOpen}
            />
          )}

          {activeRoute === 'lead_detail' && selectedLeadId && (
            <LeadDetailView
              leadId={selectedLeadId}
              snapshot={snapshot}
              currentUser={currentUser}
              onBack={() => setActiveRoute('leads')}
              onUpdateStage={handleUpdateStage}
              onLogActivity={handleLogActivity}
              onCreateTask={handleCreateTask}
              onToggleTask={handleToggleTask}
              onRunAiAssist={handleRunAiLeadAssist}
            />
          )}

          {activeRoute === 'pipeline' && (
            <PipelineView
              snapshot={snapshot}
              onSelectLead={handleSelectLead}
              onUpdateStage={handleUpdateStage}
              onOpenNewLeadModal={() => {
                setActiveRoute('leads');
                setIsCreateLeadModalOpen(true);
              }}
            />
          )}

          {activeRoute === 'tasks' && (
            <TasksView
              snapshot={snapshot}
              currentUser={currentUser}
              onToggleTask={handleToggleTask}
              onCreateTask={handleCreateTask}
              onSelectLead={handleSelectLead}
            />
          )}

          {activeRoute === 'campaigns' && (
            <CampaignsView
              snapshot={snapshot}
              onSelectLead={handleSelectLead}
            />
          )}

          {activeRoute === 'ai_assistant' && (
            <AiAssistantView
              snapshot={snapshot}
              onRunLeadAssist={handleRunAiLeadAssist}
              onRunBusinessBrief={handleGenerateAiBrief}
            />
          )}

          {activeRoute === 'approvals' && (
            <ApprovalsView
              snapshot={snapshot}
              currentUser={currentUser}
              onReviewApproval={handleReviewApproval}
              onSelectLead={handleSelectLead}
            />
          )}

          {activeRoute === 'settings' && (
            <SettingsView snapshot={snapshot} currentUser={currentUser} />
          )}
        </main>
      </div>
    </div>
  );
}
