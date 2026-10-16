// Chapter 02 — minimal interactions: hamburger nav + scroll reveal
(function () {
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
    var msg = document.getElementById("joinMsg");
    var submit = document.getElementById("joinSubmit");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = document.getElementById("joinName").value.trim();
      var branch = document.getElementById("joinBranch").value;
      var year = document.getElementById("joinYear").value;
      msg.className = "join-msg";
      if (name.length < 2) { msg.textContent = "Please enter your full name."; msg.classList.add("err"); return; }
      if (!branch) { msg.textContent = "Please pick your branch."; msg.classList.add("err"); return; }
      if (!year) { msg.textContent = "Please pick your year."; msg.classList.add("err"); return; }
      submit.disabled = true;
      msg.textContent = "Joining…";
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
              msg.textContent = "You're already on the list — see you at the next session.";
            } else {
              msg.textContent = "You're in! Welcome to Chapter 02.";
              form.reset();
            }
            msg.classList.add("ok");
          } else {
            msg.textContent = d.error || "Something went wrong. Please try again.";
            msg.classList.add("err");
          }
        })
        .catch(function () {
          msg.textContent = "Network hiccup — please try again.";
          msg.classList.add("err");
        })
        .finally(function () { submit.disabled = false; });
    });
  }

  /* ---- gallery from /api/media ---- */
  var slots = document.querySelector(".gallery-slots");
  if (slots) {
    fetch("/api/media", { headers: { "Accept": "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok || !d.items || !d.items.length) return;
        slots.innerHTML = "";
        d.items.slice(0, 6).forEach(function (it) {
          var fig = document.createElement("figure");
          fig.className = "gallery-item rv in";
          var media = it.kind === "video"
            ? '<video src="' + it.url + '" muted loop playsinline preload="metadata"></video>'
            : '<img src="' + it.url + '" alt="' + (it.caption || "Chapter 02 gallery").replace(/"/g, "&quot;") + '" loading="lazy">';
          fig.innerHTML = media + (it.caption ? '<figcaption class="mono"></figcaption>' : "");
          if (it.caption) fig.querySelector("figcaption").textContent = it.caption;
          slots.appendChild(fig);
        });
      })
      .catch(function () { /* keep placeholders */ });
  }
})();
