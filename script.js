const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

let points = [];
let animationIndex = 0;
let animationId = null;

let padding = 50;
let offsetX = padding;
let offsetY = canvas.height - padding;

let drag = false, lastX, lastY;
let scale = 10; // pixels per unit
let gravity = 9.8;

// ----- DRAGGING -----
canvas.addEventListener("mousedown", e => {
    drag = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.style.cursor = "grabbing";
});
canvas.addEventListener("mouseup", () => {
    drag = false;
    canvas.style.cursor = "grab";
});
canvas.addEventListener("mousemove", e => {
    if (drag) {
        offsetX += e.clientX - lastX;
        offsetY += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        drawFrame(animationIndex);
    }
});

// ----- SLIDERS -----
const angleSlider = document.getElementById("angle");
const forceSlider = document.getElementById("force");
const gravitySlider = document.getElementById("gravity");
const gravityValue = document.getElementById("gravityValue");
const airResSlider = document.getElementById("airRes");
const airResValue = document.getElementById("airResValue");

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
    airResValue.innerText = airResSlider.value;
});

// ----- SIMULATION -----
function simulateProjectile(angle, force, airRes) {
    const dt = 0.1;
    let x = 0, y = 0;
    let traj = [{ x, y }];

    const angleRad = angle * Math.PI / 180;
    let vx = force * Math.cos(angleRad);
    let vy = force * Math.sin(angleRad);

    for (let i = 0; i < 200; i++) {
        if (airRes > 0) {
            const drag = airRes / 100; // slider -> drag
            vx *= (1 - drag * dt);
            vy *= (1 - drag * dt);
        }

        x += vx * dt;
        y += vy * dt - 0.5 * gravity * dt * dt;
        vy -= gravity * dt;

        if (y < 0) break;
        traj.push({ x, y });
    }

    return traj;
}

function runSimulation() {
    cancelAnimationFrame(animationId);
    animationIndex = 0;

    const angle = parseFloat(angleSlider.value);
    const force = parseFloat(forceSlider.value);
    const airRes = parseFloat(airResSlider.value);

    points = simulateProjectile(angle, force, airRes);
    drawFrame(0);
    animate();
}

function animate() {
    drawFrame(animationIndex);
    if (animationIndex < points.length - 1) {
        animationIndex++;
        animationId = requestAnimationFrame(animate);
    }
}

// ----- AXES -----
function drawAxes(drawCtx) {
    drawCtx.clearRect(0, 0, canvas.width, canvas.height);
    drawCtx.strokeStyle = "white";
    drawCtx.lineWidth = 1;
    drawCtx.font = "12px sans-serif";
    drawCtx.fillStyle = "white";

    drawCtx.beginPath();
    drawCtx.moveTo(0, offsetY);
    drawCtx.lineTo(canvas.width, offsetY);
    drawCtx.stroke();

    drawCtx.beginPath();
    drawCtx.moveTo(offsetX, 0);
    drawCtx.lineTo(offsetX, canvas.height);
    drawCtx.stroke();

    const labelSpacingPx = 50;
    const preloadLabels = 20;

    // X labels
    const minX = Math.floor((-offsetX - preloadLabels*labelSpacingPx)/labelSpacingPx);
    const maxX = Math.ceil((canvas.width-offsetX + preloadLabels*labelSpacingPx)/labelSpacingPx);
    for (let i=minX;i<=maxX;i++){
        if(i===0) continue;
        let px = offsetX + i*labelSpacingPx;
        let value = (i*labelSpacingPx)/scale;
        drawCtx.fillText(value.toFixed(0), px-8, offsetY+15);
    }

    // Y labels
    const minY = Math.floor((-offsetY - preloadLabels*labelSpacingPx)/labelSpacingPx);
    const maxY = Math.ceil((canvas.height-offsetY + preloadLabels*labelSpacingPx)/labelSpacingPx);
    for (let i=minY;i<=maxY;i++){
        if(i===0) continue;
        let py = offsetY - i*labelSpacingPx;
        let value = (i*labelSpacingPx)/scale;
        drawCtx.fillText(value.toFixed(0), offsetX-25, py+4);
    }
}

// ----- DRAW FRAME -----
function drawFrame(n) {
    drawAxes(ctx);
    if (!points || points.length===0) return;

    ctx.beginPath();
    for (let i=0;i<=n && i<points.length;i++){
        let px = offsetX + points[i].x*scale;
        let py = offsetY - points[i].y*scale;
        if(i===0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.stroke();

    if(n<points.length){
        let p = points[n];
        ctx.beginPath();
        ctx.arc(offsetX + p.x*scale, offsetY - p.y*scale, 6,0,2*Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
    }
}

// ----- ZOOM -----
function zoomIn(){ scale*=1.2; drawFrame(animationIndex); }
function zoomOut(){ scale/=1.2; drawFrame(animationIndex); }

window.onload = () => { drawFrame(0); };
