// --- Init muscles (SVG paths) ---
document.querySelectorAll("path.muscles").forEach(node => {
  node.addEventListener("click", () => {
    console.log("clicked:", node.id);
    state.bodyPart = node.id;               // ex: "rectus_abdominis"
    selectedPartEl.textContent = node.id;

    document.querySelectorAll("path.muscles").forEach(p => p.classList.remove("active"));
    node.classList.add("active");
  });
});
console.log("muscles found:", document.querySelectorAll("path.muscles").length);

// Add a tooltip title per muscle (browser native tooltip)
document.querySelectorAll("path.muscles").forEach(node => {
  // if no <title> child yet
  if (!node.querySelector("title")) {
    const t = document.createElementNS("http://www.w3.org/2000/svg", "title");
    t.textContent = prettify(node.id);
    node.appendChild(t);
  }
});
