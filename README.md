# 🗓️ Planner - AI-Powered Planning App

A beautiful, interactive planning application with smooth animations, drag-and-drop functionality, and AI assistance. Perfect for managing marketing plans, product launches, mailing lists, and more.

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.0+-38bdf8?style=flat-square&logo=tailwindcss)

## ✨ Features

### 📅 Multiple Calendar Views
- **Month View** - Detailed monthly calendar with all events
- **3-Month View** - See a quarter at a glance
- **Year View** - Annual overview with event density indicators

### 🎯 Drag & Drop
- Easily move events between dates
- Smooth animations during drag operations
- Visual feedback for drop targets

### 🤖 AI Assistant
- Get help creating marketing plans, launch schedules, and more
- AI-powered conflict detection
- Smart suggestions based on your schedule

### ⚠️ Constraint System
- Define rules for your planning (e.g., "No weekend launches")
- Automatic conflict detection
- Visual warnings for constraint violations

### 🎨 Color Coding
- 17 beautiful color options
- Categorize events by type
- Plan types: Marketing, Mailing, Launch, Content, Social, Product, Meeting, Deadline, Milestone, Custom

### 💾 Persistent Storage
- Events saved to local storage
- Resume where you left off
- No account required

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Environment Variables (Optional)

For full AI capabilities, create a `.env.local` file:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── ai/           # AI endpoints
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── components/
│   ├── ai/               # AI Assistant
│   ├── calendar/         # Calendar views
│   ├── layout/           # Layout components
│   └── modals/           # Modal components
├── store/                 # Zustand state
└── types/                 # TypeScript types
```

## 🛠️ Built With

- [Next.js 14+](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Framer Motion](https://www.framer.com/motion/) - Animations
- [dnd-kit](https://dndkit.com/) - Drag and drop
- [Zustand](https://zustand-demo.pmnd.rs/) - State management
- [date-fns](https://date-fns.org/) - Date utilities
- [Lucide React](https://lucide.dev/) - Icons

## 📝 Usage

### Creating Events
1. Click the **Create Event** button in the sidebar
2. Fill in event details (title, dates, type, color)
3. Use the **AI** button for smart suggestions
4. Click **Create Event** to save

### Navigating Views
- Use the view toggle buttons (Month, 3 Months, Year)
- Navigate with arrow buttons or "Today" button
- Click on a month in Year view to zoom into it

### Managing Constraints
- Toggle constraints on/off in the sidebar
- Active constraints show violations in real-time
- Click violations to see suggested fixes

### Using AI Assistant
- Click the **AI Assistant** button in the header
- Ask for help with planning, conflicts, or optimization
- Use quick action buttons for common tasks

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
