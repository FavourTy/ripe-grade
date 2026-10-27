// Ripe & Grade: shared sign-in for team pages (trusted.html, review.html).
// Uses Supabase email magic links: no passwords to manage.
(function () {
  "use strict";
  var RG = window.RG, $ = RG.$, el = RG.el;

  // Renders a sign-in box into `box`; resolves {user, role} once signed in.
  RG.requireTeam = function (box, onReady) {
    if (!RG.configured || !RG.sb) { RG.notConfiguredNote(box); return; }

    function signedIn(session) {
      return RG.sb.rpc("my_role").then(function (r) {
        var role = r.error ? null : r.data;
        box.innerHTML = "";
        var bar = el("div", { class: "notice", style: "display:flex;flex-wrap:wrap;gap:10px;align-items:center" }, [
          el("span", { style: "margin-right:auto", text: "Signed in as " + session.user.email + (role ? " (" + role + ")" : "") }),
          el("button", { type: "button", class: "small", text: "Sign out", onclick: function () { RG.sb.auth.signOut().then(function () { location.reload(); }); } })
        ]);
        box.appendChild(bar);
        if (!role) {
          box.appendChild(el("div", { class: "notice warn", style: "margin-top:10px", text: "Your account isn't on the team yet. Send the project owner the email address above so they can add you." }));
          return;
        }
        onReady({ user: session.user, role: role });
      });
    }

    function showLogin(msg) {
      box.innerHTML = "";
      var email = el("input", { type: "email", id: "loginEmail", placeholder: "you@example.com", autocomplete: "email", required: "required" });
      var status = el("div", { class: "status-line", role: "status", "aria-live": "polite", text: msg || "" });
      var form = el("form", { class: "card-step", novalidate: "novalidate" }, [
        el("h2", { style: "font-size:1.25rem", text: "Team sign-in" }),
        el("p", { class: "hint", text: "Enter your email. We'll send a sign-in link; open it on this device." }),
        el("div", { class: "field" }, [el("label", { for: "loginEmail", text: "Email" }), email]),
        el("button", { type: "submit", class: "primary", text: "Send sign-in link" }),
        status
      ]);
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var v = email.value.trim();
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { status.textContent = "Enter a valid email address."; return; }
        status.textContent = "Sending…";
        RG.sb.auth.signInWithOtp({ email: v, options: { emailRedirectTo: location.origin + location.pathname } }).then(function (r) {
          status.textContent = r.error ? RG.errorText(r.error) : "Check your inbox (and spam) for the sign-in link.";
        });
      });
      box.appendChild(form);
    }

    var started = false;
    RG.sb.auth.getSession().then(function (r) {
      var s = r.data && r.data.session;
      if (s) { started = true; signedIn(s); } else showLogin();
    });
    RG.sb.auth.onAuthStateChange(function (event, session) {
      if (event === "SIGNED_IN" && session && !started) { started = true; signedIn(session); }
    });
  };
})();
