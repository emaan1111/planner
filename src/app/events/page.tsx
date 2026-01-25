'use client';

import { useState, useMemo } from 'react';
import { useEvents, useDeleteEvent } from '@/hooks/useEventsQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { useProjects } from '@/hooks/useProjectsQuery';
import { useUIStore } from '@/store/uiStore';
import { PlanEvent, colorClasses } from '@/types';
import { format, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { Trash2, Edit2, ArrowUpDown, Search, ChevronLeft, FolderKanban } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { EventModal } from '@/components/modals/EventModal';

type SortField = 'title' | 'startDate' | 'planType' | 'priority';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'upcoming' | 'past' | 'today';

export default function EventsListPage() {
  const { data: events = [], isLoading } = useEvents();
  const { data: planTypes = [] } = usePlanTypes();
  const { data: projects = [] } = useProjects();
  const deleteEventMutation = useDeleteEvent();
  const { openEventModal, isEventModalOpen } = useUIStore();

  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPlanType, setFilterPlanType] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (confirm(`Delete "${title}"?`)) {
      deleteEventMutation.mutate(id);
    }
  };

  const filteredAndSortedEvents = useMemo(() => {
    const today = startOfDay(new Date());
    
    let filtered = events.filter(event => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(query) && 
            !event.description?.toLowerCase().includes(query)) {
          return false;
        }
      }

      if (filterPlanType !== 'all') {
        if (filterPlanType === 'none') {
          if (event.planType) return false;
        } else if (event.planType !== filterPlanType) {
          return false;
        }
      }

      if (filterProject !== 'all') {
        if (filterProject === 'none') {
          if (event.projectId) return false;
        } else if (event.projectId !== filterProject) {
          return false;
        }
      }

      const eventStart = startOfDay(new Date(event.startDate));
      const eventEnd = startOfDay(new Date(event.endDate));
      
      switch (filterStatus) {
        case 'upcoming':
          return isAfter(eventStart, today) || isToday(eventStart);
        case 'past':
          return isBefore(eventEnd, today);
        case 'today':
          return isToday(eventStart) || (isBefore(eventStart, today) && isAfter(eventEnd, today));
        default:
          return true;
      }
    });

    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'planType':
          comparison = (a.planType || '').localeCompare(b.planType || '');
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = (priorityOrder[a.priority || 'medium'] || 2) - (priorityOrder[b.priority || 'medium'] || 2);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [events, searchQuery, filterPlanType, filterProject, filterStatus, sortField, sortDirection]);

  const getPlanTypeLabel = (name: string | undefined) => {
    if (!name) return '—';
    const pt = planTypes.find(p => p.name === name);
    return pt?.label || name;
  };

  const getPlanTypeColor = (name: string | undefined) => {
    if (!name) return 'gray';
    const pt = planTypes.find(p => p.name === name);
    return pt?.color || 'gray';
  };

  const getProjectName = (projectId: string | undefined) => {
    if (!projectId) return null;
    const project = projects.find(p => p.id === projectId);
    return project?.name || null;
  };

  const SortHeader = ({ field, children, className }: { field: SortField; children: React.ReactNode; className?: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={clsx(
        'flex items-center gap-1 text-xs font-medium uppercase tracking-wide hover:text-blue-600 dark:hover:text-blue-400',
        sortField === field ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400',
        className
      )}
    >
      {children}
      <ArrowUpDown className="w-3 h-3" />
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <ChevronLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                Events <span className="text-gray-400 font-normal">({filteredAndSortedEvents.length})</span>
              </h1>
            </div>
            
            <div className="flex items-center gap-2 flex-1 max-w-2xl">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
              <select
                value={filterPlanType}
                onChange={(e) => setFilterPlanType(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="none">No Type</option>
                {planTypes.map(pt => (
                  <option key={pt.id} value={pt.name}>{pt.label}</option>
                ))}
              </select>
              <select
                value={filterProject}
                onChange={(e) => setFilterProject(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 focus:ring-1 focus:ring-blue-500"
              >
                <option value="all">All Projects</option>
                <option value="none">No Project</option>
                {projects.filter(p => p.isActive).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <SortHeader field="title" className="col-span-5">Title</SortHeader>
            <SortHeader field="startDate" className="col-span-3">Date</SortHeader>
            <SortHeader field="planType" className="col-span-2">Type</SortHeader>
            <SortHeader field="priority" className="col-span-1">Pri</SortHeader>
            <div className="col-span-1" />
          </div>

          {filteredAndSortedEvents.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              {events.length === 0 ? 'No events yet' : 'No matching events'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filteredAndSortedEvents.map(event => {
                const color = getPlanTypeColor(event.planType);
                const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;
                
                return (
                  <div 
                    key={event.id}
                    onClick={() => openEventModal(event)}
                    className="grid grid-cols-12 gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 cursor-pointer items-center group"
                  >
                    <div className="col-span-5 flex items-center gap-2 min-w-0">
                      <div className={clsx('w-1 h-5 rounded-full flex-shrink-0', colorClass.bg)} />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {event.title}
                        </span>
                        {event.projectId && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <FolderKanban className="w-3 h-3" />
                            {getProjectName(event.projectId)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-span-3 text-xs text-gray-500 dark:text-gray-400">
                      {format(new Date(event.startDate), 'MMM d')}
                      {format(new Date(event.startDate), 'yyyy-MM-dd') !== format(new Date(event.endDate), 'yyyy-MM-dd') && (
                        <span> – {format(new Date(event.endDate), 'MMM d')}</span>
                      )}
                    </div>

                    <div className="col-span-2">
                      <span className={clsx(
                        'inline-block px-1.5 py-0.5 rounded text-xs truncate max-w-full',
                        event.planType ? [colorClass.bg, colorClass.text] : 'text-gray-400'
                      )}>
                        {getPlanTypeLabel(event.planType)}
                      </span>
                    </div>

                    <div className="col-span-1">
                      <span className={clsx(
                        'text-xs font-medium',
                        event.priority === 'urgent' && 'text-red-600 dark:text-red-400',
                        event.priority === 'high' && 'text-orange-600 dark:text-orange-400',
                        event.priority === 'medium' && 'text-yellow-600 dark:text-yellow-400',
                        event.priority === 'low' && 'text-green-600 dark:text-green-400',
                        !event.priority && 'text-gray-400'
                      )}>
                        {event.priority?.[0]?.toUpperCase() || '—'}
                      </span>
                    </div>

                    <div className="col-span-1 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEventModal(event); }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded"
                        title="Edit"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, event.id, event.title)}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {isEventModalOpen && <EventModal />}
    </div>
  );
}
