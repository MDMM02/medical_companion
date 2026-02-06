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

  // ===== Muscle ID groups (from YOUR SVGs) =====

// Front SVG ids (50) + Back SVG ids (37) regroupés par zones

const ARM_IDS = new Set([
  // front
  "biceps_left","biceps_right",
  "triceps_left",
  "brachioradialis_left","brachioradialis_right",
  "flexor_carpi_radialis_left","flexor_carpi_radialis_right",
  "extensor_carpi_radialis_brevis_left","extensor_carpi_radialis_brevis_right",
  "extensor_carpi_radialis_longus_left","extensor_carpi_radialis_longus_right",

  // back
  "triceps_right",
  "anconeus_left","anconeus_right",
  "flexor_carpi_ulnaris_left","flexor_carpi_ulnaris_right",
  "extensor_carpi_ulnaris_left","extensor_carpi_ulnaris_right"
]);

const SHOULDER_NECK_IDS = new Set([
  // both
  "deltoid_left","deltoid_right",
  "trapezius_left","trapezius_right",

  // back
  "trapezius",
  "splenius_capitis_left","splenius_capitis_right"
]);

const CHEST_IDS = new Set([
  "pectoralis_major_left","pectoralis_major_right",
  "serratus_anterior_left","serratus_anterior_right"
]);

const CORE_IDS = new Set([
  "rectus_abdominis",
  "external_abdominal_oblique_left","external_abdominal_oblique_right",
  "iliopsoas_left","iliopsoas_right"
]);

const BACK_IDS = new Set([
  // front/back (some overlap)
  "latissimus_dorsi",           // present in front file
  "latissimus_dorsi_left",      // present in front+back
  "latissimus_dorsi_right",     // present in back

  // back
  "rhomboid_left","rhomboid_right",
  "teres_major_left","teres_major_right",
  "teres_minor_left","teres_minor_right"
]);

const GLUTES_HIP_IDS = new Set([
  "gluteus_medius_left","gluteus_medius_right", // front
  "gluteus_maximus_left","gluteus_maximus_right" // back
]);

const LEG_IDS = new Set([
  // hip/adductors/front
  "adductor_longus_left","adductor_longus_right",
  "pectineus_left","pectineus_right",
  "gracilis_left","gracilis_right",
  "sartorius_left","sartorius_right",
  "iliopsoas_left","iliopsoas_right",

  // quads/front/back
  "vastus_intermedius_left","vastus_intermedius_right",
  "vastus_lateralis_left","vastus_lateralis_right",
  "vastus_medialis_left",        
  "vastus_medialis_right",

  // lower leg/front
  "tibialis_anterior_left","tibialis_anterior_right",
  "peroneus_longus_left","peroneus_longus_right",
  "gastrocnemius_left","gastrocnemius_right",
  "soleus_left","soleus_right",

  // hamstrings/back
  "biceps_femoris_longus_left","biceps_femoris_longus_right",
  "semimembranosus_left","semimembranosus_right",
  "semitendinosus_left","semitendinosus_right",

  // calf heads/back (note the file’s spelling: "grastrocnemius_*")
  "grastrocnemius_lateral_head_left","grastrocnemius_lateral_head_right",
  "grastrocnemius_medial_head_left","grastrocnemius_medial_head_right",

  // glutes (often treated as leg/hip zone too)
  "gluteus_medius_left","gluteus_medius_right",
  "gluteus_maximus_left","gluteus_maximus_right"
]);

