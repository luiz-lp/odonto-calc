const APP_VERSION = "1.0.6";
const versionEl = document.getElementById("appVersion");
if (versionEl) {
  versionEl.textContent = APP_VERSION;
}

// ===== Helpers =====
const $ = (id) => document.getElementById(id);

function toNumberBR(val){
  if (val == null) return NaN;
  const s = String(val).trim().replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

function fmt(n, digits = 2){
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(digits).replace(".", ",");
}

function clampMin0(n){ return Math.max(0, n); }

// ===== Tabs =====
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach(btn => {
  btn.addEventListener("click", () => {
    tabs.forEach(b => b.classList.remove("is-active"));
    btn.classList.add("is-active");

    const name = btn.dataset.tab;
    panels.forEach(p => p.classList.remove("is-active"));
    $(`tab-${name}`).classList.add("is-active");
  });
});

// ===== Theme =====
const themeBtn = $("themeBtn");
const themeIcon = $("themeIcon");

function setTheme(mode){
  document.documentElement.setAttribute("data-theme", mode);
  localStorage.setItem("odonto_theme", mode);
  themeIcon.textContent = mode === "light" ? "☀️" : "🌙";
}
const savedTheme = localStorage.getItem("odonto_theme");
setTheme(savedTheme === "light" ? "light" : "dark");

themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.getAttribute("data-theme");
  setTheme(cur === "light" ? "dark" : "light");
});

// ===== Data: anestésicos (ajuste como preferir) =====
// mg/ml pode ser inferido por % (mg/ml = %*10), mas deixei explícito pra ficar claro.
// doseMaxMgKg são referências comuns (variam por fonte/protocolo e presença de vaso).
// IMPORTANTE: você pode editar esses valores.
const anestesicos = [
  {
    key: "lidocaina_2",
    label: "Lidocaína 2%",
    pct: 2,
    mgMl: 20,
    doseMaxMgKgComVaso: 7,
    doseMaxMgKgSemVaso: 4.4,
    absMaxMg: 300,
    sessionMaxTubetes: 8.3
  },
  {
    key: "lidocaina_3",
    label: "Lidocaína 3%",
    pct: 3,
    mgMl: 30,
    doseMaxMgKgComVaso: 7,
    doseMaxMgKgSemVaso: 4.4,
    absMaxMg: 300,
    sessionMaxTubetes: 5.5
  },
  {
    key: "mepivacaina_2",
    label: "Mepivacaína 2%",
    pct: 2,
    mgMl: 20,
    doseMaxMgKgComVaso: 6.6,
    doseMaxMgKgSemVaso: 4.4,
    absMaxMg: 300,
    sessionMaxTubetes: 8.3
  },
  {
    key: "mepivacaina_3",
    label: "Mepivacaína 3%",
    pct: 3,
    mgMl: 30,
    doseMaxMgKgComVaso: 6.6,
    doseMaxMgKgSemVaso: 4.4,
    absMaxMg: 300,
    sessionMaxTubetes: 5.5
  },
  {
    key: "articaina_4",
    label: "Articaína 4%",
    pct: 4,
    mgMl: 40,
    doseMaxMgKgComVaso: 7,
    doseMaxMgKgSemVaso: 7,
    absMaxMg: 500,
    sessionMaxTubetes: 6.9
  },
  {
    key: "prilocaina_3",
    label: "Prilocaína 3%",
    pct: 3,
    mgMl: 30,
    doseMaxMgKgComVaso: 8,
    doseMaxMgKgSemVaso: 6,
    absMaxMg: 400,
    sessionMaxTubetes: 7.4
  },
  {
    key: "bupivacaina_05",
    label: "Bupivacaína 0,5%",
    pct: 0.5,
    mgMl: 5,
    doseMaxMgKgComVaso: 2,
    doseMaxMgKgSemVaso: 2,
    absMaxMg: 90,
    sessionMaxTubetes: 10
  }
];


function allowOnlyNumber(el) {
  el.addEventListener("input", () => {
    el.value = el.value.replace(/[^0-9.,]/g, "");
  });
}

[
  "pesoKg",
  "tubeteMl",
  "concPct",
  "tubeteMl2",
  "comprimentoMm",
  "reducaoMm"
].forEach(id => allowOnlyNumber($(id)));

// ===== Populate select =====
const anestSelect = $("anestesicoSelect");
anestesicos.forEach(a => {
  const opt = document.createElement("option");
  opt.value = a.key;
  opt.textContent = a.label;
  anestSelect.appendChild(opt);
});

