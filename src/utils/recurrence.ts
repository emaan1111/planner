import { addDays, addWeeks, addMonths, addYears, isBefore, isAfter, startOfDay, setHours, setMinutes, differenceInDays } from 'date-fns';
import { PlanEvent, RecurrencePattern } from '@/types';

export function expandRecurringEvents(
  events: PlanEvent[],
  viewStart: Date,
  viewEnd: Date
): PlanEvent[] {
  const result: PlanEvent[] = [];
  const expandedIds = new Set<string>();

  // First, add all non-recurring events and explicit instances (children)
  events.forEach(event => {
    if (!event.recurrence) {
      if (isEventInRange(event, viewStart, viewEnd)) {
        result.push(event);
        // If this is an exception instance, track it so we don't generate a base recurrence for this date
        if (event.parentEventId) {
          // We need a way to identify which recurrence instance this replaces. 
          // Usually done by originalStartDate, but simplified here.
          // For now, we'll just add it.
        }
      }
    }
  });

  // Then expand recurring events
  events.forEach(event => {
    if (event.recurrence) {
      const instances = generateInstances(event, viewStart, viewEnd);
      instances.forEach(instance => {
         // Simple de-duplication could happen here if we had exception logic
         result.push(instance);
      });
    }
  });

  return result;
}

function isEventInRange(event: PlanEvent, start: Date, end: Date): boolean {
  return event.startDate <= end && event.endDate >= start;
}

function generateInstances(event: PlanEvent, rangeStart: Date, rangeEnd: Date): PlanEvent[] {
  const instances: PlanEvent[] = [];
  const { recurrence, startDate, endDate } = event;
  
  if (!recurrence) return [];

  let currentStart = new Date(startDate);
  const durationDays = differenceInDays(endDate, startDate);
  
  // Safety break
  let count = 0;
  const maxCount = 365 * 5; // 5 years limit for safety loops

  // If start date is after range end, no instances
  if (isAfter(currentStart, rangeEnd)) return [];

  // If recurrence has an end date, respect it
  const recurEnd = recurrence.endDate ? new Date(recurrence.endDate) : null;

  while (count < maxCount) {
    // Check loop termination
    if (recurEnd && isAfter(currentStart, recurEnd)) break;
    if (isAfter(currentStart, rangeEnd)) break;

    // Check if current instance is within range (optimization: we can skip generating if before start)
    // However, if we skip, we still need to increment correctly.
    
    // Calculate current end date
    const currentEnd = addDays(currentStart, durationDays);
    // Restore time of day from original end date since addDays might mess with it if DST? 
    // Actually date-fns handles DST well usually, but we want to keep duration const.
    currentEnd.setHours(endDate.getHours(), endDate.getMinutes());

    // optimization: if instance ends before rangeStart, continue
    if (!isAfter(currentEnd, rangeStart)) {
        // Increment and continue
        currentStart = getNextOccurrence(currentStart, recurrence);
        count++;
        continue;
    }

    // It overlaps (we checked isAfter(currentStart, rangeEnd) earlier)
    
    // Create instance
    // Create a deterministic ID based on index or date
    const instanceId = `${event.id}_${currentStart.getTime()}`;
    
    instances.push({
      ...event,
      id: instanceId,
      startDate: new Date(currentStart),
      endDate: new Date(currentEnd),
      recurrence: undefined, // Expanded instances don't have recurrence rule themselves usually
      parentEventId: event.id,
    });

    // Increment
    currentStart = getNextOccurrence(currentStart, recurrence);
    count++;
  }

  return instances;
}

function getNextOccurrence(current: Date, recurrence: RecurrencePattern): Date {
  const { frequency, interval } = recurrence;
  const validInterval = Math.max(1, interval || 1);

  switch (frequency) {
    case 'daily':
      return addDays(current, validInterval);
    case 'weekly':
      return addWeeks(current, validInterval);
    case 'monthly':
      return addMonths(current, validInterval);
    case 'yearly':
      return addYears(current, validInterval);
    default:
      return addDays(current, validInterval);
  }
}
