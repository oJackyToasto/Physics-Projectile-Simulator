// ------------------ GLOBALS ------------------
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

let scale = 20; // pixels per meter
let offsetX = canvas.width / 2;
let offsetY = canvas.height / 2;

let simSpeed = 1;
let airResistance = 0;
let statsEnabled = false;
let isRunning = false;
let animationId = null;

// Mass
let mass = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    m: 1
};

// Springs
let springs = [
    { enabled: true, k: 1, L0: 5, angle: 0, anchor: {x: 5, y: 0}, color: "red" },
    { enabled: false, k: 1, L0: 5, angle: 120, anchor: {x: -5, y: 0}, color: "green" },
    { enabled: false, k: 1, L0: 5, angle: 240, anchor: {x: 0, y: 5}, color: "blue" }
];

// ------------------ UI ------------------
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");

// ------------------ AXES ------------------
function drawAxes() {
    ctx.strokeStyle = "#888";
    ctx.lineWidth = 1;
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
}

// ------------------ PHYSICS ------------------
function updatePhysics(dt) {
    let ax = 0, ay = 0;

    springs.forEach(s => {
        if (!s.enabled) return;

        // Anchor point relative to mass
        const ax_rel = s.anchor.x;
        const ay_rel = s.anchor.y;

        // Vector from mass to spring anchor
        const dx = ax_rel - mass.x;
        const dy = ay_rel - mass.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Spring force (Hooke's law)
        const f = s.k * (dist - s.L0);

        if (dist !== 0) {
            ax += f * (dx / dist);
            ay += f * (dy / dist);
        }
    });

    // Air resistance
    ax -= airResistance * mass.vx;
    ay -= airResistance * mass.vy;

    // Acceleration -> velocity -> position
    mass.vx += ax / mass.m * dt * simSpeed;
    mass.vy += ay / mass.m * dt * simSpeed;

    mass.x += mass.vx * dt * simSpeed;
    mass.y += mass.vy * dt * simSpeed;
}

// ------------------ DRAWING ------------------
function worldToCanvas(x_m, y_m) {
    return {
        x: offsetX + x_m * scale,
        y: offsetY - y_m * scale
    };
}

function drawSprings() {
    // Draw springs
    springs.forEach(s => {
        if (!s.enabled) return;
        const anchor = worldToCanvas(s.anchor.x, s.anchor.y);
        const massPos = worldToCanvas(mass.x, mass.y);

        ctx.strokeStyle = s.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(anchor.x, anchor.y);
        ctx.lineTo(massPos.x, massPos.y);
        ctx.stroke();
    });

    // Draw mass
    const massPos = worldToCanvas(mass.x, mass.y);
    ctx.beginPath();
    ctx.arc(massPos.x, massPos.y, 10, 0, 2*Math.PI);
    ctx.fillStyle = "orange";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.stroke();
}

function drawFrame() {
    ctx.clearRect(0,0,canvas.width, canvas.height);
    drawAxes();
    drawSprings();
}

// ------------------ STATS ------------------
function updateStats() {
    if (!statsEnabled) return;

    const v = Math.sqrt(mass.vx*mass.vx + mass.vy*mass.vy);
    let KE = 0.5 * mass.m * v*v;
    let PE = 0;
    springs.forEach(s => {
        if (!s.enabled) return;
        const dx = s.anchor.x - mass.x;
        const dy = s.anchor.y - mass.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        PE += 0.5 * s.k * Math.pow(dist - s.L0, 2);
    });
    const total = KE + PE;

    statsDiv.innerHTML = `
        <strong>Mass</strong><br>
        Position: (${mass.x.toFixed(2)}, ${mass.y.toFixed(2)}) m<br>
        Velocity: (${mass.vx.toFixed(2)}, ${mass.vy.toFixed(2)}) m/s<br>
        KE: ${KE.toFixed(2)} J<br>
        PE: ${PE.toFixed(2)} J<br>
        Total Energy: ${total.toFixed(2)} J
    `;
}

// ------------------ ANIMATION ------------------
function runAnimation() {
    const dt = 0.016;
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
    isRunning = false;
    cancelAnimationFrame(animationId);
    document.getElementById("runBtn").textContent = "Run";

    mass.x = 0;
    mass.y = 0;
    mass.vx = 0;
    mass.vy = 0;

    drawFrame();
    if (statsEnabled) updateStats();
}

// ------------------ SLIDERS ------------------
// These should bind to your HTML sliders for mass, spring k, L0, angles, airResistance, etc.
// Update `mass.m`, `springs[i].k`, `springs[i].L0`, `springs[i].angle` accordingly

// ------------------ STATS TOGGLE ------------------
toggleStatsBtn.addEventListener("click", () => {
    statsEnabled = !statsEnabled;
    toggleStatsBtn.textContent = statsEnabled ? "Hide Stats" : "Show Stats";
    if (statsEnabled) updateStats();
    else statsDiv.innerHTML = "";
});

// ------------------ INIT ------------------
window.onload = () => {
    drawFrame();
};

// Expose
window.toggleSimulation = toggleSimulation;
window.resetSimulation = resetSimulation;
