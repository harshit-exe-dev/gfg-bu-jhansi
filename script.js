// Chapter 02 — minimal interactions: hamburger nav + scroll reveal
(function () {
  // Toast notifications
  var toastBox = document.getElementById("toasts");
  function toast(text, isErr) {
    if (!toastBox) return;
    var el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = text;
    toastBox.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 300);
    }, 3600);
    while (toastBox.children.length > 3) toastBox.firstChild.remove();
  }

  // First-party conversion tracking (no cookies, no third parties)
  function track(event) {
    try {
      var payload = JSON.stringify({ event: event });
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/events", new Blob([payload], { type: "application/json" }));
      } else {
        fetch("/api/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      }
    } catch (e) { /* analytics must never break the page */ }
  }
  track("page_view");

  // Always land at the top on fresh loads (no anchor). Keeps in-page
  // #section links working when the user taps them in the nav.
  if (!window.location.hash && "scrollRestoration" in window.history) {
    window.history.scrollRestoration = "manual";
  }
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }

  var hamburger = document.getElementById("hamburger");
  var navLinks = document.getElementById("navLinks");

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", function () {
      var open = navLinks.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", open ? "true" : "false");
      hamburger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        navLinks.classList.remove("open");
        hamburger.setAttribute("aria-expanded", "false");
        hamburger.setAttribute("aria-label", "Open menu");
      }
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".rv");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("in"); });
    return;
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });

  revealEls.forEach(function (el) { io.observe(el); });

  /* ---- live member count (hidden until 10+ members) ---- */
  var countNum = document.getElementById("joinCountNum");
  var countWrap = document.getElementById("joinCount");
  var countLabel = document.getElementById("joinCountLabel");
  var COUNT_SHOW_FROM = 10;
  function refreshCount() {
    if (!countNum || !countWrap) return;
    fetch("/api/join", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.ok && typeof d.count === "number" && d.count >= COUNT_SHOW_FROM) {
          countNum.textContent = d.count;
          if (countLabel) countLabel.textContent = d.count === 1 ? "member" : "members";
          countWrap.style.display = "";
        } else {
          countWrap.style.display = "none";
        }
      })
      .catch(function () { countWrap.style.display = "none"; });
  }
  refreshCount();

  /* ---- join form ---- */
  var form = document.getElementById("joinForm");
  if (form) {
    var submit = document.getElementById("joinSubmit");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("joinName").value.trim();
      var branch = document.getElementById("joinBranch").value;
      var year = document.getElementById("joinYear").value;
      if (name.length < 2) { toast("Please enter your full name.", true); return; }
      if (!branch) { toast("Please pick your branch.", true); return; }
      if (!year) { toast("Please pick your year.", true); return; }
      submit.disabled = true;
      var originalLabel = submit.textContent;
      submit.textContent = "Joining…";
      fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ name: name, branch: branch, year: year })
      })
        .then(function (r) { return r.json().then(function (d) { return { status: r.status, body: d }; }); })
        .then(function (res) {
          var d = res.body || {};
          if (d.ok) {
            refreshCount();
            if (d.duplicate) {
              toast("You're already on the list — see you at the next session.");
            } else {
              toast("You're in! Welcome to Chapter 02.");
              track("join_success");
              form.reset();
            }
          } else {
            toast(d.error || "Something went wrong. Please try again.", true);
          }
        })
        .catch(function () {
          toast("Network hiccup — please try again.", true);
        })
        .finally(function () { submit.disabled = false; submit.textContent = originalLabel; });
    });
  }

  /* ---- gallery from /api/media ---- */
  var slots = document.querySelector(".gallery-slots");
  if (slots) {
    var showEmpty = function () {
      slots.innerHTML = '<div class="slot-empty rv in"><span class="mono">Event photos dropping soon — check back after the next session</span></div>';
    };
    fetch("/api/media", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.items || !d.items.length) { showEmpty(); return; };
        slots.innerHTML = "";
        d.items.slice(0, 6).forEach(function (it) {
          var fig = document.createElement("figure");
          fig.className = "gallery-item rv in";
          // Serve modern formats + smart compression for Cloudinary uploads
          var src = it.url.indexOf("res.cloudinary.com") !== -1
            ? it.url.replace("/upload/", "/upload/f_auto,q_auto/")
            : it.url;
          var media = it.kind === "video"
            ? '<video src="' + src + '" muted loop playsinline preload="metadata"></video>'
            : '<img src="' + src + '" alt="' + (it.caption || "Chapter 02 gallery").replace(/"/g, "&quot;") + '" loading="lazy">';
          fig.innerHTML = media + (it.caption ? '<figcaption class="mono"></figcaption>' : "");
          if (it.caption) fig.querySelector("figcaption").textContent = it.caption;
          slots.appendChild(fig);
        });
      })
      .catch(function () { showEmpty(); });
  }
})();
