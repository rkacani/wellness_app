This is a "Wellness and Training Companion" app.

Goals of the project include:

• Development of a user-friendly app to promote health, fitness, and well-being

• Provision of tools for planning and managing workouts and training plans

• Timers and exercise guidance during workouts

• Integration of a system for tracking daily habits (e.g., water intake, sleep, exercise)

• Increased motivation through reminders and progress indicators

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Technologies Used
- **Next.js**: A React framework for building server-side rendered applications.
- **[Supabase](https://supabase.com/)**: An open-source Firebase alternative for backend services.
- **Tailwind CSS**: A utility-first CSS framework for styling.
- **[Vercel](https://vercel.com/)**: A platform for deploying Next.js applications.
- **PWA**: Progressive Web App features for offline support and improved performance.

## Process

### Next.js installation
- npx create-next-app@latest wellness-app
- npm install
- npm run dev
### Supabase setup
- npm install @supabase/supabase-js
- create .env.local with
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
  ```
### PWA setup
- npm install next-pwa