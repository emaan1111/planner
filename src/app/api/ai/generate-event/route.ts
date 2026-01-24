import { NextRequest, NextResponse } from 'next/server';

// Generate event suggestions using AI
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planType, startDate } = body;

    // Generate suggestions based on plan type
    const suggestions = getSuggestionsByType(planType, startDate);

    return NextResponse.json({
      suggestion: suggestions,
    });
  } catch (error) {
    console.error('Generate event error:', error);
    return NextResponse.json(
      { error: 'Failed to generate event' },
      { status: 500 }
    );
  }
}

function getSuggestionsByType(planType: string, startDate: string) {
  const date = new Date(startDate);
  const month = date.toLocaleString('default', { month: 'long' });

  const suggestions: Record<string, { title: string; description: string; tags: string[] }> = {
    marketing: {
      title: `${month} Marketing Campaign`,
      description: 'Strategic marketing campaign to increase brand awareness and drive conversions.',
      tags: ['marketing', 'campaign', 'growth'],
    },
    mailing: {
      title: `${month} Newsletter`,
      description: 'Monthly newsletter with updates, tips, and exclusive offers for subscribers.',
      tags: ['email', 'newsletter', 'engagement'],
    },
    launch: {
      title: 'Product Launch',
      description: 'Coordinate product launch activities across all channels.',
      tags: ['launch', 'product', 'announcement'],
    },
    content: {
      title: `${month} Content Calendar`,
      description: 'Content creation and publishing schedule for the month.',
      tags: ['content', 'blog', 'social'],
    },
    social: {
      title: 'Social Media Campaign',
      description: 'Coordinated social media posts and engagement strategy.',
      tags: ['social', 'instagram', 'twitter'],
    },
    product: {
      title: 'Product Milestone',
      description: 'Key product development milestone or feature release.',
      tags: ['product', 'development', 'feature'],
    },
    meeting: {
      title: 'Team Meeting',
      description: 'Regular team sync to discuss progress and align on goals.',
      tags: ['meeting', 'team', 'sync'],
    },
    deadline: {
      title: 'Project Deadline',
      description: 'Important deadline for project deliverables.',
      tags: ['deadline', 'project', 'deliverable'],
    },
    milestone: {
      title: 'Project Milestone',
      description: 'Key milestone in the project timeline.',
      tags: ['milestone', 'achievement', 'progress'],
    },
    custom: {
      title: 'New Event',
      description: 'Custom event for your planning needs.',
      tags: ['event'],
    },
  };

  return suggestions[planType] || suggestions.custom;
}
