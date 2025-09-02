const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

let points = [];
let animationIndex = 0;
let animationId = null;

// 3D Camera
let camera = {
    x: 0,      // camera position in world space
    y: 0,
    z: 50      // distance from scene (controls zoom)
};

let drag = false, lastX, lastY;

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
        camera.x -= (e.clientX - lastX) / 10;
        camera.y += (e.clientY - lastY) / 10;
        lastX = e.clientX;
        lastY = e.clientY;
        drawFrame(animationIndex);
    }
});

const angleSlider = document.getElementById("angle");
const forceSlider = document.getElementById("force");

angleSlider.addEventListener("input", () => {
    document.getElementById("angleValue").innerText = angleSlider.value + "°";
});
forceSlider.addEventListener("input", () => {
    document.getElementById("forceValue").innerText = forceSlider.value + " N";
});

// --- Projectile simulation in JS ---
function simulateProjectile(angle, force, airRes) {
    const g = 9.8;
    const dt = 0.1;
    let x = 0, y = 0;
    let points = [{ x, y, z: 0 }];

    const angleRad = angle * Math.PI / 180;
    let vx = force * Math.cos(angleRad);
    let vy = force * Math.sin(angleRad);

    for (let i = 0; i < 200; i++) {
        if (airRes) {
            const drag = 0.05;
            vx *= (1 - drag * dt);
            vy *= (1 - drag * dt);
        }

        // Update positions
        x += vx * dt;
        y += vy * dt - 0.5 * g * dt * dt;
        vy -= g * dt;

        if (y < 0) break;

        points.push({ x, y, z: 0 });
    }

    return points;
}

// --- Run simulation ---
function runSimulation() {
    cancelAnimationFrame(animationId);
    animationIndex = 0;

    const angle = parseFloat(angleSlider.value);
    const force = parseFloat(forceSlider.value);
    const airRes = document.getElementById("airRes").checked;

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

// --- 3D projection ---
function project(point) {
    const scaleFactor = 200; // world units to pixels
    const zOffset = camera.z + 0.0001; // avoid div by zero

    const screenX = canvas.width / 2 + (point.x - camera.x) * (scaleFactor / zOffset);
    const screenY = canvas.height / 2 - (point.y - camera.y) * (scaleFactor / zOffset);
    return { x: screenX, y: screenY };
}

// --- Draw axes ---
function drawAxes() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "white";
    ctx.lineWidth = 1;
    ctx.font = "12px sans-serif";
    ctx.fillStyle = "white";

    // X-axis labels
    for (let i = -20; i <= 20; i++) {
        const p = project({ x: i, y: 0, z: 0 });
        ctx.fillText(i, p.x, p.y + 15);
    }

    // Y-axis labels
    for (let i = 0; i <= 20; i++) {
        const p = project({ x: 0, y: i, z: 0 });
        ctx.fillText(i, p.x - 20, p.y + 4);
    }

    // X-axis line
    let xStart = project({ x: -20, y: 0, z: 0 });
    let xEnd = project({ x: 20, y: 0, z: 0 });
    ctx.beginPath();
    ctx.moveTo(xStart.x, xStart.y);
    ctx.lineTo(xEnd.x, xEnd.y);
    ctx.stroke();

    // Y-axis line
    let yStart = project({ x: 0, y: 0, z: 0 });
    let yEnd = project({ x: 0, y: 20, z: 0 });
    ctx.beginPath();
    ctx.moveTo(yStart.x, yStart.y);
    ctx.lineTo(yEnd.x, yEnd.y);
    ctx.stroke();
}

// --- Draw frame ---
function drawFrame(n) {
    drawAxes();
    if (!points || points.length === 0) return;

    ctx.beginPath();
    for (let i = 0; i <= n && i < points.length; i++) {
        const p = project(points[i]);
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = "#3b82f6";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (n < points.length) {
        const p = project(points[n]);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = "red";
        ctx.fill();
    }
}

// --- Zoom ---
function zoomIn() { camera.z *= 0.8; drawFrame(animationIndex); }
function zoomOut() { camera.z *= 1.25; drawFrame(animationIndex); }

window.onload = () => { drawAxes(); };
