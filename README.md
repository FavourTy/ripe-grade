# Ripe & Grade

A public website where anyone can upload photos of **beans, banana, plantain and pawpaw** for an open computer-vision dataset, plus private pages for your team to upload lab-verified samples and review everything.

| Page | Who uses it | What it does |
| --- | --- | --- |
| `index.html` | Anyone with the link (students, friends, the public) | Snap 1–4 photos, tap produce, ripeness, problems, where it came from, what the seller said. No login. |
| `trusted.html` | You and lab partners (email sign-in) | Full form: sample tag, grade, known treatment (carbide / natural / preservative), hours since start, lab result. |
| `review.html` | Admins only | See photos, approve or reject, set the final label, delete junk, export CSV. |
| `scripts/download_dataset.py` | You, on your computer | Downloads approved photos and a labels CSV, ready for training. |

**Why two kinds of upload:** the public can't know whether fruit was ripened with carbide, so the public form only asks what people can see, plus what the seller *said* (a weak hint, never treated as truth). Known chemical labels come only from controlled batches on `trusted.html`.

---

## Setup (about 30 minutes, all free)

### 1. Create the database (Supabase)
1. Go to https://supabase.com, sign up, and create a **New project**. Pick a region close to Nigeria if offered (for example Europe). Save the database password somewhere safe.
2. When it's ready, open **SQL Editor > New query**, paste everything from `supabase/setup.sql`, and press **Run**. You should see "Success".
3. Open **Project Settings > API** and copy:
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key
4. Paste both into `config.js`.

> The anon key is safe to publish; the database rules decide what it can do. The **service_role** key is not: never put it in the website or on GitHub.

### 2. Set up email sign-in for the team pages
1. In Supabase open **Authentication > URL Configuration**.
2. Set **Site URL** to your website address (you'll get it in step 3, for example `https://ripe-grade.vercel.app`). Come back and fill this in after deploying.
3. Under **Redirect URLs** add `https://YOUR-SITE.vercel.app/*` (and `http://localhost:3000/*` if you test locally).

### 3. Put the website online (Vercel)
Option A, no Git:
1. Install Node.js, then run `npm i -g vercel`.
2. In this folder run `vercel` and follow the prompts. Then `vercel --prod`.

Option B, with GitHub:
1. Push this folder to a new GitHub repository.
2. On https://vercel.com click **Add New > Project**, import the repo, keep the defaults (no build command needed), and **Deploy**.

### 4. Make yourself admin
1. Open `https://YOUR-SITE.vercel.app/trusted.html`, enter your email and click the sign-in link you receive.
2. It will say your account isn't on the team yet. That's expected.
3. Back in Supabase **SQL Editor**, run (with your email):
   ```sql
   insert into public.team (user_id, role, email)
   select id, 'admin', email from auth.users where email = 'you@example.com'
   on conflict (user_id) do update set role = excluded.role;
   ```
4. Reload `trusted.html`. You'll now see the full form and a **Review** link.

Add a lab partner the same way, with `'trusted'` instead of `'admin'` (they can upload full samples but not review).

### 5. Test it
1. Upload one sample on the public page from your phone.
2. Open `review.html`, approve it, and press **Export CSV**.

---

## Sharing with students
- Share the main link only: `https://YOUR-SITE.vercel.app`.
- Tell them: plain light background, daylight, no faces, one sample per upload.
- The **Top helpers** list rewards people who add a nickname. Consider certificates for top contributors or a class competition.

## Downloading the dataset for training
```bash
pip install supabase
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=your-service-role-key python scripts/download_dataset.py
```
This creates `dataset/images/<crop>/...` and `dataset/samples.csv` (one row per photo) with only **approved** samples. Run it with `STATUS=all` to include everything.

---

## Limits and costs to watch
- **Storage:** photos are shrunk on the phone to about 200–400 KB, so 1 GB holds roughly 3,000–5,000 photos. Check Supabase's current free-tier limits; upgrade or archive old photos when you approach them.
- **Free Supabase projects pause** after a period with no activity. Visit the dashboard occasionally, or upgrade when collection is busy.
- **Sign-in emails:** Supabase's built-in email sender only sends a few emails per hour. That's fine for a small team. For more, connect your own email provider under Authentication > SMTP.
- **Spam:** anyone can upload, so expect some junk. Each photo is capped at 4 MB and must be an image, photos stay private until you approve them, and you can delete rejected samples. If abuse becomes a problem, add Cloudflare Turnstile or require Supabase anonymous sign-in with CAPTCHA.

## Privacy (Nigeria Data Protection Act 2023)
- Consent is an unticked box people must tick for every upload.
- Only a town and an optional nickname are collected; no names, phone numbers or exact locations.
- Photos are private in storage; only admins can view them. Remove any photo that shows a face before publishing the dataset.
- When you publish, credit contributors by nickname and choose an open licence (for example CC BY 4.0).

## Files
```
index.html            public upload page
trusted.html          team upload (sign-in)
review.html           admin review + CSV export
config.js             your Supabase URL and anon key
assets/style.css      design
assets/common.js      shared code (photo resize, upload, labels)
assets/auth.js        email sign-in for team pages
supabase/setup.sql    tables, security rules, storage bucket
scripts/download_dataset.py   download approved data for training
```

## Editing the labels
Produce types, defects, ripeness stages and options live at the top of `assets/common.js`. If you add a new produce type, also add it to the `crop` check in `supabase/setup.sql` and run that part again.
