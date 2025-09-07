// ------------------ GLOBAL VARIABLES ------------------
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

let points = [];
let animationIndex = 0;
let animationId = null;
let isRunning = false;
let initialEnergy = 0;
let statsEnabled = false;
let showPeakEnabled = false;

let padding = 50;
let offsetX = padding;
let offsetY = canvas.height - padding;
let scale = 2.5; // pixels per unit
let simSpeed = 1; // animation speed multiplier

// ------------------ ELEMENTS ------------------
const angleSlider = document.getElementById("angle");
const forceSlider = document.getElementById("force");
const gravitySlider = document.getElementById("gravity");
const airResSlider = document.getElementById("airRes");
const speedSlider = document.getElementById("simSpeed");
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");
const togglePeakBtn = document.getElementById("togglePeakBtn");
const gravityReset = document.getElementById("gravityReset");

// ------------------ PEAK TOGGLE ------------------
togglePeakBtn.addEventListener("click", () => {
    showPeakEnabled = !showPeakEnabled;
    togglePeakBtn.innerText = showPeakEnabled ? "Hide Peak" : "Show Peak";
    drawFrame(Math.floor(animationIndex)); // 🔥 Force redraw immediately
});

// ------------------ STATS TOGGLE ------------------
toggleStatsBtn.addEventListener("click", () => {
    statsEnabled = !statsEnabled;
    toggleStatsBtn.innerText = statsEnabled ? "Hide Stats" : "Show Stats";
    if (!statsEnabled) {
        statsDiv.innerHTML = "";
    } else if (points.length > 0) {
        updateStats(points[Math.floor(animationIndex)]);
    }
});

// ------------------ DRAGGING (Mouse + Touch) ------------------
let drag = false, lastX = 0, lastY = 0;
let pinchStartDistance = 0; // For pinch-to-zoom

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
    drawFrame(Math.floor(animationIndex));
}

// Mouse events
canvas.addEventListener("mousedown", e => startDrag(e.clientX, e.clientY));
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mousemove", e => doDrag(e.clientX, e.clientY));

