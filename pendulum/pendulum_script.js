// ------------------ GLOBALS ------------------
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// Viewport / axes
let scale = 10;
let offsetX = canvas.width / 2;
let offsetY = 100;
let padding = 50;

// Pendulums
let pendulums = [
  { theta: Math.PI/4, omega: 0, alpha: 0, L: 10, m: 1, enabled: true, color: "red", rodColor: "white" },
  { theta: Math.PI/4, omega: 0, alpha: 0, L: 10, m: 1, enabled: false, color: "orange", rodColor: "yellow" },
  { theta: Math.PI/4, omega: 0, alpha: 0, L: 10, m: 1, enabled: false, color: "green", rodColor: "lightgreen" }
];

let g = 9.8;
let airResistance = 0;
let simSpeed = 1;

let isRunning = false;
let animationId = null;
let statsEnabled = false;

// Dragging

let drag = false, lastX = 0, lastY = 0;

function startDrag(x, y) { drag = true; lastX = x; lastY = y; canvas.style.cursor = "grabbing"; }
function endDrag() { drag = false; canvas.style.cursor = "grab"; }
function doDrag(x, y) {
    if (!drag) return;
    offsetX += x - lastX;
    offsetY += y - lastY;
    lastX = x;
    lastY = y;
    drawFrame();
}
canvas.addEventListener("mousedown", e => startDrag(e.clientX, e.clientY));
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mousemove", e => doDrag(e.clientX, e.clientY));


// ------------------ ELEMENTS ------------------
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");
const extraContainer = document.getElementById("extraPendulumContainer");

const angleSliders = [
  document.getElementById("angle1"),
  null, // will be dynamically created
  null
];
const massSliders = [
  document.getElementById("mass1"),
  null,
  null
];
const lengthSliders = [
  document.getElementById("length1"),
  null,
  null
];
const gravitySlider = document.getElementById("gravity");
const airResSlider = document.getElementById("airRes");
const speedSlider = document.getElementById("simSpeed");
const toggleSecondBtn = document.getElementById("toggleSecondPendulum");
const toggleThirdBtn = document.getElementById("toggleThirdPendulum");

// ------------------ UI LABELS ------------------
function syncLabels() {
  document.getElementById("angle1Value").innerText = angleSliders[0].value + "°";
  document.getElementById("mass1Value").innerText = massSliders[0].value + "kg";
  document.getElementById("length1Value").innerText = lengthSliders[0].value + "m";
  document.getElementById("gravityValue").innerText = gravitySlider.value + " m/s²";
  document.getElementById("airResValue").innerText = airResSlider.value + " N*s/m²";
  document.getElementById("simSpeedValue").innerText = speedSlider.value + "x";
}

// ------------------ EXTRA PENDULUM TEMPLATES ------------------
const pendulum2HTML = `
<div class="pendulum_control" id="pen2">
  <div class="control-row">
    <label for="angle2">Start Angle (2):</label>
    <input type="range" id="angle2" min="0" max="90" value="45">
    <span class="slider-value" id="angle2Value">45°</span>
  </div>
  <div class="control-row">
    <label for="mass2">Mass (2):</label>
    <input type="range" id="mass2" min="1" max="10" value="1">
    <span class="slider-value" id="mass2Value">1kg</span>
  </div>
  <div class="control-row">
    <label for="length2">Length (2):</label>
    <input type="range" id="length2" min="1" max="20" value="10">
    <span class="slider-value" id="length2Value">10m</span>
  </div>
</div>
`;

const pendulum3HTML = `
<div class="pendulum_control" id="pen3">
  <div class="control-row">
    <label for="angle3">Start Angle (3):</label>
    <input type="range" id="angle3" min="0" max="90" value="45">
    <span class="slider-value" id="angle3Value">45°</span>
  </div>
  <div class="control-row">
    <label for="mass3">Mass (3):</label>
    <input type="range" id="mass3" min="1" max="10" value="1">
    <span class="slider-value" id="mass3Value">1kg</span>
  </div>
  <div class="control-row">
    <label for="length3">Length (3):</label>
    <input type="range" id="length3" min="1" max="20" value="10">
    <span class="slider-value" id="length3Value">10m</span>
  </div>
</div>
`;

