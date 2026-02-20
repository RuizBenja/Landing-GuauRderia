// script.js

// ===== Helpers
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0
});

// ===== Utils
function daysBetween(start, end) {
  const a = new Date(start);
  const b = new Date(end);
  const days = Math.ceil((b - a) / (1000 * 60 * 60 * 24));
  return Number.isFinite(days) ? days : 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ===== Pricing
function computePrice({ plan, size, start, end }) {
  const baseByPlan = { estadia: 32000, guarderia: 18000, spa: 22000 };
  const multiplierBySize = { pequeno: 1.0, mediano: 1.15, grande: 1.35 };

  const base = baseByPlan[plan] ?? 0;
  const mult = multiplierBySize[size] ?? 1;

  if (plan === "spa") {
    const total = Math.round(base * mult);
    return { total, units: 1, label: "1 sesión" };
  }

  const units = clamp(daysBetween(start, end), 1, 365);
  let total = Math.round(base * mult * units);

  if (units >= 5) total = Math.round(total * 0.92);

  const unitLabel = plan === "estadia" ? "noche(s)" : "día(s)";
  return { total, units, label: `${units} ${unitLabel}` };
}

// ===== UI
function setMinDates() {
  const iso = new Date().toISOString().slice(0, 10);
  $$('input[type="date"]').forEach((inp) => (inp.min = iso));
}

function toast(msg) {
  const t = $("#toast");
  const m = $("#toastMsg");
  if (!t || !m) return;

  m.textContent = msg;
  t.hidden = false;

  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => {
    t.hidden = true;
  }, 2600);
}

// ===== Config
const WHATSAPP_NUMBER_INTERNATIONAL = "56954759527"; // CAMBIA A TU NUMERO
const DEFAULT_CITY = "Santiago";

function waLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER_INTERNATIONAL}?text=${encodeURIComponent(message)}`;
}

// ===== WhatsApp
function attachWhatsappButtons() {
  const top = $("#btnWhatsappTop");
  const mobile = $("#btnWhatsappMobile");

  [top, mobile].forEach((btn) => {
    if (!btn) return;
    btn.href = waLink(
      `Hola! Quiero reservar en Perrihotel\n\nComuna: ${DEFAULT_CITY}\nServicio: (por definir)\nFechas: (por definir)\nTamaño: (por definir)\n`
    );
  });

  ["#btnWhatsappFooter", "#btnWhatsappLocation"].forEach((id) => {
    const b = $(id);
    if (!b) return;

    b.addEventListener("click", () => {
      window.open(
        waLink("Hola! Quiero reservar en Perrihotel. ¿Me ayudas con disponibilidad?"),
        "_blank",
        "noopener"
      );
    });
  });
}

// ===== Mobile Menu
function initMobileMenu() {
  const header = $(".topbar");
  const burger = $(".burger");
  const mobile = $(".mobilemenu");

  if (!header || !burger || !mobile) return;

  const closeMenu = () => {
    header.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
    mobile.hidden = true;
  };

  const openMenu = () => {
    header.classList.add("is-open");
    burger.setAttribute("aria-expanded", "true");
    mobile.hidden = false;
  };

  closeMenu();

  burger.addEventListener("click", () => {
    const isOpen = burger.getAttribute("aria-expanded") === "true";
    if (isOpen) closeMenu();
    else openMenu();
  });

  mobile.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeMenu));

  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) closeMenu();
  });
}

// ===== Reveal
function initReveal() {
  const els = $$(".reveal");
  if (!els.length) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) e.target.classList.add("is-visible");
      });
    },
    { threshold: 0.12 }
  );

  els.forEach((el) => io.observe(el));
}

// ===== Gallery Lightbox
function initGallery() {
  const lightbox = $("#lightbox");
  const img = $("#lightboxImg");
  if (!lightbox || !img) return;

  const open = (src) => {
    img.src = src;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const close = () => {
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    img.src = "";
  };

  $$(".gitem").forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.getAttribute("data-src");
      if (src) open(src);
    });
  });

  lightbox.addEventListener("click", (e) => {
    if (e.target && e.target.matches("[data-close]")) close();
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && lightbox.getAttribute("aria-hidden") === "false") close();
  });
}

// ===== Booking Form
function bindEstimator(formEl, valueEl, metaEl) {
  const update = () => {
    const data = Object.fromEntries(new FormData(formEl).entries());
    const { plan, size, start, end } = data;

    if (!plan || !size) return;

    if (plan !== "spa" && (!start || !end)) {
      valueEl.textContent = CLP.format(0);
      metaEl.textContent = "Selecciona fechas para calcular";
      return;
    }

    if (plan !== "spa") {
      const d = daysBetween(start, end);
      if (d <= 0) {
        valueEl.textContent = CLP.format(0);
        metaEl.textContent = "La salida debe ser después de la entrada";
        return;
      }
    }

    const { total, label } = computePrice({ plan, size, start, end });
    valueEl.textContent = CLP.format(total);
    metaEl.textContent = plan === "spa" ? "Precio base · según tamaño" : `${label} · desc. 5+ aplica`;
  };

  formEl.addEventListener("input", update);
  formEl.addEventListener("change", update);
  update();
}

function initBookingForm() {
  const bookingForm = $("#bookingForm");
  if (!bookingForm) return;

  const totalValue = $("#totalValue");
  const totalMeta = $("#totalMeta");
  if (!totalValue || !totalMeta) return;

  bindEstimator(bookingForm, totalValue, totalMeta);

  $("#btnWhatsappForm")?.addEventListener("click", () => {
    const data = Object.fromEntries(new FormData(bookingForm).entries());
    const { total, label } = computePrice(data);

    const msg = [
      "Hola! Quiero reservar en Perrihotel",
      "",
      `Dueño/a: ${data.owner || "—"}`,
      `WhatsApp: ${data.phone || "—"}`,
      `Perrito: ${data.dogName || "—"}`,
      `Tamaño: ${data.size || "—"}`,
      `Servicio: ${data.plan || "—"}`,
      data.plan === "spa" ? "Sesión: 1" : `Fechas: ${data.start} → ${data.end} (${label})`,
      `Comentarios: ${data.notes || "—"}`,
      `Total estimado: ${CLP.format(total)}`
    ].join("\n");

    window.open(waLink(msg), "_blank", "noopener");
  });

  bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const data = Object.fromEntries(new FormData(bookingForm).entries());

    if (data.plan !== "spa") {
      const d = daysBetween(data.start, data.end);
      if (d <= 0) {
        toast("Revisa las fechas: salida debe ser después de entrada");
        return;
      }
    }

    const { total, label } = computePrice(data);

    toast("Solicitud enviada. Te contactamos por WhatsApp");

    const msg = [
      "Hola! Quiero confirmar mi reserva en Perrihotel",
      "",
      `Dueño/a: ${data.owner || "—"}`,
      `WhatsApp: ${data.phone || "—"}`,
      `Perrito: ${data.dogName || "—"}`,
      `Tamaño: ${data.size || "—"}`,
      `Servicio: ${data.plan || "—"}`,
      data.plan === "spa" ? "Sesión: 1" : `Fechas: ${data.start} → ${data.end} (${label})`,
      `Comentarios: ${data.notes || "—"}`,
      `Total estimado: ${CLP.format(total)}`
    ].join("\n");

    window.open(waLink(msg), "_blank", "noopener");
    bookingForm.reset();
    bookingForm.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

// ===== Dog FX
function bark() {
  const dog = $("#dog");
  if (!dog) return;

  dog.classList.remove("is-bark");
  void dog.offsetWidth; // reinicia animación
  dog.classList.add("is-bark");
}

function spinDog(times = 2) {
  const dog = $("#dog");
  if (!dog) return;

  let i = 0;
  const run = () => {
    dog.classList.remove("do-spin");
    void dog.offsetWidth;
    dog.classList.add("do-spin");
    i++;
    if (i < times) setTimeout(run, 900);
  };
  run();
}

// ===== Pet Toy
function initPetHeroToy() {
  const dog = $("#dog");
  const title = $("#toyTitle");
  const text = $("#toyText");
  const chips = $$(".toyChip");
  const btnDemo = $("#btnPetDemo");
  const toy = $("#toy");

  if (!dog || !title || !text || !chips.length || !toy) return;

  const modes = {
    calma: {
      t: "Calma",
      d: "Sentadito, respirando suave y moviendo la colita.",
      dogCls: "is-calm",
      toyCls: "is-calm"
    },
    juego: {
      t: "Juego",
      d: "¡A dar vueltas! Cola rápida y aparece la pelotita.",
      dogCls: "is-play",
      toyCls: "is-play",
      onEnter: () => spinDog(2)
    },
    felicidad: {
      t: "Felicidad",
      d: "Colita feliz y te dice guau guau 💜",
      dogCls: "is-happy",
      toyCls: "is-happy",
      onEnter: () => {
        bark();

        // “hablar” simulando la boca
        const mouth = $(".dog__mouth", dog);
        if (mouth) {
          mouth.animate(
            [
              { transform: "translateX(-50%) scaleY(1)" },
              { transform: "translateX(-50%) scaleY(0.55)" }
            ],
            { duration: 120, direction: "alternate", iterations: 8, easing: "ease-in-out" }
          );
        }
      }
    }
  };

  function setMode(key) {
    const m = modes[key];
    if (!m) return;

    title.textContent = m.t;
    text.textContent = m.d;

    dog.classList.remove("is-calm", "is-play", "is-happy");
    dog.classList.add(m.dogCls);

    toy.classList.remove("is-calm", "is-play", "is-happy");
    toy.classList.add(m.toyCls);

    chips.forEach((c) => c.classList.toggle("is-active", c.dataset.mode === key));

    if (key !== "felicidad") dog.classList.remove("is-bark");

    m.onEnter?.();
  }

  chips.forEach((c) => c.addEventListener("click", () => setMode(c.dataset.mode)));

  btnDemo?.addEventListener("click", async () => {
    const order = ["calma", "juego", "felicidad"];
    for (const k of order) {
      setMode(k);
      await new Promise((r) => setTimeout(r, 950));
    }
    setMode("calma");
  });

  setMode("calma");
}

// ===== Init
function init() {
  setMinDates();
  attachWhatsappButtons();
  initMobileMenu();
  initReveal();
  initGallery();
  initBookingForm();
  initPetHeroToy();

  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());
}

init();

/* =========================
   SPARKLES CANVAS (FULL HERO)
   ========================= */
(function () {
  const canvas = document.getElementById("sparkCanvas");
  const hero = document.querySelector(".hero--pet");
  const dogImg = document.querySelector(".heroDogImg");

  if (!canvas || !hero || !dogImg) return;

  const ctx = canvas.getContext("2d", { alpha: true });

  const COLORS = [
    { c: "rgba(255,122,24,0.95)", glow: "rgba(255,122,24,0.22)" },
    { c: "rgba(175,66,255,0.95)", glow: "rgba(175,66,255,0.20)" },
    { c: "rgba(45,212,191,0.95)", glow: "rgba(45,212,191,0.18)" },
    { c: "rgba(120,140,255,0.95)", glow: "rgba(120,140,255,0.16)" }
  ];

  let W = 0, H = 0;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let particles = [];

  const mouse = { x: 0, y: 0, vx: 0, vy: 0, active: false };
  let lastMouse = { x: 0, y: 0 };

  function resize() {
    const r = hero.getBoundingClientRect();
    W = Math.floor(r.width);
    H = Math.floor(r.height);

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function rand(min, max) { return min + Math.random() * (max - min); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function getDogSpawnPoint() {
    const dogRect = dogImg.getBoundingClientRect();
    const heroRect = hero.getBoundingClientRect();

    // Coordenadas dentro del HERO
    const x = (dogRect.left - heroRect.left) + dogRect.width * 0.55;
    const y = (dogRect.top - heroRect.top) + dogRect.height * 0.48;

    return { x, y, w: dogRect.width, h: dogRect.height };
  }

  function spawn(n = 2) {
    const s = getDogSpawnPoint();

    for (let i = 0; i < n; i++) {
      const col = pick(COLORS);

      const px = s.x + rand(-s.w * 0.35, s.w * 0.35);
      const py = s.y + rand(-s.h * 0.35, s.h * 0.35);

      const size = rand(0.7, 2.4);
      const speed = rand(0.25, 1.05);

      particles.push({
        x: px,
        y: py,
        vx: rand(-0.45, 0.45) * speed,
        vy: rand(-0.65, -0.10) * speed,
        drift: rand(-0.18, 0.18),
        size,
        life: rand(170, 300),
        maxLife: 0,
        tw: rand(0, Math.PI * 2),
        col,
        alpha: rand(0.55, 0.95),
      });

      particles[particles.length - 1].maxLife = particles[particles.length - 1].life;
    }

    if (particles.length > 320) particles.splice(0, particles.length - 320);
  }

  function drawSpark(p) {
    const t = 1 - p.life / p.maxLife;
    const fadeIn = Math.min(1, t / 0.18);
    const fadeOut = Math.min(1, (1 - t) / 0.35);
    const a = p.alpha * fadeIn * fadeOut;

    const r = p.size * (1.0 + Math.sin(p.tw) * 0.25);

    // glow
    ctx.beginPath();
    ctx.fillStyle = p.col.glow;
    ctx.arc(p.x, p.y, r * 7.0, 0, Math.PI * 2);
    ctx.fill();

    // core
    ctx.beginPath();
    ctx.fillStyle = p.col.c.replace("0.95", String(a));
    ctx.arc(p.x, p.y, r * 1.35, 0, Math.PI * 2);
    ctx.fill();

    // spark cross
    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = p.col.c.replace("0.95", String(a));
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(p.x - r * 2.2, p.y);
    ctx.lineTo(p.x + r * 2.2, p.y);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(p.x, p.y - r * 2.2);
    ctx.lineTo(p.x, p.y + r * 2.2);
    ctx.stroke();

    ctx.restore();
  }

  function step() {
    ctx.clearRect(0, 0, W, H);

    // Emisión constante + extra si hay mouse
    spawn(mouse.active ? 4 : 2);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.tw += 0.08;
      p.vx += Math.sin(p.tw) * 0.002 + p.drift * 0.002;
      p.vy += 0.001;

      // interacción mouse
      if (mouse.active) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) + 0.001;

        const radius = 180;
        if (dist < radius) {
          const f = (1 - dist / radius);
          const nx = dx / dist;
          const ny = dy / dist;

          p.vx += nx * f * 0.12;
          p.vy += ny * f * 0.12;

          p.vx += mouse.vx * f * 0.06;
          p.vy += mouse.vy * f * 0.06;
        }
      }

      p.x += p.vx;
      p.y += p.vy;

      p.vx *= 0.985;
      p.vy *= 0.985;

      p.life -= 1;

      if (p.life <= 0 || p.x < -160 || p.x > W + 160 || p.y < -260 || p.y > H + 260) {
        particles.splice(i, 1);
        continue;
      }

      drawSpark(p);
    }

    requestAnimationFrame(step);
  }

  function onMove(e) {
    const point = e.touches?.[0] || e;
    const rect = hero.getBoundingClientRect();
    const x = point.clientX - rect.left;
    const y = point.clientY - rect.top;

    mouse.vx = x - lastMouse.x;
    mouse.vy = y - lastMouse.y;

    lastMouse.x = x;
    lastMouse.y = y;

    mouse.x = x;
    mouse.y = y;
    mouse.active = true;
  }

  function onLeave() {
    mouse.active = false;
    mouse.vx = mouse.vy = 0;
  }

  // resize pro
  const ro = new ResizeObserver(() => resize());
  ro.observe(hero);

  window.addEventListener("resize", resize);
  const onPointerDown = (e) => {
    hero.setPointerCapture?.(e.pointerId);
    onMove(e);
  };

  const onPointerMove = (e) => {
    onMove(e);
  };

  const onPointerUp = (e) => {
    hero.releasePointerCapture?.(e.pointerId);
    onLeave();
  };

  hero.addEventListener("pointerdown", onPointerDown, { passive: false });
  hero.addEventListener("pointermove", onPointerMove, { passive: false });
  hero.addEventListener("pointerup", onPointerUp, { passive: false });
  hero.addEventListener("pointercancel", onPointerUp, { passive: false });

  resize();

  // init mouse center
  lastMouse.x = W * 0.6;
  lastMouse.y = H * 0.5;
  mouse.x = lastMouse.x;
  mouse.y = lastMouse.y;

  step();
})();
