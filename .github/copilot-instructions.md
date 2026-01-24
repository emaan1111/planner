# Planner - AI-Powered Planning App

## Project Overview
This is a Next.js 14+ planning application with:
- TypeScript for type safety
- Tailwind CSS for styling
- Framer Motion for smooth animations
- Zustand for state management
- dnd-kit for drag-and-drop functionality

## Key Features
- **Multiple Calendar Views**: Month, 3-Month, and Year views
- **Drag & Drop**: Move events between dates
- **AI Assistant**: Get help planning with AI suggestions
- **Constraint System**: Define rules and get notified of conflicts
- **Color Coding**: Categorize events with 17 color options
- **Plan Types**: Marketing, Mailing, Launch, Content, Social, Product, Meeting, Deadline, Milestone, Custom

## Project Structure
- `/src/app` - Next.js app router pages and API routes
- `/src/components` - React components
  - `/calendar` - Calendar view components
  - `/layout` - Layout components (Sidebar)
  - `/ai` - AI Assistant component
  - `/modals` - Modal components
- `/src/store` - Zustand state management
- `/src/types` - TypeScript type definitions

## Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## AI Integration
To enable full AI features, set the `OPENAI_API_KEY` environment variable.
The app works without it using fallback responses.

## Coding Guidelines
- Use TypeScript for all new files
- Use Framer Motion for animations
- Follow the existing component patterns
- Use Tailwind CSS for styling
- Keep components modular and reusable
