// script2.js — Symptom Triage Prototype logic (Front/Back SVG toggle + symptoms + simple rule demo)

document.addEventListener("DOMContentLoaded", () => {
  // --- Data ---
  const DEFAULT_SYMPTOMS = [
    "Fever", "Cough", "Shortness of breath", "Chest pain", "Headache",
    "Dizziness", "Nausea", "Vomiting", "Diarrhea", "Constipation",
    "Sore throat", "Fatigue", "Rash", "Joint pain", "Back pain",
    "Abdominal pain", "Urinary pain", "Swelling", "Numbness/tingling"
  ];

  const state = {
    view: "front",
    bodyPart: null,
    painLevel: 0,
    painType: "",
    notes: "",
    symptoms: new Set(),
    profile: {
      weight: "",
      height: "",
      sports: "",
      smoker: "",
      sex: "",
      contraception: "",
      food: ""
    }
  };

  // --- Elements ---
  const selectedPartEl = document.getElementById("selectedPart");
  const painLevelEl = document.getElementById("painLevel");
  const painValueEl = document.getElementById("painValue");
  const painTypeEl = document.getElementById("painType");
  const notesEl = document.getElementById("notes");

  const symptomChipsEl = document.getElementById("symptomChips");
  const selectedSymptomsEl = document.getElementById("selectedSymptoms");
  const customSymptomEl = document.getElementById("customSymptom");
  const btnAddCustomEl = document.getElementById("btnAddCustom");

  const sexEl = document.getElementById("sex");
  const contraceptionWrapEl = document.getElementById("contraceptionWrap");

  const possibleCausesEl = document.getElementById("possibleCauses");
  const suggestedDoctorEl = document.getElementById("suggestedDoctor");
  const urgentCareEl = document.getElementById("urgentCare");

  const btnAnalyzeEl = document.getElementById("btnAnalyze");
  const btnExportEl = document.getElementById("btnExport");
  const btnResetEl = document.getElementById("btnReset");
  const summaryOutEl = document.getElementById("summaryOut");

  // Front/Back toggle elements (must exist in HTML)
  const btnFront = document.getElementById("btnFront");
  const btnBack = document.getElementById("btnBack");
  const frontSvg = document.getElementById("frontSvg");
  const backSvg = document.getElementById("backSvg");
  const bodyStack = document.getElementById("bodyStack");
  const bodyImg = document.getElementById("bodyImg");

  // --- Helpers ---
  function prettify(id) {
    return String(id || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setAspectFromSvg(svgEl){
    if (!svgEl || !bodyStack) return;
    const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
    if (vb.length === 4 && Number.isFinite(vb[2]) && Number.isFinite(vb[3])) {
      bodyStack.style.setProperty("--body-aspect", `${vb[2]} / ${vb[3]}`);
    }
  }

  function clearSelection(){
    state.bodyPart = null;
    if (selectedPartEl) selectedPartEl.textContent = "None";
    document.querySelectorAll("path.muscles").forEach(p => p.classList.remove("active"));
  }

  // Browser tooltip per muscle (optional but handy)
  function normalizeMuscleClasses() {
  // Force tous les paths qui ont un id à être traités comme "muscles"
  // (front + back). Si tu veux seulement front, je te mets la variante juste après.
  document.querySelectorAll("svg.bodySvg path[id]").forEach(p => {
    p.classList.add("muscles");
  });
}
  function addSvgTitlePerMuscle(){
    document.querySelectorAll("path.muscles").forEach(node => {
      if (!node.querySelector("title")) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
        t.textContent = prettify(node.id);
        node.appendChild(t);
      }
    });
  }

  // --- View toggle ---
  function setView(view){
    const isFront = view === "front";
    state.view = isFront ? "front" : "back";

    if (frontSvg) frontSvg.classList.toggle("is-hidden", !isFront);
    if (backSvg) backSvg.classList.toggle("is-hidden", isFront);

    if (btnFront) {
      btnFront.classList.toggle("is-active", isFront);
      btnFront.setAttribute("aria-selected", isFront ? "true" : "false");
    }
    if (btnBack) {
      btnBack.classList.toggle("is-active", !isFront);
      btnBack.setAttribute("aria-selected", !isFront ? "true" : "false");
    }

    // Swap background image (you said you added back.jpg)
    if (bodyImg) bodyImg.src = isFront ? "front.jpg" : "back.jpg";

    // Match container aspect-ratio to visible SVG's viewBox
    setAspectFromSvg(isFront ? frontSvg : backSvg);

    // Reset selection between views (avoids confusion)
    clearSelection();
  }

  btnFront?.addEventListener("click", () => setView("front"));
  btnBack?.addEventListener("click", () => setView("back"));

  // --- SVG interactions (works for BOTH SVGs) ---
  function initMuscleClicks(){
    const muscles = document.querySelectorAll("path.muscles");
    console.log("muscles found:", muscles.length);

    muscles.forEach(node => {
      node.addEventListener("click", () => {
        state.bodyPart = node.id;
        if (selectedPartEl) selectedPartEl.textContent = prettify(node.id);

        // single selection
        document.querySelectorAll("path.muscles").forEach(p => p.classList.remove("active"));
        node.classList.add("active");
      });
    });
  }

  // --- Pain controls ---
  painLevelEl?.addEventListener("input", () => {
    state.painLevel = Number(painLevelEl.value);
    if (painValueEl) painValueEl.textContent = String(state.painLevel);
  });

  painTypeEl?.addEventListener("change", () => {
    state.painType = painTypeEl.value;
  });

  notesEl?.addEventListener("input", () => {
    state.notes = notesEl.value.trim();
  });

  // --- Symptoms UI ---
  function renderSymptomChips(){
    if (!symptomChipsEl) return;
    symptomChipsEl.innerHTML = "";
    DEFAULT_SYMPTOMS.forEach(label => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = label;
      btn.setAttribute("aria-pressed", state.symptoms.has(label) ? "true" : "false");
      if (state.symptoms.has(label)) btn.classList.add("chip--active");
      btn.addEventListener("click", () => {
        if (state.symptoms.has(label)) state.symptoms.delete(label);
        else state.symptoms.add(label);
        renderSymptomChips();
        renderSelectedSymptoms();
      });
      symptomChipsEl.appendChild(btn);
    });
  }

  function renderSelectedSymptoms(){
    if (!selectedSymptomsEl) return;
    if (state.symptoms.size === 0) {
      selectedSymptomsEl.innerHTML = '<div class="muted small">No symptoms selected yet.</div>';
      return;
    }
    const items = [...state.symptoms]
      .sort()
      .map(s => `<span class="pill pill--soft">${escapeHtml(s)}</span>`)
      .join(" ");
    selectedSymptomsEl.innerHTML = items;
  }

  function addCustomSymptom(){
    const value = (customSymptomEl?.value || "").trim();
    if (!value) return;
    state.symptoms.add(value);
    if (customSymptomEl) customSymptomEl.value = "";
    renderSymptomChips();
    renderSelectedSymptoms();
  }

  btnAddCustomEl?.addEventListener("click", addCustomSymptom);
  customSymptomEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomSymptom();
    }
  });

  // --- Profile fields ---
  function bind(id, key){
    const el = document.getElementById(id);
    if (!el) return;
    const handler = () => state.profile[key] = el.value;
    el.addEventListener("input", handler);
    el.addEventListener("change", handler);
  }

  bind("weight", "weight");
  bind("height", "height");
  bind("sports", "sports");
  bind("smoker", "smoker");
  bind("sex", "sex");
  bind("contraception", "contraception");
  bind("food", "food");

  sexEl?.addEventListener("change", () => {
    const isFemale = sexEl.value === "female";
    contraceptionWrapEl?.classList.toggle("hidden", !isFemale);
    if (!isFemale) state.profile.contraception = "";
  });

  // --- Analysis (simple demo rules) ---
  function analyze(){
    const symptoms = state.symptoms;
    const part = state.bodyPart;
    const pain = state.painLevel;

    const causes = new Set();
    const doctors = new Set();
    const urgent = new Set();

    if (!part && symptoms.size === 0) {
      possibleCausesEl.textContent = "Select at least a body area or a symptom.";
      suggestedDoctorEl.textContent = "—";
      urgentCareEl.textContent = "—";
      return;
    }

    if (symptoms.has("Chest pain") && (symptoms.has("Shortness of breath") || pain >= 7)) {
      urgent.add("Chest pain + breathing issues or severe pain: seek urgent care now.");
    }
    if (symptoms.has("Shortness of breath") && symptoms.has("Fever")) {
      urgent.add("Breathing difficulty with fever: urgent evaluation recommended.");
    }
    if (pain >= 8) urgent.add("Severe pain (8–10): consider urgent evaluation if new/worsening.");

    if (part) {
      const p = part.toLowerCase();

      if (p.includes("trapezius") || p.includes("deltoid") || p.includes("pectoralis")) {
        causes.add("Muscle strain / posture-related pain");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
      }
      if (p.includes("latissimus") || p.includes("rhomboid") || p.includes("thoraco") || p.includes("erector")) {
        causes.add("Back muscle strain / overuse");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
      }
      if (p.includes("rectus_abdominis") || p.includes("oblique")) {
        causes.add("Muscle strain / digestive discomfort (context-dependent)");
        doctors.add("Family medicine (GP)");
      }
      if (p.includes("vastus") || p.includes("tibialis") || p.includes("gastrocnemius") || p.includes("soleus") || p.includes("hamstring") || p.includes("biceps_femoris")) {
        causes.add("Overuse / strain / tendon irritation");
        doctors.add("Sports medicine");
        doctors.add("Physiotherapist");
        doctors.add("Family medicine (GP)");
      }
    }

    if (symptoms.has("Rash")) doctors.add("Dermatologist");
    if (symptoms.has("Joint pain")) doctors.add("Rheumatologist");
    if (symptoms.has("Urinary pain")) doctors.add("Urologist");
    if (state.profile.smoker === "yes" && (symptoms.has("Cough") || symptoms.has("Shortness of breath"))) {
      doctors.add("Pulmonologist");
    }

    possibleCausesEl.textContent = causes.size ? [...causes].join(" · ") : "Not enough info to suggest causes.";
    suggestedDoctorEl.textContent = doctors.size ? [...doctors].join(" · ") : "Family medicine (GP)";
    urgentCareEl.textContent = urgent.size
      ? [...urgent].join(" ")
      : "If symptoms rapidly worsen, you feel faint, or have severe chest pain/breathing trouble: seek urgent care.";

    summaryOutEl.textContent = buildSummaryText();
  }

  function buildSummaryText(){
    const s = [...state.symptoms].sort();
    const profile = state.profile;
    const lines = [
      "=== Symptom Triage Summary (Prototype) ===",
      `View: ${state.view}`,
      `Body area: ${state.bodyPart ? prettify(state.bodyPart) : "—"}`,
      `Pain: ${state.painLevel}/10 ${state.painType ? "(" + state.painType + ")" : ""}`,
      `Symptoms: ${s.length ? s.join(", ") : "—"}`,
      `Notes: ${state.notes || "—"}`,
      "",
      "Profile:",
      `- Weight: ${profile.weight || "—"} kg`,
      `- Height: ${profile.height || "—"} cm`,
      `- Sports/week: ${profile.sports || "—"}`,
      `- Smoker: ${profile.smoker || "—"}`,
      `- Sex: ${profile.sex || "—"}`,
      `- Contraception: ${profile.sex === "female" ? (profile.contraception || "—") : "—"}`,
      `- Food intake: ${profile.food || "—"}`
    ];
    return lines.join("\n");
  }

  function exportSummary(){
    const text = buildSummaryText();
    summaryOutEl.textContent = text;
    navigator.clipboard?.writeText?.(text).catch(() => {});
  }

  function resetAll(){
    state.bodyPart = null;
    state.painLevel = 0;
    state.painType = "";
    state.notes = "";
    state.symptoms = new Set();
    state.profile = { weight:"", height:"", sports:"", smoker:"", sex:"", contraception:"", food:"" };

    if (selectedPartEl) selectedPartEl.textContent = "None";
    document.querySelectorAll("path.muscles").forEach(p => p.classList.remove("active"));

    if (painLevelEl) painLevelEl.value = "0";
    if (painValueEl) painValueEl.textContent = "0";
    if (painTypeEl) painTypeEl.value = "";
    if (notesEl) notesEl.value = "";

    ["weight","height","sports","smoker","sex","contraception","food"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    contraceptionWrapEl?.classList.add("hidden");

    renderSymptomChips();
    renderSelectedSymptoms();

    if (possibleCausesEl) possibleCausesEl.textContent = "—";
    if (suggestedDoctorEl) suggestedDoctorEl.textContent = "—";
    if (urgentCareEl) urgentCareEl.textContent = "—";
    if (summaryOutEl) summaryOutEl.textContent = "";
  }

  btnAnalyzeEl?.addEventListener("click", analyze);
  btnExportEl?.addEventListener("click", exportSummary);
  btnResetEl?.addEventListener("click", resetAll);

  // --- Init ---
  addSvgTitlePerMuscle();
  initMuscleClicks();
  renderSymptomChips();
  renderSelectedSymptoms();
  resetAll();
  setView("front");
});
