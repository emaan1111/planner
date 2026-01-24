import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST to migrate data from localStorage to database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events, tasks, decisions, planTypes, constraints } = body;
    
    const results = {
      events: { created: 0, errors: 0 },
      tasks: { created: 0, errors: 0 },
      decisions: { created: 0, errors: 0 },
      planTypes: { created: 0, errors: 0 },
      constraints: { created: 0, errors: 0 },
    };

    // Migrate Events
    if (events && Array.isArray(events)) {
      for (const event of events) {
        try {
          // Check if event already exists
          const existing = await prisma.event.findUnique({ where: { id: event.id } });
          if (!existing) {
            await prisma.event.create({
              data: {
                id: event.id,
                title: event.title,
                description: event.description || null,
                startDate: new Date(event.startDate),
                endDate: new Date(event.endDate),
                planType: event.planType,
                color: event.color,
                isAllDay: event.isAllDay ?? false,
                tags: event.tags ?? [],
                priority: event.priority || null,
                status: event.status ?? 'planned',
                notes: event.notes || null,
              },
            });
            results.events.created++;
          }
        } catch (error) {
          console.error('Error migrating event:', event.id, error);
          results.events.errors++;
        }
      }
    }

    // Migrate Tasks
    if (tasks && Array.isArray(tasks)) {
      for (const task of tasks) {
        try {
          const existing = await prisma.task.findUnique({ where: { id: task.id } });
          if (!existing) {
            await prisma.task.create({
              data: {
                id: task.id,
                title: task.title,
                description: task.description || null,
                status: task.status ?? 'todo',
                priority: task.priority ?? 'medium',
                dueDate: task.dueDate ? new Date(task.dueDate) : null,
                linkedPlanType: task.linkedPlanType || null,
                linkedEventId: task.linkedEventId || null,
              },
            });
            results.tasks.created++;
          }
        } catch (error) {
          console.error('Error migrating task:', task.id, error);
          results.tasks.errors++;
        }
      }
    }

    // Migrate Decisions
    if (decisions && Array.isArray(decisions)) {
      for (const decision of decisions) {
        try {
          const existing = await prisma.decision.findUnique({ where: { id: decision.id } });
          if (!existing) {
            await prisma.decision.create({
              data: {
                id: decision.id,
                title: decision.title,
                description: decision.description || null,
                status: decision.status ?? 'pending',
                outcome: decision.outcome || null,
                linkedPlanType: decision.linkedPlanType || null,
                linkedEventId: decision.linkedEventId || null,
                decidedAt: decision.decidedAt ? new Date(decision.decidedAt) : null,
              },
            });
            results.decisions.created++;
          }
        } catch (error) {
          console.error('Error migrating decision:', decision.id, error);
          results.decisions.errors++;
        }
      }
    }

    // Migrate Plan Types
    if (planTypes && Array.isArray(planTypes)) {
      for (const planType of planTypes) {
        try {
          // Check by name since that's unique
          const existing = await prisma.planType.findUnique({ where: { name: planType.name } });
          if (!existing) {
            await prisma.planType.create({
              data: {
                id: planType.id,
                name: planType.name,
                label: planType.label,
                color: planType.color,
                icon: planType.icon ?? 'Star',
              },
            });
            results.planTypes.created++;
          }
        } catch (error) {
          console.error('Error migrating planType:', planType.name, error);
          results.planTypes.errors++;
        }
      }
    }

    // Migrate Constraints
    if (constraints && Array.isArray(constraints)) {
      for (const constraint of constraints) {
        try {
          const existing = await prisma.constraint.findUnique({ where: { id: constraint.id } });
          if (!existing) {
            await prisma.constraint.create({
              data: {
                id: constraint.id,
                name: constraint.name,
                type: constraint.type,
                description: constraint.description || '',
                ruleType: constraint.rule?.type ?? 'custom',
                ruleParams: constraint.rule?.params ?? {},
                isActive: constraint.isActive ?? true,
              },
            });
            results.constraints.created++;
          }
        } catch (error) {
          console.error('Error migrating constraint:', constraint.id, error);
          results.constraints.errors++;
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Migration error:', error);
    return NextResponse.json({ error: 'Migration failed', details: String(error) }, { status: 500 });
  }
}
