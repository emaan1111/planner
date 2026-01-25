'use client';

import { useState, useMemo } from 'react';
import { useEvents, useDeleteEvent } from '@/hooks/useEventsQuery';
import { usePlanTypes } from '@/hooks/usePlanTypesQuery';
import { useUIStore } from '@/store/uiStore';
import { PlanEvent, colorClasses } from '@/types';
import { format, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { Calendar, Trash2, Edit2, ArrowUpDown, Filter, Search, ChevronLeft } from 'lucide-react';
import clsx from 'clsx';
import Link from 'next/link';
import { EventModal } from '@/components/modals/EventModal';

type SortField = 'title' | 'startDate' | 'endDate' | 'planType' | 'priority' | 'status';
type SortDirection = 'asc' | 'desc';
type FilterStatus = 'all' | 'upcoming' | 'past' | 'today';

export default function EventsListPage() {
  const { data: events = [], isLoading } = useEvents();
  const { data: planTypes = [] } = usePlanTypes();
  const deleteEventMutation = useDeleteEvent();
  const { openEventModal, isEventModalOpen } = useUIStore();

  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterPlanType, setFilterPlanType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Are you sure you want to delete "${title}"?`)) {
      deleteEventMutation.mutate(id);
    }
  };

  const handleEdit = (event: PlanEvent) => {
    openEventModal(event);
  };

  const filteredAndSortedEvents = useMemo(() => {
    const today = startOfDay(new Date());
    
    let filtered = events.filter(event => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!event.title.toLowerCase().includes(query) && 
            !event.description?.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Plan type filter
      if (filterPlanType !== 'all' && event.planType !== filterPlanType) {
        return false;
      }

      // Status filter
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

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'startDate':
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case 'endDate':
          comparison = new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
          break;
        case 'planType':
          comparison = (a.planType || '').localeCompare(b.planType || '');
          break;
        case 'priority':
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = (priorityOrder[a.priority || 'medium'] || 2) - (priorityOrder[b.priority || 'medium'] || 2);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [events, searchQuery, filterPlanType, filterStatus, sortField, sortDirection]);

  const getPlanTypeLabel = (name: string | undefined) => {
    if (!name) return 'No Type';
    const pt = planTypes.find(p => p.name === name);
    return pt?.label || name;
  };

  const getPlanTypeColor = (name: string | undefined) => {
    if (!name) return 'gray';
    const pt = planTypes.find(p => p.name === name);
    return pt?.color || 'gray';
  };

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className={clsx(
        'flex items-center gap-1 font-medium text-sm hover:text-blue-600 dark:hover:text-blue-400 transition-colors',
        sortField === field ? 'text-blue-600 dark:text-blue-400' : 'text-gray-600 dark:text-gray-400'
      )}
    >
      {children}
      <ArrowUpDown className={clsx(
        'w-3 h-3',
        sortField === field && sortDirection === 'desc' && 'rotate-180'
      )} />
    </button>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                <span>Back to Calendar</span>
              </Link>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                All Events
              </h1>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {filteredAndSortedEvents.length} of {events.length} events
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>

            {/* Plan Type Filter */}
            <select
              value={filterPlanType}
              onChange={(e) => setFilterPlanType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Plan Types</option>
              {planTypes.map(pt => (
                <option key={pt.id} value={pt.name}>{pt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
            <div className="col-span-4">
              <SortButton field="title">Title</SortButton>
            </div>
            <div className="col-span-2">
              <SortButton field="startDate">Start Date</SortButton>
            </div>
            <div className="col-span-2">
              <SortButton field="endDate">End Date</SortButton>
            </div>
            <div className="col-span-2">
              <SortButton field="planType">Plan Type</SortButton>
            </div>
            <div className="col-span-1">
              <SortButton field="priority">Priority</SortButton>
            </div>
            <div className="col-span-1 text-right text-sm font-medium text-gray-600 dark:text-gray-400">
              Actions
            </div>
          </div>

          {/* Table Body */}
          {filteredAndSortedEvents.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
              {events.length === 0 ? (
                <div>
                  <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No events yet</p>
                  <p className="text-sm mt-1">Create your first event from the calendar view</p>
                </div>
              ) : (
                <div>
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">No matching events</p>
                  <p className="text-sm mt-1">Try adjusting your filters</p>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAndSortedEvents.map(event => {
                const color = getPlanTypeColor(event.planType);
                const colorClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;
                
                return (
                  <div 
                    key={event.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors items-center"
                  >
                    {/* Title & Description */}
                    <div className="col-span-4">
                      <div className="flex items-start gap-3">
                        <div className={clsx('w-1 h-10 rounded-full flex-shrink-0', colorClass.bg)} />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {event.title}
                          </p>
                          {event.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {event.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Start Date */}
                    <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(event.startDate), 'MMM d, yyyy')}
                    </div>

                    {/* End Date */}
                    <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                      {format(new Date(event.endDate), 'MMM d, yyyy')}
                    </div>

                    {/* Plan Type */}
                    <div className="col-span-2">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                        colorClass.bg,
                        colorClass.text
                      )}>
                        {getPlanTypeLabel(event.planType)}
                      </span>
                    </div>

                    {/* Priority */}
                    <div className="col-span-1">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        event.priority === 'urgent' && 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        event.priority === 'high' && 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                        event.priority === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                        event.priority === 'low' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                        !event.priority && 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      )}>
                        {event.priority || 'medium'}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(event)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Edit event"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(event.id, event.title)}
                        className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete event"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event Modal */}
      {isEventModalOpen && <EventModal />}
    </div>
  );
}
