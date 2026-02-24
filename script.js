document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // State + config
  // =========================
  const DEFAULT_SYMPTOMS = [
    "Abdominal pain","Back pain","Chest pain","Confusion","Constipation","Cough","Coughing up blood",
    "Diarrhea","Dizziness","Fainting / faint","Fatigue","Fever","Headache","Joint pain","Leg weakness",
    "Nausea","Neck stiffness","Numbness/tingling","Rash","Shortness of breath","Sore throat","Swelling",
    "Swollen lips/tongue","Urinary pain","Vomiting"
  ];

  const SVG_FILES = {
    front: {
      parts: "front_sil.svg",
      muscles: "./front_muscles.svg",
    },
    back: {
      parts: "./back_sil.svg",
      muscles: "./back_muscles.svg",
    }
  };

  const IMG_FILES = {
  front: {
    parts: "front_sil.jpg",
    muscles: "front_muscles.jpg",
  },
  back: {
    parts: "./back_sil.jpg",
    muscles: "./back_muscles.jpg",
  }
};

  const state = {
    view: "front",      // "front" | "back"
    layer: "parts",     // "parts" | "muscles"
    selectedId: null,
    selectedType: null, // "bodypart" | "muscle"
    painLevel: 0,
    painType: "",
    notes: "",
    symptoms: new Set(),
    profile: {
      weight: "", height: "", sports: "", smoker: "", sex: "", contraception: "", food: ""
    }
  };

  const cache = {}; // key -> raw svg text

  // =========================
  // DOM
  // =========================
  const svgHost = document.getElementById("svgHost");
  const bodyStack = document.getElementById("bodyStack");
  const bodyImg = document.getElementById("bodyImg");

  const selectedPartEl = document.getElementById("selectedPart");
  const selectedMetaEl = document.getElementById("selectedMeta");

  const btnLayerParts = document.getElementById("btnLayerParts");
  const btnLayerMuscles = document.getElementById("btnLayerMuscles");
  const btnViewFront = document.getElementById("btnViewFront");
  const btnViewBack = document.getElementById("btnViewBack");

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
  const nextStepsEl = document.getElementById("nextSteps");
  const urgentCareEl = document.getElementById("urgentCare");
  const summaryOutEl = document.getElementById("summaryOut");

  const btnAnalyzeEl = document.getElementById("btnAnalyze");
  const btnExportEl = document.getElementById("btnExport");
  const btnResetEl = document.getElementById("btnReset");

  // =========================
  // Helpers
  // =========================
  const prettify = (id) => String(id || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());

  function escapeHtml(str) {
    return String(str)
      .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
      .replaceAll('"',"&quot;").replaceAll("'","&#039;");
  }

  function setAspectFromSvg(svgEl) {
    const vb = (svgEl.getAttribute("viewBox") || "").trim().split(/\s+/).map(Number);
    if (vb.length === 4 && Number.isFinite(vb[2]) && Number.isFinite(vb[3])) {
      bodyStack.style.setProperty("--body-aspect", `${vb[2]} / ${vb[3]}`);
    }
  }

  function clearSelection() {
    state.selectedId = null;
    state.selectedType = null;
    selectedPartEl.textContent = "None";
    selectedMetaEl.textContent = "—";
    svgHost.querySelectorAll("path.active").forEach(p => p.classList.remove("active"));
  }

  // =========================
  // Load + render SVG
  // =========================
  async function loadSvg(url) {
    if (cache[url]) return cache[url];
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
    const txt = await res.text();
    cache[url] = txt;
    return txt;
  }

  function normalizePaths(svgEl) {
    // Ensure scaling is controlled by CSS
    svgEl.removeAttribute("width");
    svgEl.removeAttribute("height");

    // Disable pointer events on any embedded image inside SVG (just in case)
    svgEl.querySelectorAll("image").forEach(img => img.style.pointerEvents = "none");

    if (state.layer === "muscles") {
      svgEl.querySelectorAll("path[id]").forEach(p => p.classList.add("muscles"));
    } else {
      svgEl.querySelectorAll("path[id]").forEach(p => p.classList.add("bodypart"));
    }

    // Add per-path tooltip title (shows id nicely on hover)
    svgEl.querySelectorAll("path[id]").forEach(p => {
      if (!p.querySelector("title")) {
        const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
        t.textContent = prettify(p.id);
        p.appendChild(t);
      }
    });
  }

  function wireClicks(svgEl) {
    const selector = state.layer === "muscles" ? "path.muscles[id]" : "path.bodypart[id]";
    svgEl.querySelectorAll(selector).forEach(node => {
      node.addEventListener("click", () => {
        svgHost.querySelectorAll("path.active").forEach(p => p.classList.remove("active"));
        node.classList.add("active");

        state.selectedId = node.id;
        state.selectedType = (state.layer === "muscles") ? "muscle" : "bodypart";

        selectedPartEl.textContent = prettify(node.id);
        selectedMetaEl.textContent = `${state.selectedType} · ${state.view}`;

      });
    });
  }

  async function renderBody() {
    // background image
    bodyImg.src = IMG_FILES[state.view][state.layer];

    const svgUrl = SVG_FILES[state.view][state.layer];
    const svgText = await loadSvg(svgUrl);

    // Inject
    svgHost.innerHTML = svgText;

    // Find the injected <svg>
    const svgEl = svgHost.querySelector("svg");
    if (!svgEl) throw new Error("Injected SVG has no <svg> root.");

    // Standardize
    svgEl.classList.add("bodySvg");
    setAspectFromSvg(svgEl);
    normalizePaths(svgEl);
    wireClicks(svgEl);

    // Clear selection on view/layer switch (recommended)
    clearSelection();
  }

  function setLayer(layer) {
    state.layer = layer;
    btnLayerParts.classList.toggle("is-active", layer === "parts");
    btnLayerMuscles.classList.toggle("is-active", layer === "muscles");
    btnLayerParts.setAttribute("aria-selected", layer === "parts" ? "true" : "false");
    btnLayerMuscles.setAttribute("aria-selected", layer === "muscles" ? "true" : "false");
    renderBody().catch(console.error);
  }

  function setView(view) {
    state.view = view;
    btnViewFront.classList.toggle("is-active", view === "front");
    btnViewBack.classList.toggle("is-active", view === "back");
    btnViewFront.setAttribute("aria-selected", view === "front" ? "true" : "false");
    btnViewBack.setAttribute("aria-selected", view === "back" ? "true" : "false");
    renderBody().catch(console.error);
  }

  // =========================
  // Symptoms UI
  // =========================
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
    const items = [...state.symptoms].sort()
      .map(s => `<span class="pill pill--soft">${escapeHtml(s)}</span>`).join(" ");
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

  // =========================
  // Profile bindings
  // =========================
  const bind = (id, key) => {
    const el = document.getElementById(id);
    el.addEventListener("input", () => state.profile[key] = el.value);
    el.addEventListener("change", () => state.profile[key] = el.value);
  };

  // =========================
  // Region classification (muscles + bodyparts)
  // =========================
  // Body parts ids we saw in your silhouettes (keep robust if you rename)
  const BODY_HEAD = new Set(["face","forehead","forehead_left","forehead_right"]);
  const BODY_NECK = new Set(["neck"]);
  const BODY_CHEST = new Set(["chest","sternum"]);
  const BODY_ABDOMEN = new Set(["upper_abdomen","lower_abdomen"]);
  const BODY_PELVIS = new Set(["pelvis","gentials"]); // (typo in your file: gentials)
  const BODY_BACK = new Set(["upper_back","lower_back"]);
  const BODY_SHOULDER = new Set(["shoulder_left","shoulder_right"]);
  const BODY_ARM = new Set(["upper_arm_left","upper_arm_right","forearm_left","forearm_right","wrist_left","wrist_right","hand_left","hand_right"]);
  const BODY_HIP = new Set(["hips_left","hips_right","buttock"]);
  const BODY_LEG = new Set([
    "thighs_left","thighs_right","hamstrings_left","hamstrings_right",
    "knee_left","knees_right","shins_left","shins_right",
    "calf_left","calf_right","ankles_left","ankles_right",
    "feet_left","feet_right"
  ]);

  function bodyPartToRegion(id) {
    if (BODY_HEAD.has(id)) return "head";
    if (BODY_NECK.has(id)) return "neck";
    if (BODY_CHEST.has(id)) return "chest";
    if (BODY_ABDOMEN.has(id)) return "abdomen";
    if (BODY_PELVIS.has(id)) return "pelvis";
    if (BODY_BACK.has(id)) return "back";
    if (BODY_SHOULDER.has(id)) return "shoulder";
    if (BODY_ARM.has(id)) return "arm";
    if (BODY_HIP.has(id)) return "hip";
    if (BODY_LEG.has(id)) return "leg";

    // fallback: keyword inference
    const s = String(id||"").toLowerCase();
    if (s.includes("abdomen")) return "abdomen";
    if (s.includes("chest") || s.includes("stern")) return "chest";
    if (s.includes("neck")) return "neck";
    if (s.includes("back")) return "back";
    if (s.includes("arm") || s.includes("forearm") || s.includes("wrist") || s.includes("hand")) return "arm";
    if (s.includes("thigh") || s.includes("knee") || s.includes("shin") || s.includes("calf") || s.includes("ankle") || s.includes("foot")) return "leg";
    if (s.includes("pelvis") || s.includes("genit")) return "pelvis";
    return "other";
  }

  function muscleToRegion(id) {
    const s = String(id||"").toLowerCase();
    if (s.includes("pectoralis") || s.includes("serratus")) return "chest";
    if (s.includes("rectus_abdominis") || s.includes("oblique") || s.includes("iliopsoas")) return "abdomen";
    if (s.includes("trapezius") || s.includes("splenius")) return "neck";
    if (s.includes("latissimus") || s.includes("rhomboid") || s.includes("teres") || s.includes("erector")) return "back";
    if (s.includes("deltoid")) return "shoulder";
    if (s.includes("biceps") || s.includes("triceps") || s.includes("brachio") || s.includes("flexor") || s.includes("extensor") || s.includes("carpi")) return "arm";
    if (s.includes("glute")) return "hip";
    if (s.includes("vastus") || s.includes("tibialis") || s.includes("gastro") || s.includes("soleus") || s.includes("hamstring") || s.includes("femoris") || s.includes("adductor") || s.includes("gracilis") || s.includes("sartorius")) return "leg";
    return "other";
  }

  function selectionToRegion() {
    if (!state.selectedId || !state.selectedType) return "none";
    if (state.selectedType === "bodypart") return bodyPartToRegion(state.selectedId);
    return muscleToRegion(state.selectedId);
  }

  // =========================
  // Rule-based analyzer (muscles + body parts)
  // =========================
  function analyze() {
    const causes = new Set();
    const doctors = new Set();
    const nextSteps = new Set();
    const urgent = new Set();

    const pain = Number(state.painLevel || 0);
    const painType = String(state.painType || "").toLowerCase();
    const notes = String(state.notes || "").toLowerCase();
    const region = selectionToRegion();

    const sym = new Set([...state.symptoms].map(s => String(s).toLowerCase()));
    const has = (x) => sym.has(String(x).toLowerCase());
    const hasAny = (...xs) => xs.some(x => has(x));
    const noteHas = (...kw) => kw.some(k => notes.includes(String(k).toLowerCase()));

    // --- Urgency first (global) ---
    if (has("Chest pain") && (has("Shortness of breath") || pain >= 7)) {
      urgent.add("🚨 Chest pain + breathing issues or severe pain: seek urgent care now.");
      doctors.add("Emergency / A&E");
    }
    if (has("Shortness of breath") && has("Fever")) {
      urgent.add("⚠️ Breathing difficulty with fever: urgent evaluation recommended.");
      doctors.add("Emergency / A&E");
    }
    if (has("Coughing up blood")) {
      urgent.add("🚨 Coughing up blood: urgent evaluation recommended.");
      doctors.add("Emergency / A&E");
    }
    if (has("Fainting / faint") || has("Confusion")) {
      urgent.add("🚨 Fainting or confusion: urgent evaluation recommended.");
      doctors.add("Emergency / A&E");
    }
    if (has("Swollen lips/tongue") && has("Shortness of breath")) {
      urgent.add("🚨 Possible severe allergic reaction (swelling + breathing trouble): emergency now.");
      doctors.add("Emergency / A&E");
    }
    if (has("Fever") && has("Neck stiffness") && has("Headache")) {
      urgent.add("🚨 Fever + neck stiffness + headache: urgent assessment recommended.");
      doctors.add("Emergency / A&E");
    }
    if (pain >= 8) urgent.add("⚠️ Severe pain (8–10): consider urgent evaluation if new/worsening.");

    // --- Region-driven guidance (works for muscles and body parts) ---
    switch (region) {
      case "head":
        causes.add("Tension headache / migraine (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Neurologist (if recurrent/severe)");
        nextSteps.add("Hydrate, rest, track triggers; seek care if sudden worst headache or neuro symptoms.");
        break;

      case "neck":
      case "shoulder":
        causes.add("Muscle strain / posture-related pain");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
        if (has("Headache")) causes.add("Tension headache related to neck/shoulder tension");
        nextSteps.add("Gentle mobility, heat/ice, avoid aggravating posture; physiotherapy if persistent.");
        break;

      case "chest":
        causes.add("Musculoskeletal chest wall pain / reflux / respiratory cause (context-dependent)");
        doctors.add("Family medicine (GP)");
        if (hasAny("Cough","Fever","Shortness of breath")) doctors.add("Pulmonologist");
        if (has("Chest pain")) doctors.add("Cardiologist (if persistent or risk factors)");
        nextSteps.add("If mild: monitor, avoid exertion; if worsening or with breathlessness: urgent care.");
        break;

      case "abdomen":
        causes.add("Digestive discomfort / gastroenteritis / abdominal wall strain (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Gastroenterologist (if persistent)");
        if (hasAny("Vomiting","Diarrhea")) nextSteps.add("Hydration, light meals; seek care if dehydration or severe pain.");
        if (noteHas("right lower", "appendix") || (pain >= 7 && has("Fever"))) urgent.add("⚠️ Severe abdominal pain with fever: urgent evaluation recommended.");
        break;

      case "pelvis":
        causes.add("Urinary / pelvic pain (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Gynecologist (if relevant)");
        doctors.add("Urologist (if urinary symptoms)");
        if (has("Urinary pain")) nextSteps.add("Consider UTI assessment; seek care faster if fever/flank pain.");
        break;

      case "back":
        causes.add("Back strain / disc irritation (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
        doctors.add("Rheumatologist (if chronic/inflammatory signs)");
        if (has("Leg weakness") || has("Numbness/tingling")) urgent.add("⚠️ Back pain with leg weakness/numbness: urgent evaluation recommended.");
        nextSteps.add("Relative rest, gentle mobility; seek care if weakness/numbness or bladder/bowel issues.");
        break;

      case "arm":
        causes.add("Overuse / tendon irritation / strain (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
        doctors.add("Sports medicine");
        nextSteps.add("Reduce load, ice if acute, gradual return; consult if swelling or loss of strength.");
        break;

      case "leg":
        causes.add("Overuse / strain / tendon irritation (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
        doctors.add("Sports medicine");
        if (has("Swelling") && noteHas("one leg", "calf", "warm")) {
          urgent.add("⚠️ Leg swelling/pain (especially one-sided): consider same-day evaluation to rule out clot.");
        }
        nextSteps.add("Rest/ice for acute strain; seek care if swelling, redness, or walking becomes difficult.");
        break;

      case "hip":
        causes.add("Hip/glute overload or referred back pain (context-dependent)");
        doctors.add("Family medicine (GP)");
        doctors.add("Physiotherapist");
        nextSteps.add("Gentle mobility; seek care if pain radiates with numbness/weakness.");
        break;

      default:
        doctors.add("Family medicine (GP)");
        nextSteps.add("Add a body area (or symptoms) to refine suggestions.");
        break;
    }

    // --- Symptom-driven specialists (global) ---
    if (has("Rash")) doctors.add("Dermatologist");
    if (has("Joint pain")) doctors.add("Rheumatologist");
    if (has("Urinary pain")) doctors.add("Urologist");
    if (state.profile.smoker === "yes" && (has("Cough") || has("Shortness of breath"))) doctors.add("Pulmonologist");

    // --- Output ---
    possibleCausesEl.textContent = causes.size ? [...causes].join(" · ") : "Not enough info to suggest causes.";
    suggestedDoctorEl.textContent = doctors.size ? [...doctors].join(" · ") : "Family medicine (GP)";
    nextStepsEl.textContent = nextSteps.size ? [...nextSteps].join(" · ") : "—";

    urgentCareEl.textContent = urgent.size
      ? [...urgent].join(" ")
      : "If symptoms rapidly worsen, you feel faint, or have severe chest pain/breathing trouble: seek urgent care.";

    summaryOutEl.textContent = buildSummaryText(region);
  }

  function buildSummaryText(region) {
    const s = [...state.symptoms].sort();
    const profile = state.profile;

    return [
      "=== Medical Companion Summary (Prototype) ===",
      `View: ${state.view} | Mode: ${state.layer}`,
      `Selected: ${state.selectedId ? prettify(state.selectedId) : "—"} (${state.selectedType || "—"})`,
      `Region: ${region}`,
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
    ].join("\n");
  }

  function exportSummary() {
    const text = summaryOutEl.textContent || buildSummaryText(selectionToRegion());
    summaryOutEl.textContent = text;
    navigator.clipboard?.writeText?.(text).catch(() => {});
  }

  function resetAll() {
    state.selectedId = null;
    state.selectedType = null;
    state.painLevel = 0;
    state.painType = "";
    state.notes = "";
    state.symptoms = new Set();
    state.profile = { weight:"", height:"", sports:"", smoker:"", sex:"", contraception:"", food:"" };

    selectedPartEl.textContent = "None";
    selectedMetaEl.textContent = "—";

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
    nextStepsEl.textContent = "—";
    urgentCareEl.textContent = "—";
    summaryOutEl.textContent = "";

    // clear active highlights in current svg
    svgHost.querySelectorAll("path.active").forEach(p => p.classList.remove("active"));
  }

  // =========================
  // Wire UI events
  // =========================
  btnLayerParts.addEventListener("click", () => setLayer("parts"));
  btnLayerMuscles.addEventListener("click", () => setLayer("muscles"));
  btnViewFront.addEventListener("click", () => setView("front"));
  btnViewBack.addEventListener("click", () => setView("back"));

  painLevelEl.addEventListener("input", () => {
    state.painLevel = Number(painLevelEl.value);
    painValueEl.textContent = String(state.painLevel);
  });
  painTypeEl.addEventListener("change", () => state.painType = painTypeEl.value);
  notesEl.addEventListener("input", () => state.notes = notesEl.value.trim());

  btnAddCustomEl.addEventListener("click", addCustomSymptom);
  customSymptomEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); addCustomSymptom(); }
  });

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

  btnAnalyzeEl.addEventListener("click", analyze);
  btnExportEl.addEventListener("click", exportSummary);
  btnResetEl.addEventListener("click", resetAll);

  // =========================
  // Init
  // =========================
  renderSymptomChips();
  renderSelectedSymptoms();
  resetAll();

  // Start: Body Parts + Front
  setLayer("parts");
  setView("front");
});