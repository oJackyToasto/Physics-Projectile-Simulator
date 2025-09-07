// ------------------ GLOBALS ------------------
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// Viewport / axes
let scale = 10;                 // pixels per meter
let offsetX = canvas.width / 2; // place Y-axis center
let offsetY = 100;              // place X-axis near the top, making room for the pendulum
let padding = 50;

// First Pendulum
let theta1 = Math.PI / 4; // 45 degrees default
let omega1 = 0;
let alpha1 = 0;
let L1 = 10;
let m1 = 1;

// Second Pendulum
let theta2 = Math.PI / 4;
let omega2 = 0;
let alpha2 = 0;
let L2 = 10;
let m2 = 1;
let secondPendulumEnabled = false;

// Third Pendulum
let theta3 = Math.PI / 4;
let omega3 = 0;
let alpha3 = 0;
let L3 = 10;
let m3 = 1;
let thirdPendulumEnabled = false;

// Gravity, air resistance, and sim speed
let g = 9.8;
let airResistance = 0;
let simSpeed = 1;

let isRunning = false;
let animationId = null;
let lastTime = null;

let statsEnabled = false;

// ---- Pendulum 1 ----
document.getElementById("angle1").addEventListener("input", e => {
  theta1 = parseFloat(e.target.value) * Math.PI / 180;
  document.getElementById("angle1Value").textContent = e.target.value + "°";
});
document.getElementById("mass1").addEventListener("input", e => {
  m1 = parseFloat(e.target.value);
  document.getElementById("mass1Value").textContent = m1.toFixed(1) + "kg";
});
document.getElementById("length1").addEventListener("input", e => {
  L1 = parseFloat(e.target.value);
  document.getElementById("length1Value").textContent = L1.toFixed(1) + "m";
});

if (secondPendulumEnabled) {
    document.getElementById("angle2").addEventListener("input", e => {
    theta2 = parseFloat(e.target.value) * Math.PI / 180;
    document.getElementById("angle2Value").textContent = e.target.value + "°";
  });
  document.getElementById("mass2").addEventListener("input", e => {
    m2 = parseFloat(e.target.value);
    document.getElementById("mass2Value").textContent = m2.toFixed(1) + "kg";
  });
  document.getElementById("length2").addEventListener("input", e => {
    L2 = parseFloat(e.target.value);
    document.getElementById("length2Value").textContent = L2.toFixed(1) + "m";
  });
}

if (thirdPendulumEnabled) {
    document.getElementById("angle3").addEventListener("input", e => {
    theta3 = parseFloat(e.target.value) * Math.PI / 180;
    document.getElementById("angle3Value").textContent = e.target.value + "°";
  });
  document.getElementById("mass3").addEventListener("input", e => {
    m3 = parseFloat(e.target.value);
    document.getElementById("mass3Value").textContent = m3.toFixed(1) + "kg";
  });
  document.getElementById("length3").addEventListener("input", e => {
    L3 = parseFloat(e.target.value);
    document.getElementById("length3Value").textContent = L3.toFixed(1) + "m";
  });
}

// ------------------ ELEMENTS ------------------
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");

const angle1Slider = document.getElementById("angle1");
const mass1Slider = document.getElementById("mass1");
const length1Slider = document.getElementById("length1");
const gravitySlider = document.getElementById("gravity");
const airResSlider = document.getElementById("airRes");
const speedSlider = document.getElementById("simSpeed");
const extraContainer = document.getElementById("extraPendulumContainer");
const toggleSecondBtn = document.getElementById("toggleSecondPendulum");
const toggleThirdBtn = document.getElementById("toggleThirdPendulum");

