# ProductLens

A website for building an open photo dataset of Nigerian produce (**beans, banana, plantain and pawpaw**) for computer vision research on quality grading and chemical ripening.


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

## Photo guidelines 
- Plain white or light background: a plate, tray, paper or white cloth.
- Daylight or shade. No flash or yellow bulbs.
- **Beans:** one layer on a tray, photographed straight down.
- **Fruit:** side view, top view, and a close-up of the stalk or stem.
- One sample per upload. No faces in the photos.