// ------------------ BIND SLIDERS ------------------
function bindSlider(index, angleId, massId, lengthId) {
  const angleSlider = document.getElementById(angleId);
  const massSlider = document.getElementById(massId);
  const lengthSlider = document.getElementById(lengthId);

  // Angle slider
  angleSlider.addEventListener("input", e => {
    pendulums[index].theta = parseFloat(e.target.value) * Math.PI / 180;
    pendulums[index].omega = 0;
    pendulums[index].alpha = 0;
    document.getElementById(`${angleId}Value`).textContent = e.target.value + "°";
    drawFrame();
    if (statsEnabled) updateStats();
  });

  // Mass slider
  massSlider.addEventListener("input", e => {
    pendulums[index].m = parseFloat(e.target.value);
    document.getElementById(`${massId}Value`).textContent = parseFloat(e.target.value).toFixed(1) + "kg";
    if (statsEnabled) updateStats();
  });

  // Length slider
  lengthSlider.addEventListener("input", e => {
    pendulums[index].L = parseFloat(e.target.value);
    document.getElementById(`${lengthId}Value`).textContent = parseFloat(e.target.value).toFixed(1) + "m";
    drawFrame();
    if (statsEnabled) updateStats();
  });
}


// Bind pendulum 1 initially
bindSlider(0, "angle1", "mass1", "length1");

// ------------------ TOGGLE EXTRA PENDULUMS ------------------
toggleSecondBtn.addEventListener("click", () => {
  if (!pendulums[1].enabled) {
    extraContainer.innerHTML = pendulum2HTML;
    pendulums[1].enabled = true;
    bindSlider(1, "angle2", "mass2", "length2");
    toggleSecondBtn.textContent = "Disable 2nd Pendulum";
    toggleThirdBtn.style.display = "block";
  } else {
    pendulums[1].enabled = false;
    pendulums[2].enabled = false;
    extraContainer.innerHTML = "";
    toggleSecondBtn.textContent = "Enable 2nd Pendulum";
    toggleThirdBtn.style.display = "none";
    toggleThirdBtn.textContent = "Enable 3rd Pendulum";
  }
  updateStats(); // <-- update stats immediately
  drawFrame();
});

toggleThirdBtn.addEventListener("click", () => {
  if (!pendulums[2].enabled) {
    extraContainer.insertAdjacentHTML('beforeend', pendulum3HTML);
    pendulums[2].enabled = true;
    bindSlider(2, "angle3", "mass3", "length3");
    toggleThirdBtn.textContent = "Disable 3rd Pendulum";
  } else {
    pendulums[2].enabled = false;
    const pen3 = document.getElementById("pen3");
    if (pen3) pen3.remove();
    toggleThirdBtn.textContent = "Enable 3rd Pendulum";
  }
  updateStats(); // <-- update stats immediately
  drawFrame();
});


// ------------------ PHYSICS ------------------
function updatePhysics(dt) {
  pendulums.forEach(p => {
    if (!p.enabled) return;
    p.alpha = -(g / p.L) * Math.sin(p.theta) - airResistance * p.omega;
    p.omega += p.alpha * dt;
    p.theta += p.omega * dt;
  });
}

// ------------------ DRAWING ------------------
function worldToCanvas(x_m, y_m) {
  return {
    x: offsetX + x_m * scale,
    y: offsetY - y_m * scale
  };
}

function drawAxes(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "white";

    // X axis
    ctx.beginPath();
    ctx.moveTo(0, offsetY);
    ctx.lineTo(canvas.width, offsetY);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(offsetX, 0);
    ctx.lineTo(offsetX, canvas.height);
    ctx.stroke();

    const labelSpacingPx = 50;
    const preloadLabels = 20;

    // X labels
    const startXi = Math.floor((-offsetX - preloadLabels * labelSpacingPx) / labelSpacingPx);
    const endXi   = Math.ceil((canvas.width - offsetX + preloadLabels * labelSpacingPx) / labelSpacingPx);
    for (let i = startXi; i <= endXi; i++) {
        if (i === 0) continue;
        const px = offsetX + i * labelSpacingPx;
        const value = (i * labelSpacingPx) / scale;
        ctx.fillText(value.toFixed(0), px - 8, offsetY + 15);
    }

    // Y labels
    const startYi = Math.floor((-offsetY - preloadLabels * labelSpacingPx) / labelSpacingPx);
    const endYi   = Math.ceil((canvas.height - offsetY + preloadLabels * labelSpacingPx) / labelSpacingPx);
    for (let i = startYi; i <= endYi; i++) {
        if (i === 0) continue;
        const py = offsetY + i * labelSpacingPx;
        const value = (i * labelSpacingPx) / scale;
        ctx.fillText(value.toFixed(0), offsetX - 25, py + 4);
    }
}


