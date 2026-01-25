import { useMemo, useEffect, useRef } from 'react';
import { useEvents } from './useEventsQuery';
import { useConstraints } from './useConstraintsQuery';
import { useUIStore } from '@/store/uiStore';
import { ConstraintViolation, PlanEvent, Constraint } from '@/types';

// Check constraints and return violations
function checkConstraints(events: PlanEvent[], constraints: Constraint[]): ConstraintViolation[] {
  const violations: ConstraintViolation[] = [];
  const activeConstraints = constraints.filter((c) => c.isActive);

  for (const constraint of activeConstraints) {
    const { rule } = constraint;

    if (rule.type === 'no-weekend') {
      const planTypes = rule.params.planTypes as string[];
      for (const event of events) {
        if (event.planType && planTypes.includes(event.planType)) {
          const day = event.startDate.getDay();
          if (day === 0 || day === 6) {
            violations.push({
              constraintId: constraint.id,
              constraintName: constraint.name,
              eventId: event.id,
              message: `"${event.title}" is scheduled on a weekend`,
              severity: 'warning',
              suggestedFix: 'Move to a weekday',
            });
          }
        }
      }
    }

    if (rule.type === 'min-gap') {
      const planTypes = rule.params.planTypes as string[];
      const minDays = rule.params.minDays as number;
      
      const relevantEvents = events
        .filter((e) => e.planType && planTypes.includes(e.planType))
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

      for (let i = 0; i < relevantEvents.length - 1; i++) {
        const current = relevantEvents[i];
        const next = relevantEvents[i + 1];
        const gapDays = Math.floor(
          (next.startDate.getTime() - current.endDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (gapDays < minDays) {
          violations.push({
            constraintId: constraint.id,
            constraintName: constraint.name,
            eventId: next.id,
            message: `"${next.title}" is only ${gapDays} days after "${current.title}"`,
            severity: 'warning',
            suggestedFix: `Move at least ${minDays - gapDays} more days later`,
          });
        }
      }
    }

    if (rule.type === 'no-overlap') {
      const planTypes = rule.params.planTypes as string[];
      const relevantEvents = events.filter((e) => e.planType && planTypes.includes(e.planType));

      for (let i = 0; i < relevantEvents.length; i++) {
        for (let j = i + 1; j < relevantEvents.length; j++) {
          const a = relevantEvents[i];
          const b = relevantEvents[j];

          const overlaps =
            (a.startDate <= b.endDate && a.endDate >= b.startDate);

          if (overlaps) {
            violations.push({
              constraintId: constraint.id,
              constraintName: constraint.name,
              eventId: b.id,
              message: `"${a.title}" and "${b.title}" overlap`,
              severity: 'error',
              suggestedFix: 'Reschedule one of the events',
            });
          }
        }
      }
    }
  }

  return violations;
}

// Hook to compute and update constraint violations
export function useConstraintChecker() {
  const { data: events = [] } = useEvents();
  const { data: constraints = [] } = useConstraints();
  const setViolations = useUIStore((state) => state.setViolations);
  const prevViolationsRef = useRef<string>('');

  const violations = useMemo(() => {
    return checkConstraints(events, constraints);
  }, [events, constraints]);

  // Update violations in UI store only when they actually change
  useEffect(() => {
    const violationsKey = JSON.stringify(violations.map(v => v.eventId + v.constraintId));
    if (violationsKey !== prevViolationsRef.current) {
      prevViolationsRef.current = violationsKey;
      setViolations(violations);
    }
  }, [violations, setViolations]);

  return violations;
}

// Export the check function for use elsewhere
export { checkConstraints };