// ------------------ UI HOOKS (labels) ------------------
function syncLabels() {
  document.getElementById("angle1Value").innerText = angle1Slider.value + "°";
  document.getElementById("mass1Value").innerText = mass1Slider.value + "kg";
  document.getElementById("length1Value").innerText = length1Slider.value + "m";
  document.getElementById("gravityValue").innerText = gravitySlider.value + " m/s²";
  document.getElementById("airResValue").innerText = airResSlider.value + " N*s/m²";
  document.getElementById("simSpeedValue").innerText = speedSlider.value + "x";
}

function bindExtraSliders() {
  const pendulums = [
    { enabled: secondPendulumEnabled, id: 2, theta: 'theta2', omega: 'omega2', alpha: 'alpha2', L: 'L2', m: 'm2' },
    { enabled: thirdPendulumEnabled, id: 3, theta: 'theta3', omega: 'omega3', alpha: 'alpha3', L: 'L3', m: 'm3' }
  ];

  pendulums.forEach(p => {
    if (!p.enabled) return;

    const angleSlider = document.getElementById(`angle${p.id}`);
    const massSlider = document.getElementById(`mass${p.id}`);
    const lengthSlider = document.getElementById(`length${p.id}`);

    if (!angleSlider || !massSlider || !lengthSlider) return;

    // Angle slider
    if (!angleSlider.dataset.bound) {
      angleSlider.addEventListener("input", e => {
        window[p.theta] = parseFloat(e.target.value) * Math.PI / 180;
        window[p.omega] = 0;
        window[p.alpha] = 0;
        drawFrame();
        if (statsEnabled) updateStats();
        document.getElementById(`angle${p.id}Value`).textContent = e.target.value + "°";
      });
      angleSlider.dataset.bound = "true";
    }

    // Mass slider
    if (!massSlider.dataset.bound) {
      massSlider.addEventListener("input", e => {
        window[p.m] = parseFloat(e.target.value);
        drawFrame();
        if (statsEnabled) updateStats();
        document.getElementById(`mass${p.id}Value`).textContent = parseFloat(e.target.value).toFixed(1) + "kg";
      });
      massSlider.dataset.bound = "true";
    }

    // Length slider
    if (!lengthSlider.dataset.bound) {
      lengthSlider.addEventListener("input", e => {
        window[p.L] = parseFloat(e.target.value);
        drawFrame();
        if (statsEnabled) updateStats();
        document.getElementById(`length${p.id}Value`).textContent = parseFloat(e.target.value).toFixed(1) + "m";
      });
      lengthSlider.dataset.bound = "true";
    }
  });
}




// ------------------ STATS TOGGLE ------------------
toggleStatsBtn.addEventListener("click", () => {
  statsEnabled = !statsEnabled;
  toggleStatsBtn.innerText = statsEnabled ? "Hide Stats" : "Show Stats";
  if (!statsEnabled) statsDiv.innerHTML = "";
  else updateStats();
});

// Template for Pendulum 2
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

// Template for Pendulum 3
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

// Handle second pendulum toggle
// Handle second pendulum toggle
toggleSecondBtn.addEventListener("click", () => {
  if (!secondPendulumEnabled) {
    // Enable second pendulum
    extraContainer.innerHTML = pendulum2HTML;
    secondPendulumEnabled = true;
    bindExtraSliders(); // <-- THIS ensures event listeners are added instantly
    toggleSecondBtn.textContent = "Disable 2nd Pendulum";
    toggleThirdBtn.style.display = "block"; // show 3rd toggle button
  } else {
    // Disable both second and third
    extraContainer.innerHTML = "";
    secondPendulumEnabled = false;
    thirdPendulumEnabled = false;
    toggleSecondBtn.textContent = "Enable 2nd Pendulum";
    toggleThirdBtn.style.display = "none";
    toggleThirdBtn.textContent = "Enable 3rd Pendulum";
  }
});

