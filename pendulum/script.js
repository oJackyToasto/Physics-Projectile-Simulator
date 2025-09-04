// ------------------ GLOBALS ------------------
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// Viewport / axes
let scale = 10;                 // pixels per meter
let offsetX = canvas.width / 2; // place Y-axis center
let offsetY = 100;              // place X-axis near the top, making room for the pendulum
let padding = 50;

// Simulation state (single pendulum)
let theta = 45 * Math.PI / 180; // radians
let omega = 0;                  // rad/s
let alpha = 0;                  // rad/s^2

// Controls (read live from sliders, but keep cached copies for speed)
let L = 10;     // meters
let m = 1;      // kg
let g = 9.8;    // m/s^2
let damping = 0; // 1/s (interpret "airRes" as damping coefficient)
let simSpeed = 1;

let isRunning = false;
let animationId = null;
let lastTime = null;

let statsEnabled = false;

// ------------------ ELEMENTS ------------------
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");

const angle1Slider = document.getElementById("angle1");
const mass1Slider = document.getElementById("mass1");
const length1Slider = document.getElementById("length1");
const gravitySlider = document.getElementById("gravity");
const airResSlider = document.getElementById("airRes");
const speedSlider = document.getElementById("simSpeed");

// ------------------ UI HOOKS (labels) ------------------
function syncLabels() {
  document.getElementById("angle1Value").innerText = angle1Slider.value + "°";
  document.getElementById("mass1Value").innerText = mass1Slider.value + "kg";
  document.getElementById("length1Value").innerText = length1Slider.value + "m";
  document.getElementById("gravityValue").innerText = gravitySlider.value + " m/s²";
  document.getElementById("airResValue").innerText = airResSlider.value + " N*s/m²";
  document.getElementById("simSpeedValue").innerText = speedSlider.value + "x";
}

// ------------------ STATS TOGGLE ------------------
toggleStatsBtn.addEventListener("click", () => {
  statsEnabled = !statsEnabled;
  toggleStatsBtn.innerText = statsEnabled ? "Hide Stats" : "Show Stats";
  if (!statsEnabled) statsDiv.innerHTML = "";
  else updateStats();
});

// ------------------ DRAGGING + TOUCH (pan / pinch) ------------------
let drag = false, lastX = 0, lastY = 0;
let pinchStartDistance = 0;

function startDrag(x, y) {
  drag = true;
  lastX = x;
  lastY = y;
  canvas.style.cursor = "grabbing";
}
function endDrag() {
  drag = false;
  canvas.style.cursor = "grab";
}
function doDrag(x, y) {
  if (!drag) return;
  offsetX += x - lastX;
  offsetY += y - lastY;
  lastX = x;
  lastY = y;
  drawFrame();
}

// Mouse
canvas.addEventListener("mousedown", e => startDrag(e.clientX, e.clientY));
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mousemove", e => doDrag(e.clientX, e.clientY));

// Touch
canvas.addEventListener("touchstart", e => {
  if (e.touches.length === 1) {
    startDrag(e.touches[0].clientX, e.touches[0].clientY);
  } else if (e.touches.length === 2) {
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    pinchStartDistance = Math.sqrt(dx*dx + dy*dy);
  }
}, { passive: false });

canvas.addEventListener("touchend", e => {
  if (e.touches.length === 0) endDrag();
}, { passive: false });

canvas.addEventListener("touchmove", e => {
  if (e.touches.length === 1) {
    doDrag(e.touches[0].clientX, e.touches[0].clientY);
  } else if (e.touches.length === 2) {
    const dx = e.touches[1].clientX - e.touches[0].clientX;
    const dy = e.touches[1].clientY - e.touches[0].clientY;
    const newDistance = Math.sqrt(dx*dx + dy*dy);
    if (pinchStartDistance > 0) {
      if (newDistance > pinchStartDistance + 10) zoomIn();
      if (newDistance < pinchStartDistance - 10) zoomOut();
    }
    pinchStartDistance = newDistance;
  }
  e.preventDefault();
}, { passive: false });

