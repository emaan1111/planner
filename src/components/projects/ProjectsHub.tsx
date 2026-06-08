'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  LayoutGrid,
  Columns3,
  CalendarRange,
  Rows3,
  Plus,
  Archive,
  CheckSquare,
} from 'lucide-react';
import { Task, Project, EventColor } from '@/types';
import { useTasks, useCreateTask, useUpdateTask, useReorderTasks, useBulkUpdateTasks } from '@/hooks/useTasksQuery';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useReorderProjects,
  useBulkUpdateProjects,
} from '@/hooks/useProjectsQuery';
import { TaskModal } from '@/components/modals/TaskModal';
import { taskBucket, isActiveBoardTask, isDueThisWeek } from '@/lib/pm';
import { ProjectBoard } from './ProjectBoard';
import { KanbanView } from './KanbanView';
import { CardsView } from './CardsView';
import { TimelineView } from './TimelineView';
import { InboxBar } from './InboxBar';
import { BulkActionBar } from './BulkActionBar';
import { ArchivedView } from './ArchivedView';
import { ProjectFormModal } from './ProjectFormModal';
import { ProjectDetail } from './ProjectDetail';

type ViewMode = 'board' | 'kanban' | 'cards' | 'timeline';
type Scope = 'week' | 'all';

const COLLAPSE_KEY = 'pm-collapsed-groups';

const VIEWS: { id: ViewMode; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'board', label: 'Board', icon: Rows3 },
  { id: 'kanban', label: 'Kanban', icon: Columns3 },
  { id: 'cards', label: 'Cards', icon: LayoutGrid },
  { id: 'timeline', label: 'Timeline', icon: CalendarRange },
];