// Persist inputs (opcional)
const persistIds = [
  "pesoKg","anestesicoSelect","vasoSelect","tubeteMl",
  "concPct","tubeteMl2",
  "comprimentoMm","reducaoMm"
];
persistIds.forEach(id => {
  const el = $(id);
  const saved = localStorage.getItem(`odonto_${id}`);
  if (saved != null && el){
    el.value = saved;
  }
  el?.addEventListener("input", () => localStorage.setItem(`odonto_${id}`, el.value));
  el?.addEventListener("change", () => localStorage.setItem(`odonto_${id}`, el.value));
});

// ===== Anestesia calc =====
function calcularAnestesia() {
  const peso = toNumberBR($("pesoKg").value);
  const tubeteMl = toNumberBR($("tubeteMl").value);
  const vaso = $("vasoSelect").value;
  const key = anestSelect.value;

  const a = anestesicos.find(x => x.key === key);
  const res = $("resAnestesia");

  // Se estiver incompleto/ inválido, limpa o resultado e sai
  if (!a || !Number.isFinite(peso) || peso <= 0 || !Number.isFinite(tubeteMl) || tubeteMl <= 0) {
    res.innerHTML = "Preencha os dados acima para ver o cálculo.";
    res.classList.add("muted");
    return;
  }

  res.classList.remove("muted");

  // Dose máxima por kg (com ou sem vasoconstritor)
  const doseMgKg = vaso === "com"
    ? a.doseMaxMgKgComVaso
    : a.doseMaxMgKgSemVaso;

  const isHighRisk = Number.isFinite(a.absMaxMg) && a.absMaxMg <= 100;

  // Dose calculada por peso
  const dosePorPesoMg = peso * doseMgKg;

  // Aplica máximo absoluto (se existir)
  const doseMaxMgFinal = (Number.isFinite(a.absMaxMg) && a.absMaxMg > 0)
    ? Math.min(dosePorPesoMg, a.absMaxMg)
    : dosePorPesoMg;

  // mg por tubete
  const mgPorTubete = a.mgMl * tubeteMl;
  let absMaxTubetesInfo = "";

  if (Number.isFinite(a.absMaxMg) && a.absMaxMg > 0) {
    const absTubetes = Math.floor(a.absMaxMg / mgPorTubete);
    absMaxTubetesInfo = `Máximo absoluto: ${fmt(a.absMaxMg, 0)} mg (≈ ${absTubetes} tubetes)`;
  }

  // Tubetes possíveis pelo limite em mg
  const tubetesPorMg = doseMaxMgFinal / mgPorTubete;
  const tubetesInteirosPorMg = Math.floor(tubetesPorMg);

  // Aplica máximo por sessão (se existir)
  const tubetesInteirosFinal = (Number.isFinite(a.sessionMaxTubetes) && a.sessionMaxTubetes > 0)
    ? Math.min(tubetesInteirosPorMg, Math.floor(a.sessionMaxTubetes))
    : tubetesInteirosPorMg;

  // Identificar qual limite foi aplicado
  let limiteAplicado = "";
  if (Number.isFinite(a.absMaxMg) && a.absMaxMg > 0 && doseMaxMgFinal < dosePorPesoMg) {
    limiteAplicado = `Limite aplicado: máximo absoluto de ${fmt(a.absMaxMg, 0)} mg.`;
  } else {
    limiteAplicado = "Limite aplicado: cálculo por peso (mg/kg).";
  }

  if (Number.isFinite(a.sessionMaxTubetes) && a.sessionMaxTubetes > 0 && tubetesInteirosFinal < tubetesInteirosPorMg) {
    limiteAplicado += ` Máximo por sessão: ${Math.floor(a.sessionMaxTubetes)} tubetes.`;
  }

  const absLimitActive =
  Number.isFinite(a.absMaxMg) &&
  a.absMaxMg > 0 &&
  doseMaxMgFinal < dosePorPesoMg;

  // Status visual (alerta clínico)
  let status = "ok";
  let aviso = "";

  if (tubetesInteirosFinal <= 0) {
    status = "crit";
    aviso = "Atenção: uma dose completa de 1 tubete ultrapassa a dose máxima permitida para este paciente.";
  } else if (tubetesInteirosFinal === 1) {
    status = "warn";
    aviso = "Cuidado: limite baixo (apenas 1 tubete inteiro dentro da dose máxima).";
  }

  // Renderização do resultado
  res.innerHTML = `
    <div class="kpi">

      <div>
        <b>${a.label}</b> (${a.mgMl} mg/ml)
        ${isHighRisk ? `<span class="badge-risk">ALTO RISCO</span>` : ""}
        — ${vaso === "com" ? "com" : "sem"} vasoconstritor
      </div>

      <div style="margin-top:8px">
        <span class="muted">Dose máx (mg/kg):</span>
        <b>${fmt(doseMgKg, 2)}</b><br/>

        <span class="muted">Dose máxima total (mg):</span>
        <b>${fmt(doseMaxMgFinal, 1)}</b><br/>

        <span class="muted">mg por tubete:</span>
        <b>${fmt(mgPorTubete, 0)}</b><br/>

        ${absMaxTubetesInfo
          ? `<div class="muted small" style="margin-top:4px">${absMaxTubetesInfo}</div>`
          : ""
        }

        <span class="muted">Tubetes máximos:</span>
        <span class="value-pill ${status}">
          ${tubetesInteirosFinal}
        </span>
      </div>

      <div class="muted small ${absLimitActive ? "limit-abs" : ""}">
        ${limiteAplicado}
      </div>

      ${aviso ? `<div class="alert-box ${status}">${aviso}</div>` : ""}

      <div class="muted small" style="margin-top:8px">
        *Ferramenta de apoio/estudo. Em atendimento real, siga protocolos, bula e condições do paciente.
      </div>
    </div>
  `;
}