// ------------------ SLIDERS (values + live updates) ------------------
angle1Slider.addEventListener("input", () => {
  syncLabels();
  // Reset angle to slider if user tweaks it (keeps demo intuitive)
  theta = parseFloat(angle1Slider.value) * Math.PI / 180;
  omega = 0;
  drawFrame();
  if (statsEnabled) updateStats();
});

mass1Slider.addEventListener("input", () => {
  m = parseFloat(mass1Slider.value);
  syncLabels();
  if (statsEnabled) updateStats();
});

length1Slider.addEventListener("input", () => {
  L = parseFloat(length1Slider.value);
  syncLabels();
  drawFrame();
  if (statsEnabled) updateStats();
});

gravitySlider.addEventListener("input", () => {
  g = parseFloat(gravitySlider.value);
  syncLabels();
  if (statsEnabled) updateStats();
});

airResSlider.addEventListener("input", () => {
  damping = parseFloat(airResSlider.value); // interpret as viscous damping coeff (1/s)
  syncLabels();
});

speedSlider.addEventListener("input", () => {
  simSpeed = parseFloat(speedSlider.value);
  syncLabels();
});

// ------------------ BUTTONS ------------------
function resetGravity() {
  gravitySlider.value = 9.8;
  g = 9.8;
  document.getElementById("gravityValue").innerText = g + " m/s²";
}

function toggleSimulation() {
  if (!isRunning) {
    isRunning = true;
    lastTime = null; // reset time base
    document.getElementById("runBtn").innerText = "Pause";
    animationId = requestAnimationFrame(animate);
  } else {
    isRunning = false;
    document.getElementById("runBtn").innerText = "Run";
    cancelAnimationFrame(animationId);
  }
}

function resetSimulation() {
  isRunning = false;
  cancelAnimationFrame(animationId);
  document.getElementById("runBtn").innerText = "Run";

  // Reset from sliders
  theta = parseFloat(angle1Slider.value) * Math.PI / 180;
  omega = 0;
  // L, m, g, damping already tracked live
  drawFrame();
  if (statsEnabled) updateStats();
}

// Stubs so your buttons don’t error out yet
function enablePen2() { alert("Second pendulum not implemented yet."); }
function enablePen3() { alert("Third pendulum (chaotic) not implemented yet."); }

// ------------------ PHYSICS (simple pendulum) ------------------
function step(dt) {
  // dt is in seconds; use simSpeed as a time multiplier (0..1 per your slider)
  const h = dt * simSpeed;
  if (h <= 0) return;

  // Equation: theta¨ = -(g/L) sin(theta) - damping * theta˙
  alpha = -(g / L) * Math.sin(theta) - damping * omega;
  omega += alpha * h;
  theta += omega * h;
}

// ------------------ DRAWING ------------------
function worldToCanvas(xm, ym) {
  return {
    x: offsetX + xm * scale,
    y: offsetY - ym * scale
  };
}

function drawAxes(drawCtx) {
  drawCtx.clearRect(0, 0, canvas.width, canvas.height);
  drawCtx.strokeStyle = "white";
  drawCtx.lineWidth = 1;
  drawCtx.font = "12px sans-serif";
  drawCtx.fillStyle = "white";

  // X axis
  drawCtx.beginPath();
  drawCtx.moveTo(0, offsetY);
  drawCtx.lineTo(canvas.width, offsetY);
  drawCtx.stroke();

  // Y axis
  drawCtx.beginPath();
  drawCtx.moveTo(offsetX, 0);
  drawCtx.lineTo(offsetX, canvas.height);
  drawCtx.stroke();

  const labelSpacingPx = 50;
  const preloadLabels = 20;

  // X-axis labels (meters)
  for (let i = Math.floor((-offsetX - preloadLabels * labelSpacingPx) / labelSpacingPx);
       i <= Math.ceil((canvas.width - offsetX + preloadLabels * labelSpacingPx) / labelSpacingPx); i++) {
    if (i === 0) continue;
    let px = offsetX + i * labelSpacingPx;
    let value = (i * labelSpacingPx) / scale;
    drawCtx.fillText(value.toFixed(0), px - 8, offsetY + 15);
  }

  // Y-axis labels (meters)
  for (let i = Math.floor((-offsetY - preloadLabels * labelSpacingPx) / labelSpacingPx);
       i <= Math.ceil((canvas.height - offsetY + preloadLabels * labelSpacingPx) / labelSpacingPx); i++) {
    if (i === 0) continue;
    let py = offsetY - i * labelSpacingPx;
    let value = (i * labelSpacingPx) / scale;
    drawCtx.fillText(value.toFixed(0), offsetX - 25, py + 4);
  }
}

