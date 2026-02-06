# Medical Companion (Prototype)

An interactive web prototype that helps users describe pain and symptoms using a clickable human body map (front/back).  
The user selects where it hurts, adds symptoms, pain intensity/type, and basic context (weight, height, habits). The app then produces a **rule-based orientation**: possible causes (high-level) + which type of clinician to consult + urgent safety messages.

> ⚠️ Disclaimer: This is a prototype for **information and orientation only**. It is **not** a medical device and does **not** provide a diagnosis. If symptoms are severe or worsening, seek professional care.

---

## Features

- **Clickable muscle map (Front / Back)**  
  - SVG regions are selectable
  - Hover highlight + persistent selection state
- **Symptom capture**
  - Predefined symptom chips + custom symptom input
- **Pain characterization**
  - Pain level (0–10)
  - Pain type dropdown (sharp, dull, burning, etc.)
  - Free-text notes
- **Profile / context inputs**
  - Weight, height
  - Sports frequency
  - Smoker status
  - Sex + contraception (shown only when relevant)
  - Food intake / hydration notes
- **Rule-based orientation engine**
  - Urgency red-flags (e.g., chest pain + dyspnea)
  - Region-based logic (neck/shoulder/back/legs/arms/core)
  - Specialty suggestions (GP, physiotherapist, sports med, rheumatology, dermatology, etc.)
- **Exportable summary**
  - Generates a clean text summary that can be copied

---

## Tech Stack

- HTML / CSS / JavaScript
- Inline SVG (clickable regions)
- No external dependencies (static site)

---

## How the Body Map Works

The UI stacks:

- a reference image (front.jpg / back.jpg) for visuals

- an inline SVG above it for interaction

The SVG paths use:

- id="..." for unique muscle names

- class="muscles" so JavaScript can attach hover/click logic

Editing the SVG regions

SVG regions were created/edited in Inkscape:

- Import anatomy reference image

- Trace muscle regions with paths

- Set each path id to a muscle name

- Add class="muscles" for all clickable paths

- Export/save as SVG and inline it inside index.html

---

## Rule-Based Orientation Logic

The logic is implemented in JavaScript (see analyze() function).
It is designed in layers:

- Urgency / red flags (safety first)

- Region-based inference (selected muscle group)

- Symptom-driven specialty suggestions

- Output formatting (causes, suggested doctor, urgent guidance, summary export)

If you want to improve it:

- Add more symptoms (chips)

- Add stronger “notes keyword” extraction

- Add separate rules per muscle subgroup (e.g., knee vs calf)

- Add a confidence score per rule (simple scoring system)
---
## Roadmap / Ideas

- Front/back toggle animations + persistent selection per view

- Multi-select muscles for radiating pain patterns

- Tooltips following the cursor (custom tooltip)

- Better symptom timeline: onset, duration, triggers

- Export to PDF or shareable link

---

## Safety Notes

If you experience:

- severe chest pain

- trouble breathing

- fainting

- sudden weakness/face droop/speech issues

- severe headache with neurological symptoms

- uncontrolled bleeding

- rapidly worsening symptoms

Seek urgent medical help immediately.
---
## License

This project is currently a personal prototype.
Add a license if you plan to distribute or reuse parts publicly.

