/* =========================================================
   Ezra & Yuusaka — Wedding Invitation
   Motion: GSAP + ScrollTrigger + Lenis (smooth, inertial scroll)
   ========================================================= */
(() => {
  "use strict";

  // ---------- Config (ubah di sini) ----------
  const CONFIG = {
    eventDate: new Date("2027-02-20T10:00:00+07:00"),
    calendarMonth: { year: 2027, month: 1, day: 20 }, // month 0-indexed (1 = Februari)
    calendar: {
      title: "Pernikahan Ezra & Yuusaka",
      start: "20270220T030000Z", // 10.00 WIB
      end: "20270220T140000Z",   // 21.00 WIB
      location: "Gereja Katedral Jakarta & Hotel Indonesia Kempinski, Jakarta",
      details: "Pemberkatan Nikah 10.00 WIB · Resepsi 18.30 WIB. Kehadiran Anda adalah kebahagiaan bagi kami.",
    },
    storageKey: "ey_wishes_v1",
    seedWishes: [
      { name: "Keluarga Besar Wibisono", att: "hadir", msg: "Selamat menempuh hidup baru, Ezra & Yuusaka! Kiranya kasih Tuhan senantiasa menyertai rumah tangga kalian.", ago: 1.2 },
      { name: "Dimas & Sarah", att: "hadir", msg: "Akhirnya! Dari teman kelas bahasa Jepang sampai pelaminan. Happy wedding, semoga langgeng sampai kakek-nenek 🤍", ago: 2.5 },
      { name: "Kenji Tanaka", att: "ragu", msg: "おめでとうございます! Semoga perjalanan kalian penuh tawa dan kebahagiaan.", ago: 3.1 },
      { name: "Anindya Putri", att: "tidak", msg: "Maaf belum bisa hadir karena sedang di luar kota. Doa terbaik dari jauh untuk kalian berdua!", ago: 4.6 },
      { name: "Tim Kantor Ezra", att: "hadir", msg: "Congratulations, bro! Siap meramaikan resepsi. Semoga menjadi keluarga yang hangat dan penuh berkat.", ago: 6 },
    ],
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const html = document.documentElement;
  const body = document.body;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);
  const MOTION = hasGSAP && !reduceMotion;
  if (!MOTION) html.classList.add("no-gsap");

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.scrollTo(0, 0);

  // ---------- Guest name from ?to= ----------
  const guest = (new URLSearchParams(location.search).get("to") || "").trim().slice(0, 60);
  if (guest) {
    $("#guestName").textContent = guest;
    $("#fName").value = guest;
  }

  // ---------- Text splitting helpers ----------
  $$(".split").forEach((el) => {
    el.setAttribute("aria-label", el.dataset.split);
    [...el.dataset.split].forEach((ch) => {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = ch;
      s.setAttribute("aria-hidden", "true");
      el.appendChild(s);
    });
  });
  function splitWords(el) {
    const words = [];
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const w = document.createElement("span");
            w.className = "w";
            w.textContent = part;
            words.push(w);
            frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    walk(el);
    return words;
  }
  // Wrap titles so they can rise from behind a mask
  $$("[data-mask]").forEach((el) => {
    el.innerHTML = `<span class="mask"><span class="mask__in">${el.innerHTML}</span></span>`;
  });

  // ---------- Smooth scroll (Lenis) ----------
  let lenis = null;
  if (MOTION && window.Lenis) {
    lenis = new window.Lenis({
      lerp: 0.075,          // lower = more glide / "delay"
      wheelMultiplier: 0.9,
      smoothWheel: true,
      syncTouch: false,     // keep native momentum on phones (feels best on iOS/Android)
    });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }
  if (MOTION) {
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }
  const scrollToEl = (el) => {
    if (lenis) lenis.scrollTo(el, { duration: 1.8, easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
    else el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  };
  const lockScroll = (on) => {
    if (lenis) on ? lenis.stop() : lenis.start();
    html.style.overflow = on ? "hidden" : "";
  };

  // ---------- Music ----------
  const audio = $("#bgm");
  const musicBtn = $("#musicBtn");
  let wantsMusic = false;

  function fadeVolume(to, ms = 2000) {
    const from = audio.volume;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      try { audio.volume = from + (to - from) * k; } catch (_) {}
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function playMusic() {
    wantsMusic = true;
    try { audio.volume = 0; } catch (_) {}
    const p = audio.play();
    if (p && p.then) {
      p.then(() => fadeVolume(0.7)).catch(() => {
        window.addEventListener("pointerdown", () => { if (wantsMusic) playMusic(); }, { once: true });
      });
    }
  }
  function pauseMusic() { wantsMusic = false; audio.pause(); }
  musicBtn.addEventListener("click", () => (audio.paused ? playMusic() : pauseMusic()));

  // Vinyl: spins up / winds down with inertia instead of starting & stopping abruptly
  const vinyl = $("#vinyl");
  const ringFg = $("#discProgress");
  const notesWrap = $("#discNotes");
  const RPM_DEG = 150; // degrees per second at full speed
  let angle = 0, vel = 0, spinning = false, lastT = 0;
  function spinFrame(t) {
    const dt = lastT ? Math.min(0.05, (t - lastT) / 1000) : 0;
    lastT = t;
    const target = audio.paused ? 0 : RPM_DEG;
    vel += (target - vel) * Math.min(1, dt * (target ? 1.4 : 1.1));
    angle = (angle + vel * dt) % 360;
    vinyl.style.transform = `rotate(${angle.toFixed(2)}deg)`;
    if (!audio.paused || vel > 0.6) requestAnimationFrame(spinFrame);
    else { spinning = false; lastT = 0; }
  }
  function kickSpin() {
    if (reduceMotion || spinning) return;
    spinning = true;
    requestAnimationFrame(spinFrame);
  }

  // Floating notes while the music plays
  const NOTE_CHARS = ["♪", "♫", "♩", "♬"];
  let noteTimer = null;
  function spawnNote() {
    if (document.hidden || audio.paused) return;
    const n = document.createElement("span");
    n.className = "note";
    n.textContent = NOTE_CHARS[(Math.random() * NOTE_CHARS.length) | 0];
    n.style.setProperty("--dx", (Math.random() * 56 - 28).toFixed(0) + "px");
    n.style.setProperty("--r", (Math.random() * 50 - 25).toFixed(0) + "deg");
    n.style.setProperty("--fs", (11 + Math.random() * 7).toFixed(0) + "px");
    n.addEventListener("animationend", () => n.remove());
    notesWrap.appendChild(n);
  }
  function setPlayingUI(on) {
    musicBtn.classList.toggle("is-playing", on);
    musicBtn.setAttribute("aria-pressed", String(on));
    kickSpin();
    clearInterval(noteTimer);
    if (on && !reduceMotion) { spawnNote(); noteTimer = setInterval(spawnNote, 1300); }
  }
  audio.addEventListener("play", () => setPlayingUI(true));
  audio.addEventListener("pause", () => setPlayingUI(false));
  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    ringFg.style.strokeDashoffset = (100 - (audio.currentTime / audio.duration) * 100).toFixed(2);
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) audio.pause();
    else if (wantsMusic) audio.play().catch(() => {});
  });

  // ---------- Preloader ----------
  const loader = $("#loader");
  const loaderBar = $("#loaderBar");
  function preload() {
    const imgs = ["assets/img/cover.jpg", "assets/img/hero.jpg"];
    let done = 0;
    const total = imgs.length + 1;
    const bump = () => {
      done++;
      if (MOTION) gsap.to(loaderBar, { scaleX: done / total, duration: 0.6, ease: "power2.out" });
    };
    const imgPromises = imgs.map((src) => new Promise((res) => {
      const i = new Image();
      i.onload = i.onerror = () => { bump(); res(); };
      i.src = src;
    }));
    const fonts = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(bump);
    const minTime = new Promise((r) => setTimeout(r, MOTION ? 1300 : 0));
    const maxTime = new Promise((r) => setTimeout(r, 6000)); // never block too long on slow networks
    return Promise.race([Promise.all([...imgPromises, fonts, minTime]), maxTime]);
  }

  // Initial hidden states (only when animating)
  if (MOTION) {
    gsap.set([loader, "#cover"], { clipPath: "inset(0% 0% 0% 0%)" });
    gsap.set(".cv", { opacity: 0, y: 34 });
    gsap.set(".cover__frame", { opacity: 0, scale: 1.06 });
    gsap.set(".cover__bg img", { scale: 1.25 });
    gsap.set(".loader__l", { yPercent: 110 });
    gsap.set(".loader__amp", { opacity: 0, scale: 0.6 });
    gsap.set(".hero .ch", { yPercent: 115, rotate: 10, opacity: 0 });
    gsap.set(".hv", { opacity: 0, y: 26 });
    gsap.set(".hero__frame", { opacity: 0, scale: 1.08 });
    gsap.set(".hero__media", { scale: 1.35 });
    gsap.timeline()
      .to(".loader__l", { yPercent: 0, duration: 1, ease: "expo.out", stagger: 0.12 })
      .to(".loader__amp", { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(2)" }, "-=0.6");
  }

  preload().then(() => {
    if (!MOTION) { loader.style.display = "none"; return; }
    gsap.timeline()
      .to(loaderBar, { scaleX: 1, duration: 0.4, ease: "power2.out" })
      .to(".loader__mono, .loader__bar, .loader__txt", { opacity: 0, y: -20, duration: 0.6, ease: "power3.in", stagger: 0.05 })
      .to(loader, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.2, ease: "expo.inOut" }, "-=0.15")
      .set(loader, { display: "none" })
      .to(".cover__bg img", { scale: 1.06, duration: 2.6, ease: "expo.out" }, "-=0.9")
      .to(".cover__frame", { opacity: 1, scale: 1, duration: 1.8, ease: "expo.out" }, "<0.1")
      .to(".cv", { opacity: 1, y: 0, duration: 1.3, ease: "expo.out", stagger: 0.1 }, "<0.15");
  });

  // ---------- Open invitation ----------
  const cover = $("#cover");
  let opened = false;
  $("#openBtn").addEventListener("click", () => {
    if (opened) return;
    opened = true;
    playMusic();
    window.scrollTo(0, 0);
    body.classList.add("is-opening");

    const finishUnlock = () => {
      body.classList.add("is-open");
      body.classList.remove("is-locked");
      if (lenis) lenis.start();
      startPetals();
      if (MOTION) ScrollTrigger.refresh();
    };

    if (!MOTION) {
      setTimeout(finishUnlock, 450);
      setTimeout(() => { cover.style.display = "none"; }, 1500);
      return;
    }

    gsap.timeline({ onComplete: () => { cover.style.display = "none"; } })
      .to(".cover__inner", { y: -70, opacity: 0, duration: 0.8, ease: "power3.in" })
      .to(".cover__frame", { scale: 0.92, opacity: 0, duration: 0.8, ease: "power3.in" }, "<")
      .to(cover, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.5, ease: "expo.inOut" }, "-=0.35")
      .to(".cover__bg img", { yPercent: -12, duration: 1.5, ease: "expo.inOut" }, "<")
      .add(finishUnlock, "<0.5")
      .to(".hero__media", { scale: 1, duration: 2.8, ease: "expo.out" }, "<-0.1")
      .to(".hero__frame", { opacity: 1, scale: 1, duration: 2, ease: "expo.out" }, "<0.4")
      .to(".hero__top", { opacity: 1, y: 0, duration: 1.2, ease: "expo.out" }, "<0.1")
      .to(".hero__content .eyebrow", { opacity: 1, y: 0, duration: 1.2, ease: "expo.out" }, "<0.1")
      .to(".hero .split:first-child .ch", { yPercent: 0, rotate: 0, opacity: 1, duration: 1.4, ease: "expo.out", stagger: 0.07 }, "<0.15")
      .to(".hero__amp", { opacity: 1, y: 0, duration: 1.2, ease: "expo.out" }, "<0.35")
      .to(".hero .split:last-child .ch", { yPercent: 0, rotate: 0, opacity: 1, duration: 1.4, ease: "expo.out", stagger: 0.06 }, "<0.1")
      .to(".hero__date", { opacity: 1, y: 0, duration: 1.2, ease: "expo.out" }, "<0.5");
  });

  // ---------- Calendar ----------
  (function buildCalendar() {
    const grid = $("#calGrid");
    const { year, month, day } = CONFIG.calendarMonth;
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    for (let i = 0; i < first; i++) grid.appendChild(document.createElement("span"));
    for (let n = 1; n <= days; n++) {
      const s = document.createElement("span");
      if (n === day) {
        s.className = "is-day";
        s.innerHTML = `<svg viewBox="0 0 48 44"><path pathLength="1" d="M10 30C4 18 14 5 28 5s20 10 16 22-22 16-32 8S6 12 18 8"/></svg><b>${n}</b>`;
      } else {
        s.textContent = n;
      }
      grid.appendChild(s);
    }
  })();

  const c = CONFIG.calendar;
  $("#calBtn").href =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    "&text=" + encodeURIComponent(c.title) +
    "&dates=" + c.start + "/" + c.end +
    "&details=" + encodeURIComponent(c.details) +
    "&location=" + encodeURIComponent(c.location);

  // ---------- Countdown ----------
  const cdEls = {};
  $$(".cd__num").forEach((el) => (cdEls[el.dataset.unit] = el));
  function setNum(el, val) {
    const v = String(val).padStart(2, "0");
    if (el.textContent === v) return;
    el.textContent = v;
    if (MOTION) gsap.fromTo(el, { yPercent: -60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "expo.out" });
  }
  function tick() {
    let diff = Math.max(0, CONFIG.eventDate - Date.now());
    const d = Math.floor(diff / 864e5); diff -= d * 864e5;
    const h = Math.floor(diff / 36e5); diff -= h * 36e5;
    const m = Math.floor(diff / 6e4); diff -= m * 6e4;
    const s = Math.floor(diff / 1e3);
    setNum(cdEls.d, d); setNum(cdEls.h, h); setNum(cdEls.m, m); setNum(cdEls.s, s);
  }
  tick();
  setInterval(tick, 1000);

  // ---------- Stats (declared early so reveals can trigger it) ----------
  const statEls = {};
  $$("[data-stat]").forEach((el) => (statEls[el.dataset.stat] = el));
  let statsShown = false;

  // =========================================================
  //  SCROLL ANIMATIONS
  // =========================================================
  if (MOTION) {
    const EASE = "expo.out";

    // --- one-shot reveals, batched for performance ---
    const REVEALS = {
      up:   { from: { opacity: 0, y: 44 }, to: { opacity: 1, y: 0, duration: 1.3, ease: EASE } },
      fade: { from: { opacity: 0, y: 12 }, to: { opacity: 1, y: 0, duration: 1.4, ease: "power2.out" } },
      zoom: { from: { opacity: 0, scale: 0.86 }, to: { opacity: 1, scale: 1, duration: 1.4, ease: EASE } },
      rise: { from: { opacity: 0, y: 100, rotateX: 16, transformPerspective: 900 }, to: { opacity: 1, y: 0, rotateX: 0, duration: 1.6, ease: EASE } },
    };
    Object.entries(REVEALS).forEach(([type, cfg]) => {
      const els = $$(`[data-reveal="${type}"]`);
      if (!els.length) return;
      gsap.set(els, cfg.from);
      ScrollTrigger.batch(els, {
        start: "top 90%",
        once: true,
        onEnter: (batch) => {
          batch.forEach((el) => el.classList.add("in"));
          gsap.to(batch, { ...cfg.to, stagger: 0.12, overwrite: true });
        },
      });
    });

    // children stagger (countdown tiles, swatches)
    $$('[data-reveal="stagger"]').forEach((wrap) => {
      gsap.from(wrap.children, {
        opacity: 0, y: 30, scale: 0.85, duration: 1.2, ease: EASE, stagger: 0.09,
        scrollTrigger: { trigger: wrap, start: "top 90%", once: true },
      });
    });

    // flourish line drawing (CSS transition on .in)
    $$('[data-reveal="draw"]').forEach((el) => {
      ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => el.classList.add("in") });
    });

    // arch / image curtain reveal
    $$('[data-reveal="clip"]').forEach((el) => {
      const img = el.querySelector("img");
      const tl = gsap.timeline({ scrollTrigger: { trigger: el.parentElement, start: "top 82%", once: true } });
      tl.fromTo(el, { clipPath: "inset(100% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.7, ease: "expo.inOut" })
        .from(img, { scale: 1.4, duration: 2.4, ease: EASE }, 0.15);
    });

    // masked titles
    $$("[data-mask] .mask__in").forEach((el) => {
      gsap.from(el, {
        yPercent: 115, rotate: 4, duration: 1.5, ease: EASE,
        scrollTrigger: { trigger: el.closest("[data-mask]"), start: "top 90%", once: true },
      });
    });

    // --- scrubbed parallax on images (the smooth "lag" feel) ---
    $$("[data-speed]").forEach((img) => {
      const s = parseFloat(img.dataset.speed);
      gsap.fromTo(img, { yPercent: -s }, {
        yPercent: s, ease: "none",
        scrollTrigger: { trigger: img.parentElement, start: "top bottom", end: "bottom top", scrub: 1.2 },
      });
    });

    // --- hero: drift out as you scroll ---
    gsap.timeline({ scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: 1 } })
      .to(".hero__media img", { yPercent: 16, ease: "none" }, 0)
      .to(".hero__content", { yPercent: -35, opacity: 0, ease: "none" }, 0)
      .to(".hero__veil", { opacity: 0.4, ease: "none" }, 0);

    // --- opening verse: words light up as you read ---
    const verseWords = $$("#verse .line").flatMap((l) => splitWords(l));
    gsap.fromTo(verseWords, { opacity: 0.12 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: "#verse", start: "top 82%", end: "bottom 50%", scrub: 1 },
    });

    // --- couple: drifting monogram letters, offset frames, rotating ampersand ---
    $$(".person").forEach((p, i) => {
      const dir = i === 0 ? 1 : -1;
      gsap.fromTo(p.querySelector(".person__ghost"), { xPercent: -18 * dir, yPercent: 10 }, {
        xPercent: 18 * dir, yPercent: -10, ease: "none",
        scrollTrigger: { trigger: p, start: "top bottom", end: "bottom top", scrub: 1.5 },
      });
      gsap.fromTo(p.querySelector(".arch-wrap__line"), { x: 0, y: 0, opacity: 0 }, {
        x: 12 * dir, y: 12, opacity: 0.55, ease: "none",
        scrollTrigger: { trigger: p, start: "top 80%", end: "top 30%", scrub: 1.2 },
      });
    });
    gsap.fromTo(".couple__and .amp", { rotate: -25 }, {
      rotate: 10, ease: "none",
      scrollTrigger: { trigger: ".couple__and", start: "top bottom", end: "bottom top", scrub: 1.2 },
    });

    // --- love story: progress line + reveal each chapter ---
    gsap.to("#tlFill", {
      scaleY: 1, ease: "none",
      scrollTrigger: { trigger: "#timeline", start: "top 70%", end: "bottom 65%", scrub: 1 },
    });
    $$(".tl").forEach((tl) => {
      gsap.timeline({ scrollTrigger: { trigger: tl, start: "top 82%", once: true, onEnter: () => tl.classList.add("in") } })
        .fromTo(tl.querySelector(".tl__img"), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut" })
        .from(tl.querySelectorAll(".tl__year, .tl__title, .tl__text"), { opacity: 0, x: -24, duration: 1.2, ease: EASE, stagger: 0.1 }, 0.5);
    });

    // --- gallery: pinned horizontal scroll ---
    const hgal = $("#hgal");
    const track = $("#hgalTrack");
    const viewport = $(".hgal__viewport");
    const dist = () => Math.max(0, track.scrollWidth - viewport.clientWidth);
    const hTween = gsap.to(track, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: {
        trigger: hgal,
        start: () => (hgal.offsetHeight > window.innerHeight ? "bottom bottom" : "center center"),
        end: () => "+=" + dist() * 1.15,
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => gsap.set("#hgalBar", { scaleX: self.progress }),
      },
    });
    $$(".hgal__item").forEach((item) => {
      gsap.fromTo(item.querySelector("img"), { xPercent: 8 }, {
        xPercent: -8, ease: "none",
        scrollTrigger: { trigger: item, containerAnimation: hTween, start: "left right", end: "right left", scrub: true },
      });
    });

    // --- quote: words fade in as the image drifts ---
    const qWords = splitWords($("#quoteText"));
    gsap.fromTo(qWords, { opacity: 0.1, y: 10 }, {
      opacity: 1, y: 0, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: "#quoteText", start: "top 85%", end: "bottom 55%", scrub: 1 },
    });

    // --- stats count-up when visible ---
    ScrollTrigger.create({ trigger: ".stats", start: "top 88%", once: true, onEnter: () => { statsShown = true; renderStats(); } });

    // --- reading progress bar ---
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate: (self) => gsap.set("#progressBar", { scaleX: self.progress }),
    });

    // images that finish loading late can shift layout: refresh positions
    window.addEventListener("load", () => ScrollTrigger.refresh());
  } else {
    // No animation library / reduced motion: show everything immediately
    $$("[data-reveal], .tl").forEach((el) => el.classList.add("in"));
    statsShown = true;
  }

  // ---------- Dock navigation ----------
  const dock = $("#dock");
  const dockLinks = $$("a", dock);
  const pill = $(".dock__pill");
  const navSections = dockLinks.map((a) => document.getElementById(a.dataset.target));
  let activeIdx = -1;

  function setActive(idx) {
    if (idx === activeIdx) return;
    activeIdx = idx;
    dockLinks.forEach((a, i) => a.classList.toggle("is-active", i === idx));
    pill.style.setProperty("--x", dockLinks[idx].offsetLeft + "px");
  }
  function updateDock() {
    const mid = window.innerHeight * 0.5;
    let idx = 0;
    navSections.forEach((sec, i) => { if (sec && sec.getBoundingClientRect().top <= mid) idx = i; });
    setActive(idx);
  }
  let dockTick = false;
  window.addEventListener("scroll", () => {
    if (!dockTick) { dockTick = true; requestAnimationFrame(() => { dockTick = false; updateDock(); }); }
  }, { passive: true });
  window.addEventListener("resize", () => { const i = activeIdx; activeIdx = -1; setActive(Math.max(0, i)); });
  setActive(0);

  dockLinks.forEach((a) => a.addEventListener("click", (e) => {
    e.preventDefault();
    scrollToEl(document.getElementById(a.dataset.target));
  }));

  // ---------- Lightbox ----------
  const lb = $("#lightbox");
  const lbImg = $(".lb-img", lb);
  const lbCount = $(".lb-count", lb);
  const lbSources = $$("[data-lb]").sort((a, b) => a.dataset.lb - b.dataset.lb).map((i) => i.getAttribute("src"));
  let lbIdx = 0;

  function showLb(i) {
    lbIdx = (i + lbSources.length) % lbSources.length;
    lbImg.style.opacity = 0;
    const src = lbSources[lbIdx];
    const pre = new Image();
    pre.onload = pre.onerror = () => { lbImg.src = src; lbImg.style.opacity = 1; };
    pre.src = src;
    lbCount.textContent = `${lbIdx + 1} / ${lbSources.length}`;
  }
  function openLb(i) { showLb(i); lb.classList.add("is-open"); lockScroll(true); }
  function closeLb() { lb.classList.remove("is-open"); lockScroll(false); }

  $$("[data-lb]").forEach((img) => {
    const host = img.closest("figure") || img;
    host.addEventListener("click", () => openLb(+img.dataset.lb));
  });
  $(".lb-close", lb).addEventListener("click", closeLb);
  $(".lb-prev", lb).addEventListener("click", (e) => { e.stopPropagation(); showLb(lbIdx - 1); });
  $(".lb-next", lb).addEventListener("click", (e) => { e.stopPropagation(); showLb(lbIdx + 1); });
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLb(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLb();
    if (e.key === "ArrowLeft") showLb(lbIdx - 1);
    if (e.key === "ArrowRight") showLb(lbIdx + 1);
  });
  let tx = 0, ty = 0;
  lb.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - tx;
    const dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) showLb(lbIdx + (dx < 0 ? 1 : -1));
    else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) closeLb();
  });

  // ---------- Toast & copy ----------
  const toast = $("#toast");
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-show"), 2200);
  }
  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;top:0";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch (_) {}
      ta.remove();
      return ok;
    }
  }
  $$("[data-copy]").forEach((btn) => btn.addEventListener("click", async () => {
    const ok = await copyText(btn.dataset.copy);
    showToast(ok ? "Berhasil disalin ✓" : "Gagal menyalin, silakan salin manual");
  }));

  // ---------- Gift envelope ----------
  const env = $("#envelope");
  const envBtn = $("#envBtn");
  const giftReveal = $("#giftReveal");
  const envLabel = envBtn.querySelector("span");
  const afterLayoutChange = () => { if (MOTION) setTimeout(() => ScrollTrigger.refresh(), 1150); };
  function toggleGift() {
    if (!env.classList.contains("is-open")) {
      env.classList.add("is-open");
      envLabel.textContent = "Tutup Amplop";
      setTimeout(() => giftReveal.classList.add("is-open"), 700);
      afterLayoutChange();
      return;
    }
    const open = giftReveal.classList.toggle("is-open");
    env.classList.toggle("is-open", open);
    envLabel.textContent = open ? "Tutup Amplop" : "Buka Amplop";
    afterLayoutChange();
  }
  env.addEventListener("click", toggleGift);
  envBtn.addEventListener("click", toggleGift);

  // ---------- RSVP & Wishes ----------
  const form = $("#wishForm");
  const seg = $(".seg", form);
  const guestField = $("#guestField");
  const guestOut = $("#guestCount");
  const errEl = $("#formErr");
  const list = $("#wishList");
  let guestCount = 1;

  seg.addEventListener("change", () => {
    const radios = $$("input", seg);
    const idx = radios.findIndex((r) => r.checked);
    seg.style.setProperty("--seg", idx);
    guestField.classList.toggle("is-hidden", radios[idx].value !== "hadir");
  });
  $$("[data-step]", guestField).forEach((b) => b.addEventListener("click", () => {
    guestCount = Math.min(5, Math.max(1, guestCount + +b.dataset.step));
    guestOut.textContent = guestCount;
  }));

  function loadUserWishes() {
    try { return JSON.parse(localStorage.getItem(CONFIG.storageKey)) || []; } catch (_) { return []; }
  }
  function saveUserWishes(arr) {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(arr)); } catch (_) {}
  }
  const now = Date.now();
  const seeds = CONFIG.seedWishes.map((w) => ({ ...w, t: now - w.ago * 864e5 }));
  const userWishes = loadUserWishes();

  const ATT_LABEL = { hadir: "Hadir", tidak: "Tidak Hadir", ragu: "Masih Ragu" };
  function timeAgo(t) {
    const s = Math.max(1, Math.floor((Date.now() - t) / 1000));
    if (s < 60) return "Baru saja";
    const m = Math.floor(s / 60); if (m < 60) return m + " menit lalu";
    const h = Math.floor(m / 60); if (h < 24) return h + " jam lalu";
    const d = Math.floor(h / 24); if (d < 30) return d + " hari lalu";
    return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  }
  function wishEl(w, isNew) {
    const li = document.createElement("li");
    li.className = "wish" + (isNew ? " is-new" : "");
    const av = document.createElement("span");
    av.className = "wish__avatar";
    av.textContent = (w.name.trim()[0] || "?").toUpperCase();
    const bodyEl = document.createElement("div");
    const head = document.createElement("div");
    head.className = "wish__head";
    const nm = document.createElement("span");
    nm.className = "wish__name";
    nm.textContent = w.name;
    const badge = document.createElement("span");
    badge.className = "wish__badge wish__badge--" + w.att;
    badge.textContent = ATT_LABEL[w.att] || "";
    head.append(nm, badge);
    const msg = document.createElement("p");
    msg.className = "wish__msg";
    msg.textContent = w.msg;
    const time = document.createElement("p");
    time.className = "wish__time";
    time.textContent = timeAgo(w.t);
    bodyEl.append(head, msg, time);
    li.append(av, bodyEl);
    return li;
  }
  const allWishes = () => [...userWishes, ...seeds].sort((a, b) => b.t - a.t);
  function renderWishes() {
    list.textContent = "";
    allWishes().forEach((w) => list.appendChild(wishEl(w)));
    $("#wishCount").textContent = allWishes().length;
  }

  function countUp(el, to) {
    const from = +el.textContent || 0;
    if (!MOTION || from === to) { el.textContent = to; return; }
    const o = { v: from };
    gsap.to(o, { v: to, duration: 1.6, ease: "power3.out", onUpdate: () => { el.textContent = Math.round(o.v); } });
  }
  function renderStats() {
    if (!statsShown) return;
    const counts = { hadir: 0, tidak: 0, ragu: 0 };
    allWishes().forEach((w) => { counts[w.att] = (counts[w.att] || 0) + 1; });
    counts.hadir += 24; counts.tidak += 3; counts.ragu += 2; // RSVP-only guests (contoh)
    Object.keys(statEls).forEach((k) => countUp(statEls[k], counts[k]));
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#fName").value.trim();
    const msg = $("#fMsg").value.trim();
    const att = (form.querySelector("input[name=att]:checked") || {}).value || "hadir";
    if (name.length < 2) { errEl.textContent = "Mohon isi nama Anda (minimal 2 karakter)."; $("#fName").focus(); return; }
    if (msg.length < 3) { errEl.textContent = "Mohon tuliskan ucapan Anda."; $("#fMsg").focus(); return; }
    errEl.textContent = "";
    const w = { name: name.slice(0, 40), msg: msg.slice(0, 400), att, guests: att === "hadir" ? guestCount : 0, t: Date.now() };
    userWishes.unshift(w);
    saveUserWishes(userWishes);
    list.prepend(wishEl(w, true));
    list.scrollTo({ top: 0, behavior: "smooth" });
    $("#wishCount").textContent = allWishes().length;
    renderStats();
    $("#fMsg").value = "";
    showToast("Terima kasih atas ucapan & doanya 🤍");
  });

  renderWishes();
  renderStats();

  // ---------- Falling petals ----------
  function startPetals() {
    if (reduceMotion) return;
    const wrap = $("#petals");
    if (wrap.childElementCount) return;
    const colors = ["#EBD3C6", "#F3E6DC", "#D8C39E", "#E6C7B8"];
    const n = window.innerWidth < 600 ? 9 : 13;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("span");
      p.className = "petal";
      const size = 10 + Math.random() * 12;
      p.style.cssText =
        `left:${Math.random() * 100}%;` +
        `--s:${size}px;` +
        `--t:${12 + Math.random() * 10}s;` +
        `--delay:${(Math.random() * 12).toFixed(2)}s;` +
        `--dx:${(Math.random() * 160 - 80).toFixed(0)}px;` +
        `--r:${(Math.random() * 540 - 270).toFixed(0)}deg;` +
        `--o:${(0.4 + Math.random() * 0.4).toFixed(2)};`;
      const col = colors[i % colors.length];
      p.innerHTML = `<svg viewBox="0 0 20 26"><path d="M10 0C18 7 19 17 10 26 1 17 2 7 10 0z" fill="${col}"/><path d="M10 3v20" stroke="rgba(176,143,92,.25)" stroke-width=".6"/></svg>`;
      wrap.appendChild(p);
    }
  }

  // ---------- Desktop side slideshow ----------
  const slides = $$(".side__slides img");
  if (slides.length > 1 && window.matchMedia("(min-width: 900px)").matches) {
    let si = 0;
    setInterval(() => {
      slides[si].classList.remove("is-active");
      si = (si + 1) % slides.length;
      slides[si].classList.add("is-active");
    }, 7000);
  }
})();
