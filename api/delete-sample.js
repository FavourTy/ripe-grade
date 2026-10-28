// Vercel serverless function: POST /api/delete-sample  { "id": "<sample uuid>" }
// Deletes a sample's photos from Cloudinary and its row from Supabase.
// Only works for a signed-in admin: the caller's Supabase token is checked on every request.
//
// Needs these Environment Variables in Vercel (Project > Settings > Environment Variables):
//   SUPABASE_URL, SUPABASE_ANON_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC_ID = /^[A-Za-z0-9_/-]{1,200}$/;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST." });
  }

  const env = process.env;
  const missing = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .filter((k) => !env[k]);
  if (missing.length) {
    return res.status(500).json({ error: "Server not set up: add " + missing.join(", ") + " in Vercel Environment Variables, then redeploy." });
  }

  const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const id = body && body.id;
  if (!token) return res.status(401).json({ error: "Please sign in again." });
  if (!id || !UUID.test(id)) return res.status(400).json({ error: "Invalid sample id." });

  const base = env.SUPABASE_URL.replace(/\/+$/, "");
  const sbHeaders = {
    apikey: env.SUPABASE_ANON_KEY,
    Authorization: "Bearer " + token,
    "Content-Type": "application/json",
  };

  try {
    // 1. Is the caller an admin? (my_role() reads the team table for the token's user)
    const roleRes = await fetch(base + "/rest/v1/rpc/my_role", { method: "POST", headers: sbHeaders, body: "{}" });
    if (roleRes.status === 401) return res.status(401).json({ error: "Your sign-in expired. Sign in again." });
    const role = roleRes.ok ? await roleRes.json() : null;
    if (role !== "admin") return res.status(403).json({ error: "Only admins can delete samples." });

    // 2. Read the sample's photos from the database (never trust a list sent by the browser).
    const rowRes = await fetch(base + "/rest/v1/samples?id=eq." + id + "&select=id,photos", { headers: sbHeaders });
    if (!rowRes.ok) return res.status(502).json({ error: "Could not read the sample (" + rowRes.status + ")." });
    const rows = await rowRes.json();
    if (!rows.length) return res.status(404).json({ error: "Sample not found. It may already be deleted." });
    const ids = (rows[0].photos || []).map((p) => p && p.public_id).filter((p) => typeof p === "string" && PUBLIC_ID.test(p));

    // 3. Delete the photos from Cloudinary (Admin API, up to 100 ids per call).
    if (ids.length) {
      const qs = ids.map((p) => "public_ids[]=" + encodeURIComponent(p)).join("&") + "&invalidate=true";
      const auth = Buffer.from(env.CLOUDINARY_API_KEY + ":" + env.CLOUDINARY_API_SECRET).toString("base64");
      const cdRes = await fetch(
        "https://api.cloudinary.com/v1_1/" + encodeURIComponent(env.CLOUDINARY_CLOUD_NAME) + "/resources/image/upload?" + qs,
        { method: "DELETE", headers: { Authorization: "Basic " + auth } }
      );
      if (!cdRes.ok) {
        const j = await cdRes.json().catch(() => ({}));
        return res.status(502).json({ error: "Cloudinary refused the delete: " + ((j.error && j.error.message) || cdRes.status) + ". Check the Cloudinary keys in Vercel." });
      }
    }

    // 4. Delete the database row (the admin's own token; database rules allow admins to delete).
    const delRes = await fetch(base + "/rest/v1/samples?id=eq." + id, {
      method: "DELETE",
      headers: Object.assign({}, sbHeaders, { Prefer: "return=representation" }),
    });
    if (!delRes.ok) return res.status(502).json({ error: "Photos deleted, but the database row could not be deleted (" + delRes.status + ")." });

    return res.status(200).json({ ok: true, photosDeleted: ids.length });
  } catch (err) {
    return res.status(500).json({ error: "Delete failed: " + (err && err.message ? err.message : "unknown error") });
  }
};
