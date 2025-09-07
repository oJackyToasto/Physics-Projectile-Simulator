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
let offsetX = canvas.width / 2;  // center for 3D rotation
let offsetY = canvas.height - padding;
let scale = 10; // pixels per unit
let simSpeed = 1; // animation speed multiplier
const fov = 500; // distance from camera to projection plane
let tiltX = 0, tiltY = 0, tiltZ = 0;

// ------------------ ELEMENTS ------------------
const angleSlider = document.getElementById("angle");
const forceSlider = document.getElementById("force");
const gravitySlider = document.getElementById("gravity");
const airResSlider = document.getElementById("airRes");
const speedSlider = document.getElementById("simSpeed");
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");
const gravityReset = document.getElementById("gravityReset");
const tiltXSlider = document.getElementById("tiltX");
const tiltYSlider = document.getElementById("tiltY");
const tiltZSlider = document.getElementById("tiltZ");
// ------------------ DRAGGING ------------------
let drag = false, lastX, lastY;
canvas.addEventListener("mousedown", e => { drag = true; lastX = e.clientX; lastY = e.clientY; canvas.style.cursor = "grabbing"; });
canvas.addEventListener("mouseup", () => { drag = false; canvas.style.cursor = "grab"; });
canvas.addEventListener("mousemove", e => {
    if(drag){
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        drawFrame(Math.floor(animationIndex));
    }
});

// ------------------ EventListeners ------------------
angleSlider.addEventListener("input", () => document.getElementById("angleValue").innerText = angleSlider.value + "°");
forceSlider.addEventListener("input", () => document.getElementById("forceValue").innerText = forceSlider.value + " N");
gravitySlider.addEventListener("input", () => document.getElementById("gravityValue").innerText = gravitySlider.value + " m/s²");
airResSlider.addEventListener("input", () => document.getElementById("airResValue").innerText = airResSlider.value + " N*s/m²");
speedSlider.addEventListener("input", () => document.getElementById("simSpeedValue").innerText = speedSlider.value + "x");
tiltXSlider.addEventListener("input", () => {
    tiltX = parseFloat(tiltXSlider.value) * Math.PI / 180;
    document.getElementById("tiltXValue").innerText = tiltXSlider.value + "°";
    drawFrame(Math.floor(animationIndex));
});

tiltYSlider.addEventListener("input", () => {
    tiltY = parseFloat(tiltYSlider.value) * Math.PI / 180;
    document.getElementById("tiltYValue").innerText = tiltYSlider.value + "°";
    drawFrame(Math.floor(animationIndex));
});

tiltZSlider.addEventListener("input", () => {
    tiltZ = parseFloat(tiltZSlider.value) * Math.PI / 180;
    document.getElementById("tiltZValue").innerText = tiltZSlider.value + "°";
    drawFrame(Math.floor(animationIndex));
});


toggleStatsBtn.addEventListener("click", () => {
    statsEnabled = !statsEnabled;
    toggleStatsBtn.innerText = statsEnabled ? "Hide Stats" : "Show Stats";
    if(statsEnabled && points.length>0) updateStats(points[Math.floor(animationIndex)]);
});

// ------------------ SIMULATION GENERATION ------------------
function runSimulation(justGenerate=false){
    cancelAnimationFrame(animationId);
    animationIndex = 0;
    points = [];

    const angle = parseFloat(angleSlider.value);
    const speed = parseFloat(forceSlider.value);
    const airRes = parseFloat(airResSlider.value);
    const gravity = parseFloat(gravitySlider.value);

    // For 3D, add z-axis motion (simple forward motion)
    let vx = speed * Math.cos(angle*Math.PI/180);
    let vy = speed * Math.sin(angle*Math.PI/180);
    let vz = speed * 0.1; // small forward motion in Z

    const dt = 0.1;
    let x = 0, y = 0, z = 0;

    points.push({x,y,z,vx,vy,vz});

    for(let i=0;i<1000;i++){
        let dragF = airRes/10;
        if(dragF>0){ vx *= (1-dragF*dt); vy *= (1-dragF*dt); vz *= (1-dragF*dt); }

        x += vx*dt;
        y += vy*dt - 0.5*gravity*dt*dt;
        vy -= gravity*dt;
        z += vz*dt;

        if(y<0){ y=0; points.push({x,y,z,vx,vy,vz}); break; }
        points.push({x,y,z,vx,vy,vz});
    }

    initialEnergy = 0.5*1*speed*speed + 1*gravity*0; // mass=1kg, y0=0

    if(!justGenerate){
        isRunning = true;
        document.getElementById("runBtn").innerText = "Pause";
        runAnimation();
    }
}

// ------------------ ANIMATION LOOP ------------------
function runAnimation(){
    drawFrame(Math.floor(animationIndex));
    if(statsEnabled) updateStats(points[Math.floor(animationIndex)]);

    if(animationIndex < points.length-1 && isRunning){
        animationIndex += parseFloat(speedSlider.value);
        animationId = requestAnimationFrame(runAnimation);
    } else {
        isRunning = false;
        document.getElementById("runBtn").innerText = "Run";
        if(statsEnabled) updateStats(points[points.length-1]);
    }
}

