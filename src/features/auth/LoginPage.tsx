import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, ArrowRight, Loader2 } from 'lucide-react';
import { loginSchema } from '../../lib/validations/crmSchemas.ts';
import type { Profile, IntegrationStatusInfo } from '../../types/crm.ts';

export interface LoginPageProps {
  profiles: Profile[];
  integrationStatus: IntegrationStatusInfo;
  onAuthenticated: (profile: Profile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  profiles,
  integrationStatus,
  onAuthenticated,
}) => {
  const [email, setEmail] = useState('owner@solivate.com');
  const [password, setPassword] = useState('Solivate2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message || 'Invalid credentials format.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      const matchedProfile = profiles.find(
        (p) => p.email.toLowerCase() === parsed.data.email.toLowerCase()
      );

      if (!matchedProfile) {
        setIsLoading(false);
        setErrorMessage(
          'Unauthorized account: Only internal Solivate Studio team members (owner@solivate.com, nadia@solivate.com, dimas@solivate.com, putri@solivate.com) are permitted.'
        );
        return;
      }

      setIsLoading(false);
      onAuthenticated(matchedProfile);
    }, 280);
  };

  return (
    <div className="min-h-screen bg-[#061426] text-white flex flex-col lg:flex-row">
      {/* Left Brand & Architecture Context Column */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-[#07172A] border-b lg:border-b-0 lg:border-r border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#D5FF35] text-[#07172A] flex items-center justify-center font-bold text-base">
              S
            </div>
            <span className="text-lg font-bold tracking-tight text-white">
              Solivate Studio
            </span>
          </div>

          <h1 className="mt-12 text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight max-w-xl">
            Internal Sales, Meta Ads Attribution & AI Operations Workspace
          </h1>
          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-lg leading-relaxed">
            Centralize multi-channel B2B leads, track pipeline milestones, verify Meta Lead Ads ROI, and execute human-governed AI sales workflows.
          </p>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs font-semibold text-[#D5FF35]">
                01. Centralized Lead Pipeline
              </div>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Unified capture across Meta Lead Ads, website forms, manual WhatsApp logs, and referrals with deduplication guards.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="text-xs font-semibold text-[#D5FF35]">
                02. Controlled AI Sales Copilot
              </div>
              <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                Structured qualification and draft generation grounded in Solivate’s approved service catalog and human approval queue.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 text-xs text-slate-400 flex flex-wrap items-center justify-between gap-4">
          <span>Solivate Studio Internal Application · Restricted Access</span>
          <span>No Public Sign-Up Permitted</span>
        </div>
      </div>

      {/* Right Authentication Form Column */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex items-center justify-center bg-[#F4F7FB] text-[#07172A]">
        <div className="w-full max-w-md bg-white border border-[#E2E8F0] rounded-xl p-6 sm:p-8 shadow-sm">
          <div>
            <h2 className="text-xl font-bold text-[#07172A]">Sign in to Solivate CRM</h2>
            <p className="mt-1 text-xs text-[#64748B]">
              Enter your internal Solivate Studio credentials to access the workspace.
            </p>
          </div>

          {/* Explicit Development Auth Boundary Notice (Per Section 4 & Section 7B) */}
          {!integrationStatus.supabaseConfigured && (
            <div className="mt-5 p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Development Auth Setup Mode Active</span>
              </div>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Supabase Auth credentials (<code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code>) are not configured in this environment. Select an authorized internal team role below to inspect the CRM foundation.
              </p>
            </div>
          )}

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium"
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
            <div>
              <label
                htmlFor="crm-login-email"
                className="block text-xs font-semibold text-[#07172A] mb-1.5"
              >
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="crm-login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@solivate.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="crm-login-password"
                className="block text-xs font-semibold text-[#07172A] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="crm-login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-[#E2E8F0] rounded-lg text-[#07172A] focus:outline-none focus:border-[#0759A8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#64748B] hover:text-[#07172A]"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#07172A] text-[#D5FF35] hover:bg-[#061426] font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validating internal session...</span>
                </>
              ) : (
                <>
                  <span>Sign in to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Role Selector for Testing RBAC (Owner, Sales, Marketing, Admin) */}
          <div className="mt-6 pt-5 border-t border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#64748B] mb-2">
              Authorized Internal Team Accounts (Click to Autofill):
            </div>
            <div className="grid grid-cols-1 gap-1.5">
              {profiles.map((prof) => (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => {
                    setEmail(prof.email);
                    setPassword('Solivate2026!');
                    setErrorMessage(null);
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-colors text-left ${
                    email.toLowerCase() === prof.email.toLowerCase()
                      ? 'border-[#0759A8] bg-[#F4F7FB] text-[#07172A] font-semibold'
                      : 'border-[#E2E8F0] hover:bg-slate-50 text-[#64748B]'
                  }`}
                >
                  <span className="truncate">
                    {prof.fullName} · <span className="font-mono">{prof.email}</span>
                  </span>
                  <span className="text-[11px] font-mono text-[#0759A8] uppercase shrink-0 ml-2">
                    {prof.role}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
