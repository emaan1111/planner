import { NextRequest, NextResponse } from 'next/server';

// AI Chat endpoint for the planning assistant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context } = body;

    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      // Return helpful response even without API key
      return NextResponse.json({
        message: generateFallbackResponse(message, context),
        suggestions: generateSuggestions(message, context),
        actions: generateActions(message, context),
      });
    }

    // If API key is available, use OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an expert planning assistant helping users create and optimize their plans. 
You have access to the user's current events, constraints, planning context, projects, and any violations.

Current Date: ${new Date().toISOString().split('T')[0]}
Current Year: ${new Date().getFullYear()}

Current Context:
- Events: ${JSON.stringify(context.events || [])}
- Tasks: ${JSON.stringify(context.tasks || [])}
- Projects: ${JSON.stringify(context.projects || [])}
- Constraints: ${JSON.stringify(context.constraints || [])}
- Planning Context (user-defined rules/assumptions): ${JSON.stringify(context.planningContext || [])}
- Available Plan Types: ${JSON.stringify(context.planTypes || [])}
- Violations: ${JSON.stringify(context.violations || [])}

You can suggest actions to modify the calendar. When suggesting actions, format them as JSON in code blocks like:
\`\`\`json
{
  "action": "add_event",
  "payload": {
    "title": "Event Title",
    "startDate": "${new Date().getFullYear()}-02-15",
    "endDate": "${new Date().getFullYear()}-02-15",
    "planType": "marketing",
    "color": "blue",
    "description": "Event description",
    "projectId": "optional-project-id"
  }
}
\`\`\`

Available actions:
- add_event: Create new event (requires: title, startDate, endDate, planType). Optional: projectId to associate with a project. IMPORTANT: planType MUST be one of the Available Plan Types listed above (use the "name" field).
- update_event: Update event (requires: id, plus fields to update). Can update projectId to change project association.
- delete_event: Delete event (requires: id)
- add_task: Create a new task (requires: title, linkedPlanType. Optional: description, status [todo|in-progress|done], priority [low|medium|high], dueDate, linkedEventId, projectId)
- add_plan_type: Add custom plan type (requires: name, label, color)
- add_project: Create a new project (requires: name. Optional: description, color [default: blue])

IMPORTANT: 
- Always respect the user's planning context (constraints, assumptions, goals, preferences).
- When creating events, ONLY use planType values from the Available Plan Types. If the user requests a plan type that doesn't exist, first suggest creating it with add_plan_type.
- When creating tasks, linkedPlanType is REQUIRED and MUST be one of the Available Plan Types (use the "name" field).
- Use the color from the plan type when creating events.
- ALWAYS use the current year (${new Date().getFullYear()}) for dates. Never use past years like 2024.
- When users mention a project, check if it exists in the Projects list. If not, suggest creating it with add_project first.
- You can associate events and tasks with projects using the projectId field.
Be concise, actionable, and specific in your recommendations.`,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message?.content || 'I can help you plan your events!';

    // Parse any actions from the response
    const actions = parseActionsFromResponse(assistantMessage);

    return NextResponse.json({
      message: assistantMessage,
      suggestions: generateSuggestions(message, context),
      actions,
    });
  } catch (error) {
    console.error('AI Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

function generateFallbackResponse(message: string, context: any): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('marketing') || lowerMessage.includes('plan')) {
    return `Here's a suggested marketing plan structure:

📧 **Week 1: Awareness**
- Launch teaser campaign on social media
- Send newsletter announcement to mailing list

📣 **Week 2: Engagement**  
- Run social media contest or giveaway
- Publish blog content related to launch

🚀 **Week 3: Launch**
- Main launch announcement
- Email blast to subscribers
- Press release distribution

📊 **Week 4: Follow-up**
- Share customer testimonials
- Analytics review and optimization

Would you like me to help you create specific events for any of these phases?`;
  }

  if (lowerMessage.includes('conflict') || lowerMessage.includes('violation')) {
    const violations = context.violations || [];
    if (violations.length > 0) {
      return `I found ${violations.length} conflict(s) in your schedule:\n\n${violations
        .map((v: any, i: number) => `${i + 1}. ${v.message}\n   💡 ${v.suggestedFix || 'Consider adjusting the timing'}`)
        .join('\n\n')}\n\nWould you like help resolving any of these?`;
    }
    return 'Great news! I don\'t see any scheduling conflicts in your current plan. Your schedule looks well-organized!';
  }

  if (lowerMessage.includes('launch')) {
    return `Here's a product launch plan template:

**T-4 weeks:** Preparation
- Finalize product features
- Create marketing materials
- Set up landing page

**T-2 weeks:** Pre-launch
- Send early access to VIPs
- Start teaser campaign
- Prepare customer support

**Launch Day:**
- Send launch email
- Post on all social channels
- Monitor feedback

**T+1 week:** Post-launch
- Collect testimonials
- Address feedback
- Plan improvements

Shall I create these as events on your calendar?`;
  }

  if (lowerMessage.includes('optimize') || lowerMessage.includes('schedule')) {
    const events = context.events || [];
    if (events.length === 0) {
      return 'Your calendar is empty! Start by adding some events, and I can help you optimize their timing and avoid conflicts.';
    }
    return `I analyzed your schedule with ${events.length} events. Here are some optimization suggestions:

1. **Spacing**: Try to maintain consistent gaps between similar event types
2. **Weekday preference**: Consider scheduling important launches on Tuesdays or Wednesdays for maximum engagement
3. **Buffer time**: Add buffer days before major events for last-minute adjustments

Would you like specific recommendations for any of your events?`;
  }

  // Check for planning context and acknowledge it
  const planningContext = context.planningContext || [];
  const activeContext = planningContext.filter((c: any) => c.isActive);
  
  if (activeContext.length > 0) {
    return `I see you have ${activeContext.length} active planning context items I should consider:

${activeContext.map((c: any) => `• **${c.title}** (${c.type}): ${c.description}`).join('\n')}

I'm your AI planning assistant! I can help you with:

🗓️ **Creating Plans** - Marketing campaigns, product launches, content calendars
⚠️ **Conflict Detection** - Identify scheduling issues and constraints violations  
⚡ **Optimization** - Suggest better timing for your events
📋 **Templates** - Get structured plan templates for common scenarios
🎯 **Actions** - I can add, update, or delete events for you

What would you like help with?`;
  }

  return `I'm your AI planning assistant! I can help you with:

🗓️ **Creating Plans** - Marketing campaigns, product launches, content calendars
⚠️ **Conflict Detection** - Identify scheduling issues and constraints violations  
⚡ **Optimization** - Suggest better timing for your events
📋 **Templates** - Get structured plan templates for common scenarios
🎯 **Actions** - I can add, update, or delete events for you

💡 Tip: Use the "AI Planning Context" button in the sidebar to define constraints and assumptions I should follow.

What would you like help with?`;
}