// ------------------ TOGGLE RUN/PAUSE ------------------
function toggleSimulation() {
    if (!isRunning) {
        if (points.length === 0 || animationIndex >= points.length - 1) runSimulation();
        else { isRunning = true; document.getElementById("runBtn").innerText = "Pause"; runAnimation(); }
    } else { isRunning = false; cancelAnimationFrame(animationId); document.getElementById("runBtn").innerText = "Run"; }
}

// ------------------ RESET ------------------
function resetSimulation(){
    cancelAnimationFrame(animationId);
    animationIndex = 0;
    drawFrame(0);
    if(statsEnabled) updateStats(points[0]);
    isRunning = false;
    document.getElementById("runBtn").innerText = "Run";
}

function resetGravity() {
    gravitySlider.value = 9.8;
    document.getElementById("gravityValue").innerText = gravitySlider.value + " m/s²";
}

// ------------------ STATS ------------------
function updateStats(current){
    if(!current) return;
    const vx = current.vx;
    const vy = current.vy;
    const vz = current.vz;
    const speed = Math.sqrt(vx*vx + vy*vy + vz*vz);
    const angleXY = Math.atan2(vy,vx)*(180/Math.PI);
    const gpe = parseFloat(gravitySlider.value) * current.y;
    const ke = 0.5*1*speed*speed;
    const total = ke + gpe;
    const energyLoss = Math.max(0, initialEnergy - total);

    statsDiv.innerHTML = `
        Mass: 1 kg<br>
        Speed: ${speed.toFixed(2)} m/s<br>
        XY Angle: ${angleXY.toFixed(1)}°<br>
        GPE: ${gpe.toFixed(2)} J<br>
        KE: ${ke.toFixed(2)} J<br>
        Energy Lost: ${energyLoss.toFixed(2)} J
    `;
}

// ------------------ PEAK ------------------
function showPeak() {
    if(points.length === 0) return;
    showPeakEnabled = true;
    let peak = points.slice(0, Math.floor(animationIndex)+1).reduce((p, c) => c.y > p.y ? c : p, points[0]);
    const {x, y, z} = peak;
    const [px, py] = project3D(x,y,z);
    ctx.setLineDash([5,5]);
    ctx.strokeStyle = "yellow";
    ctx.beginPath();
    ctx.moveTo(offsetX, py);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(px, offsetY);
    ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(px, py, 6,0,2*Math.PI);
    ctx.strokeStyle = "yellow";
    ctx.stroke();
}

// ------------------ 3D PROJECTION ------------------
function project3D(x, y, z){
    // ----- Rotation around X-axis -----
    let y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
    let z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX);

    // ----- Rotation around Y-axis -----
    let x2 = x * Math.cos(tiltY) + z1 * Math.sin(tiltY);
    let z2 = -x * Math.sin(tiltY) + z1 * Math.cos(tiltY);

    // ----- Rotation around Z-axis -----
    let x3 = x2 * Math.cos(tiltZ) - y1 * Math.sin(tiltZ);
    let y3 = x2 * Math.sin(tiltZ) + y1 * Math.cos(tiltZ);

    // ----- Perspective projection -----
    const factor = fov / (fov + z2);
    const px = offsetX + x3 * scale * factor;
    const py = offsetY - y3 * scale * factor;
    return [px, py];
}

function resetTiltX() {
    tiltXSlider.value = 0;
    tiltX = 0;
    document.getElementById("tiltXValue").innerText = "0°";
    drawFrame(Math.floor(animationIndex));
}

function resetTiltY() {
    tiltYSlider.value = 0;
    tiltY = 0;
    document.getElementById("tiltYValue").innerText = "0°";
    drawFrame(Math.floor(animationIndex));
}

function resetTiltZ() {
    tiltZSlider.value = 0;
    tiltZ = 0;
    document.getElementById("tiltZValue").innerText = "0°";
    drawFrame(Math.floor(animationIndex));
}

// ------------------ DRAW ------------------
function drawAxes(drawCtx){
    drawCtx.clearRect(0,0,canvas.width,canvas.height);
    drawCtx.strokeStyle="white";
    drawCtx.lineWidth=1;
    drawCtx.font="12px sans-serif";
    drawCtx.fillStyle="white";

    // simple ground plane
    drawCtx.beginPath();
    drawCtx.moveTo(0,offsetY);
    drawCtx.lineTo(canvas.width,offsetY);
    drawCtx.stroke();
}

function drawFrame(n){
    drawAxes(ctx);
    if(!points || points.length===0) return;

    ctx.beginPath();
    for(let i=0;i<=n && i<points.length;i++){
        const [px, py] = project3D(points[i].x, points[i].y, points[i].z);
        if(i===0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.strokeStyle="#3b82f6";
    ctx.lineWidth=2;
    ctx.stroke();

    if(n<points.length){
        const [px, py] = project3D(points[n].x, points[n].y, points[n].z);
        ctx.beginPath();
        ctx.arc(px, py, 6,0,2*Math.PI);
        ctx.fillStyle="red";
        ctx.fill();
    }

    if(showPeakEnabled) showPeak();
}

// ------------------ ZOOM ------------------
function zoomIn(){ scale *= 1.2; drawFrame(Math.floor(animationIndex)); }
function zoomOut(){ scale /= 1.2; drawFrame(Math.floor(animationIndex)); }

window.onload = () => { drawAxes(ctx); };