// Recalcular automaticamente ao digitar
$("pesoKg").addEventListener("input", calcularAnestesia);
$("tubeteMl").addEventListener("input", calcularAnestesia);

// Recalcular automaticamente ao trocar selects
$("anestesicoSelect").addEventListener("change", calcularAnestesia);
$("vasoSelect").addEventListener("change", calcularAnestesia);

$("btnLimparAnestesia").addEventListener("click", () => {
  $("pesoKg").value = "";
  $("resAnestesia").textContent = "";
  localStorage.removeItem("odonto_pesoKg");
});

// ===== mg/ml calc =====
function calcularMgml() {
  const pct = toNumberBR($("concPct").value);
  const tubeteMl = toNumberBR($("tubeteMl2").value);
  const res = $("resMgml");

  // Se inválido/incompleto, limpa o resultado e sai
  if (!Number.isFinite(pct) || pct <= 0 || !Number.isFinite(tubeteMl) || tubeteMl <= 0) {
    res.innerHTML = "Informe a concentração e o volume do tubete.";
    res.classList.add("muted");
    return;
  }

  const mgMl = pct * 10;
  const mgTubete = mgMl * tubeteMl;

  res.classList.remove("muted");

  res.innerHTML = `
    <div>
      <span class="muted">Concentração:</span> <b>${fmt(pct, 2)}%</b><br/>
      <span class="muted">mg/ml:</span> <b>${fmt(mgMl, 0)}</b><br/>
      <span class="muted">mg por tubete:</span> <b>${fmt(mgTubete, 0)}</b>
    </div>
  `;
}

// Recalcular automaticamente ao digitar
$("concPct").addEventListener("input", calcularMgml);
$("tubeteMl2").addEventListener("input", calcularMgml);

$("btnLimparMgml").addEventListener("click", () => {
  $("concPct").value = "";
  $("resMgml").textContent = "";
  localStorage.removeItem("odonto_concPct");
});

// ===== Endo calc =====
function calcularEndo() {
  const comp = toNumberBR($("comprimentoMm").value);
  const red = toNumberBR($("reducaoMm").value);

  // Se inválido/incompleto, limpa e sai
  if (!Number.isFinite(comp) || comp <= 0 || !Number.isFinite(red) || red < 0) {
    $("resultadoEndo").value = "";
    return;
  }

  const trabalho = clampMin0(comp - red);
  $("resultadoEndo").value = fmt(trabalho, 2);
}

// Recalcular automaticamente ao digitar
$("comprimentoMm").addEventListener("input", calcularEndo);
$("reducaoMm").addEventListener("input", calcularEndo);

$("btnLimparEndo").addEventListener("click", () => {
  $("comprimentoMm").value = "";
  $("reducaoMm").value = "1";
  $("resultadoEndo").value = "";
  localStorage.removeItem("odonto_comprimentoMm");
  localStorage.removeItem("odonto_reducaoMm");
});

//====

const installBtn = document.getElementById("installBtn");
let deferredPrompt = null;

if (window.matchMedia("(display-mode: standalone)").matches) {
  installBtn.classList.add("hidden");
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;

  if (!window.matchMedia("(display-mode: standalone)").matches) {
    installBtn.classList.remove("hidden");
    installBtn.classList.add("attention");
  }
});

installBtn.addEventListener("click", async () => {
  if (!deferredPrompt) return;

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;

  if (outcome === "accepted") {
    installBtn.classList.add("hidden");
    installBtn.classList.remove("attention");
    deferredPrompt = null;
  }
});

setTimeout(() => {
  installBtn.classList.remove("attention");
}, 6000);

// Footer year
$("year").textContent = new Date().getFullYear();

calcularAnestesia();
calcularMgml();
calcularEndo();