const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

let points = [];
let animationIndex = 0;
let animationId = null;

let padding = 50;
let offsetX = padding;
let offsetY = canvas.height - padding;

let dragCanvas = false, lastX, lastY;
let scale = 10; // pixels per unit
let gravity = 9.8;

let peakVisible = false;
let statsEnabled = false;

// ----- DOM Elements -----
const angleSlider = document.getElementById("angle");
const forceSlider = document.getElementById("force");
const gravitySlider = document.getElementById("gravity");
const gravityValue = document.getElementById("gravityValue");
const airResSlider = document.getElementById("airRes");
const airResValue = document.getElementById("airResValue");
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");

// ----- DRAGGING -----
canvas.addEventListener("mousedown", e => {
    dragCanvas = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
});
canvas.addEventListener("mouseup", () => {
    dragCanvas = false;
    canvas.style.cursor = "grab";
});
canvas.addEventListener("mousemove", e => {
    if (dragCanvas) {
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        drawFrame(animationIndex);
    }
});

// ----- SLIDERS -----
angleSlider.addEventListener("input", () => {
    document.getElementById("angleValue").innerText = angleSlider.value + "°";
});
forceSlider.addEventListener("input", () => {
    document.getElementById("forceValue").innerText = forceSlider.value + " N";
});
gravitySlider.addEventListener("input", () => {
    gravity = parseFloat(gravitySlider.value);
    gravityValue.innerText = gravity.toFixed(1) + " m/s²";
});
document.getElementById("gravityReset").addEventListener("click", () => {
    gravity = 9.8;
    gravitySlider.value = gravity;
    gravityValue.innerText = gravity.toFixed(1) + " m/s²";
});
airResSlider.addEventListener("input", () => {
    airResValue.innerText = parseFloat(airResSlider.value).toFixed(1) + " C_d";
});

// Toggle dynamic stats
toggleStatsBtn.addEventListener("click", () => {
    statsEnabled = !statsEnabled;
    toggleStatsBtn.innerText = statsEnabled ? "Hide Stats" : "Show Stats";
    if (!statsEnabled) statsDiv.innerHTML = "";
});

// ----- SIMULATION -----
function simulateProjectile(angle, force, C_d) {
    const dt = 0.1;
    const rho = 1.225;  // kg/m³
    const A = 0.785;    // m²
    const m = 1;        // kg
    const dragScale = 0.1; // scale down drag for visibility

    let x = 0, y = 0;
    let traj = [];

    const angleRad = angle * Math.PI / 180;
    let vx = force * Math.cos(angleRad);
    let vy = force * Math.sin(angleRad);

    traj.push({ x, y, vx, vy });

    for (let i = 0; i < 200; i++) {
        if (C_d > 0) {
            const v = Math.sqrt(vx*vx + vy*vy);
            const F_drag = 0.5 * rho * C_d * A * v * v * dragScale;
            const a_drag = F_drag / m;
            vx -= (vx / v) * a_drag * dt;
            vy -= (vy / v) * a_drag * dt;
        }

        x += vx * dt;
        y += vy * dt - 0.5 * gravity * dt * dt;
        vy -= gravity * dt;

        if (y < 0) break;
        traj.push({ x, y, vx, vy });
    }

    return traj;
}

function runSimulation() {
    cancelAnimationFrame(animationId);
    animationIndex = 0;
    peakVisible = false;

    const angle = parseFloat(angleSlider.value);
    const force = parseFloat(forceSlider.value);
    const airRes = parseFloat(airResSlider.value);

    points = simulateProjectile(angle, force, airRes);
    drawFrame(0);
    animate();
}

// ----- ANIMATION -----
function animate() {
    drawFrame(animationIndex);
    if (statsEnabled) updateStats(points[animationIndex]);

    if (animationIndex < points.length - 1) {
        animationIndex++;
        animationId = requestAnimationFrame(animate);
    }
}

// ----- STATS -----
function updateStats(p) {
    if (!statsEnabled || !p) return;
    const mass = 1; // kg
    const velocity = Math.sqrt(p.vx*p.vx + p.vy*p.vy);
    const angle = parseFloat(angleSlider.value);
    const gpe = mass * gravity * p.y;
    const ke = 0.5 * mass * velocity * velocity;

    statsDiv.innerHTML = `
        <p>Mass: ${mass} kg</p>
        <p>Velocity: ${velocity.toFixed(2)} m/s</p>
        <p>Angle: ${angle}°</p>
        <p>GPE: ${gpe.toFixed(2)} J</p>
        <p>Kinetic Energy: ${ke.toFixed(2)} J</p>
    `;
}