// Toggle third pendulum
toggleThirdBtn.addEventListener("click", () => {
  if (!thirdPendulumEnabled) {
    // Append pendulum 3 only if it's not already there
    if (!document.getElementById("pen3")) {
      extraContainer.insertAdjacentHTML('beforeend', pendulum3HTML);
      thirdPendulumEnabled = true;
      bindExtraSliders();  // attach listeners only to new elements
      toggleThirdBtn.textContent = "Disable 3rd Pendulum";
    }
  } else {
    // Remove pendulum 3
    const pen3 = document.getElementById("pen3");
    if (pen3) pen3.remove();
    thirdPendulumEnabled = false;
    toggleThirdBtn.textContent = "Enable 3rd Pendulum";
  }
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
  // Pause the simulation
  isRunning = false;
  cancelAnimationFrame(animationId);
  document.getElementById("runBtn").textContent = "Run";

  // ---- Reset pendulum 1 ----
  theta1 = parseFloat(angle1Slider.value) * Math.PI / 180;
  omega1 = 0;
  alpha1 = 0;

  // ---- Reset pendulum 2 ----
  if (secondPendulumEnabled) {
    const angle2Slider = document.getElementById("angle2");
    theta2 = parseFloat(angle2Slider.value) * Math.PI / 180;
    omega2 = 0;
    alpha2 = 0;
  }

  // ---- Reset pendulum 3 ----
  if (thirdPendulumEnabled) {
    const angle3Slider = document.getElementById("angle3");
    theta3 = parseFloat(angle3Slider.value) * Math.PI / 180;
    omega3 = 0;
    alpha3 = 0;
  }

  // Redraw frame and stats
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
function worldToCanvas(x_m, y_m) {
    // pivotCanvasY = vertical position of pivot in canvas coordinates
    // positive y downward on canvas
    const pivotCanvas = { x: offsetX, y: offsetY }; // offsetX/Y as before

    return {
        x: pivotCanvas.x + x_m * scale,
        y: pivotCanvas.y - y_m * scale // ⚠ flip y
    };
}

function getTotalLength() {
  let total = L1;
  if (secondPendulumEnabled) total += L2;
  if (thirdPendulumEnabled) total += L3;
  return total;
}

function runAnimation() {
  const dt = 0.016 * simSpeed; // ~60fps timestep
  updatePhysics(dt);
  drawFrame();
  if (isRunning) animationId = requestAnimationFrame(runAnimation);
}

function drawAxes(drawCtx) {
  drawCtx.clearRect(0, 0, canvas.width, canvas.height);
  drawCtx.strokeStyle = "white";
  drawCtx.lineWidth = 1;
  drawCtx.font = "12px sans-serif";
  drawCtx.fillStyle = "white";

  // X axis (horizontal)
  drawCtx.beginPath();
  drawCtx.moveTo(0, offsetY);
  drawCtx.lineTo(canvas.width, offsetY);
  drawCtx.stroke();

  // Y axis (vertical)
  drawCtx.beginPath();
  drawCtx.moveTo(offsetX, 0);
  drawCtx.lineTo(offsetX, canvas.height);
  drawCtx.stroke();

  const labelSpacingPx = 50;
  const preloadLabels = 20;

  // X-axis labels (meters)
  const startXi = Math.floor((-offsetX - preloadLabels * labelSpacingPx) / labelSpacingPx);
  const endXi   = Math.ceil((canvas.width - offsetX + preloadLabels * labelSpacingPx) / labelSpacingPx);
  for (let i = startXi; i <= endXi; i++) {
    if (i === 0) continue;
    const px = offsetX + i * labelSpacingPx;
    const value = (i * labelSpacingPx) / scale;
    drawCtx.fillText(value.toFixed(0), px - 8, offsetY + 15);
  }

  // Y-axis labels (meters) — note: Y grows *downwards* in world coords now
  const startYi = Math.floor((-offsetY - preloadLabels * labelSpacingPx) / labelSpacingPx);
  const endYi   = Math.ceil((canvas.height - offsetY + preloadLabels * labelSpacingPx) / labelSpacingPx);
  for (let i = startYi; i <= endYi; i++) {
    if (i === 0) continue;
    const py = offsetY + i * labelSpacingPx; // DOWNwards
    const value = (i * labelSpacingPx) / scale;
    drawCtx.fillText(value.toFixed(0), offsetX - 25, py + 4);
  }
}

function drawPendulum(ctx) {
  const pivot = worldToCanvas(0, 0);

  // Step 1: First pendulum
  const x1 = L1 * Math.sin(theta1);
  const y1 = -L1 * Math.cos(theta1);

  const bob1 = worldToCanvas(x1, y1);

  // Draw rod 1
  ctx.beginPath();
  ctx.moveTo(pivot.x, pivot.y);
  ctx.lineTo(bob1.x, bob1.y);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw bob 1
  ctx.beginPath();
  ctx.arc(bob1.x, bob1.y, 10, 0, 2 * Math.PI);
  ctx.fillStyle = "red";
  ctx.fill();

  let lastX = x1;
  let lastY = y1;

  // Step 2: Second pendulum (if enabled)
  if (secondPendulumEnabled) {
    const x2 = lastX + L2 * Math.sin(theta2);
    const y2 = lastY - L2 * Math.cos(theta2);

    const bob2 = worldToCanvas(x2, y2);

    // Rod 2
    ctx.beginPath();
    ctx.moveTo(bob1.x, bob1.y);
    ctx.lineTo(bob2.x, bob2.y);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bob 2
    ctx.beginPath();
    ctx.arc(bob2.x, bob2.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "orange";
    ctx.fill();

    lastX = x2;
    lastY = y2;
  }

  // Step 3: Third pendulum (if enabled)
  if (thirdPendulumEnabled) {
    const x3 = lastX + L3 * Math.sin(theta3);
    const y3 = lastY - L3 * Math.cos(theta3);

    const bob3 = worldToCanvas(x3, y3);

    // Rod 3
    ctx.beginPath();
    ctx.moveTo(worldToCanvas(lastX, lastY).x, worldToCanvas(lastX, lastY).y);
    ctx.lineTo(bob3.x, bob3.y);
    ctx.strokeStyle = "lightgreen";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Bob 3
    ctx.beginPath();
    ctx.arc(bob3.x, bob3.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "green";
    ctx.fill();
  }

  // Pivot
  ctx.beginPath();
  ctx.arc(pivot.x, pivot.y, 5, 0, 2 * Math.PI);
  ctx.fillStyle = "#cdd6f4";
  ctx.fill();
}


function updatePhysics(dt) {
  // Apply simple pendulum physics to each active pendulum

  // ---- Pendulum 1 ----
  alpha1 = (-g / L1) * Math.sin(theta1) - (airResistance * omega1);
  omega1 += alpha1 * dt;
  theta1 += omega1 * dt;

  // ---- Pendulum 2 ----
  if (secondPendulumEnabled) {
    alpha2 = (-g / L2) * Math.sin(theta2) - (airResistance * omega2);
    omega2 += alpha2 * dt;
    theta2 += omega2 * dt;
  }

  // ---- Pendulum 3 ----
  if (thirdPendulumEnabled) {
    alpha3 = (-g / L3) * Math.sin(theta3) - (airResistance * omega3);
    omega3 += alpha3 * dt;
    theta3 += omega3 * dt;
  }
}


function drawFrame() {
  drawAxes(ctx); // optional if you have axes
  drawPendulum(ctx);
}

// ------------------ STATS ------------------
function updateStats() {
  const totalLength = getTotalLength();
  // bob position (world y down)
  const x_m = L * Math.sin(theta);
  const y_m = L * Math.cos(theta);

  // linear speed at bob
  const v = Math.abs(L * omega); // m/s

  // height above lowest point: lowest point is at y = L (when theta=0),
  // so height = L - current_y
  const height = totalLength - y_m;

  const PE = m * g * height;
  const KE = 0.5 * m * v * v;
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
