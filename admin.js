
(function () {
  "use strict";
  // Filled in at deploy time from Harshit's Cloudinary account:
  var CLOUDINARY_CLOUD = "mwfc5ybf";
  var CLOUDINARY_PRESET = "gfg-gallery";

  var loginCard = document.getElementById("loginCard");
  var dash = document.getElementById("dash");
  var tokenKey = "gfg_admin_token";

  function authHeaders(extra) {
    var h = extra || {};
    h["Authorization"] = "Bearer " + sessionStorage.getItem(tokenKey);
    return h;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]; }); }

  function showDash() { loginCard.classList.add("hidden"); dash.classList.remove("hidden"); loadMembers(); loadMedia(); loadStats(); }

  /* login */
  document.getElementById("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var msg = document.getElementById("loginMsg");
    msg.className = "admin-msg"; msg.textContent = "Signing in…";
    fetch("/api/admin-login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: document.getElementById("adminPw").value })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (d && d.ok) { sessionStorage.setItem(tokenKey, d.token); showDash(); }
      else { msg.textContent = (d && d.error) || "Sign in failed."; msg.classList.add("err"); }
    }).catch(function () { msg.textContent = "Network hiccup — try again."; msg.classList.add("err"); });
  });

  document.getElementById("logoutBtn").addEventListener("click", function () {
    sessionStorage.removeItem(tokenKey);
    dash.classList.add("hidden"); loginCard.classList.remove("hidden");
  });

  /* site stats (first-party conversion tracking) */
  function loadStats() {
    fetch("/api/events", { headers: authHeaders() })
      .then(function (r) { if (r.status === 401) throw new Error("auth"); return r.json(); })
      .then(function (d) {
        if (d && d.ok && d.counts) {
          document.getElementById("statViews").textContent = d.counts.page_view;
          document.getElementById("statJoins").textContent = d.counts.join_success;
        }
      })
      .catch(function () {});
  }

  /* members */
  function loadMembers() {
    fetch("/api/admin-members", { headers: authHeaders() })
      .then(function (r) { if (r.status === 401) throw new Error("auth"); return r.json(); })
      .then(function (d) {
        document.getElementById("memberCount").textContent = d.count;
        var tb = document.getElementById("memberRows");
        if (!d.members.length) { tb.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">No members yet.</td></tr>'; return; }
        tb.innerHTML = d.members.map(function (m) {
          var dt = m.joinedAt ? new Date(m.joinedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";
          return "<tr><td>" + esc(m.name) + "</td><td>" + esc(m.branch) + "</td><td>" + esc(m.year) + "</td><td>" + esc(dt) +
            '</td><td><button class="linklike" data-del="' + esc(m.id) + '" style="color:#e5686e">remove</button></td></tr>';
        }).join("");
        tb.querySelectorAll("[data-del]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            if (!confirm("Remove this member?")) return;
            fetch("/api/admin-members?id=" + encodeURIComponent(btn.getAttribute("data-del")),
              { method: "DELETE", headers: authHeaders() })
              .then(function () { loadMembers(); }).catch(function () {});
          });
        });
      })
      .catch(function (e) {
        if (e.message === "auth") { sessionStorage.removeItem(tokenKey); dash.classList.add("hidden"); loginCard.classList.remove("hidden"); }
      });
  }

  /* media list (public GET is fine — URLs aren't secret) */
  function loadMedia() {
    fetch("/api/media").then(function (r) { return r.json(); }).then(function (d) {
      var g = document.getElementById("mediaGrid"); g.innerHTML = "";
      (d.items || []).forEach(function (it) {
        var cell = document.createElement("div"); cell.className = "media-cell";
        var inner = it.kind === "video"
          ? '<video src="' + esc(it.url) + '" muted playsinline preload="metadata"></video>'
          : '<img src="' + esc(it.url) + '" alt="" loading="lazy">';
        cell.innerHTML = inner + '<button data-id="' + esc(it.id) + '">Delete</button>';
        cell.querySelector("button").addEventListener("click", function () { delMedia(it.id); });
        g.appendChild(cell);
      });
    }).catch(function () {});
  };

  function delMedia(id) {
    if (!confirm("Delete this from the gallery?")) return;
    fetch("/api/media?id=" + encodeURIComponent(id), { method: "DELETE", headers: authHeaders() })
      .then(function () { loadMedia(); }).catch(function () {});
  }

  /* upload: browser -> Cloudinary (unsigned preset) -> save URL via API */
  document.getElementById("upBtn").addEventListener("click", function () {
    var file = document.getElementById("upFile").files[0];
    var msg = document.getElementById("upMsg");
    var prog = document.getElementById("upProg");
    var bar = prog.querySelector("div");
    msg.className = "admin-msg"; msg.textContent = "";
    if (!file) { msg.textContent = "Pick a file first."; msg.classList.add("err"); return; }
    if (CLOUDINARY_CLOUD.indexOf("__") === 0) { msg.textContent = "Cloudinary isn't connected yet — ask Kaly."; msg.classList.add("err"); return; }
    if (file.size > 100 * 1024 * 1024) { msg.textContent = "File is over 100 MB."; msg.classList.add("err"); return; }

    var fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", CLOUDINARY_PRESET);
    fd.append("folder", "gfg-gallery");

    prog.classList.remove("hidden"); bar.style.width = "5%";
    msg.textContent = "Uploading…";
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "https://api.cloudinary.com/v1_1/" + CLOUDINARY_CLOUD + "/auto/upload");
    xhr.upload.onprogress = function (e) { if (e.lengthComputable) bar.style.width = Math.round(e.loaded / e.total * 90) + "%"; };
    xhr.onload = function () {
      try {
        var r = JSON.parse(xhr.responseText);
        if (!r.secure_url) throw new Error("bad");
        bar.style.width = "95%";
        var kind = (file.type || "").indexOf("video") === 0 ? "video" : "image";
        fetch("/api/media", {
          method: "POST",
          headers: Object.assign({ "Content-Type": "application/json" }, authHeaders()),
          body: JSON.stringify({ url: r.secure_url, kind: kind, caption: document.getElementById("upCaption").value.trim() })
        }).then(function (rr) { return rr.json(); }).then(function (d) {
          if (d && d.ok) {
            bar.style.width = "100%";
            msg.textContent = "Added to the gallery."; msg.classList.add("ok");
            document.getElementById("upFile").value = ""; document.getElementById("upCaption").value = "";
            setTimeout(function () { prog.classList.add("hidden"); bar.style.width = "0"; }, 800);
            loadMedia();
          } else { throw new Error("save"); }
        }).catch(function () { msg.textContent = "Uploaded, but saving failed — try again."; msg.classList.add("err"); });
      } catch (e2) { msg.textContent = "Upload failed — try again."; msg.classList.add("err"); }
    };
    xhr.onerror = function () { msg.textContent = "Upload failed — check your connection."; msg.classList.add("err"); };
    xhr.send(fd);
  });

  if (sessionStorage.getItem(tokenKey)) showDash();
})();
