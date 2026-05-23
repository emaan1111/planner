'use client';

import { useState } from 'react';
import {
  useScenarios,
  useScenarioFolders,
  useCreateFolder,
  useDeleteFolder,
  useUpdateFolder,
  useCreateScenario,
  useDeleteScenario,
  useDuplicateScenario,
  useUpdateScenario,
  useReorderScenarios,
} from '@/hooks/useScenariosQuery';
import { useScenariosStore } from '@/store/scenariosStore';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderPlus,
  Plus,
  Copy,
  Trash2,
  Pencil,
  Calendar,
  X,
  GripVertical,
} from 'lucide-react';
import clsx from 'clsx';

export function ScenarioSidebar() {
  const { data: scenarios = [] } = useScenarios();
  const { data: folders = [] } = useScenarioFolders();
  const createFolder = useCreateFolder();
  const deleteFolder = useDeleteFolder();
  const updateFolder = useUpdateFolder();
  const createScenario = useCreateScenario();
  const deleteScenario = useDeleteScenario();
  const duplicateScenario = useDuplicateScenario();
  const updateScenario = useUpdateScenario();
  const reorderScenarios = useReorderScenarios();

  const { activeScenarioId, setActiveScenario, sidebarOpen, setSidebarOpen, leftRailCollapsed } = useScenariosStore();
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  // 'unfiled' is the sentinel for the no-folder bucket.
  const [dragOverBucket, setDragOverBucket] = useState<string | 'unfiled' | null>(null);

  const handleReorder = (draggedId: string, dropTargetId: string) => {
    if (draggedId === dropTargetId) return;
    const dragged = scenarios.find((s) => s.id === draggedId);
    const target = scenarios.find((s) => s.id === dropTargetId);
    if (!dragged || !target) return;
    const draggedBucket = dragged.folderId ?? null;
    const targetBucket = target.folderId ?? null;

    if (draggedBucket === targetBucket) {
      const inBucket = scenarios
        .filter((s) => (s.folderId ?? null) === targetBucket)
        .sort((a, b) => a.order - b.order);
      const draggedIdx = inBucket.findIndex((s) => s.id === draggedId);
      const targetIdx = inBucket.findIndex((s) => s.id === dropTargetId);
      if (draggedIdx === -1 || targetIdx === -1) return;
      const reordered = [...inBucket];
      const [removed] = reordered.splice(draggedIdx, 1);
      reordered.splice(targetIdx, 0, removed);
      reorderScenarios.mutate(reordered.map((s, i) => ({ id: s.id, order: i })));
      return;
    }

    // Cross-bucket: move dragged into target's bucket and insert at target's position.
    updateScenario.mutate({ id: draggedId, updates: { folderId: targetBucket ?? null } as Partial<typeof dragged> });
    const inTargetBucket = scenarios
      .filter((s) => (s.folderId ?? null) === targetBucket && s.id !== draggedId)
      .sort((a, b) => a.order - b.order);
    const targetIdx = inTargetBucket.findIndex((s) => s.id === dropTargetId);
    if (targetIdx === -1) return;
    const reordered = [...inTargetBucket];
    reordered.splice(targetIdx, 0, { ...dragged, folderId: targetBucket ?? undefined });
    reorderScenarios.mutate(reordered.map((s, i) => ({ id: s.id, order: i })));
    if (targetBucket) setOpenFolderIds((prev) => new Set(prev).add(targetBucket));
  };

  // Move scenario to a bucket and append at the end (used when dropping on the
  // folder header or empty body rather than on a specific row).
  const handleMoveToBucket = (draggedId: string, bucket: string | null) => {
    const dragged = scenarios.find((s) => s.id === draggedId);
    if (!dragged) return;
    if ((dragged.folderId ?? null) === bucket) return;
    const inBucket = scenarios.filter((s) => (s.folderId ?? null) === bucket && s.id !== draggedId);
    const nextOrder = inBucket.length > 0 ? Math.max(...inBucket.map((s) => s.order)) + 1 : 0;
    updateScenario.mutate({
      id: draggedId,
      updates: { folderId: bucket ?? null, order: nextOrder } as Partial<typeof dragged>,
    });
    if (bucket) setOpenFolderIds((prev) => new Set(prev).add(bucket));
  };

  const toggleFolder = (id: string) => {
    setOpenFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddFolder = async () => {
    const folder = await createFolder.mutateAsync({ name: 'New Folder' });
    setOpenFolderIds((prev) => new Set(prev).add(folder.id));
    setRenamingId(folder.id);
    setRenameValue(folder.name);
  };

  const handleAddScenario = async (folderId: string | null) => {
    const scenario = await createScenario.mutateAsync({
      name: 'New Scenario',
      folderId: folderId ?? undefined,
    });
    setActiveScenario(scenario.id);
    if (folderId) setOpenFolderIds((prev) => new Set(prev).add(folderId));
    setRenamingId(scenario.id);
    setRenameValue(scenario.name);
  };

  const handleRenameSubmit = (id: string, kind: 'folder' | 'scenario') => {
    if (!renameValue.trim()) {
      setRenamingId(null);
      return;
    }
    if (kind === 'folder') {
      updateFolder.mutate({ id, updates: { name: renameValue.trim() } });
    } else {
      updateScenario.mutate({ id, updates: { name: renameValue.trim() } });
    }
    setRenamingId(null);
  };

  const unfiledScenarios = scenarios.filter((s) => !s.folderId);

  return (
    <>
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 z-30 bg-gray-950/40 backdrop-blur-[1px]"
          aria-hidden
        />
      )}
      <aside
        className={clsx(
          'flex flex-col border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900',
          // Mobile: slide-over drawer
          'fixed inset-y-0 left-0 z-40 w-[82vw] max-w-xs transform transition-transform duration-200 ease-out shadow-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop: static rail (hidden when collapsed)
          leftRailCollapsed
            ? 'md:hidden'
            : 'md:relative md:translate-x-0 md:shadow-none md:w-64 md:flex-shrink-0',
        )}
      >
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Scenarios</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddFolder}
            title="New folder"
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAddScenario(null)}
            title="New scenario"
            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            title="Close"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {folders.map((folder) => {
          const open = openFolderIds.has(folder.id);
          const folderScenarios = scenarios.filter((s) => s.folderId === folder.id);
          return (
            <div key={folder.id} className="px-2">
              <div
                className={clsx(
                  'group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm',
                  dragOverBucket === folder.id &&
                    draggingId &&
                    'bg-indigo-50 dark:bg-indigo-900/30 ring-1 ring-indigo-300 dark:ring-indigo-700',
                )}
                onClick={() => toggleFolder(folder.id)}
                onDragOver={(e) => {
                  if (!draggingId) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOverBucket(folder.id);
                }}
                onDragLeave={() =>
                  setDragOverBucket((cur) => (cur === folder.id ? null : cur))
                }
                onDrop={(e) => {
                  e.preventDefault();
                  if (draggingId) handleMoveToBucket(draggingId, folder.id);
                  setDraggingId(null);
                  setDragOverBucket(null);
                  setDragOverId(null);
                }}
              >
                {open ? (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
                <Folder className="w-3.5 h-3.5 text-indigo-500" />
                {renamingId === folder.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(folder.id, 'folder')}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSubmit(folder.id, 'folder');
                      if (e.key === 'Escape') setRenamingId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 px-1 text-sm bg-white dark:bg-gray-800 border border-indigo-300 rounded"
                  />
                ) : (
                  <span className="flex-1 truncate text-gray-700 dark:text-gray-200">{folder.name}</span>
                )}
                <span className="text-xs text-gray-400">{folderScenarios.length}</span>
                <div className="md:opacity-0 md:group-hover:opacity-100 flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddScenario(folder.id);
                    }}
                    title="Add scenario to folder"
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Plus className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setRenamingId(folder.id);
                      setRenameValue(folder.name);
                    }}
                    title="Rename"
                    className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <Pencil className="w-3 h-3 text-gray-500" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete folder "${folder.name}"? Scenarios inside will be moved to unfiled.`))
                        deleteFolder.mutate(folder.id);
                    }}
                    title="Delete"
                    className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
              {open && (
                <div
                  className={clsx(
                    'ml-6 border-l border-gray-100 dark:border-gray-800 pl-2 my-1',
                    folderScenarios.length === 0 &&
                      dragOverBucket === folder.id &&
                      draggingId &&
                      'bg-indigo-50/40 dark:bg-indigo-900/20 rounded',
                  )}
                  onDragOver={(e) => {
                    if (!draggingId) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverBucket(folder.id);
                  }}
                  onDragLeave={() =>
                    setDragOverBucket((cur) => (cur === folder.id ? null : cur))
                  }
                  onDrop={(e) => {
                    // Only handle drops directly on the body (not bubbled from rows).
                    if (e.target !== e.currentTarget) return;
                    e.preventDefault();
                    if (draggingId) handleMoveToBucket(draggingId, folder.id);
                    setDraggingId(null);
                    setDragOverBucket(null);
                    setDragOverId(null);
                  }}
                >
                  {folderScenarios.length === 0 && (
                    <div className="text-xs text-gray-400 italic px-2 py-1 pointer-events-none">empty</div>
                  )}
                  {folderScenarios.map((s) => (
                    <ScenarioRow
                      key={s.id}
                      id={s.id}
                      name={s.name}
                      active={activeScenarioId === s.id}
                      renaming={renamingId === s.id}
                      renameValue={renameValue}
                      onRenameChange={setRenameValue}
                      onRenameStart={() => {
                        setRenamingId(s.id);
                        setRenameValue(s.name);
                      }}
                      onRenameCommit={() => handleRenameSubmit(s.id, 'scenario')}
                      onRenameCancel={() => setRenamingId(null)}
                      onSelect={() => setActiveScenario(s.id)}
                      onDuplicate={() => duplicateScenario.mutate({ id: s.id })}
                      onDelete={() => {
                        if (confirm(`Delete scenario "${s.name}"?`)) deleteScenario.mutate(s.id);
                      }}
                      isDragging={draggingId === s.id}
                      isDragOver={dragOverId === s.id && draggingId !== null && draggingId !== s.id}
                      onDragStart={() => setDraggingId(s.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      onDragOver={() => setDragOverId(s.id)}
                      onDragLeave={() => setDragOverId((cur) => (cur === s.id ? null : cur))}
                      onDrop={() => {
                        if (draggingId) handleReorder(draggingId, s.id);
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unfiled scenarios */}
        {(unfiledScenarios.length > 0 || (draggingId && scenarios.find((s) => s.id === draggingId)?.folderId)) && (
          <div
            className={clsx(
              'px-2 mt-2',
              dragOverBucket === 'unfiled' &&
                draggingId &&
                'bg-indigo-50/40 dark:bg-indigo-900/20 rounded',
            )}
            onDragOver={(e) => {
              if (!draggingId) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDragOverBucket('unfiled');
            }}
            onDragLeave={() =>
              setDragOverBucket((cur) => (cur === 'unfiled' ? null : cur))
            }
            onDrop={(e) => {
              e.preventDefault();
              // Only act on direct drops (container padding or the Unfiled header);
              // drops on scenario rows bubble up after the row's own handler runs.
              const onContainer = e.target === e.currentTarget;
              const onHeader = (e.target as HTMLElement).dataset?.unfiledHeader === 'true';
              if (draggingId && (onContainer || onHeader)) {
                handleMoveToBucket(draggingId, null);
              }
              setDraggingId(null);
              setDragOverBucket(null);
              setDragOverId(null);
            }}
          >
            <div
              data-unfiled-header="true"
              className={clsx(
                'px-2 py-1 text-xs uppercase tracking-wide text-gray-400',
                dragOverBucket === 'unfiled' &&
                  draggingId &&
                  'text-indigo-500 dark:text-indigo-300',
              )}
            >
              Unfiled
            </div>
            {unfiledScenarios.map((s) => (
              <ScenarioRow
                key={s.id}
                id={s.id}
                name={s.name}
                active={activeScenarioId === s.id}
                renaming={renamingId === s.id}
                renameValue={renameValue}
                onRenameChange={setRenameValue}
                onRenameStart={() => {
                  setRenamingId(s.id);
                  setRenameValue(s.name);
                }}
                onRenameCommit={() => handleRenameSubmit(s.id, 'scenario')}
                onRenameCancel={() => setRenamingId(null)}
                onSelect={() => setActiveScenario(s.id)}
                onDuplicate={() => duplicateScenario.mutate({ id: s.id })}
                onDelete={() => {
                  if (confirm(`Delete scenario "${s.name}"?`)) deleteScenario.mutate(s.id);
                }}
                isDragging={draggingId === s.id}
                isDragOver={dragOverId === s.id && draggingId !== null && draggingId !== s.id}
                onDragStart={() => setDraggingId(s.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setDragOverId(null);
                }}
                onDragOver={() => setDragOverId(s.id)}
                onDragLeave={() => setDragOverId((cur) => (cur === s.id ? null : cur))}
                onDrop={() => {
                  if (draggingId) handleReorder(draggingId, s.id);
                  setDraggingId(null);
                  setDragOverId(null);
                }}
              />
            ))}
          </div>
        )}

        {scenarios.length === 0 && folders.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p>No scenarios yet</p>
            <button
              onClick={() => handleAddScenario(null)}
              className="mt-2 text-indigo-500 hover:text-indigo-600 text-xs"
            >
              Create your first scenario
            </button>
          </div>
        )}
      </div>
    </aside>
    </>
  );
}

interface ScenarioRowProps {
  id: string;
  name: string;
  active: boolean;
  renaming: boolean;
  renameValue: string;
  onRenameChange: (v: string) => void;
  onRenameStart: () => void;
  onRenameCommit: () => void;
  onRenameCancel: () => void;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

function ScenarioRow({
  id,
  name,
  active,
  renaming,
  renameValue,
  onRenameChange,
  onRenameStart,
  onRenameCommit,
  onRenameCancel,
  onSelect,
  onDuplicate,
  onDelete,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: ScenarioRowProps) {
  return (
    <div
      draggable={!renaming}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/scenario-id', id);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        onDragOver();
      }}
      onDragLeave={onDragLeave}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onClick={onSelect}
      className={clsx(
        'group flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer relative',
        active
          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
        isDragging && 'opacity-40',
        isDragOver && 'before:absolute before:-top-px before:left-0 before:right-0 before:h-0.5 before:bg-indigo-500 before:rounded',
      )}
    >
      <GripVertical
        className="w-3 h-3 flex-shrink-0 text-gray-300 dark:text-gray-600 md:opacity-0 md:group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        aria-label="Drag to reorder"
      />
      <Calendar className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" />
      {renaming ? (
        <input
          autoFocus
          value={renameValue}
          onChange={(e) => onRenameChange(e.target.value)}
          onBlur={onRenameCommit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onRenameCommit();
            if (e.key === 'Escape') onRenameCancel();
          }}
          onClick={(e) => e.stopPropagation()}
          className="flex-1 px-1 text-sm bg-white dark:bg-gray-800 border border-indigo-300 rounded"
        />
      ) : (
        <span className="flex-1 truncate">{name}</span>
      )}
      <div className="md:opacity-0 md:group-hover:opacity-100 flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRenameStart();
          }}
          title="Rename"
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Pencil className="w-3 h-3 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate"
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Copy className="w-3 h-3 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
      </div>
    </div>
  );
}
