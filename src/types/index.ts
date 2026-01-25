// Core types for the Planning App

// Plan type is just a string identifier
export type PlanType = string;

// Plan type definition (all plan types are user-configurable)
export interface PlanTypeConfig {
  id: string;
  name: string;
  label: string;
  color: EventColor;
  icon: string;
}

// Initial seed plan types (used when store is empty)
export const initialPlanTypes: Omit<PlanTypeConfig, 'id'>[] = [
  { name: 'marketing', label: 'Marketing', color: 'purple', icon: 'Megaphone' },
  { name: 'mailing', label: 'Mailing List', color: 'blue', icon: 'Mail' },
  { name: 'launch', label: 'Product Launch', color: 'orange', icon: 'Rocket' },
  { name: 'content', label: 'Content', color: 'green', icon: 'FileText' },
  { name: 'social', label: 'Social Media', color: 'pink', icon: 'Share2' },
  { name: 'product', label: 'Product', color: 'indigo', icon: 'Package' },
  { name: 'meeting', label: 'Meeting', color: 'cyan', icon: 'Users' },
  { name: 'deadline', label: 'Deadline', color: 'red', icon: 'AlertCircle' },
  { name: 'milestone', label: 'Milestone', color: 'amber', icon: 'Flag' },
  { name: 'custom', label: 'Custom', color: 'teal', icon: 'Star' },
];

// Planning context for AI assistance
export interface PlanningContext {
  id: string;
  type: 'constraint' | 'assumption' | 'goal' | 'preference' | 'note';
  title: string;
  description: string;
  isActive: boolean;
  createdAt: Date;
}

// AI Action types for the assistant to execute
export interface AIAction {
  type: 'add_event' | 'update_event' | 'delete_event' | 'add_task' | 'add_plan_type' | 'delete_plan_type' | 'add_constraint' | 'add_project';
  payload: Record<string, unknown>;
}

// Project for organizing events, tasks, and decisions
export interface Project {
  id: string;
  name: string;
  description?: string;
  color: EventColor;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Task Management
export type TaskStatus = 'todo' | 'in-progress' | 'scheduled' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  linkedPlanType?: PlanType;
  linkedEventId?: string;
  projectId?: string;
  order?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Key Decisions
export interface KeyDecision {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'decided' | 'deferred';
  outcome?: string;
  linkedPlanType?: PlanType;
  linkedEventId?: string;
  projectId?: string;
  decidedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Saved Custom View for CustomMonthView
export interface SavedCustomViewMonth {
  year: number;
  month: number; // 0-11
  width: number;
  height: number;
}

export interface SavedCustomView {
  id: string;
  name: string;
  months: SavedCustomViewMonth[];
  createdAt: Date;
  updatedAt: Date;
}

export type ViewMode = 'month' | 'multi-month' | 'six-month' | 'year' | 'custom';

export type EventColor = 
  // Standard colors
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'
  // Pastel colors
  | 'pastel-pink'
  | 'pastel-purple'
  | 'pastel-blue'
  | 'pastel-cyan'
  | 'pastel-green'
  | 'pastel-yellow'
  | 'pastel-orange'
  | 'pastel-red'
  | 'pastel-rose'
  | 'pastel-violet'
  | 'pastel-indigo'
  | 'pastel-sky'
  | 'pastel-teal'
  | 'pastel-emerald'
  | 'pastel-lime'
  | 'pastel-amber'
  // Soft/Light colors
  | 'soft-coral'
  | 'soft-peach'
  | 'soft-lavender'
  | 'soft-mint'
  | 'soft-cream'
  | 'soft-blush'
  | 'soft-periwinkle'
  | 'soft-sage'
  // Dark/muted colors
  | 'slate'
  | 'gray'
  | 'zinc'
  | 'stone'
  | 'neutral'
  // Special colors
  | 'gold'
  | 'bronze'
  | 'coral'
  | 'mint'
  | 'lavender'
  | 'peach'
  | 'aqua'
  | 'salmon'
  | 'plum'
  | 'mauve'
  | 'dusty-rose'
  | 'sea-green'
  | 'powder-blue'
  | 'buttercup';

// Recurrence pattern for recurring events
export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number; // e.g., every 2 weeks
  endDate?: Date;
  endAfterOccurrences?: number;
  daysOfWeek?: number[]; // 0-6 for weekly recurrence
  dayOfMonth?: number; // 1-31 for monthly
}

export interface PlanEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  planType?: PlanType;
  color: EventColor;
  isAllDay?: boolean;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  status?: 'scheduled' | 'in-progress' | 'done' | 'reschedule' | 'no-action';
  constraints?: Constraint[];
  notes?: string;
  projectId?: string;
  recurrence?: RecurrencePattern;
  parentEventId?: string; // For recurring event instances
  createdAt: Date;
  updatedAt: Date;
}

