# ProductLens

A public website where anyone can upload photos of **beans, banana, plantain and pawpaw** for an open computer-vision dataset, plus private pages for your team to upload lab-verified samples and review everything.

**Where things live**
- **Photos:** Cloudinary (free plan: 25 credits a month; 1 credit = 1 GB storage, 1 GB bandwidth or 1,000 transformations).
- **Labels, team and sign-in:** Supabase (free plan).
- **Website:** Vercel (free plan).

| Page | Who uses it | What it does |
| --- | --- | --- |
| `index.html` | Anyone with the link | Snap 1–4 photos, tap produce, ripeness, problems, where it came from, what the seller said. No login. |
| `trusted.html` | You and lab partners (email sign-in) | Full form: sample tag, grade, known treatment, hours since start, lab result. |
| `review.html` | Admins only | See photos, approve or reject, set the final label, delete, export CSV. |
| `api/delete-sample.js` | Runs on Vercel | Deletes a sample's photos and row; checks you're an admin first. |
| `scripts/download_dataset.py` | You, on your computer | Downloads approved photos and a labels CSV for training. |

---

## Setup

### 1. Supabase (database and sign-in)
1. Create a project at https://supabase.com.
2. **SQL Editor > New query**: paste all of `supabase/setup.sql`, then **Run**.
   - If it stops with an error about `photos_cloudinary`, you have old test rows. Run `delete from public.samples;`, then run the file again.
3. **Project Settings > API**: copy the **API URL** and the **anon** key (on the **Legacy API Keys** tab if you see "Publishable" keys).

### 2. Cloudinary (photos)
1. Sign up at https://cloudinary.com (free plan).
2. On the dashboard home, copy your **Cloud name**.
3. Create the upload preset: **Settings** (gear icon) > **Upload** > **Upload presets** > **Add upload preset**.
   - **Preset name:** `productlens_unsigned`
   - **Signing mode:** **Unsigned**
   - **Asset folder** (or **Folder**): `productlens`
   - **Use filename / Unique filename:** leave the defaults so every photo gets a new random name. **Overwrite:** off.
   - **Upload control / Upload manipulations** (names vary in the Cloudinary UI):
     - **Allowed formats:** `jpg,png,webp`
     - **Incoming transformation:** `c_limit,w_1600,h_1600,q_auto:good` (shrinks large photos on arrival to save space)
   - **Save.**
4. Get the API key and secret for deleting: **Settings > API Keys**. Copy the **API Key** and **API Secret**. These go into Vercel only (step 4), never into `config.js` or GitHub.

### 3. Fill in `config.js`
```js
SUPABASE_URL: "https://abcd1234.supabase.co",
SUPABASE_ANON_KEY: "eyJ...",
CLOUDINARY_CLOUD_NAME: "your-cloud-name",
CLOUDINARY_UPLOAD_PRESET: "productlens_unsigned",
```

### 4. Deploy on Vercel
1. Push the folder to GitHub (VS Code: Source Control > Publish to GitHub).
2. On https://vercel.com: **Add New > Project**, import the repo. **Framework Preset:** Other. No build command.
3. Before or after the first deploy, open **Project > Settings > Environment Variables** and add these five (for Production, Preview and Development):

   | Name | Value |
   | --- | --- |
   | `SUPABASE_URL` | same as in config.js |
   | `SUPABASE_ANON_KEY` | same as in config.js |
   | `CLOUDINARY_CLOUD_NAME` | your cloud name |
   | `CLOUDINARY_API_KEY` | from Cloudinary Settings > API Keys |
   | `CLOUDINARY_API_SECRET` | from Cloudinary Settings > API Keys |

4. **Redeploy** (Deployments > ... > Redeploy) so the function picks up the variables.

### 5. Supabase sign-in links
**Authentication > URL Configuration**:
- **Site URL:** `https://YOUR-SITE.vercel.app`
- **Redirect URLs:** `https://YOUR-SITE.vercel.app/*` and `http://127.0.0.1:5500/*` (for Live Server)

### 6. Make yourself admin
1. Open `https://YOUR-SITE.vercel.app/trusted.html`, sign in with the email link.
2. In Supabase **SQL Editor**, run:
   ```sql
   insert into public.team (user_id, role, email)
   select id, 'admin', email from auth.users where email = 'you@example.com'
   on conflict (user_id) do update set role = excluded.role;
   ```
3. Reload `trusted.html`; you'll see the **Review** link. For a lab partner, use `'trusted'` instead of `'admin'`.

### 7. Test
1. Upload one sample from your phone on the public page.
2. Check it appears in Cloudinary **Media Library** (folder `productlens`) and in Supabase **Table Editor > samples**.
3. On `review.html`, approve it, export CSV, then try deleting a rejected test sample.

---

## Local testing (VS Code Live Server)
Uploads, sign-in and review all work on Live Server. **Delete** only works on the deployed Vercel site, because it needs the server function. (To run functions locally, install the Vercel CLI and run `vercel dev`.)

## Downloading the dataset for training
```bash
pip install supabase
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_KEY=service-role-key CLOUDINARY_CLOUD_NAME=your-cloud python scripts/download_dataset.py
```
Creates `dataset/images/<crop>/...` and `dataset/samples.csv` with **approved** samples only (`STATUS=all` for everything). It skips photos you already have. Each download uses Cloudinary bandwidth credits, so don't re-download everything often.

---

## Limits and costs to watch
- **Cloudinary credits** are shared each month between storage, bandwidth and transformations. Storage keeps counting every month, so 20 GB stored leaves about 5 credits for viewing and downloading. Check **Dashboard > Usage** weekly during campaigns.
- **Photo size:** phones shrink photos to 1600 px before upload (about 200–400 KB each), and the preset's incoming transformation enforces it. 20 GB holds roughly 50,000+ photos.
- **Supabase free projects pause** after a week without activity. Open the dashboard and click Restore if the site stops working.
- **Sign-in emails** from Supabase are limited to a few per hour on the free plan.

## Security notes
- `config.js` values are public by design. The **Cloudinary API secret** and **Supabase service_role key** must never be in the website or GitHub.
- The upload preset lets anyone with the site upload images to your Cloudinary folder. Review regularly and delete junk.
- Photo links are public but random and unguessable. Delete anything with a face or personal details.
- **Optional hardening:** in Cloudinary **Settings > Security**, turn on **Strict transformations** and allow `c_fill,w_400,h_400,q_auto,f_auto` (the review thumbnail). This stops strangers from burning your credits with custom image sizes.
- The database only accepts photo records that are Cloudinary IDs, so nobody can save links to outside images.

## Privacy (Nigeria Data Protection Act 2023)
- Consent is an unticked box people must tick for every upload.
- Only a town and an optional nickname are collected.
- Remove any photo showing a face before publishing the dataset. Credit contributors by nickname and choose an open licence (for example CC BY 4.0).

## Files
```
index.html                    public upload page
trusted.html                  team upload (sign-in)
review.html                   admin review + CSV export
config.js                     Supabase + Cloudinary public settings
api/delete-sample.js          Vercel function: admin-only delete
assets/style.css              design
assets/common.js              shared code (resize, Cloudinary upload, labels)
assets/auth.js                email sign-in for team pages
supabase/setup.sql            tables and security rules
scripts/download_dataset.py   download approved data for training
.gitignore                    keeps the dataset and secrets out of GitHub
```