// Helper to classify the currently selected muscle id
function classifyPart(partId) {
  const part = String(partId || "");
  return {
    isArm: ARM_IDS.has(part),
    isShoulderNeck: SHOULDER_NECK_IDS.has(part),
    isChest: CHEST_IDS.has(part),
    isCore: CORE_IDS.has(part),
    isBack: BACK_IDS.has(part),
    isGlutesHip: GLUTES_HIP_IDS.has(part),
    isLeg: LEG_IDS.has(part),
  };
}

  // // --- Analysis (simple demo rules) ---
  // function analyze(){
  //   const symptoms = state.symptoms;
  //   const part = state.bodyPart;
  //   const pain = state.painLevel;

  //   const causes = new Set();
  //   const doctors = new Set();
  //   const urgent = new Set();

  //   if (!part && symptoms.size === 0) {
  //     possibleCausesEl.textContent = "Select at least a body area or a symptom.";
  //     suggestedDoctorEl.textContent = "—";
  //     urgentCareEl.textContent = "—";
  //     return;
  //   }

  //   if (symptoms.has("Chest pain") && (symptoms.has("Shortness of breath") || pain >= 7)) {
  //     urgent.add("Chest pain + breathing issues or severe pain: seek urgent care now.");
  //   }
  //   if (symptoms.has("Shortness of breath") && symptoms.has("Fever")) {
  //     urgent.add("Breathing difficulty with fever: urgent evaluation recommended.");
  //   }
  //   if (pain >= 8) urgent.add("Severe pain (8–10): consider urgent evaluation if new/worsening.");

  //   if (part) {
  //     const p = part.toLowerCase();

  //     if (p.includes("trapezius") || p.includes("deltoid") || p.includes("pectoralis")) {
  //       causes.add("Muscle strain / posture-related pain");
  //       doctors.add("Family medicine (GP)");
  //       doctors.add("Physiotherapist");
  //     }
  //     if (p.includes("latissimus") || p.includes("rhomboid") || p.includes("thoraco") || p.includes("erector")) {
  //       causes.add("Back muscle strain / overuse");
  //       doctors.add("Family medicine (GP)");
  //       doctors.add("Physiotherapist");
  //     }
  //     if (p.includes("rectus_abdominis") || p.includes("oblique")) {
  //       causes.add("Muscle strain / digestive discomfort (context-dependent)");
  //       doctors.add("Family medicine (GP)");
  //     }
  //     if (p.includes("vastus") || p.includes("tibialis") || p.includes("gastrocnemius") || p.includes("soleus") || p.includes("hamstring") || p.includes("biceps_femoris")) {
  //       causes.add("Overuse / strain / tendon irritation");
  //       doctors.add("Sports medicine");
  //       doctors.add("Physiotherapist");
  //       doctors.add("Family medicine (GP)");
  //     }
  //   }

  //   if (symptoms.has("Rash")) doctors.add("Dermatologist");
  //   if (symptoms.has("Joint pain")) doctors.add("Rheumatologist");
  //   if (symptoms.has("Urinary pain")) doctors.add("Urologist");
  //   if (state.profile.smoker === "yes" && (symptoms.has("Cough") || symptoms.has("Shortness of breath"))) {
  //     doctors.add("Pulmonologist");
  //   }

  //   possibleCausesEl.textContent = causes.size ? [...causes].join(" · ") : "Not enough info to suggest causes.";
  //   suggestedDoctorEl.textContent = doctors.size ? [...doctors].join(" · ") : "Family medicine (GP)";
  //   urgentCareEl.textContent = urgent.size
  //     ? [...urgent].join(" ")
  //     : "If symptoms rapidly worsen, you feel faint, or have severe chest pain/breathing trouble: seek urgent care.";

  //   summaryOutEl.textContent = buildSummaryText();
  // }
  function analyze() {
  const causes = new Set();
  const doctors = new Set();
  const urgent = new Set();

  const pain = Number(state.painLevel || 0);
  const painType = String(state.painType || "").trim().toLowerCase();
  const part = String(state.bodyPart || "");
  const p = part.toLowerCase();

  const notesRaw = String(state.notes || "");
  const notes = notesRaw.toLowerCase();

  // --- helpers (symptoms + notes + body part) ---
  const symLower = new Set([...state.symptoms].map(s => String(s).trim().toLowerCase()));

  const has = (name) => symLower.has(String(name).toLowerCase());
  const hasAny = (...names) => names.some(n => has(n));
  const hasAll = (...names) => names.every(n => has(n));

  const noteHas = (...kw) => kw.some(k => notes.includes(String(k).toLowerCase()));
  const partHas = (...kw) => kw.some(k => p.includes(String(k).toLowerCase()));

  const sex = String(state.profile.sex || "").toLowerCase();                 // "female" | "male" | "other" | ""
  const smoker = String(state.profile.smoker || "").toLowerCase();           // "yes" | "no" | ""
  const contraception = String(state.profile.contraception || "").toLowerCase(); // free text
  const sports = String(state.profile.sports || "").toLowerCase();           // "0" | "1-2" | "3-5" | "6+" | ""

  const sportsHigh = (sports === "3-5" || sports === "6+" || noteHas("workout", "training", "gym", "run", "lifting"));
  const sudden = noteHas("sudden", "soudain", "d'un coup", "tout d'un coup");
  const trauma = noteHas("accident", "fall", "chute", "hit", "shock", "car crash");

  // basic region inference from muscle ids
  const { isArm, isShoulderNeck, isChest, isCore, isBack, isGlutesHip, isLeg } = classifyPart(state.bodyPart);
  const isNeckShoulder = isShoulderNeck; // alias pour l'ancien nom
  const isAbdomen = isCore;              // alias pour ton "core/abdomen"

  // Urgency levels (we’ll show stronger text)
  let emergency = false;
  let urgentSameDay = false;

  const addEmergency = (msg) => { emergency = true; urgent.add("🚨 " + msg); };
  const addUrgent = (msg) => { if (!emergency) urgentSameDay = true; urgent.add("⚠️ " + msg); };

  // =========================================================
  // 1) TRIAGE FIRST (red flags)
  // =========================================================

  // --- Chest pain / heart attack-like patterns ---
  // NHS: call 999 for sudden chest pain that doesn't go away, pressure/squeezing, radiates, with sweating/sick/lightheaded/SOB. :contentReference[oaicite:1]{index=1}
  if (has("Chest pain")) {
    const cardiacLike =
      pain >= 7 ||
      hasAny("Shortness of breath", "Nausea") ||
      noteHas("pressure", "squeez", "tight", "heavy", "crushing", "indigestion") ||
      noteHas("left arm", "right arm", "jaw", "neck", "back", "radiat") ||
      noteHas("sweat", "clammy", "light headed", "dizzy", "faint");

    if (cardiacLike) {
      addEmergency("Chest pain with severe features (pressure/radiation/sweaty/sick/light-headed/short of breath): seek emergency help now.");
      doctors.add("Emergency / A&E");
      doctors.add("Cardiologist");
    }
  }

  // --- Stroke / FAST ---
  // NHS stroke: face droop, arm weakness, speech problems -> call 999. :contentReference[oaicite:2]{index=2}
  // (You don't have dedicated chips for these, so we pick them up from notes.)
  if (noteHas("face droop", "drooping", "uneven smile", "arm weakness", "can't lift", "slurred", "speech", "confused") && sudden) {
    addEmergency("Possible stroke signs (FAST-like) described in notes: call emergency services now.");
    doctors.add("Emergency / A&E");
    doctors.add("Neurologist");
  }

  // --- Back pain red flags / possible cauda equina ---
  // NHS back pain: call 999 if numbness/tingling around genitals/buttocks, both legs symptoms, difficulty peeing, loss of bladder/bowel control. :contentReference[oaicite:3]{index=3}
  const backRedFlags =
    (isBack || noteHas("back pain", "low back", "sciatica")) &&
    (
      noteHas("both legs") ||
      noteHas("genitals", "groin", "saddle", "buttocks") ||
      noteHas("difficulty peeing", "can't pee", "retention") ||
      noteHas("loss of bladder", "incontinence", "bowel control", "pooing yourself") ||
      (has("Numbness/tingling") && noteHas("both legs", "genitals", "buttocks"))
    );

  if (backRedFlags) {
    addEmergency("Back pain with red-flag neuro/bladder/bowel symptoms: urgent emergency assessment needed.");
    doctors.add("Emergency / A&E");
    doctors.add("Neurologist");
    doctors.add("Orthopedist");
  }

  // --- DVT / PE (blood clots) ---
  // NHS DVT: urgent GP/111 if suspect DVT; call 999 if DVT symptoms + breathlessness/chest pain; risk higher if smoke / contraceptive pill etc. :contentReference[oaicite:4]{index=4}
  const dvtLegSymptoms =
    isLeg && (has("Swelling") || noteHas("calf", "thigh", "one leg", "warm", "red", "tender"));

  const clotRisk =
    smoker === "yes" ||
    contraception.includes("pill") ||
    contraception.includes("combined") ||
    contraception.includes("patch") ||
    contraception.includes("ring") ||
    noteHas("recent flight", "long travel", "immobile", "surgery");

  if (dvtLegSymptoms) {
    addUrgent("Possible DVT (leg pain/swelling/warmth/tenderness): seek same-day medical advice (GP/urgent care).");
    doctors.add("Family medicine (GP)");
    doctors.add("Emergency / A&E");
    if (clotRisk) urgent.add("⚠️ Risk factors present (e.g., smoking / hormonal contraception / immobility): be extra cautious.");
  }

  if (dvtLegSymptoms && (has("Shortness of breath") || has("Chest pain") || noteHas("coughing blood", "coughing up blood"))) {
    addEmergency("Leg clot symptoms plus chest pain or breathlessness could be a pulmonary embolism: emergency now.");
    doctors.add("Emergency / A&E");
  }

  // --- Sepsis-like warning signs (broad safety net) ---
  // CDC sepsis: emergency symptoms can include fast breathing, confusion, extreme pain, clammy skin, etc. :contentReference[oaicite:5]{index=5}
  if (has("Fever") && (has("Shortness of breath") || noteHas("confus", "confusion") || noteHas("clammy", "mottled") || pain >= 8)) {
    addUrgent("Fever with systemic severe features (breathing difficulty/confusion/extreme pain/clammy): urgent evaluation recommended.");
    doctors.add("Emergency / A&E");
  }

  // --- Anaphylaxis (severe allergy) ---
  // NHS Inform: swelling mouth/throat/tongue, wheezing, faint, collapse -> call emergency. :contentReference[oaicite:6]{index=6}
  const possibleAnaphylaxis =
    (has("Rash") || noteHas("hives", "urticaria")) &&
    (has("Shortness of breath") || noteHas("wheeze", "swelling tongue", "swelling throat", "swollen lips", "faint", "collapse"));

  if (possibleAnaphylaxis) {
    addEmergency("Possible severe allergic reaction (rash + breathing/swelling/faint): emergency help now.");
    doctors.add("Emergency / A&E");
  }

  // --- Kidney infection / pyelonephritis suspicion ---
  // NHS: urgent care if very high temp/shivery + back/side pain + being sick, etc. :contentReference[oaicite:7]{index=7}
  if (has("Urinary pain")) {
    causes.add("Urinary tract infection (context-dependent)");
    doctors.add("Family medicine (GP)");

    if (has("Fever") || noteHas("flank", "side pain", "under ribs", "back just under the ribs") || hasAny("Nausea", "Vomiting")) {
      addUrgent("Urinary pain with fever and/or flank/back pain and/or vomiting can suggest kidney infection: seek urgent medical advice.");
      doctors.add("Emergency / A&E");
    }
  }

  // =========================================================
  // 2) NON-EMERGENCY: BODY PART + PAIN QUALITY + CONTEXT
  // =========================================================

  // --- Nerve irritation patterns (burning + tingling) ---
  if (has("Numbness/tingling") && (painType === "burning" || noteHas("shooting", "electric", "pins and needles"))) {
    causes.add("Possible nerve irritation (pinched nerve / radicular pain)");
    doctors.add("Family medicine (GP)");
    doctors.add("Neurologist");
    if (isBack) doctors.add("Orthopedist");
  }

  // --- Myofascial pain syndrome / trigger points ---
  // Mayo: trigger points cause pain and can cause referred pain. :contentReference[oaicite:8]{index=8}
  const mpsLikely =
    (isNeckShoulder || isBack || isArm || isLeg) &&
    sportsHigh &&
    (painType === "dull" || painType === "stiffness" || noteHas("knot", "trigger point", "massage helps", "tight", "spasm"));

  if (mpsLikely) {
    causes.add("Myofascial pain / trigger points (overuse, posture, muscle tension)");
    doctors.add("Physiotherapist");
    doctors.add("Family medicine (GP)");
    if (has("Headache") && isNeckShoulder) causes.add("Tension-type headache related to neck/shoulder muscle tension");
  }

  // --- Classic muscle strain / overuse ---
  const strainLikely =
    sportsHigh &&
    (painType === "sharp" || pain >= 5 || noteHas("pulled", "strain", "tore", "overdid", "too much")) &&
    (isLeg || isBack || isNeckShoulder || isArm);

  if (strainLikely) {
    causes.add("Muscle strain / overuse");
    doctors.add("Physiotherapist");
    doctors.add("Sports medicine");
    doctors.add("Family medicine (GP)");
  }

  // --- Location-driven suggestions (your original mapping, expanded a bit) ---
  if (part) {
    if (isNeckShoulder) {
      causes.add("Posture-related neck/shoulder pain or overload");
      doctors.add("Physiotherapist");
      doctors.add("Family medicine (GP)");
    }

    if (isBack) {
      causes.add("Back muscle overload / strain (context-dependent)");
      doctors.add("Physiotherapist");
      doctors.add("Family medicine (GP)");
      if (has("Fever")) addUrgent("Back pain + fever can be a red flag: seek urgent medical advice.");
    }

    if (isAbdomen) {
      causes.add("Abdominal wall strain / or digestive discomfort (context-dependent)");
      doctors.add("Family medicine (GP)");
      // Safety net: sudden severe abdominal pain + fever/vomiting → urgent
      if (sudden && (pain >= 7) && hasAny("Fever", "Vomiting")) {
        addUrgent("Sudden severe abdominal pain with fever/vomiting: urgent evaluation recommended.");
        doctors.add("Emergency / A&E");
      }
    }

    if (isLeg) {
      causes.add("Lower-limb overload / strain / tendon irritation");
      doctors.add("Sports medicine");
      doctors.add("Physiotherapist");
      doctors.add("Family medicine (GP)");
    }

    if (isArm) {
      causes.add("Upper-limb overuse (tendon irritation) / strain (context-dependent)");
      doctors.add("Physiotherapist");
      doctors.add("Family medicine (GP)");
    }
  }

  // --- Symptom-driven specialists (kept + expanded) ---
  if (has("Rash")) doctors.add("Dermatologist");
  if (has("Joint pain")) doctors.add("Rheumatologist");
  if (has("Cough") && (has("Shortness of breath") || smoker === "yes")) doctors.add("Pulmonologist");

  // =========================================================
  // 3) OUTPUT (prioritize urgency text)
  // =========================================================
  possibleCausesEl.textContent = causes.size ? [...causes].join(" · ") : "Not enough info to suggest possible causes yet.";
  suggestedDoctorEl.textContent = doctors.size ? [...doctors].join(" · ") : "Family medicine (GP)";

  // If no urgent flags, show a generic safety-net message
  if (!urgent.size) {
    urgentCareEl.textContent =
      "Safety note: if symptoms rapidly worsen, you feel faint, develop severe chest pain, trouble breathing, or new neuro/bladder/bowel symptoms, seek urgent care.";
  } else {
    // Show emergency messages first
    const sorted = [...urgent].sort((a, b) => (a.startsWith("🚨") ? -1 : 1) - (b.startsWith("🚨") ? -1 : 1));
    urgentCareEl.textContent = sorted.join(" ");
  }

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
  normalizeMuscleClasses();
  addSvgTitlePerMuscle();
  initMuscleClicks();
  renderSymptomChips();
  renderSelectedSymptoms();
  resetAll();
  setView("front");
});
