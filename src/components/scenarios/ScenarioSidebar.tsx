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

  const { activeScenarioId, setActiveScenario } = useScenariosStore();
  const [openFolderIds, setOpenFolderIds] = useState<Set<string>>(new Set());
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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
    <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Scenarios</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAddFolder}
            title="New folder"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleAddScenario(null)}
            title="New scenario"
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
          >
            <Plus className="w-4 h-4" />
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
                className="group flex items-center gap-1 px-2 py-1.5 rounded hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm"
                onClick={() => toggleFolder(folder.id)}
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
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddScenario(folder.id);
                    }}
                    title="Add scenario to folder"
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
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
                    className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
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
                    className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
                  >
                    <Trash2 className="w-3 h-3 text-red-500" />
                  </button>
                </div>
              </div>
              {open && (
                <div className="ml-6 border-l border-gray-100 dark:border-gray-800 pl-2 my-1">
                  {folderScenarios.length === 0 && (
                    <div className="text-xs text-gray-400 italic px-2 py-1">empty</div>
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
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Unfiled scenarios */}
        {unfiledScenarios.length > 0 && (
          <div className="px-2 mt-2">
            <div className="px-2 py-1 text-xs uppercase tracking-wide text-gray-400">Unfiled</div>
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
}

function ScenarioRow({
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
}: ScenarioRowProps) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer',
        active
          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-200'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300',
      )}
    >
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
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRenameStart();
          }}
          title="Rename"
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Pencil className="w-3 h-3 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicate"
          className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Copy className="w-3 h-3 text-gray-500" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
          className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30"
        >
          <Trash2 className="w-3 h-3 text-red-500" />
        </button>
      </div>
    </div>
  );
}