export interface Constraint {
  id: string;
  name: string;
  type: 'date-range' | 'no-overlap' | 'dependency' | 'resource' | 'custom';
  description: string;
  rule: ConstraintRule;
  isActive: boolean;
}

export interface ConstraintRule {
  type: string;
  params: Record<string, unknown>;
}

export interface ConstraintViolation {
  constraintId: string;
  constraintName: string;
  eventId: string;
  message: string;
  severity: 'warning' | 'error';
  suggestedFix?: string;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  type: PlanType;
  events: PlanEvent[];
  constraints: Constraint[];
  color: EventColor;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIAssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: AISuggestion[];
}

export interface AISuggestion {
  id: string;
  type: 'schedule' | 'optimize' | 'conflict' | 'reminder';
  title: string;
  description: string;
  action?: () => void;
}

export interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: PlanEvent[];
}

export interface DraggedEvent {
  event: PlanEvent;
  originalDate: Date;
}

export interface ResizeHandle {
  eventId: string;
  edge: 'start' | 'end';
}

// Color mapping for Tailwind classes
export const colorClasses: Record<EventColor, { bg: string; border: string; text: string; hover: string; light: string }> = {
  // Standard colors
  red: { bg: 'bg-red-500', border: 'border-red-500', text: 'text-red-500', hover: 'hover:bg-red-600', light: 'bg-red-100' },
  orange: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500', hover: 'hover:bg-orange-600', light: 'bg-orange-100' },
  amber: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500', hover: 'hover:bg-amber-600', light: 'bg-amber-100' },
  yellow: { bg: 'bg-yellow-500', border: 'border-yellow-500', text: 'text-yellow-500', hover: 'hover:bg-yellow-600', light: 'bg-yellow-100' },
  lime: { bg: 'bg-lime-500', border: 'border-lime-500', text: 'text-lime-500', hover: 'hover:bg-lime-600', light: 'bg-lime-100' },
  green: { bg: 'bg-green-500', border: 'border-green-500', text: 'text-green-500', hover: 'hover:bg-green-600', light: 'bg-green-100' },
  emerald: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500', hover: 'hover:bg-emerald-600', light: 'bg-emerald-100' },
  teal: { bg: 'bg-teal-500', border: 'border-teal-500', text: 'text-teal-500', hover: 'hover:bg-teal-600', light: 'bg-teal-100' },
  cyan: { bg: 'bg-cyan-500', border: 'border-cyan-500', text: 'text-cyan-500', hover: 'hover:bg-cyan-600', light: 'bg-cyan-100' },
  sky: { bg: 'bg-sky-500', border: 'border-sky-500', text: 'text-sky-500', hover: 'hover:bg-sky-600', light: 'bg-sky-100' },
  blue: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', hover: 'hover:bg-blue-600', light: 'bg-blue-100' },
  indigo: { bg: 'bg-indigo-500', border: 'border-indigo-500', text: 'text-indigo-500', hover: 'hover:bg-indigo-600', light: 'bg-indigo-100' },
  violet: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-500', hover: 'hover:bg-violet-600', light: 'bg-violet-100' },
  purple: { bg: 'bg-purple-500', border: 'border-purple-500', text: 'text-purple-500', hover: 'hover:bg-purple-600', light: 'bg-purple-100' },
  fuchsia: { bg: 'bg-fuchsia-500', border: 'border-fuchsia-500', text: 'text-fuchsia-500', hover: 'hover:bg-fuchsia-600', light: 'bg-fuchsia-100' },
  pink: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-500', hover: 'hover:bg-pink-600', light: 'bg-pink-100' },
  rose: { bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-500', hover: 'hover:bg-rose-600', light: 'bg-rose-100' },
  
  // Pastel colors (light, soft versions)
  'pastel-pink': { bg: 'bg-pink-300', border: 'border-pink-300', text: 'text-pink-700', hover: 'hover:bg-pink-400', light: 'bg-pink-50' },
  'pastel-purple': { bg: 'bg-purple-300', border: 'border-purple-300', text: 'text-purple-700', hover: 'hover:bg-purple-400', light: 'bg-purple-50' },
  'pastel-blue': { bg: 'bg-blue-300', border: 'border-blue-300', text: 'text-blue-700', hover: 'hover:bg-blue-400', light: 'bg-blue-50' },
  'pastel-cyan': { bg: 'bg-cyan-300', border: 'border-cyan-300', text: 'text-cyan-700', hover: 'hover:bg-cyan-400', light: 'bg-cyan-50' },
  'pastel-green': { bg: 'bg-green-300', border: 'border-green-300', text: 'text-green-700', hover: 'hover:bg-green-400', light: 'bg-green-50' },
  'pastel-yellow': { bg: 'bg-yellow-200', border: 'border-yellow-300', text: 'text-yellow-700', hover: 'hover:bg-yellow-300', light: 'bg-yellow-50' },
  'pastel-orange': { bg: 'bg-orange-300', border: 'border-orange-300', text: 'text-orange-700', hover: 'hover:bg-orange-400', light: 'bg-orange-50' },
  'pastel-red': { bg: 'bg-red-300', border: 'border-red-300', text: 'text-red-700', hover: 'hover:bg-red-400', light: 'bg-red-50' },
  'pastel-rose': { bg: 'bg-rose-300', border: 'border-rose-300', text: 'text-rose-700', hover: 'hover:bg-rose-400', light: 'bg-rose-50' },
  'pastel-violet': { bg: 'bg-violet-300', border: 'border-violet-300', text: 'text-violet-700', hover: 'hover:bg-violet-400', light: 'bg-violet-50' },
  'pastel-indigo': { bg: 'bg-indigo-300', border: 'border-indigo-300', text: 'text-indigo-700', hover: 'hover:bg-indigo-400', light: 'bg-indigo-50' },
  'pastel-sky': { bg: 'bg-sky-300', border: 'border-sky-300', text: 'text-sky-700', hover: 'hover:bg-sky-400', light: 'bg-sky-50' },
  'pastel-teal': { bg: 'bg-teal-300', border: 'border-teal-300', text: 'text-teal-700', hover: 'hover:bg-teal-400', light: 'bg-teal-50' },
  'pastel-emerald': { bg: 'bg-emerald-300', border: 'border-emerald-300', text: 'text-emerald-700', hover: 'hover:bg-emerald-400', light: 'bg-emerald-50' },
  'pastel-lime': { bg: 'bg-lime-300', border: 'border-lime-300', text: 'text-lime-700', hover: 'hover:bg-lime-400', light: 'bg-lime-50' },
  'pastel-amber': { bg: 'bg-amber-300', border: 'border-amber-300', text: 'text-amber-700', hover: 'hover:bg-amber-400', light: 'bg-amber-50' },
  
  // Soft/Light colors (very subtle, elegant)
  'soft-coral': { bg: 'bg-red-200', border: 'border-red-300', text: 'text-red-600', hover: 'hover:bg-red-300', light: 'bg-red-50' },
  'soft-peach': { bg: 'bg-orange-200', border: 'border-orange-300', text: 'text-orange-600', hover: 'hover:bg-orange-300', light: 'bg-orange-50' },
  'soft-lavender': { bg: 'bg-purple-200', border: 'border-purple-300', text: 'text-purple-600', hover: 'hover:bg-purple-300', light: 'bg-purple-50' },
  'soft-mint': { bg: 'bg-emerald-200', border: 'border-emerald-300', text: 'text-emerald-600', hover: 'hover:bg-emerald-300', light: 'bg-emerald-50' },
  'soft-cream': { bg: 'bg-amber-100', border: 'border-amber-200', text: 'text-amber-600', hover: 'hover:bg-amber-200', light: 'bg-amber-50' },
  'soft-blush': { bg: 'bg-pink-200', border: 'border-pink-300', text: 'text-pink-600', hover: 'hover:bg-pink-300', light: 'bg-pink-50' },
  'soft-periwinkle': { bg: 'bg-indigo-200', border: 'border-indigo-300', text: 'text-indigo-600', hover: 'hover:bg-indigo-300', light: 'bg-indigo-50' },
  'soft-sage': { bg: 'bg-green-200', border: 'border-green-300', text: 'text-green-600', hover: 'hover:bg-green-300', light: 'bg-green-50' },
  
  // Dark/muted colors
  slate: { bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-slate-500', hover: 'hover:bg-slate-600', light: 'bg-slate-100' },
  gray: { bg: 'bg-gray-500', border: 'border-gray-500', text: 'text-gray-500', hover: 'hover:bg-gray-600', light: 'bg-gray-100' },
  zinc: { bg: 'bg-zinc-500', border: 'border-zinc-500', text: 'text-zinc-500', hover: 'hover:bg-zinc-600', light: 'bg-zinc-100' },
  stone: { bg: 'bg-stone-500', border: 'border-stone-500', text: 'text-stone-500', hover: 'hover:bg-stone-600', light: 'bg-stone-100' },
  neutral: { bg: 'bg-neutral-500', border: 'border-neutral-500', text: 'text-neutral-500', hover: 'hover:bg-neutral-600', light: 'bg-neutral-100' },
  
  // Special/Accent colors
  gold: { bg: 'bg-yellow-600', border: 'border-yellow-600', text: 'text-yellow-600', hover: 'hover:bg-yellow-700', light: 'bg-yellow-100' },
  bronze: { bg: 'bg-amber-700', border: 'border-amber-700', text: 'text-amber-700', hover: 'hover:bg-amber-800', light: 'bg-amber-100' },
  coral: { bg: 'bg-red-400', border: 'border-red-400', text: 'text-red-500', hover: 'hover:bg-red-500', light: 'bg-red-50' },
  mint: { bg: 'bg-emerald-400', border: 'border-emerald-400', text: 'text-emerald-600', hover: 'hover:bg-emerald-500', light: 'bg-emerald-50' },
  lavender: { bg: 'bg-violet-400', border: 'border-violet-400', text: 'text-violet-600', hover: 'hover:bg-violet-500', light: 'bg-violet-50' },
  peach: { bg: 'bg-orange-400', border: 'border-orange-400', text: 'text-orange-600', hover: 'hover:bg-orange-500', light: 'bg-orange-50' },
  aqua: { bg: 'bg-cyan-400', border: 'border-cyan-400', text: 'text-cyan-600', hover: 'hover:bg-cyan-500', light: 'bg-cyan-50' },
  salmon: { bg: 'bg-rose-400', border: 'border-rose-400', text: 'text-rose-600', hover: 'hover:bg-rose-500', light: 'bg-rose-50' },
  plum: { bg: 'bg-purple-600', border: 'border-purple-600', text: 'text-purple-600', hover: 'hover:bg-purple-700', light: 'bg-purple-100' },
  mauve: { bg: 'bg-fuchsia-400', border: 'border-fuchsia-400', text: 'text-fuchsia-600', hover: 'hover:bg-fuchsia-500', light: 'bg-fuchsia-50' },
  'dusty-rose': { bg: 'bg-rose-400', border: 'border-rose-400', text: 'text-rose-600', hover: 'hover:bg-rose-500', light: 'bg-rose-100' },
  'sea-green': { bg: 'bg-teal-400', border: 'border-teal-400', text: 'text-teal-600', hover: 'hover:bg-teal-500', light: 'bg-teal-50' },
  'powder-blue': { bg: 'bg-sky-300', border: 'border-sky-300', text: 'text-sky-600', hover: 'hover:bg-sky-400', light: 'bg-sky-50' },
  'buttercup': { bg: 'bg-yellow-400', border: 'border-yellow-400', text: 'text-yellow-600', hover: 'hover:bg-yellow-500', light: 'bg-yellow-50' },
};
