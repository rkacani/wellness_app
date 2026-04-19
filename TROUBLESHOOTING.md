# Quick Troubleshooting Checklist

## 🔴 Error: 500 when creating program or viewing programs

### ✅ Checklist (Do these in order):

1. **Check Environment Variables**
   - [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_URL`
   - [ ] `.env.local` has `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - [ ] `.env.local` has `SUPABASE_SERVICE_ROLE_KEY`
   - [ ] Run `npm run dev` again after editing `.env.local`
   - [ ] Check terminal logs for `[Supabase] ✓ Set` messages

2. **Check Supabase Tables Exist**
   - [ ] Log in to [Supabase Dashboard](https://app.supabase.com/)
   - [ ] Click **Table Editor**
   - [ ] Do you see `week_programs` table? 
   - [ ] Do you see `exercises` table?
   - [ ] If NO: Run the SQL schema from `supabase/workout_schema.sql`

3. **Check Logs for Detailed Error**
   - [ ] In your terminal where `npm run dev` runs, look for lines starting with:
     - `[GET /api/programs]`
     - `[POST /api/programs]`
     - `[Supabase]`
   - [ ] Copy-paste the full error message
   - [ ] This will tell you exactly what's wrong

4. **Verify Service Role Key**
   - [ ] Go to Supabase Dashboard → **Settings → API**
   - [ ] Copy the **Service Role Key** (the longer one, not the public key)
   - [ ] Paste it in `.env.local` as `SUPABASE_SERVICE_ROLE_KEY=<key>`
   - [ ] Restart dev server

5. **Check Database URL**
   - [ ] Supabase Dashboard → **Settings → API**
   - [ ] Your URL should look like: `https://abc123def456.supabase.co`
   - [ ] In `.env.local`, is it exactly the same?
   - [ ] Don't add `/` or anything at the end