function drawPendulum(ctx) {
  const pivot = worldToCanvas(0,0);
  let lastX = 0, lastY = 0;

  pendulums.forEach((p, idx) => {
    if (!p.enabled) return;
    const x = lastX + p.L * Math.sin(p.theta);
    const y = lastY - p.L * Math.cos(p.theta);
    const bob = worldToCanvas(x, y);

    // Rod
    ctx.beginPath();
    const start = worldToCanvas(lastX, lastY);
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(bob.x, bob.y);
    ctx.strokeStyle = p.rodColor;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bob
    ctx.beginPath();
    ctx.arc(bob.x, bob.y, 10, 0, 2*Math.PI);
    ctx.fillStyle = p.color;
    ctx.fill();

    lastX = x;
    lastY = y;
  });

  // Pivot
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, 5, 0, 2*Math.PI);
  ctx.fillStyle = "#cdd6f4";
  ctx.fill();
}

function drawFrame() {
  ctx.clearRect(0,0,canvas.width, canvas.height);
  drawAxes(ctx);   // <-- Add this
  drawPendulum(ctx);
}

// ------------------ STATS ------------------
function updateStats() {
  if (!statsEnabled) return; // only show stats when button is pressed

  let html = "";

  pendulums.forEach((p, index) => {
    if (!p.enabled) return;

    const theta = p.theta;
    const omega = p.omega;
    const alpha = p.alpha;
    const L     = p.L;
    const m     = p.m;

    const x_m = L * Math.sin(theta);
    const y_m = L * Math.cos(theta);
    const v = Math.abs(L * omega);
    const height = L - y_m; // relative to pivot
    const PE = m * g * height;
    const KE = 0.5 * m * v * v;
    const total = PE + KE;

    html += `
      <strong>Pendulum ${index + 1}</strong><br>
      Mass: ${m.toFixed(2)} kg<br>
      Length: ${L.toFixed(2)} m<br>
      Angle: ${(theta * 180 / Math.PI).toFixed(1)}°<br>
      ω (rad/s): ${omega.toFixed(3)}<br>
      α (rad/s²): ${alpha.toFixed(3)}<br>
      Speed: ${v.toFixed(3)} m/s<br>
      PE: ${PE.toFixed(2)} J<br>
      KE: ${KE.toFixed(2)} J<br>
      Total Energy: ${total.toFixed(2)} J
      <hr>
    `;
  });

  statsDiv.innerHTML = html;
}


// ------------------ ANIMATION ------------------
function runAnimation() {
  const dt = 0.016 * simSpeed;
  updatePhysics(dt);
  drawFrame();
  if (statsEnabled) updateStats();
  if (isRunning) animationId = requestAnimationFrame(runAnimation);
}

function toggleSimulation() {
  isRunning = !isRunning;
  if (isRunning) {
    runAnimation();
    document.getElementById("runBtn").textContent = "Pause";
  } else {
    cancelAnimationFrame(animationId);
    document.getElementById("runBtn").textContent = "Run";
  }
}

function resetSimulation() {
  // Pause simulation
  isRunning = false;
  cancelAnimationFrame(animationId);
  document.getElementById("runBtn").textContent = "Run";

  // Reset all enabled pendulums
  pendulums.forEach((p, idx) => {
    if (!p.enabled) return;

    // Get slider IDs based on pendulum index
    const angleSlider = document.getElementById(`angle${idx + 1}`);
    const massSlider  = document.getElementById(`mass${idx + 1}`);
    const lengthSlider= document.getElementById(`length${idx + 1}`);

    if (angleSlider) p.theta = parseFloat(angleSlider.value) * Math.PI / 180;
    p.omega = 0;
    p.alpha = 0;

    if (massSlider) p.m = parseFloat(massSlider.value);
    if (lengthSlider) p.L = parseFloat(lengthSlider.value);
  });

  // Redraw frame and stats
  drawFrame();
  if (statsEnabled) updateStats();
}

function zoomIn()  { scale *= 1.2; drawFrame(); }
function zoomOut() { scale /= 1.2; drawFrame(); }


// ------------------ SLIDERS ------------------
gravitySlider.addEventListener("input", e => { g = parseFloat(e.target.value); syncLabels(); if(statsEnabled) updateStats(); });
airResSlider.addEventListener("input", e => { airResistance = parseFloat(e.target.value); syncLabels(); });
speedSlider.addEventListener("input", e => { simSpeed = parseFloat(e.target.value); syncLabels(); });

// ------------------ STATS TOGGLE ------------------
toggleStatsBtn.addEventListener("click", () => {
  statsEnabled = !statsEnabled;
  toggleStatsBtn.textContent = statsEnabled ? "Hide Stats" : "Show Stats";
  if (statsEnabled) updateStats();
  else statsDiv.innerHTML = "";
});

// ------------------ INIT ------------------
window.onload = () => {
  syncLabels();
  drawFrame();
};

// Expose functions
window.toggleSimulation = toggleSimulation;
window.resetSimulation = resetSimulation;