export function ProjectsHub() {
  const { data: tasks = [] } = useTasks();
  const { data: projects = [] } = useProjects();

  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const bulkTasks = useBulkUpdateTasks();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const reorderProjects = useReorderProjects();
  const bulkProjects = useBulkUpdateProjects();

  const [viewMode, setViewMode] = useState<ViewMode>('board');
  const [scope, setScope] = useState<Scope>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [projectForm, setProjectForm] = useState<{ open: boolean; project: Project | null }>({ open: false, project: null });
  const [inboxCollapsed, setInboxCollapsed] = useState(false);
  const [openProjectId, setOpenProjectId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const now = useMemo(() => new Date(), []);

  // Persist group collapse state.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLLAPSE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration of persisted UI state
      if (raw) setCollapsed(new Set(JSON.parse(raw)));
    } catch {}
  }, []);
  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);
  const isCollapsed = useCallback((id: string) => collapsed.has(id), [collapsed]);

  // ---- Partition data ----
  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const archivedProjects = useMemo(() => projects.filter((p) => p.archived), [projects]);
  const archivedTasks = useMemo(() => tasks.filter((t) => t.archived), [tasks]);
  const inboxTasks = useMemo(
    () => tasks.filter((t) => !t.archived && taskBucket(t) === 'inbox').sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
    [tasks]
  );
  const somedayTasks = useMemo(
    () => tasks.filter((t) => !t.archived && taskBucket(t) === 'someday'),
    [tasks]
  );

  // Active board tasks, optionally scoped to this week.
  const boardTasks = useMemo(() => {
    const base = tasks.filter(isActiveBoardTask);
    const scoped = scope === 'week' ? base.filter((t) => isDueThisWeek(t, now)) : base;
    return scoped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }, [tasks, scope, now]);

  const tasksByProject = useMemo(() => {
    const map = new Map<string, Task[]>();
    activeProjects.forEach((p) => map.set(p.id, []));
    boardTasks.forEach((t) => {
      if (t.projectId && map.has(t.projectId)) map.get(t.projectId)!.push(t);
    });
    return map;
  }, [activeProjects, boardTasks]);

  const noProjectTasks = useMemo(
    () => boardTasks.filter((t) => !t.projectId || !tasksByProject.has(t.projectId)),
    [boardTasks, tasksByProject]
  );

  // Open-project detail (ignores week scope so you see the whole project).
  const openProject = useMemo(() => activeProjects.find((p) => p.id === openProjectId) ?? null, [activeProjects, openProjectId]);
  const openProjectTasks = useMemo(
    () => (openProjectId ? tasks.filter((t) => isActiveBoardTask(t) && t.projectId === openProjectId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)) : []),
    [tasks, openProjectId]
  );

  // In week scope, hide projects that have no in-week tasks.
  const visibleProjects = useMemo(() => {
    if (scope === 'all') return activeProjects;
    return activeProjects.filter((p) => (tasksByProject.get(p.id)?.length ?? 0) > 0);
  }, [scope, activeProjects, tasksByProject]);

  // ---- Selection ----
  const toggleSelect = useCallback((id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelectedTaskIds(new Set()), []);

  // Ids selectable from the board (everything currently rendered there).
  const boardSelectableIds = useMemo(() => {
    const ids: string[] = [];
    visibleProjects.forEach((p) => (tasksByProject.get(p.id) ?? []).forEach((t) => ids.push(t.id)));
    noProjectTasks.forEach((t) => ids.push(t.id));
    if (scope !== 'week') somedayTasks.forEach((t) => ids.push(t.id));
    return ids;
  }, [visibleProjects, tasksByProject, noProjectTasks, somedayTasks, scope]);
  const allBoardSelected = boardSelectableIds.length > 0 && boardSelectableIds.every((id) => selectedTaskIds.has(id));
  const toggleSelectAllBoard = useCallback(() => {
    setSelectedTaskIds((prev) => {
      if (boardSelectableIds.every((id) => prev.has(id))) {
        const next = new Set(prev);
        boardSelectableIds.forEach((id) => next.delete(id));
        return next;
      }
      return new Set([...prev, ...boardSelectableIds]);
    });
  }, [boardSelectableIds]);

  // ---- Task handlers ----
  const handleAddTask = useCallback((projectId: string | undefined, title: string, overrides?: Partial<Task>) => {
    createTask.mutate({ title, status: 'todo', priority: 'medium', bucket: 'active', projectId, ...overrides });
  }, [createTask]);

  const handleCapture = useCallback((title: string) => {
    createTask.mutate({ title, status: 'todo', priority: 'medium', bucket: 'inbox' });
  }, [createTask]);

  const handleUpdateTask = useCallback((id: string, updates: Partial<Task>) => {
    updateTask.mutate({ id, updates });
  }, [updateTask]);

  const handleArchiveTask = useCallback((id: string) => {
    updateTask.mutate({ id, updates: { archived: true } });
    setSelectedTaskIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
  }, [updateTask]);

  const handleTriage = useCallback((id: string, projectId: string) => {
    updateTask.mutate({ id, updates: { projectId, bucket: 'active' } });
  }, [updateTask]);

  const handleSomeday = useCallback((id: string) => {
    updateTask.mutate({ id, updates: { bucket: 'someday' } });
  }, [updateTask]);

  const handleRevive = useCallback((id: string) => {
    updateTask.mutate({ id, updates: { bucket: 'active' } });
  }, [updateTask]);

  // ---- Bulk handlers ----
  const ids = useMemo(() => [...selectedTaskIds], [selectedTaskIds]);
  const runBulk = useCallback((action: Parameters<typeof bulkTasks.mutate>[0]['action'], value?: string) => {
    if (ids.length === 0) return;
    bulkTasks.mutate({ ids, action, value });
    clearSelection();
  }, [ids, bulkTasks, clearSelection]);

  // ---- Project handlers ----
  const handleCreateProject = useCallback((data: { name: string; description?: string; color: EventColor }) => {
    createProject.mutate(data);
  }, [createProject]);
  const handleUpdateProject = useCallback((id: string, updates: Partial<Project>) => {
    updateProject.mutate({ id, updates });
  }, [updateProject]);
  const handleArchiveProject = useCallback((id: string) => {
    updateProject.mutate({ id, updates: { archived: true } });
  }, [updateProject]);

  const allCategories = useMemo(
    () => [...new Set(tasks.map((t) => t.category).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b)),
    [tasks]
  );

  const inboxCount = inboxTasks.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </Link>
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                <LayoutGrid className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Projects</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Plan, organize, and track your work</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Scope toggle */}
              {!showArchived && (
                <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  {(['week', 'all'] as Scope[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setScope(s)}
                      className={clsx(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        scope === s ? 'bg-indigo-500 text-white' : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      )}
                    >
                      {s === 'week' ? 'This Week' : 'All'}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowArchived((v) => !v)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                  showArchived ? 'bg-amber-500 text-white border-amber-500' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                )}
              >
                <Archive className="w-3.5 h-3.5" /> Archived
              </button>

              <button
                onClick={() => setProjectForm({ open: true, project: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg text-xs font-semibold shadow hover:shadow-md transition-shadow"
              >
                <Plus className="w-4 h-4" /> New Project
              </button>
            </div>
          </div>

          {/* View switcher */}
          {!showArchived && (
            <div className="flex items-center gap-1 mt-3">
              {VIEWS.map((v) => {
                const Icon = v.icon;
                return (
                  <button
                    key={v.id}
                    onClick={() => { setViewMode(v.id); setOpenProjectId(null); }}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                      viewMode === v.id ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" /> {v.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-4 space-y-4 pb-24">
        {showArchived ? (
          <ArchivedView
            archivedTasks={archivedTasks}
            archivedProjects={archivedProjects}
            onRestoreTask={(id) => updateTask.mutate({ id, updates: { archived: false } })}
            onDeleteTask={(id) => bulkTasks.mutate({ ids: [id], action: 'delete' })}
            onRestoreProject={(id) => updateProject.mutate({ id, updates: { archived: false } })}
            onDeleteProject={(id) => bulkProjects.mutate({ ids: [id], action: 'delete' })}
          />
        ) : openProject ? (
          <ProjectDetail
            project={openProject}
            tasks={openProjectTasks}
            selectedTaskIds={selectedTaskIds}
            onToggleSelect={toggleSelect}
            onBack={() => setOpenProjectId(null)}
            onEditProject={(p) => setProjectForm({ open: true, project: p })}
            onArchiveProject={(id) => { handleArchiveProject(id); setOpenProjectId(null); }}
            onEditTask={setEditingTask}
            onUpdateTask={handleUpdateTask}
            onArchiveTask={handleArchiveTask}
            onReorderTasks={(orderedIds) => reorderTasks.mutate(orderedIds)}
            onAddTask={(title, overrides) => handleAddTask(openProject.id, title, overrides)}
            categories={allCategories}
          />
        ) : (
          <>
            {/* Inbox quick-capture (always visible) */}
            <InboxBar
              inboxTasks={inboxTasks}
              projects={activeProjects}
              collapsed={inboxCollapsed}
              onToggleCollapse={() => setInboxCollapsed((v) => !v)}
              onCapture={handleCapture}
              onTriage={handleTriage}
              onSomeday={handleSomeday}
              onArchive={handleArchiveTask}
              onEdit={setEditingTask}
            />

            {activeProjects.length === 0 && boardTasks.length === 0 && inboxCount === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <CheckSquare className="w-10 h-10 mb-3 opacity-50" />
                <p className="text-sm mb-3">No projects yet. Create one to get started.</p>
                <button
                  onClick={() => setProjectForm({ open: true, project: null })}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium"
                >
                  New Project
                </button>
              </div>
            ) : viewMode === 'board' ? (
              <>
              <div className="flex items-center gap-3 px-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allBoardSelected}
                    onChange={toggleSelectAllBoard}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {allBoardSelected ? 'Deselect all' : 'Select all'}
                  </span>
                </label>
                {selectedTaskIds.size > 0 && (
                  <span className="text-xs text-gray-400">{selectedTaskIds.size} selected</span>
                )}
              </div>
              <ProjectBoard
                projects={visibleProjects}
                tasksByProject={tasksByProject}
                noProjectTasks={noProjectTasks}
                somedayTasks={scope === 'week' ? [] : somedayTasks}
                isCollapsed={isCollapsed}
                onToggleCollapse={toggleCollapse}
                selectedTaskIds={selectedTaskIds}
                onToggleSelect={toggleSelect}
                onEditTask={setEditingTask}
                onUpdateTask={handleUpdateTask}
                onArchiveTask={handleArchiveTask}
                onReorderTasks={(orderedIds) => reorderTasks.mutate(orderedIds)}
                onAddTask={handleAddTask}
                onArchiveProject={handleArchiveProject}
                onEditProject={(p) => setProjectForm({ open: true, project: p })}
                onReorderProjects={(orderedIds) => reorderProjects.mutate(orderedIds)}
                onReviveTask={handleRevive}
              />
              </>
            ) : viewMode === 'kanban' ? (
              <KanbanView tasks={boardTasks} projects={activeProjects} onUpdateTask={handleUpdateTask} onEditTask={setEditingTask} />
            ) : viewMode === 'cards' ? (
              <CardsView
                projects={visibleProjects}
                tasksByProject={tasksByProject}
                noProjectTasks={noProjectTasks}
                onOpenProject={(id) => setOpenProjectId(id)}
                onEditProject={(p) => setProjectForm({ open: true, project: p })}
                onArchiveProject={handleArchiveProject}
                onReorderProjects={(orderedIds) => reorderProjects.mutate(orderedIds)}
              />
            ) : (
              <TimelineView
                projects={visibleProjects}
                tasksByProject={tasksByProject}
                noProjectTasks={noProjectTasks}
                now={now}
                onEditTask={setEditingTask}
                onResize={(id, updates) => updateTask.mutate({ id, updates })}
              />
            )}
          </>
        )}
      </main>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedTaskIds.size > 0 && (
          <BulkActionBar
            count={selectedTaskIds.size}
            projects={activeProjects}
            onClear={clearSelection}
            onArchive={() => runBulk('archive')}
            onDelete={() => runBulk('delete')}
            onSomeday={() => runBulk('setBucket', 'someday')}
            onSetProject={(projectId) => runBulk('setProject', projectId)}
            onCopyToProject={(projectId) => runBulk('copy', projectId)}
            onSetStatus={(status) => runBulk('setStatus', status)}
            onSetPriority={(priority) => runBulk('setPriority', priority)}
          />
        )}
      </AnimatePresence>

      {/* Edit task modal */}
      <AnimatePresence>
        {editingTask && <TaskModal isOpen={!!editingTask} selectedTask={editingTask} onClose={() => setEditingTask(null)} />}
      </AnimatePresence>

      {/* Project form modal */}
      <AnimatePresence>
        {projectForm.open && (
          <ProjectFormModal
            project={projectForm.project}
            onClose={() => setProjectForm({ open: false, project: null })}
            onCreate={handleCreateProject}
            onUpdate={handleUpdateProject}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
