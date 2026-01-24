import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// AI Actions endpoint - Allows AI to execute actions on the planner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // Validate action type
    const validActions = [
      'add_event',
      'update_event', 
      'delete_event',
      'add_plan_type',
      'delete_plan_type',
      'add_constraint',
      'add_planning_context',
      'add_task',
      'update_task',
      'delete_task',
      'add_decision',
      'update_decision',
      'delete_decision',
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action: ${action}. Valid actions: ${validActions.join(', ')}` },
        { status: 400 }
      );
    }

    // Execute the action with database operations
    let result;
    
    switch (action) {
      case 'add_event':
        if (!payload.title || !payload.startDate || !payload.endDate || !payload.planType) {
          return NextResponse.json(
            { error: 'add_event requires: title, startDate, endDate, planType' },
            { status: 400 }
          );
        }
        result = await prisma.event.create({
          data: {
            title: payload.title,
            description: payload.description,
            startDate: new Date(payload.startDate),
            endDate: new Date(payload.endDate),
            planType: payload.planType,
            color: payload.color || 'blue',
            priority: payload.priority,
            status: payload.status || 'planned',
            notes: payload.notes,
            tags: payload.tags || [],
          },
        });
        break;
        
      case 'update_event':
        if (!payload.id) {
          return NextResponse.json(
            { error: 'update_event requires: id' },
            { status: 400 }
          );
        }
        result = await prisma.event.update({
          where: { id: payload.id },
          data: {
            title: payload.title,
            description: payload.description,
            startDate: payload.startDate ? new Date(payload.startDate) : undefined,
            endDate: payload.endDate ? new Date(payload.endDate) : undefined,
            planType: payload.planType,
            color: payload.color,
            priority: payload.priority,
            status: payload.status,
            notes: payload.notes,
          },
        });
        break;
        
      case 'delete_event':
        if (!payload.id) {
          return NextResponse.json(
            { error: 'delete_event requires: id' },
            { status: 400 }
          );
        }
        result = await prisma.event.delete({
          where: { id: payload.id },
        });
        break;
        
      case 'add_plan_type':
        if (!payload.name || !payload.label) {
          return NextResponse.json(
            { error: 'add_plan_type requires: name, label' },
            { status: 400 }
          );
        }
        result = await prisma.planType.create({
          data: {
            name: payload.name,
            label: payload.label,
            color: payload.color || 'blue',
            icon: payload.icon || 'Star',
          },
        });
        break;
        
      case 'delete_plan_type':
        if (!payload.id) {
          return NextResponse.json(
            { error: 'delete_plan_type requires: id' },
            { status: 400 }
          );
        }
        result = await prisma.planType.delete({
          where: { id: payload.id },
        });
        break;
        
      case 'add_task':
        if (!payload.title) {
          return NextResponse.json(
            { error: 'add_task requires: title' },
            { status: 400 }
          );
        }
        result = await prisma.task.create({
          data: {
            title: payload.title,
            description: payload.description,
            status: payload.status || 'todo',
            priority: payload.priority || 'medium',
            dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
            linkedPlanType: payload.linkedPlanType,
            linkedEventId: payload.linkedEventId,
          },
        });
        break;
        
      case 'update_task':
        if (!payload.id) {
          return NextResponse.json(
            { error: 'update_task requires: id' },
            { status: 400 }
          );
        }
        result = await prisma.task.update({
          where: { id: payload.id },
          data: {
            title: payload.title,
            description: payload.description,
            status: payload.status,
            priority: payload.priority,
            dueDate: payload.dueDate ? new Date(payload.dueDate) : undefined,
            linkedPlanType: payload.linkedPlanType,
            linkedEventId: payload.linkedEventId,
          },
        });
        break;
        
      case 'delete_task':
        if (!payload.id) {
          return NextResponse.json(
            { error: 'delete_task requires: id' },
            { status: 400 }
          );
        }
        result = await prisma.task.delete({
          where: { id: payload.id },
        });
        break;
        
      case 'add_decision':
        if (!payload.title) {
          return NextResponse.json(
            { error: 'add_decision requires: title' },
            { status: 400 }
          );
        }
        result = await prisma.decision.create({
          data: {
            title: payload.title,
            description: payload.description,
            status: payload.status || 'pending',
            outcome: payload.outcome,
            linkedPlanType: payload.linkedPlanType,
            linkedEventId: payload.linkedEventId,
          },
        });
        break;
        
      case 'update_decision':
        if (!payload.id) {
          return NextResponse.json(
            { error: 'update_decision requires: id' },
            { status: 400 }
          );
        }
        result = await prisma.decision.update({
          where: { id: payload.id },
          data: {
            title: payload.title,
            description: payload.description,
            status: payload.status,
            outcome: payload.outcome,
            decidedAt: payload.status === 'decided' ? new Date() : undefined,
            linkedPlanType: payload.linkedPlanType,
            linkedEventId: payload.linkedEventId,
          },
        });
        break;
        
      case 'delete_decision':
        if (!payload.id) {
          return NextResponse.json(
            { error: 'delete_decision requires: id' },
            { status: 400 }
          );
        }
        result = await prisma.decision.delete({
          where: { id: payload.id },
        });
        break;
        
      case 'add_constraint':
        if (!payload.name || !payload.description) {
          return NextResponse.json(
            { error: 'add_constraint requires: name, description' },
            { status: 400 }
          );
        }
        result = await prisma.constraint.create({
          data: {
            name: payload.name,
            description: payload.description,
            type: payload.type || 'custom',
            ruleType: payload.rule?.type || 'custom',
            ruleParams: payload.rule?.params || {},
            isActive: true,
          },
        });
        break;
        
      case 'add_planning_context':
        if (!payload.type || !payload.title || !payload.description) {
          return NextResponse.json(
            { error: 'add_planning_context requires: type, title, description' },
            { status: 400 }
          );
        }
        result = await prisma.planningContext.create({
          data: {
            type: payload.type,
            title: payload.title,
            description: payload.description,
            isActive: true,
          },
        });
        break;
    }

    return NextResponse.json({
      success: true,
      action,
      result,
      message: `Action '${action}' executed successfully.`,
    });
  } catch (error) {
    console.error('AI Actions error:', error);
    return NextResponse.json(
      { error: 'Failed to process action' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available actions
export async function GET() {
  return NextResponse.json({
    actions: [
      {
        name: 'add_event',
        description: 'Add a new event to the calendar',
        requiredFields: ['title', 'startDate', 'endDate', 'planType'],
        optionalFields: ['description', 'color', 'priority', 'status', 'notes'],
      },
      {
        name: 'update_event',
        description: 'Update an existing event',
        requiredFields: ['id'],
        optionalFields: ['title', 'description', 'startDate', 'endDate', 'planType', 'color', 'priority', 'status', 'notes'],
      },
      {
        name: 'delete_event',
        description: 'Delete an event by ID',
        requiredFields: ['id'],
      },
      {
        name: 'add_plan_type',
        description: 'Add a new custom plan type',
        requiredFields: ['name', 'label'],
        optionalFields: ['color', 'icon'],
      },
      {
        name: 'delete_plan_type',
        description: 'Delete a custom plan type',
        requiredFields: ['id'],
      },
      {
        name: 'add_constraint',
        description: 'Add a new scheduling constraint',
        requiredFields: ['name', 'description'],
        optionalFields: ['type', 'rule'],
      },
      {
        name: 'add_planning_context',
        description: 'Add AI planning context (constraint, assumption, goal, preference, note)',
        requiredFields: ['type', 'title', 'description'],
      },
    ],
    planTypes: ['marketing', 'mailing', 'launch', 'content', 'social', 'product', 'meeting', 'deadline', 'milestone', 'custom'],
    colors: ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'],
    priorities: ['low', 'medium', 'high', 'urgent'],
    contextTypes: ['constraint', 'assumption', 'goal', 'preference', 'note'],
  });
}
