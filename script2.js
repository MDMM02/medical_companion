// script.js — Symptom Triage Prototype logic (SVG muscles + symptoms + simple rules)

document.addEventListener("DOMContentLoaded", () => {
  // --- Data ---
  const DEFAULT_SYMPTOMS = [
    "Fever", "Cough", "Shortness of breath", "Chest pain", "Headache",
    "Dizziness", "Nausea", "Vomiting", "Diarrhea", "Constipation",
    "Sore throat", "Fatigue", "Rash", "Joint pain", "Back pain",
    "Abdominal pain", "Urinary pain", "Swelling", "Numbness/tingling"
  ];

  const state = {
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

  // --- Helpers ---
  function prettify(id) {
    return String(id)
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

  function addSvgTitlePerMuscle() {
    // Browser tooltip: show muscle name instead of "Front muscle map"
    document.querySelectorAll("path.muscles").forEach(node => {
      // If a <title> already exists under the path, keep it
      if (!node.querySelector("title")) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
        t.textContent = prettify(node.id);
        node.appendChild(t);
      }
    });
  }

  // --- SVG interactions (click + active highlight) ---
  function initMuscleClicks() {
    const muscles = document.querySelectorAll("path.muscles");

    // Debug: should be 50 in your case
    console.log("muscles found:", muscles.length);

    muscles.forEach(node => {
      node.addEventListener("click", () => {
        state.bodyPart = node.id;
        selectedPartEl.textContent = prettify(node.id);

        // Single selection (one active at a time)
        document.querySelectorAll("path.muscles").forEach(p => p.classList.remove("active"));
        node.classList.add("active");

        // Debug
        console.log("clicked:", node.id);
      });
    });
  }

  // --- Pain controls ---
  painLevelEl.addEventListener("input", () => {
    state.painLevel = Number(painLevelEl.value);
    painValueEl.textContent = String(state.painLevel);
  });

  painTypeEl.addEventListener("change", () => {
    state.painType = painTypeEl.value;
  });

  notesEl.addEventListener("input", () => {
    state.notes = notesEl.value.trim();
  });

  // --- Symptoms UI ---
  function renderSymptomChips() {
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

  function renderSelectedSymptoms() {
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

  function addCustomSymptom() {
    const value = (customSymptomEl.value || "").trim();
    if (!value) return;
    state.symptoms.add(value);
    customSymptomEl.value = "";
    renderSymptomChips();
    renderSelectedSymptoms();
  }

  btnAddCustomEl.addEventListener("click", addCustomSymptom);
  customSymptomEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addCustomSymptom();
    }
  });

  // --- Profile fields ---
  const bind = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => state.profile[key] = el.value);
    el.addEventListener("change", () => state.profile[key] = el.value);
  };

  bind("weight", "weight");
  bind("height", "height");
  bind("sports", "sports");
  bind("smoker", "smoker");
  bind("sex", "sex");
  bind("contraception", "contraception");
  bind("food", "food");

  sexEl.addEventListener("change", () => {
    const isFemale = sexEl.value === "female";
    contraceptionWrapEl.classList.toggle("hidden", !isFemale);
    if (!isFemale) state.profile.contraception = "";
  });

  // --- Analysis (simple rule engine for demo) ---
  function analyze() {
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

    // Urgent patterns (demo rules)
    if (symptoms.has("Chest pain") && (symptoms.has("Shortness of breath") || pain >= 7)) {
      urgent.add("Chest pain + breathing issues or severe pain: seek urgent care now.");
    }
    if (symptoms.has("Shortness of breath") && symptoms.has("Fever")) {
      urgent.add("Breathing difficulty with fever: urgent evaluation recommended.");
    }
    if (symptoms.has("Numbness/tingling") && part && (/_(left|right)$/i.test(part) || /left|right/i.test(part))) {
      urgent.add("New one-sided numbness/tingling: urgent evaluation recommended.");
    }

    // Very light demo mapping based on selected region (you’ll expand this later)
    if (part) {
      // Basic region groupings based on common ids
      if (part.includes("pectoralis") || part.includes("trapezius")) {
        causes.add("Muscle strain / posture-related pain");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
      }

      if (part.includes("rectus_abdominis") || part.includes("abdominal") || part.includes("oblique")) {
        causes.add("Muscle strain / digestive discomfort (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Gastroenterologist (if persistent)");
      }

      if (part.includes("vastus") || part.includes("tibialis") || part.includes("gastrocnemius") || part.includes("soleus")) {
        causes.add("Overuse / strain / tendon irritation");
        doctors.add("Sports medicine");
        doctors.add("Physiotherapist");
        doctors.add("Family medicine (GP)");
        if (symptoms.has("Swelling")) causes.add("Inflammation / injury (evaluate if sudden)");
      }

      if (part.includes("biceps") || part.includes("triceps") || part.includes("brachio") || part.includes("flexor") || part.includes("extensor")) {
        causes.add("Tendon irritation / overuse / strain");
        doctors.add("Sports medicine");
        doctors.add("Physiotherapist");
        doctors.add("Family medicine (GP)");
      }
    }

    // Symptom-based tweaks
    if (symptoms.has("Rash")) doctors.add("Dermatologist");
    if (symptoms.has("Joint pain")) doctors.add("Rheumatologist");
    if (symptoms.has("Urinary pain")) doctors.add("Urologist");
    if (symptoms.has("Sore throat")) causes.add("Upper respiratory infection");

    // Smoking modifier
    if (state.profile.smoker === "yes" && (symptoms.has("Cough") || symptoms.has("Shortness of breath"))) {
      doctors.add("Pulmonologist");
    }

    // Pain severity nudges
    if (pain >= 8) urgent.add("Severe pain (8–10): consider urgent evaluation, especially if new or worsening.");
    if (pain >= 6) doctors.add("Family medicine (GP)");

    possibleCausesEl.textContent = causes.size ? [...causes].join(" · ") : "Not enough info to suggest causes.";
    suggestedDoctorEl.textContent = doctors.size ? [...doctors].join(" · ") : "Family medicine (GP)";
    urgentCareEl.textContent = urgent.size
      ? [...urgent].join(" ")
      : "If symptoms rapidly worsen, you feel faint, or have severe chest pain/breathing trouble: seek urgent care.";

    summaryOutEl.textContent = buildSummaryText();
  }

  function buildSummaryText() {
    const s = [...state.symptoms].sort();
    const profile = state.profile;
    const lines = [
      "=== Symptom Triage Summary (Prototype) ===",
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

  function exportSummary() {
    const text = buildSummaryText();
    summaryOutEl.textContent = text;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
  }

  function resetAll() {
    state.bodyPart = null;
    state.painLevel = 0;
    state.painType = "";
    state.notes = "";
    state.symptoms = new Set();
    state.profile = { weight:"", height:"", sports:"", smoker:"", sex:"", contraception:"", food:"" };

    selectedPartEl.textContent = "None";

    // IMPORTANT FIX: target the actual SVG paths (not ".path.muscles")
    document.querySelectorAll("path.muscles").forEach(p => p.classList.remove("active"));

    painLevelEl.value = "0";
    painValueEl.textContent = "0";
    painTypeEl.value = "";
    notesEl.value = "";

    ["weight","height","sports","smoker","sex","contraception","food"].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
    contraceptionWrapEl.classList.add("hidden");

    renderSymptomChips();
    renderSelectedSymptoms();

    possibleCausesEl.textContent = "—";
    suggestedDoctorEl.textContent = "—";
    urgentCareEl.textContent = "—";
    summaryOutEl.textContent = "";
  }

  // Buttons
  btnAnalyzeEl.addEventListener("click", analyze);
  btnExportEl.addEventListener("click", exportSummary);
  btnResetEl.addEventListener("click", resetAll);

  // Init
  addSvgTitlePerMuscle();   // hover tooltip per muscle
  initMuscleClicks();       // click/active highlight
  renderSymptomChips();
  renderSelectedSymptoms();
  resetAll();
});
