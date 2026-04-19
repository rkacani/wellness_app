# Supabase Setup Guide

## Prerequisites
- Supabase project created and configured
- Environment variables set:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Step 1: Set Environment Variables

Create or update your `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Get these values from your [Supabase project settings](https://app.supabase.com/):
- Go to **Settings → API** for the URL and keys
- **Service Role Key** is in the same section (keep this secret!)

## Step 2: Create Database Tables

1. Go to [Supabase Dashboard](https://app.supabase.com/) → Your Project
2. Click **SQL Editor** in the left sidebar
3. Click **+ New Query**
4. Copy and paste the contents of `supabase/workout_schema.sql`
5. Click **Run** button (top right)
6. Wait for success message ✓

## Step 3: Verify Tables Were Created

In the Supabase Dashboard:
1. Click **Table Editor** in the left sidebar
2. You should see two new tables:
   - `week_programs`
   - `exercises`

If you don't see them, check the error message in the SQL Editor.