// Touch events
canvas.addEventListener("touchstart", e => {
    if (e.touches.length === 1) {
        // Single finger drag
        startDrag(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        // Two fingers -> Pinch start
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        pinchStartDistance = Math.sqrt(dx * dx + dy * dy);
    }
}, { passive: false });

canvas.addEventListener("touchend", e => {
    if (e.touches.length === 0) {
        endDrag();
    }
}, { passive: false });

canvas.addEventListener("touchmove", e => {
    if (e.touches.length === 1) {
        // Drag
        doDrag(e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
        // Pinch to zoom
        const dx = e.touches[1].clientX - e.touches[0].clientX;
        const dy = e.touches[1].clientY - e.touches[0].clientY;
        const newDistance = Math.sqrt(dx * dx + dy * dy);

        if (pinchStartDistance > 0) {
            if (newDistance > pinchStartDistance + 10) zoomIn();
            if (newDistance < pinchStartDistance - 10) zoomOut();
        }
        pinchStartDistance = newDistance;
    }
    e.preventDefault(); // Prevent scrolling while dragging
}, { passive: false });

// ------------------ SLIDER DISPLAY ------------------
angleSlider.addEventListener("input", () => document.getElementById("angleValue").innerText = angleSlider.value + "°");
forceSlider.addEventListener("input", () => document.getElementById("forceValue").innerText = forceSlider.value + " N");
gravitySlider.addEventListener("input", () => document.getElementById("gravityValue").innerText = gravitySlider.value + " m/s²");
airResSlider.addEventListener("input", () => document.getElementById("airResValue").innerText = airResSlider.value + " N*s/m²");
speedSlider.addEventListener("input", () => document.getElementById("simSpeedValue").innerText = speedSlider.value + "x");

// ------------------ SIMULATION GENERATION ------------------
function runSimulation(justGenerate = false) {
    cancelAnimationFrame(animationId);
    animationIndex = 0;
    points = [];

    const angle = parseFloat(angleSlider.value);
    const speed = parseFloat(forceSlider.value);
    const airRes = parseFloat(airResSlider.value);
    const gravity = parseFloat(gravitySlider.value);

    let vx = speed * Math.cos(angle * Math.PI / 180);
    let vy = speed * Math.sin(angle * Math.PI / 180);

    const dt = 0.1;
    let x = 0, y = 0;

    points.push({ x, y, vx, vy });

    for (let i = 0; i < 1000; i++) {
        let drag = airRes / 10;
        if (drag > 0) {
            vx *= (1 - drag * dt);
            vy *= (1 - drag * dt);
        }

        x += vx * dt;
        y += vy * dt - 0.5 * gravity * dt * dt;
        vy -= gravity * dt;

        if (y < 0) {
            y = 0;
            points.push({ x, y, vx, vy });
            break;
        }
        points.push({ x, y, vx, vy });
    }

    initialEnergy = 0.5 * speed * speed; // mass=1kg, y0=0

    if (!justGenerate) {
        isRunning = true;
        document.getElementById("runBtn").innerText = "Pause";
        runAnimation();
    }
}

// ------------------ ANIMATION LOOP ------------------
function runAnimation() {
    drawFrame(Math.floor(animationIndex));
    if (statsEnabled) updateStats(points[Math.floor(animationIndex)]);

    if (animationIndex < points.length - 1 && isRunning) {
        animationIndex += parseFloat(speedSlider.value);
        animationId = requestAnimationFrame(runAnimation);
    } else {
        isRunning = false;
        document.getElementById("runBtn").innerText = "Run";
        if (statsEnabled) updateStats(points[points.length - 1]);
    }
}

// ------------------ TOGGLE RUN/PAUSE ------------------
function toggleSimulation() {
    if (!isRunning) {
        if (points.length === 0 || animationIndex >= points.length - 1) {
            runSimulation(); // Start new simulation
        } else {
            isRunning = true;
            document.getElementById("runBtn").innerText = "Pause";
            runAnimation(); // Resume
        }
    } else {
        isRunning = false;
        cancelAnimationFrame(animationId);
        document.getElementById("runBtn").innerText = "Run";
    }
}

// ------------------ RESET ------------------
function resetSimulation() {
    cancelAnimationFrame(animationId);
    animationIndex = 0;
    drawFrame(0);
    if (statsEnabled && points.length > 0) updateStats(points[0]);
    isRunning = false;
    document.getElementById("runBtn").innerText = "Run";
}

function resetGravity() {
    gravitySlider.value = 9.8;
    document.getElementById("gravityValue").innerText = gravitySlider.value + " m/s²";
}

// ------------------ STATS ------------------
function updateStats(current) {
    if (!current) return;
    const vx = current.vx;
    const vy = current.vy;
    const speed = Math.sqrt(vx * vx + vy * vy);
    const angle = Math.atan2(vy, vx) * (180 / Math.PI);
    const gpe = parseFloat(gravitySlider.value) * current.y;
    const ke = 0.5 * speed * speed;
    const total = ke + gpe;
    const energyLoss = Math.max(0, initialEnergy - total);

    statsDiv.innerHTML = `
        Mass: 1 kg<br>
        Velocity: ${speed.toFixed(2)} m/s<br>
        Angle: ${angle.toFixed(1)}°<br>
        GPE: ${gpe.toFixed(2)} J<br>
        Kinetic Energy: ${ke.toFixed(2)} J<br>
        Energy Lost: ${energyLoss.toFixed(2)} J
    `;
}

// ------------------ PEAK ------------------
function showPeak() {
    if (points.length === 0) return;

    let peak = points.slice(0, Math.floor(animationIndex) + 1)
        .reduce((p, c) => c.y > p.y ? c : p, points[0]);

    const px = offsetX + peak.x * scale;
    const py = offsetY - peak.y * scale;

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "yellow";

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(offsetX, py);
    ctx.lineTo(px, py);
    ctx.stroke();

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, py);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, 2 * Math.PI);
    ctx.strokeStyle = "yellow";
    ctx.stroke();
}

// ------------------ DRAW ------------------
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

    // X-axis labels
    for (let i = Math.floor((-offsetX - preloadLabels * labelSpacingPx) / labelSpacingPx);
         i <= Math.ceil((canvas.width - offsetX + preloadLabels * labelSpacingPx) / labelSpacingPx); i++) {
        if (i === 0) continue;
        let px = offsetX + i * labelSpacingPx;
        let value = (i * labelSpacingPx) / scale;
        drawCtx.fillText(value.toFixed(0), px - 8, offsetY + 15);
    }

    // Y-axis labels
    for (let i = Math.floor((-offsetY - preloadLabels * labelSpacingPx) / labelSpacingPx);
         i <= Math.ceil((canvas.height - offsetY + preloadLabels * labelSpacingPx) / labelSpacingPx); i++) {
        if (i === 0) continue;
        let py = offsetY - i * labelSpacingPx;
        let value = (i * labelSpacingPx) / scale;
        drawCtx.fillText(value.toFixed(0), offsetX - 25, py + 4);
    }
}

function drawFrame(n) {
    drawAxes(ctx);
    if (!points || points.length === 0) return;

    ctx.beginPath();
    for (let i = 0; i <= n && i < points.length; i++) {
        let px = offsetX + points[i].x * scale;
        let py = offsetY - points[i].y * scale;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (n < points.length) {
        const p = points[n];
        ctx.beginPath();
        ctx.arc(offsetX + p.x * scale, offsetY - p.y * scale, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
    }

    if (showPeakEnabled) showPeak();
}

// ------------------ ZOOM ------------------
function zoomIn() { scale *= 1.2; drawFrame(Math.floor(animationIndex)); }
function zoomOut() { scale /= 1.2; drawFrame(Math.floor(animationIndex)); }

// ------------------ INIT ------------------
window.onload = () => { drawAxes(ctx); };