// ----- PEAK HIGHLIGHT -----
function showPeak() {
    if (!points || points.length === 0) return;

    peakVisible = true;
    drawFrame(animationIndex);

    const peak = points.reduce((max, p) => p.y > max.y ? p : max, points[0]);

    // Dotted lines
    ctx.setLineDash([5,5]);
    ctx.strokeStyle = "yellow";

    // Horizontal
    ctx.beginPath();
    ctx.moveTo(0, offsetY - peak.y*scale);
    ctx.lineTo(canvas.width, offsetY - peak.y*scale);
    ctx.stroke();

    // Vertical
    ctx.beginPath();
    ctx.moveTo(offsetX + peak.x*scale, 0);
    ctx.lineTo(offsetX + peak.x*scale, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Hollow circle
    ctx.beginPath();
    ctx.arc(offsetX + peak.x*scale, offsetY - peak.y*scale, 10, 0, 2*Math.PI);
    ctx.strokeStyle = "yellow";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Optional: show stats at peak
    updateStats(peak);
}

// ----- AXES -----
function drawAxes(drawCtx) {
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawCtx.strokeStyle = "white";
    drawCtx.lineWidth = 1;
    drawCtx.font = "12px sans-serif";
    drawCtx.fillStyle = "white";

    // X-axis
    drawCtx.beginPath();
    drawCtx.moveTo(0, offsetY);
    drawCtx.lineTo(canvas.width, offsetY);
    drawCtx.stroke();

    // Y-axis
    drawCtx.beginPath();
    drawCtx.moveTo(offsetX, 0);
    drawCtx.lineTo(offsetX, canvas.height);
    drawCtx.stroke();

    const labelSpacingPx = 50;
    const preloadLabels = 20;

    const minX = Math.floor((-offsetX - preloadLabels*labelSpacingPx)/labelSpacingPx);
    const maxX = Math.ceil((canvas.width-offsetX + preloadLabels*labelSpacingPx)/labelSpacingPx);
    for(let i=minX;i<=maxX;i++){
        if(i===0) continue;
        let px = offsetX + i*labelSpacingPx;
        let value = (i*labelSpacingPx)/scale;
        drawCtx.fillText(value.toFixed(0), px-8, offsetY+15);
    }

    const minY = Math.floor((-offsetY - preloadLabels*labelSpacingPx)/labelSpacingPx);
    const maxY = Math.ceil((canvas.height-offsetY + preloadLabels*labelSpacingPx)/labelSpacingPx);
    for(let i=minY;i<=maxY;i++){
        if(i===0) continue;
        let py = offsetY - i*labelSpacingPx;
        let value = (i*labelSpacingPx)/scale;
        drawCtx.fillText(value.toFixed(0), offsetX-25, py+4);
    }
}

// ----- DRAW FRAME -----
function drawFrame(n){
    drawAxes(ctx);

    if(!points || points.length === 0) return;

    ctx.beginPath();
    for(let i=0;i<=n && i<points.length;i++){
        let px = offsetX + points[i].x*scale;
        let py = offsetY - points[i].y*scale;
        if(i===0) ctx.moveTo(px,py);
        else ctx.lineTo(px,py);
    }
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.stroke();

    if(n<points.length){
        let p = points[n];
        ctx.beginPath();
        ctx.arc(offsetX + p.x*scale, offsetY - p.y*scale, 6, 0, 2*Math.PI);
        ctx.fillStyle="red";
        ctx.fill();
    }

    if(peakVisible){
        const peak = points.reduce((max, p) => p.y > max.y ? p : max, points[0]);

        ctx.setLineDash([5,5]);
        ctx.strokeStyle = "yellow";
        ctx.beginPath();
        ctx.moveTo(0, offsetY - peak.y*scale);
        ctx.lineTo(canvas.width, offsetY - peak.y*scale);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(offsetX + peak.x*scale, 0);
        ctx.lineTo(offsetX + peak.x*scale, canvas.height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(offsetX + peak.x*scale, offsetY - peak.y*scale, 10, 0, 2*Math.PI);
        ctx.strokeStyle = "yellow";
        ctx.lineWidth = 2;
        ctx.stroke();
    }
}

// ----- ZOOM -----
function zoomIn(){ scale *=1.2; drawFrame(animationIndex);}
function zoomOut(){ scale/=1.2; drawFrame(animationIndex);}

window.onload = ()=>{ drawAxes(ctx); };