function drawPendulum(drawCtx) {
  // Pivot at world (0,0) (i.e., at the axes intersection)
  const pivot = worldToCanvas(0, 0);

  // Bob position in *meters*
  const x_m = L * Math.sin(theta);
  const y_m = -L * Math.cos(theta); // negative because down is -y in our world coords

  const bob = worldToCanvas(x_m, y_m);

  // Rod
  drawCtx.beginPath();
  drawCtx.moveTo(pivot.x, pivot.y);
  drawCtx.lineTo(bob.x, bob.y);
  drawCtx.strokeStyle = "white";
  drawCtx.lineWidth = 2;
  drawCtx.stroke();

  // Pivot
  drawCtx.beginPath();
  drawCtx.arc(pivot.x, pivot.y, 5, 0, 2 * Math.PI);
  drawCtx.fillStyle = "#cdd6f4";
  drawCtx.fill();

  // Bob
  drawCtx.beginPath();
  drawCtx.arc(bob.x, bob.y, 10, 0, 2 * Math.PI);
  drawCtx.fillStyle = "red";
  drawCtx.fill();
}

function drawFrame() {
  drawAxes(ctx);
  drawPendulum(ctx);
}

// ------------------ STATS ------------------
function updateStats() {
  // Linear speed at bob
  const v = Math.abs(L * omega); // m/s
  const height = L * (1 - Math.cos(theta)); // m above the lowest point
  const PE = m * g * height;
  const KE = 0.5 * m * (L * omega) * (L * omega);
  const total = PE + KE;

  statsDiv.innerHTML = `
    Mass: ${m.toFixed(2)} kg<br>
    Length: ${L.toFixed(2)} m<br>
    Angle: ${(theta * 180 / Math.PI).toFixed(1)}°<br>
    ω (rad/s): ${omega.toFixed(3)}<br>
    α (rad/s²): ${alpha.toFixed(3)}<br>
    Speed: ${v.toFixed(3)} m/s<br>
    PE: ${PE.toFixed(2)} J<br>
    KE: ${KE.toFixed(2)} J<br>
    Total Energy: ${total.toFixed(2)} J
  `;
}

// ------------------ ZOOM ------------------
function zoomIn()  { scale *= 1.2; drawFrame(); if (statsEnabled) updateStats(); }
function zoomOut() { scale /= 1.2; drawFrame(); if (statsEnabled) updateStats(); }

// ------------------ ANIMATION ------------------
function animate(t) {
  if (lastTime == null) lastTime = t;
  const dt = Math.min(0.05, (t - lastTime) / 1000); // clamp for stability
  lastTime = t;

  step(dt);
  drawFrame();
  if (statsEnabled) updateStats();

  if (isRunning) animationId = requestAnimationFrame(animate);
}

// ------------------ INIT ------------------
window.onload = () => {
  // Seed from sliders
  theta   = parseFloat(angle1Slider.value) * Math.PI / 180;
  omega   = 0;
  L       = parseFloat(length1Slider.value);
  m       = parseFloat(mass1Slider.value);
  g       = parseFloat(gravitySlider.value);
  damping = parseFloat(airResSlider.value);
  simSpeed= parseFloat(speedSlider.value);

  syncLabels();
  drawFrame();
  if (statsEnabled) updateStats();
};

// Expose functions used by HTML
window.toggleSimulation = toggleSimulation;
window.resetSimulation  = resetSimulation;
window.resetGravity     = resetGravity;
window.zoomIn           = zoomIn;
window.zoomOut          = zoomOut;
window.enablePen2       = enablePen2;
window.enablePen3       = enablePen3;
