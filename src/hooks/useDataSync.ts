'use client';

import { useEffect, useCallback, useRef } from 'react';
import { usePlannerStore } from '@/store/plannerStore';
import { eventsApi, tasksApi, decisionsApi, planTypesApi, constraintsApi } from '@/lib/api';
import { PlanEvent, Task, KeyDecision, PlanTypeConfig, Constraint, EventColor } from '@/types';

// Hook to sync store data with the database
export function useDataSync() {
  const {
    events,
    tasks,
    decisions,
    planTypes,
    constraints,
  } = usePlannerStore();

  const isInitialized = useRef(false);
  const isSyncing = useRef(false);

  // Load data from database on mount
  const loadData = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      const [
        dbEvents,
        dbTasks,
        dbDecisions,
        dbPlanTypes,
        dbConstraints,
      ] = await Promise.all([
        eventsApi.getAll().catch(() => []),
        tasksApi.getAll().catch(() => []),
        decisionsApi.getAll().catch(() => []),
        planTypesApi.getAll().catch(() => []),
        constraintsApi.getAll().catch(() => []),
      ]);

      const store = usePlannerStore.getState();

      // Update store with database data if we have any
      if (dbEvents.length > 0 || store.events.length === 0) {
        usePlannerStore.setState({
          events: dbEvents.map(e => ({
            ...e,
            color: e.color as EventColor,
            startDate: new Date(e.startDate),
            endDate: new Date(e.endDate),
            createdAt: new Date(e.createdAt),
            updatedAt: new Date(e.updatedAt),
          })) as PlanEvent[],
        });
      }

      if (dbTasks.length > 0 || store.tasks.length === 0) {
        usePlannerStore.setState({
          tasks: dbTasks.map(t => ({
            ...t,
            status: t.status as Task['status'],
            priority: t.priority as Task['priority'],
            dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt),
          })) as Task[],
        });
      }

      if (dbDecisions.length > 0 || store.decisions.length === 0) {
        usePlannerStore.setState({
          decisions: dbDecisions.map(d => ({
            ...d,
            status: d.status as KeyDecision['status'],
            decidedAt: d.decidedAt ? new Date(d.decidedAt) : undefined,
            createdAt: new Date(d.createdAt),
            updatedAt: new Date(d.updatedAt),
          })) as KeyDecision[],
        });
      }

      if (dbPlanTypes.length > 0) {
        usePlannerStore.setState({ 
          planTypes: dbPlanTypes.map(pt => ({
            ...pt,
            color: pt.color as EventColor,
          })) as PlanTypeConfig[],
        });
      }

      if (dbConstraints.length > 0) {
        usePlannerStore.setState({ 
          constraints: dbConstraints.map(c => ({
            ...c,
            type: c.type as Constraint['type'],
          })) as Constraint[],
        });
      }

      isInitialized.current = true;
    } catch (error) {
      console.error('Failed to load data from database:', error);
    } finally {
      isSyncing.current = false;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  return { isInitialized: isInitialized.current, refresh: loadData };
}

// Hook to persist a single event change to the database
export function usePersistEvent() {
  return {
    create: async (eventData: Parameters<typeof eventsApi.create>[0]) => {
      try {
        const created = await eventsApi.create(eventData);
        return created;
      } catch (error) {
        console.error('Failed to persist event:', error);
        throw error;
      }
    },
    update: async (id: string, data: Parameters<typeof eventsApi.update>[1]) => {
      try {
        await eventsApi.update(id, data);
      } catch (error) {
        console.error('Failed to update event:', error);
      }
    },
    delete: async (id: string) => {
      try {
        await eventsApi.delete(id);
      } catch (error) {
        console.error('Failed to delete event:', error);
      }
    },
  };
}

// Hook to persist task changes
export function usePersistTask() {
  return {
    create: async (taskData: Parameters<typeof tasksApi.create>[0]) => {
      try {
        return await tasksApi.create(taskData);
      } catch (error) {
        console.error('Failed to persist task:', error);
        throw error;
      }
    },
    update: async (id: string, data: Parameters<typeof tasksApi.update>[1]) => {
      try {
        await tasksApi.update(id, data);
      } catch (error) {
        console.error('Failed to update task:', error);
      }
    },
    delete: async (id: string) => {
      try {
        await tasksApi.delete(id);
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    },
  };
}

// Hook to persist decision changes
export function usePersistDecision() {
  return {
    create: async (decisionData: Parameters<typeof decisionsApi.create>[0]) => {
      try {
        return await decisionsApi.create(decisionData);
      } catch (error) {
        console.error('Failed to persist decision:', error);
        throw error;
      }
    },
    update: async (id: string, data: Parameters<typeof decisionsApi.update>[1]) => {
      try {
        await decisionsApi.update(id, data);
      } catch (error) {
        console.error('Failed to update decision:', error);
      }
    },
    delete: async (id: string) => {
      try {
        await decisionsApi.delete(id);
      } catch (error) {
        console.error('Failed to delete decision:', error);
      }
    },
  };
}
