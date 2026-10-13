import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid Solivate Studio email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const createLeadSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required (min 2 chars)').max(120),
  email: z.string().trim().email('Valid email address is required'),
  phone: z
    .string()
    .trim()
    .min(8, 'Valid phone / WhatsApp number is required')
    .max(30),
  companyName: z.string().trim().min(2, 'Company or business name is required').max(120),
  serviceInterest: z.string().trim().min(2, 'Select an interested service'),
  source: z.enum([
    'meta_lead_ads',
    'website_form',
    'whatsapp_manual',
    'referral',
    'organic',
  ]),
  ownerId: z.string().trim().min(1, 'Assign a lead owner'),
  estimatedValueIdr: z.number().min(0, 'Estimated deal value cannot be negative'),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  notes: z.string().trim().max(2000).default(''),
});

export const updateStageSchema = z.object({
  stage: z.enum([
    'new_lead',
    'contacted',
    'qualified',
    'proposal',
    'negotiation',
    'won',
    'lost',
    'nurture',
  ]),
  lostReason: z.string().trim().optional(),
  contractSigned: z.boolean().optional(),
  depositReceived: z.boolean().optional(),
});

export const logActivitySchema = z.object({
  leadId: z.string().min(1),
  activityType: z.enum([
    'whatsapp_log',
    'note',
    'call_summary',
    'email_summary',
  ]),
  direction: z.enum(['inbound', 'outbound', 'internal']),
  summary: z.string().trim().min(4, 'Activity summary must be at least 4 characters').max(2000),
  nextFollowupDate: z.string().optional(),
});

export const createTaskSchema = z.object({
  title: z.string().trim().min(3, 'Task title is required').max(200),
  leadId: z.string().nullable(),
  assignedTo: z.string().min(1, 'Assignee is required'),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['high', 'medium', 'low']),
  notes: z.string().trim().max(1000).default(''),
});

export const reviewApprovalSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().trim().min(3, 'Please provide a brief review note for the audit trail'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateStageInput = z.infer<typeof updateStageSchema>;
export type LogActivityInput = z.infer<typeof logActivitySchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type ReviewApprovalInput = z.infer<typeof reviewApprovalSchema>;
