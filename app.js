/* ===================================================================
   Painel MCI · OPSS 2026 — lógica de cálculo
   Regras definidas pelo SEQUALI (set/2026):
   - Data de liberação do treinamento no Humand = política disseminada.
   - O MCI conta apenas políticas CONCLUÍDAS.
   - Os círculos mensais mostram o MCI ACUMULADO ao fim de cada mês.
   - Atraso é medido contra o FIM da semana prevista (a semana toda é o prazo).
   =================================================================== */

const STATUS_LABEL = {
  concluido: "Concluído",
  andamento: "Em andamento",
  atraso: "Em atraso",
  reagendado: "Reagendado",
  nao: "Não concluído",
};

const STATUS_WEIGHT = { concluido: 100, andamento: 50, reagendado: 30, atraso: 20, nao: 0 };

const MARCO_LABEL = "Relatório de Encerramento do Projeto";

const MS_DIA = 86400000;

function parseDateBR(str) {
  if (!str) return new Date(NaN);
  const m = String(str).trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return new Date(NaN);
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d ? dt : new Date(NaN);
}

function dataValida(str) {
  return !Number.isNaN(parseDateBR(str).getTime());
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function fmtPct(n) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

async function loadData() {
  const res = await fetch("data.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Não foi possível carregar data.json");
  return res.json();
}

function buildModel(data) {
  const { projeto, mesesEsperado, politicas, semanas, cronograma, acoes } = data;
  const metaInicial = projeto.metaInicial;
  const metaFinal = projeto.metaFinal;
  const pesoPorPolitica = (metaFinal - metaInicial) / politicas.length;

  const semanaByNumero = new Map(semanas.map((s) => [s.numero, s]));
  const isMarco = (numero) => !!semanaByNumero.get(numero)?.marco;
  const linhas = acoes.filter((a) => !isMarco(a.semana) && a.politica !== MARCO_LABEL);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // --- Validação de datas: qualquer valor preenchido fora de dd/mm/aaaa é erro ---
  const datasInvalidas = linhas
    .filter((a) => a.inicio && !dataValida(a.inicio))
    .map((a) => ({ politica: a.politica, valor: a.inicio }));

  // --- Status mais avançado por política ---
  const statusPorPolitica = new Map();
  for (const a of linhas) {
    const atual = statusPorPolitica.get(a.politica);
    if (!atual || STATUS_WEIGHT[a.status] > STATUS_WEIGHT[atual.status]) {
      statusPorPolitica.set(a.politica, a);
    }
  }

  // --- MCI: conta apenas políticas concluídas ---
  const concluidas = Array.from(statusPorPolitica.values()).filter((a) => a.status === "concluido");
  const disseminadas = concluidas.length;
  const mci = round2(metaInicial + disseminadas * pesoPorPolitica);

  // --- Evolução acumulada por mês ---
  // Ao fim de cada mês: MCI considerando as políticas concluídas até aquele mês.
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();
  const evolucaoMensal = mesesEsperado.map((mes) => {
    const futuro = anoAtual < 2026 || (anoAtual === 2026 && mesAtual < mes.mesIndex);
    if (futuro) return null; // mês ainda não começou: não inventa valor
    const qtd = concluidas.filter((a) => {
      const d = parseDateBR(a.inicio);
      if (Number.isNaN(d.getTime())) return false;
      return d.getFullYear() === 2026 && d.getMonth() <= mes.mesIndex;
    }).length;
    return round2(metaInicial + qtd * pesoPorPolitica);
  });

  const previstas = politicas.length;
  const realizadas = disseminadas;
  const execucao = Array.from(statusPorPolitica.values()).filter((a) => a.status === "andamento").length;

  // --- Aderência ao cronograma ---
  // Prazo de uma política = a semana prevista inteira. "No prazo" = liberou até a sexta daquela semana.
  const aderencia = [];
  for (const a of linhas) {
    const semana = semanaByNumero.get(a.semana);
    const real = parseDateBR(a.inicio);
    if (!semana || Number.isNaN(real.getTime())) {
      aderencia.push({ linha: a, estado: "sem-data" });
      continue;
    }
    if (real > hoje) {
      aderencia.push({ linha: a, estado: "programado" });
      continue;
    }
    const limite = parseDateBR(semana.fim);
    const dias = Math.round((real - limite) / MS_DIA); // negativo = liberou antes do fim do prazo
    aderencia.push({
      linha: a,
      estado: dias > 0 ? "atrasado" : "no-prazo",
      dias: dias > 0 ? dias : 0,
      delta: dias,
    });
  }
  const aderenciaPorChave = new Map(aderencia.map((x) => [`${x.linha.semana}::${x.linha.politica}`, x]));
  const iniciadas = aderencia.filter((x) => x.estado === "no-prazo" || x.estado === "atrasado");
  const noPrazo = iniciadas.filter((x) => x.estado === "no-prazo").length;
  const atrasadas = iniciadas.filter((x) => x.estado === "atrasado");
  const atrasoMedio = atrasadas.length
    ? Math.round(atrasadas.reduce((s, x) => s + x.dias, 0) / atrasadas.length)
    : 0;

  // Série do ritmo: liberações já ocorridas, em ordem de semana
  const serieRitmo = iniciadas
    .slice()
    .sort((a, b) => a.linha.semana - b.linha.semana || a.linha.politica.localeCompare(b.linha.politica));
  // Sequência atual de liberações no prazo, contada do fim para trás
  let sequenciaNoPrazo = 0;
  for (let i = serieRitmo.length - 1; i >= 0; i--) {
    if (serieRitmo[i].estado !== "no-prazo") break;
    sequenciaNoPrazo++;
  }
  // Onde a sequência começa (para a marca de virada)
  const indiceVirada = sequenciaNoPrazo > 0 && sequenciaNoPrazo < serieRitmo.length
    ? serieRitmo.length - sequenciaNoPrazo
    : -1;

  // --- Pendências: prazo da semana já venceu e a política não avançou ---
  const previstoFimPorPolitica = new Map();
  for (const [semanaStr, nomes] of Object.entries(cronograma)) {
    const semana = semanaByNumero.get(Number(semanaStr));
    if (!semana) continue;
    for (const nome of nomes) previstoFimPorPolitica.set(nome, semana.fim);
  }
  let pendencias = 0;
  for (const p of politicas) {
    const fim = previstoFimPorPolitica.get(p.nome);
    if (!fim || hoje <= parseDateBR(fim)) continue;
    const st = statusPorPolitica.get(p.nome)?.status;
    if (st !== "concluido" && st !== "andamento" && st !== "reagendado") pendencias++;
  }

  // --- Semana atual ---
  let semanaAtual = semanas.find((s) => hoje >= parseDateBR(s.inicio) && hoje <= parseDateBR(s.fim)) || null;
  if (!semanaAtual && hoje >= parseDateBR(semanas[0].inicio)) {
    const passadas = semanas.filter((s) => hoje >= parseDateBR(s.inicio));
    semanaAtual = passadas.length ? passadas[passadas.length - 1] : null;
  }

  const reunioes = 1 + linhas.filter((a) => a.reuniao === "Sim").length;

  // --- Próximas disseminações ---
  const proximas = [];
  for (const s of semanas) {
    if (s.marco) continue;
    for (const nome of cronograma[String(s.numero)] || []) {
      if (statusPorPolitica.get(nome)?.status === "concluido") continue;
      if (hoje > parseDateBR(s.fim)) continue;
      proximas.push({ politica: nome, semana: s.numero, inicio: s.inicio, fim: s.fim });
    }
  }

  const mesIdxAtual = Math.min(3, Math.max(0, mesAtual - 7));
  const esperadoAtual = mesesEsperado[mesIdxAtual].esperado;

  let statusMci = { label: "Atenção", tone: "danger" };
  if (mci >= metaFinal) statusMci = { label: "Meta atingida", tone: "success" };
  else if (mci >= esperadoAtual) statusMci = { label: "Dentro do esperado", tone: "warning" };

  return {
    projeto, mesesEsperado, evolucaoMensal, esperadoAtual,
    disseminadas, totalPoliticas: politicas.length, mci,
    previstas, realizadas, execucao, pendencias, semanaAtual, reunioes,
    proximas3: proximas.slice(0, 3), statusMci, datasInvalidas,
    noPrazo, totalIniciadas: iniciadas.length, atrasoMedio,
    aderenciaPorChave, serieRitmo, sequenciaNoPrazo, indiceVirada,
    linhasOrdenadas: [...linhas].sort((a, b) => a.semana - b.semana),
    semanaByNumero,
    politicaSetor: new Map(politicas.map((p) => [p.nome, p.setor])),
  };
}

function render(model) {
  const { projeto } = model;

  document.getElementById("hdr-titulo").textContent = projeto.objetivo
    .replace("{metaInicial}", projeto.metaInicial)
    .replace("{metaFinal}", projeto.metaFinal);
  document.getElementById("hdr-abertura").textContent = projeto.abertura;
  document.getElementById("hdr-dissem").textContent = projeto.disseminacao;
  document.getElementById("hdr-prazo").textContent = projeto.prazo;
  document.getElementById("md-texto").textContent = projeto.medidaDirecao;

  // Alerta de datas inválidas
  const alerta = document.getElementById("alerta-datas");
  if (model.datasInvalidas.length) {
    alerta.hidden = false;
    alerta.innerHTML =
      "<strong>Datas fora do formato dd/mm/aaaa — não entram no cálculo:</strong> " +
      model.datasInvalidas.map((d) => `${d.politica} (${d.valor})`).join(" · ");
  } else {
    alerta.hidden = true;
  }

  // Círculos mensais (acumulados)
  const mesesEl = document.getElementById("meses-grid");
  mesesEl.innerHTML = "";
  model.mesesEsperado.forEach((mes, i) => {
    const valor = model.evolucaoMensal[i];
    const futuro = valor === null;
    const circunf = 2 * Math.PI * 32;
    const dash = futuro ? 0 : circunf * (Math.min(100, valor) / 100);
    const wrap = document.createElement("div");
    wrap.className = "mes-item";
    wrap.innerHTML = `
      <div class="mes-label">${mes.label.toUpperCase()}</div>
      <div class="mes-gauge">
        <svg viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="32" stroke="var(--track)" stroke-width="6" fill="none"/>
          <circle cx="40" cy="40" r="32" stroke="url(#trimGrad)" stroke-width="6" fill="none"
            stroke-linecap="round" stroke-dasharray="${dash} ${circunf}" transform="rotate(-90 40 40)"/>
        </svg>
        <div class="mes-valor${futuro ? " mes-futuro" : ""}">${futuro ? "—" : fmtPct(valor) + "<span>%</span>"}</div>
      </div>
      <div class="mes-esperado">Esperado ${mes.esperado.toLocaleString("pt-BR")}%</div>
    `;
    mesesEl.appendChild(wrap);
  });

  // Barra
  document.getElementById("barra-fill").style.width = `${Math.min(100, model.mci)}%`;
  document.getElementById("barra-meta-marker").style.left = `${projeto.metaFinal}%`;
  document.getElementById("barra-meta-label").textContent = `Meta ${projeto.metaFinal}%`;

  const capyRow = document.getElementById("capy-row");
  capyRow.innerHTML = "";
  for (let i = 0; i < model.totalPoliticas; i++) {
    const dot = document.createElement("span");
    dot.className = "capy-dot" + (i < model.disseminadas ? " on" : "");
    capyRow.appendChild(dot);
  }
  document.getElementById("capy-count").textContent = `${model.disseminadas}/${model.totalPoliticas} disseminadas`;

  document.getElementById("atual-valor").innerHTML = fmtPct(model.mci) + "<span>%</span>";
  document.getElementById("atual-meta").textContent = `Meta consolidada – ${projeto.metaFinal}%`;
  document.getElementById("meta-final-valor").innerHTML = projeto.metaFinal + "<span>%</span>";
  document.getElementById("prazo-final-valor").textContent = projeto.prazo;

  const badge = document.getElementById("mci-status-badge");
  badge.textContent = `MCI: ${model.statusMci.label}`;
  badge.className = "badge-status tone-" + model.statusMci.tone;

  // Cards
  document.getElementById("card-mci").textContent = `${fmtPct(model.mci)}%`;
  document.getElementById("card-mci-hint").textContent = `de ${projeto.metaInicial}% para ${projeto.metaFinal}%`;
  document.getElementById("card-previstas").textContent = model.previstas;
  document.getElementById("card-realizadas").textContent = model.realizadas;
  document.getElementById("card-execucao").textContent = model.execucao;

  const cardPend = document.getElementById("card-pendencias");
  cardPend.textContent = model.pendencias;
  cardPend.className = "mini-valor " + (model.pendencias > 0 ? "text-danger" : "text-success");

  const cardPrazo = document.getElementById("card-prazo");
  cardPrazo.textContent = `${model.noPrazo}/${model.totalIniciadas}`;
  const pctPrazo = model.totalIniciadas ? (model.noPrazo / model.totalIniciadas) * 100 : 0;
  cardPrazo.className = "mini-valor " + (pctPrazo >= 70 ? "text-success" : pctPrazo >= 40 ? "" : "text-danger");
  document.getElementById("card-prazo-hint").textContent = model.atrasoMedio
    ? `liberadas na semana prevista · atraso médio ${model.atrasoMedio} dias`
    : "liberadas na semana prevista";

  document.getElementById("card-semana").textContent = model.semanaAtual
    ? String(model.semanaAtual.numero).padStart(2, "0")
    : "—";
  document.getElementById("card-semana-hint").textContent = model.semanaAtual
    ? `${model.semanaAtual.inicio} a ${model.semanaAtual.fim}`
    : "fora do período";
  document.getElementById("card-reuniao").textContent = model.reunioes;

  // Próximas disseminações
  const proxEl = document.getElementById("proximas-lista");
  proxEl.innerHTML = model.proximas3.length
    ? ""
    : `<li class="prox-vazio">Nenhuma disseminação futura no calendário.</li>`;
  for (const p of model.proximas3) {
    const li = document.createElement("li");
    li.className = "prox-item";
    li.innerHTML = `<div class="prox-politica">${p.politica}</div>
      <div class="prox-detalhe">Semana ${String(p.semana).padStart(2, "0")} · ${p.inicio} a ${p.fim}</div>`;
    proxEl.appendChild(li);
  }

  renderRitmo(model);

  // Placar semanal
  const placarEl = document.getElementById("placar-body");
  placarEl.innerHTML = "";
  const semana0 = model.semanaByNumero.get(0);
  if (semana0) placarEl.appendChild(marcoRow(semana0));

  for (const linha of model.linhasOrdenadas) {
    const semanaInfo = model.semanaByNumero.get(linha.semana);
    const setor = model.politicaSetor.get(linha.politica) || "";
    const ad = model.aderenciaPorChave.get(`${linha.semana}::${linha.politica}`);
    const row = document.createElement("div");
    row.className = "placar-row" + (linha.status === "concluido" ? " row-ok" : "");
    row.innerHTML = `
      <div class="col-semana" data-rotulo="Semana">${String(linha.semana).padStart(2, "0")}</div>
      <div class="col-politica">${linha.politica}</div>
      <div class="col-periodo" data-rotulo="Previsto">${semanaInfo ? `${semanaInfo.inicio} a ${semanaInfo.fim}` : ""}</div>
      <div class="col-setor" data-rotulo="Setor">${setor}</div>
      <div class="col-inicio" data-rotulo="Liberado">${linha.inicio ? (dataValida(linha.inicio) ? linha.inicio : `<span class="data-ruim" title="Formato inválido">${linha.inicio}</span>`) : "—"}</div>
      <div class="col-atraso" data-rotulo="Atraso">${atrasoBadge(ad)}</div>
      <div class="col-status" data-rotulo="Status"><span class="status-pill status-${linha.status}">${STATUS_LABEL[linha.status]}</span></div>
      <div class="col-reuniao" data-rotulo="Reunião">${linha.reuniao}</div>
    `;
    placarEl.appendChild(row);
  }

  const semanaFinal = model.semanaByNumero.get(18);
  if (semanaFinal) placarEl.appendChild(marcoRow(semanaFinal, true));
}

/* Gráfico de ritmo: dias de cada liberação em relação ao fim da semana prevista.
   Diverging — acima da linha = passou do prazo, abaixo = saiu dentro da semana.
   Par de cores validado para daltonismo (script validate_palette do skill dataviz). */
const COR_ATRASO = "#d93500";
const COR_PRAZO = "#0080a3";

function renderRitmo(model) {
  const secao = document.getElementById("secao-ritmo");
  const serie = model.serieRitmo;
  if (!serie.length) {
    secao.hidden = true;
    return;
  }
  secao.hidden = false;

  // viewBox proporcional à largura da tela: mantém o texto legível no celular,
  // onde um viewBox largo encolheria os rótulos para uns 5px.
  const estreito = window.innerWidth < 700;
  const W = estreito ? 400 : 760;
  const H = estreito ? 250 : 232;
  const padE = estreito ? 46 : 60, padD = estreito ? 8 : 16;
  const padTopo = estreito ? 40 : 34, alturaEixo = 34;
  const larguraPlot = W - padE - padD;
  const alturaPlot = H - padTopo - alturaEixo;

  // Eixo em "antecedência": positivo = liberou antes do fim do prazo (sobe),
  // negativo = passou do prazo (desce). Assim o lado bom é para cima.
  const antecedencia = (x) => -x.delta;
  const valores = serie.map(antecedencia);
  const maxPos = Math.max(6, ...valores);
  // Folga embaixo para o rótulo da barra mais funda não encostar no eixo
  const maxNeg = Math.min(-6, ...valores) * 1.16;
  const dominio = maxPos - maxNeg;
  const y = (v) => padTopo + ((maxPos - v) / dominio) * alturaPlot;
  const yZero = y(0);

  const banda = larguraPlot / serie.length;
  const larguraBarra = Math.min(estreito ? 12 : 18, banda * 0.42);

  let barras = "";
  let rotulos = "";
  let alvos = "";

  serie.forEach((item, i) => {
    const cx = padE + banda * i + banda / 2;
    const x = cx - larguraBarra / 2;
    const v = antecedencia(item);
    const atrasado = v < 0;          // abaixo da linha
    const cor = atrasado ? COR_ATRASO : COR_PRAZO;
    const paraCima = !atrasado;
    const yTopo = paraCima ? y(v) : yZero;
    const alt = Math.max(3, Math.abs(y(v) - yZero));
    // Ponta arredondada no extremo do dado, reta na linha de base
    const r = 4;
    const d = paraCima
      ? `M${x},${yTopo + alt} L${x},${yTopo + r} Q${x},${yTopo} ${x + r},${yTopo} L${x + larguraBarra - r},${yTopo} Q${x + larguraBarra},${yTopo} ${x + larguraBarra},${yTopo + r} L${x + larguraBarra},${yTopo + alt} Z`
      : `M${x},${yZero} L${x},${yZero + alt - r} Q${x},${yZero + alt} ${x + r},${yZero + alt} L${x + larguraBarra - r},${yZero + alt} Q${x + larguraBarra},${yZero + alt} ${x + larguraBarra},${yZero + alt - r} L${x + larguraBarra},${yZero} Z`;
    barras += `<path d="${d}" fill="${cor}"/>`;

    // Rótulo direto apenas nos extremos (os atrasos mais longos)
    if (atrasado && v === Math.min(...valores)) {
      rotulos += `<text x="${cx}" y="${yZero + alt + 14}" class="rot-valor" text-anchor="middle">${Math.abs(v)}d</text>`;
    }

    // Número da semana no eixo
    rotulos += `<text x="${cx}" y="${H - 14}" class="rot-eixo" text-anchor="middle">${String(item.linha.semana).padStart(2, "0")}</text>`;

    // Alvo de hover generoso
    const titulo = `${item.linha.politica} · semana ${String(item.linha.semana).padStart(2, "0")} · liberado ${item.linha.inicio} · ${
      atrasado ? `${v} dias depois do prazo` : `${Math.abs(v)} dias antes do fim do prazo`
    }`;
    alvos += `<rect x="${padE + banda * i}" y="${padTopo}" width="${banda}" height="${alturaPlot}" fill="transparent" class="alvo-ritmo"><title>${titulo}</title></rect>`;
  });

  // Marca da virada
  let virada = "";
  if (model.indiceVirada > 0) {
    const xv = padE + banda * model.indiceVirada;
    virada = `
      <line x1="${xv}" y1="${padTopo - 8}" x2="${xv}" y2="${padTopo + alturaPlot}" class="linha-virada"/>
      <text x="${estreito ? xv + 4 : xv + 6}" y="${padTopo - 12}" class="rot-virada">${
        estreito ? "daqui em diante, no prazo" : "a partir daqui, no prazo"
      }</text>`;
  }

  secao.querySelector(".ritmo-svg").innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Dias de cada liberação em relação ao fim da semana prevista, em ordem de semana">
      ${virada}
      <line x1="${padE}" y1="${yZero}" x2="${W - padD}" y2="${yZero}" class="linha-zero"/>
      <text x="${padE - 8}" y="${yZero + 4}" class="rot-eixo" text-anchor="end">prazo</text>
      <text x="${padE - 8}" y="${yZero - 14}" class="rot-direcao" text-anchor="end">no prazo ▲</text>
      <text x="${padE - 8}" y="${yZero + 22}" class="rot-direcao" text-anchor="end">atrasado ▼</text>
      ${barras}
      ${rotulos}
      ${alvos}
    </svg>`;

  const atrasadasN = model.totalIniciadas - model.noPrazo;
  secao.querySelector(".ritmo-leitura").textContent =
    `As ${atrasadasN} primeiras liberações passaram do prazo, com atraso médio de ${model.atrasoMedio} dias. ` +
    `As ${model.sequenciaNoPrazo} últimas saíram dentro da semana prevista.`;
}

function atrasoBadge(ad) {
  if (!ad) return `<span class="atraso-na">—</span>`;
  if (ad.estado === "no-prazo") return `<span class="atraso-ok">No prazo</span>`;
  if (ad.estado === "atrasado") return `<span class="atraso-late">+${ad.dias} dias</span>`;
  if (ad.estado === "programado") return `<span class="atraso-prog">Programado</span>`;
  return `<span class="atraso-na">—</span>`;
}

function marcoRow(semana, comRelatorio) {
  const div = document.createElement("div");
  div.className = "placar-marco";
  div.innerHTML = `
    <div class="marco-titulo">${semana.rotulo}</div>
    <div class="marco-sub">${semana.inicio} · marco do projeto (não contabilizado nas disseminações)</div>
    ${comRelatorio && semana.notaMarco ? `<div class="marco-relatorio">${semana.notaMarco}</div>` : ""}
  `;
  return div;
}

async function main() {
  try {
    const data = await loadData();
    modeloAtual = buildModel(data);
    render(modeloAtual);
  } catch (err) {
    console.error(err);
    document.body.innerHTML =
      '<div style="padding:2rem;font-family:sans-serif">Não foi possível carregar os dados do painel. Verifique se o arquivo <code>data.json</code> está publicado junto com esta página.</div>';
  }
}

// Redesenha o gráfico quando a tela muda de faixa (o viewBox depende da largura)
let modeloAtual = null;
let larguraAnterior = window.innerWidth < 700;
let timerResize;
window.addEventListener("resize", () => {
  clearTimeout(timerResize);
  timerResize = setTimeout(() => {
    const agora = window.innerWidth < 700;
    if (agora !== larguraAnterior && modeloAtual) {
      larguraAnterior = agora;
      renderRitmo(modeloAtual);
    }
  }, 150);
});

main();
