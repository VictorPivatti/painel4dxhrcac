/* ==========================================================================
   Abertura "Meta atingida!"
   Aparece uma vez por aba quando o MCI chega à meta (ou sempre com ?abertura
   na URL). Dura ~6s, pula com clique, toque ou Esc. Quem pediu ao sistema
   para reduzir movimento não vê a abertura.
   Uso: aberturaMeta({ mci, meta, disseminadas, total, prazo }, aoFechar)
   ========================================================================== */
(function () {
  const CHAVE = "painel4dx-abertura-meta";
  const CORES = ["#e6ad00", "#ffd84d", "#f5b300", "#23a136", "#7fd18b", "#7fb8c9", "#ffffff", "#e2463a"];

  function deveMostrar() {
    const forcar = /[?&]abertura\b/.test(location.search);
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if (forcar) return true;
    try {
      if (sessionStorage.getItem(CHAVE)) return false;
      sessionStorage.setItem(CHAVE, "1");
    } catch (e) { /* armazenamento indisponível: mostra mesmo assim */ }
    return true;
  }

  const fmt = (n, casas) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

  const TROFEU = `
    <svg viewBox="0 0 120 130" class="ab-trofeu" aria-hidden="true">
      <defs>
        <linearGradient id="abOuro" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#fff2a8"/><stop offset=".35" stop-color="#ffd84d"/>
          <stop offset=".7" stop-color="#e6ad00"/><stop offset="1" stop-color="#a87700"/>
        </linearGradient>
        <linearGradient id="abOuroEsc" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#e6ad00"/><stop offset="1" stop-color="#8a6000"/>
        </linearGradient>
      </defs>
      <path d="M30 22 C10 22 8 52 34 58" fill="none" stroke="url(#abOuroEsc)" stroke-width="7" stroke-linecap="round"/>
      <path d="M90 22 C110 22 112 52 86 58" fill="none" stroke="url(#abOuroEsc)" stroke-width="7" stroke-linecap="round"/>
      <path d="M28 12 H92 V40 C92 62 78 76 60 76 C42 76 28 62 28 40 Z" fill="url(#abOuro)" stroke="#a87700" stroke-width="1.5"/>
      <path d="M38 18 C38 44 42 60 52 68" fill="none" stroke="#fff8d0" stroke-width="4" stroke-linecap="round" opacity=".7"/>
      <rect x="53" y="76" width="14" height="16" fill="url(#abOuroEsc)"/>
      <path d="M40 92 H80 L84 104 H36 Z" fill="url(#abOuro)" stroke="#a87700" stroke-width="1.2"/>
      <rect x="32" y="104" width="56" height="14" rx="3" fill="#0b3a1a" stroke="#e6ad00" stroke-width="1.5"/>
      <text x="60" y="114.5" text-anchor="middle" font-size="8" font-weight="700" fill="#ffd84d" font-family="Inter, sans-serif" letter-spacing="1">MCI 2026</text>
      <path d="M60 26 L63.5 34 L72 34.6 L65.5 40 L67.7 48.4 L60 43.8 L52.3 48.4 L54.5 40 L48 34.6 L56.5 34 Z" fill="#fff8d0" opacity=".95"/>
    </svg>`;

  const PEIXE = `
    <g class="ab-peixe-corpo">
      <path d="M-10 0 L-17.5 -6.5 Q-14.6 0 -17.5 6.5 Z" fill="#f2a400" stroke="#a86f00" stroke-width=".6"/>
      <path d="M-4 -5.6 Q0 -10.5 5 -6.2 Z" fill="#f2a400" stroke="#a86f00" stroke-width=".6"/>
      <path d="M-11 0 C-6 -7.2 5 -8 11.5 -1.6 Q13.2 0 11.5 1.6 C5 7.6 -6 6.8 -11 0 Z" fill="#ffc21a" stroke="#a86f00" stroke-width=".7"/>
      <path d="M-8.5 1.6 C-3 6 5 6 10.5 2 C5 4.4 -3 4.4 -8.5 1.6 Z" fill="#fff3c4" opacity=".85"/>
      <circle cx="8" cy="-1.6" r="1.7" fill="#2b1e00"/><circle cx="8.6" cy="-2.2" r=".6" fill="#fff"/>
    </g>`;

  function ondas() {
    const onda = (y, a, p) => {
      let d = `M0 ${y} Q${p / 4} ${y - a} ${p / 2} ${y}`;
      for (let x = p / 2; x < 2880; ) { x += p / 2; d += ` T${x} ${y}`; }
      return d + " V160 H0 Z";
    };
    const peixes = [10, 34, 60, 82].map((x, i) =>
      `<svg class="ab-peixe" viewBox="-20 -12 40 24" style="left:${x}%;animation-delay:${(2.6 + i * 0.4).toFixed(2)}s">${PEIXE}</svg>`).join("");
    return `
      <div class="ab-peixes" aria-hidden="true">${peixes}</div>
      <svg class="ab-ondas" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
        <path class="ab-onda ab-onda-1" d="${onda(70, 16, 720)}"/>
        <path class="ab-onda ab-onda-2" d="${onda(92, 12, 960)}"/>
        <path class="ab-onda ab-onda-3" d="${onda(114, 10, 540)}"/>
      </svg>`;
  }

  // Confete em canvas: leve, sem biblioteca externa
  function confete(canvas) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ajustar = () => {
      canvas.width = canvas.clientWidth * dpr; canvas.height = canvas.clientHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    ajustar();
    const W = () => canvas.clientWidth, H = () => canvas.clientHeight;
    let parts = [], rodando = true;
    const rajada = (x, y, ang, n) => {
      for (let i = 0; i < n; i++) {
        const a = ang + (Math.random() - 0.5) * 1.1;
        const v = 7 + Math.random() * 9;
        parts.push({
          x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          w: 6 + Math.random() * 7, h: 3 + Math.random() * 4,
          rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
          cor: CORES[(Math.random() * CORES.length) | 0], forma: Math.random() < 0.25 ? "c" : "r",
          osc: Math.random() * Math.PI * 2, vida: 0,
        });
      }
    };
    const disparar = () => {
      const k = Math.max(0.45, Math.min(1, W() / 1200)); // menos confete em tela pequena
      rajada(0, H() * 0.78, -Math.PI / 3.2, Math.round(90 * k));
      rajada(W(), H() * 0.78, -Math.PI + Math.PI / 3.2, Math.round(90 * k));
      // chuva do topo, espalhada pela largura (no lugar do estouro central, que cobria o título)
      for (let i = 0, n = Math.round(70 * k); i < n; i++) {
        parts.push({
          x: Math.random() * W(), y: -10 - Math.random() * H() * 0.4, vx: (Math.random() - 0.5) * 2, vy: 1 + Math.random() * 2,
          w: 6 + Math.random() * 7, h: 3 + Math.random() * 4, rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.25,
          cor: CORES[(Math.random() * CORES.length) | 0], forma: Math.random() < 0.25 ? "c" : "r", osc: Math.random() * 6.28, vida: 0,
        });
      }
    };
    const passo = () => {
      if (!rodando) return;
      ctx.clearRect(0, 0, W(), H());
      parts = parts.filter((p) => p.y < H() + 30 && p.vida < 420);
      for (const p of parts) {
        p.vida++; p.vy += 0.22; p.vx *= 0.985; p.vy *= 0.985;
        p.osc += 0.08; p.x += p.vx + Math.sin(p.osc) * 0.6; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.cor;
        ctx.globalAlpha = Math.min(1, (420 - p.vida) / 60);
        if (p.forma === "c") { ctx.beginPath(); ctx.arc(0, 0, p.h, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.osc)) + 1);
        ctx.restore();
      }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
    window.addEventListener("resize", ajustar);
    return { disparar, parar: () => { rodando = false; window.removeEventListener("resize", ajustar); } };
  }

  window.aberturaMeta = function (dados, aoFechar) {
    const fim = () => { try { aoFechar && aoFechar(); } catch (e) { console.warn(e); } };
    if (!deveMostrar()) { document.documentElement.classList.remove("pre-abertura"); fim(); return false; }

    const titulo = "Meta atingida!";
    const letras = [...titulo].map((c, i) =>
      `<span class="ab-letra" style="--li:${i}">${c === " " ? "&nbsp;" : c}</span>`).join("");

    const el = document.createElement("div");
    el.className = "abertura";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", `Meta atingida: MCI ${fmt(dados.mci, 2)}%`);
    el.innerHTML = `
      <div class="ab-brilho" aria-hidden="true"></div>
      <div class="ab-raios" aria-hidden="true"></div>
      <canvas class="ab-confete" aria-hidden="true"></canvas>
      <div class="ab-conteudo">
        ${TROFEU}
        <div class="ab-kicker">🌿 Disseminação das Políticas Institucionais · MCI · OPSS 2026</div>
        <h1 class="ab-titulo">${letras}</h1>
        <div class="ab-numero"><span class="ab-pct">0,00</span><span class="ab-pct-sinal">%</span></div>
        <div class="ab-sub">${dados.disseminadas} de ${dados.total} políticas disseminadas · meta de ${dados.meta}% superada antes do prazo (${dados.prazo})</div>
        <button type="button" class="ab-pular">Ver o painel →</button>
      </div>
      ${ondas()}`;
    document.body.appendChild(el);
    document.body.classList.add("com-abertura");
    document.documentElement.classList.remove("pre-abertura"); // a abertura já cobre a tela

    const fx = confete(el.querySelector(".ab-confete"));
    const pctEl = el.querySelector(".ab-pct");
    const botao = el.querySelector(".ab-pular");

    // Contagem do MCI (começa após a entrada do título)
    const T0 = 1100, DUR = 1700;
    let t0 = null, fechado = false;
    const contar = (t) => {
      if (fechado) return;
      if (t0 === null) t0 = t;
      const p = Math.min(1, (t - t0) / DUR);
      const e = 1 - Math.pow(1 - p, 4);
      pctEl.textContent = fmt(dados.mci * e, 2);
      if (p < 1) requestAnimationFrame(contar);
      else { pctEl.textContent = fmt(dados.mci, 2); el.classList.add("ab-final"); fx.disparar(); }
    };
    const timers = [
      setTimeout(() => requestAnimationFrame(contar), T0),
      setTimeout(() => fechar(), 6800),
    ];

    function fechar() {
      if (fechado) return;
      fechado = true;
      timers.forEach(clearTimeout);
      el.classList.add("ab-saindo");
      document.removeEventListener("keydown", tecla);
      setTimeout(() => {
        fx.parar(); el.remove(); document.body.classList.remove("com-abertura");
        window.scrollTo(0, 0);
        fim();
      }, 900);
    }
    const tecla = (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") { e.preventDefault(); fechar(); } };
    el.addEventListener("click", fechar);
    document.addEventListener("keydown", tecla);
    setTimeout(() => botao.focus({ preventScroll: true }), 50);
    return true;
  };
})();
