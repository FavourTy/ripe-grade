# ProductLens

A website for building an open photo dataset of Nigerian produce (**beans, banana, plantain and pawpaw**) for computer vision research on quality grading and chemical ripening.

- **Photos** are stored in Cloudinary (folder `productlens`).
- **Labels, team accounts and sign-in** are in Supabase.
- **The website** is hosted on Vercel and updates automatically when you push to GitHub.

---

## The pages

| Page | Address | Who |
| --- | --- | --- |
| Public upload | `/` | Anyone with the link. No login. |
| Team upload | `/trusted.html` | Admins and trusted lab partners (email sign-in) |
| Review | `/review.html` | Admins only |

### Public upload (for students and helpers)
1. Take or choose 1–4 photos of **one** sample.
2. Tap what it is, how ripe it looks, any problems, and where it came from.
3. Say what the seller claimed about ripening or chemicals (or "didn't say").
4. Optionally add a town and a nickname (nicknames appear on the Top helpers list).
5. Tick the consent box and upload.

The public form only asks what people can **see**. What the seller said is stored as a hint, never as the truth.

### Team upload (for you and lab partners)
Use this for samples where the true label is known: controlled ripening batches, lab-tested beans and expert-graded trays.
- **Sorting & grading:** grade, ripeness, defects, % damaged seeds.
- **Chemical:** known treatment (natural, carbide, preservative or unknown), hours since treatment, lab result.
- Give every sample a **sample tag** (tap **New**), write it on paper in the first photo, and reuse the same tag for later check-ins of the same batch.

### Review (admins)
- Filter by status (waiting, approved, rejected), source (crowd or trusted) and produce.
- Click a photo to open it full size.
- Set the **final label**, add a note, then **Approve** or **Reject**. Only approved samples go into the training dataset.
- **Delete** appears on rejected samples (tap twice). It removes the photos from Cloudinary and the row from Supabase. Delete only works on the live site.
- **Export CSV** downloads every sample's labels and photo links.

---

## Photo guidelines (share these with helpers)
- Plain white or light background: a plate, tray, paper or white cloth.
- Daylight or shade. No flash or yellow bulbs.
- **Beans:** one layer on a tray, photographed straight down.
- **Fruit:** side view, top view, and a close-up of the stalk or stem.
- One sample per upload. No faces in the photos.

---

## Managing the team

People must sign in once on `/trusted.html` before you can add them. Then run this in Supabase **SQL Editor**:

```sql
-- role: 'admin' (can review) or 'trusted' (can upload full samples, cannot review)
insert into public.team (user_id, role, email)
select id, 'trusted', email from auth.users where email = 'their-email@example.com'
on conflict (user_id) do update set role = excluded.role;
```

To remove someone: `delete from public.team where email = 'their-email@example.com';`

---

## Downloading the dataset for training

```bash
pip install supabase
SUPABASE_URL=https://jesgenigfvtkznjpkhvo.supabase.co \
SUPABASE_SERVICE_KEY=your-service-role-key \
CLOUDINARY_CLOUD_NAME=ik4jsjvl \
python scripts/download_dataset.py
```

- Creates `dataset/images/<crop>/` and `dataset/samples.csv` (one row per photo).
- Includes **approved** samples only. Add `STATUS=all` to get everything.
- Skips photos already downloaded. Downloads use Cloudinary credits, so don't re-download everything often.
- The service_role key is in Supabase > Project Settings > API Keys. Keep it on your laptop only.

---

## Making changes

- **Edit and test locally:** open the folder in VS Code and use **Live Server** on `index.html`. Uploads and review work; delete does not.
- **Publish:** commit and Sync in VS Code. Vercel redeploys in about a minute.
- **Change labels or options** (defects, ripeness stages, sources): edit the lists at the top of `assets/common.js`.
- **Add a new produce type:** add it in `assets/common.js` **and** to the `crop` check in `supabase/setup.sql`, then run that SQL again.

---

## Settings reference

| Where | Value |
| --- | --- |
| `config.js` | Supabase URL and anon key, Cloudinary cloud name, upload preset `productlens_unsigned` (all public by design) |
| Vercel > Settings > Environment Variables | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (secret) |
| Cloudinary > Settings > Upload Presets | `productlens_unsigned`: Unsigned, folder `productlens`, incoming transformation `c_limit,w_1600,h_1600,q_auto:good` |
| Supabase > Authentication > URL Configuration | Site URL and Redirect URLs set to the live address (plus `http://127.0.0.1:5500/*` for Live Server) |
| Supabase > SQL Editor | `supabase/setup.sql` (safe to run again) |

**Never** put the Cloudinary API Secret or the Supabase service_role key in `config.js` or GitHub.

---

## Keeping it running

- **Cloudinary credits:** 25 a month on the free plan, shared between storage, bandwidth and thumbnails. Check **Dashboard > Usage** weekly during campaigns.
- **Supabase pauses** free projects after a week without activity. If the site stops working, open the Supabase dashboard and click **Restore**.
- **Sign-in emails** are limited to a few per hour on Supabase's free plan. If an email doesn't arrive, wait and try again.
- **Review weekly** so junk and photos with faces don't pile up.

## Privacy
- Consent is required for every upload. Only a town and an optional nickname are collected.
- Delete any photo showing a face. When publishing the dataset, credit contributors by nickname and use an open licence (for example CC BY 4.0).

---

## Files

```
index.html                    public upload
trusted.html                  team upload
review.html                   admin review and export
config.js                     public settings
api/delete-sample.js          admin-only delete (runs on Vercel)
assets/                       styles and shared code
supabase/setup.sql            database tables and security rules
scripts/download_dataset.py   download approved data for training
```