function parseActionsFromResponse(response: string): any[] {
  const actions: any[] = [];
  
  // Look for JSON code blocks
  const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/g;
  let match;
  
  while ((match = jsonBlockRegex.exec(response)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      if (parsed.action && parsed.payload) {
        actions.push(parsed);
      }
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  return actions;
}

function generateActions(message: string, context: any): any[] {
  const actions: any[] = [];
  const lowerMessage = message.toLowerCase();
  const planTypes = context.planTypes || [];
  const projects = context.projects || [];
  
  // Get the first available plan type, or null if none exist
  const getDefaultPlanType = () => planTypes.length > 0 ? planTypes[0] : null;
  const findPlanType = (name: string) => planTypes.find((pt: any) => pt.name.toLowerCase().includes(name.toLowerCase()));
  const findProject = (name: string) => projects.find((p: any) => p.name.toLowerCase().includes(name.toLowerCase()));
  
  // Check for project creation request
  if (lowerMessage.includes('project') && (lowerMessage.includes('create') || lowerMessage.includes('add') || lowerMessage.includes('new'))) {
    actions.push({
      action: 'add_project',
      payload: {
        name: 'New Project',
        description: 'Project created by AI assistant',
        color: 'blue',
      },
      description: 'Create a new project',
    });
  }
  
  // Generate sample actions based on common requests
  if (lowerMessage.includes('add') && lowerMessage.includes('event')) {
    const defaultPlanType = getDefaultPlanType();
    if (defaultPlanType) {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      actions.push({
        action: 'add_event',
        payload: {
          title: 'New Event',
          startDate: nextWeek.toISOString().split('T')[0],
          endDate: nextWeek.toISOString().split('T')[0],
          planType: defaultPlanType.name,
          color: defaultPlanType.color,
        },
        description: 'Create a new event next week',
      });
    }
  }

  if (lowerMessage.includes('task') || lowerMessage.includes('todo')) {
    if (lowerMessage.includes('add') || lowerMessage.includes('create')) {
      const defaultPlanType = getDefaultPlanType();
      if (defaultPlanType) {
        const today = new Date();
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 3);
        actions.push({
          action: 'add_task',
          payload: {
            title: 'New Task',
            description: 'Task created by AI assistant',
            status: 'todo',
            priority: 'medium',
            dueDate: dueDate.toISOString().split('T')[0],
            linkedPlanType: defaultPlanType.name,
          },
          description: `Create a new task for ${defaultPlanType.label}`,
        });
      }
    }
  }
  
  if (lowerMessage.includes('marketing') && (lowerMessage.includes('plan') || lowerMessage.includes('campaign'))) {
    const today = new Date();
    // Try to find matching plan types, fall back to first available
    const marketingType = findPlanType('marketing') || getDefaultPlanType();
    const mailingType = findPlanType('mailing') || findPlanType('email') || marketingType;
    const socialType = findPlanType('social') || marketingType;
    const contentType = findPlanType('content') || marketingType;
    
    if (marketingType) {
      const events = [
        { title: 'Marketing Campaign Kickoff', days: 7, planType: marketingType },
        { title: 'Email Newsletter', days: 10, planType: mailingType },
        { title: 'Social Media Blitz', days: 14, planType: socialType },
        { title: 'Content Publication', days: 21, planType: contentType },
      ];
      
      events.forEach(event => {
        const date = new Date(today);
        date.setDate(date.getDate() + event.days);
        
        if (event.planType) {
          actions.push({
            action: 'add_event',
            payload: {
              title: event.title,
              startDate: date.toISOString().split('T')[0],
              endDate: date.toISOString().split('T')[0],
              planType: event.planType.name,
              color: event.planType.color,
            },
            description: `Add ${event.title}`,
          });
        }
      });
    }
  }
  
  return actions;
}

function generateSuggestions(message: string, context: any) {
  const suggestions = [];
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('marketing') || lowerMessage.includes('launch')) {
    suggestions.push({
      id: 'create-plan',
      type: 'schedule',
      title: 'Create Plan Events',
      description: 'Add suggested events to your calendar',
    });
  }

  if (context.violations?.length > 0) {
    suggestions.push({
      id: 'resolve-conflicts',
      type: 'conflict',
      title: 'Resolve Conflicts',
      description: `Fix ${context.violations.length} scheduling conflict(s)`,
    });
  }

  return suggestions;
}
