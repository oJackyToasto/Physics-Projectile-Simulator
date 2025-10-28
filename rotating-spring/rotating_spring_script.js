// ------------------ GLOBALS ------------------
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// Canvas settings
let scale = 15; // pixels per meter
let offsetX = canvas.width / 2;
let offsetY = canvas.height / 2;

// Simulation state
let isRunning = false;
let animationId = null;
let time = 0;
let statsEnabled = false;
let terminalSpeedEnabled = false;
let frameCount = 0;

// Parameters
let angularSpeed = 2.0; // rad/s
let springConstant = 5.0; // N/m
let restLength = 5.0; // m
let mass = 1.0; // kg
let simSpeed = 1.0;

// Spring state
let spring = {
    centerX: 0,
    centerY: 0,
    angle: 0,
    length: 5.0,
    targetLength: 5.0
};

// Dragging
let drag = false, lastX = 0, lastY = 0;

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

canvas.addEventListener("mousedown", e => startDrag(e.clientX, e.clientY));
canvas.addEventListener("mouseup", endDrag);
canvas.addEventListener("mousemove", e => doDrag(e.clientX, e.clientY));

// ------------------ ELEMENTS ------------------
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");
const toggleTerminalSpeedBtn = document.getElementById("toggleTerminalSpeedBtn");

const angularSpeedSlider = document.getElementById("angularSpeed");
const springConstantSlider = document.getElementById("springConstant");
const restLengthSlider = document.getElementById("restLength");
const massSlider = document.getElementById("mass");
const simSpeedSlider = document.getElementById("simSpeed");

// ------------------ PHYSICS ------------------
function updateSpringLength() {
    // Calculate equilibrium length based on physics
    // At equilibrium: k * (L - L0) = m * ω² * L
    // Solving for L: L = (k * L0) / (k - m * ω²)
    
    // Calculate critical speed
    const criticalSpeed = Math.sqrt(springConstant / mass);
    
    if (angularSpeed === 0) {
        spring.targetLength = restLength;
    } else if (angularSpeed >= criticalSpeed) {
        // Spring breaks - stop the simulation and show breaking
        isRunning = false;
        spring.targetLength = restLength * 10; // Visual indicator of breaking (very stretched)
    } else {
        const denominator = springConstant - mass * angularSpeed * angularSpeed;
        if (denominator > 0) {
            spring.targetLength = (springConstant * restLength) / denominator;
            // Ensure spring length is at least restLength
            spring.targetLength = Math.max(spring.targetLength, restLength);
        } else {
            // Shouldn't reach here, but just in case
            spring.targetLength = restLength * 5;
        }
    }
}

function updatePhysics(dt) {
    // Spring stretching rate depends on angular speed (more centrifugal force = stretches faster)
    // Make it proportional to angular speed squared (since centrifugal force ∝ ω²)
    const springSpeed = 0.3 + 0.5 * angularSpeed * angularSpeed; // Faster stretch at higher speeds
    const diff = spring.targetLength - spring.length;
    spring.length += diff * springSpeed * dt * simSpeed;
    
    // Update angle
    spring.angle += angularSpeed * dt * simSpeed;
    
    // Keep angle in [0, 2π]
    if (spring.angle > 2 * Math.PI) {
        spring.angle -= 2 * Math.PI;
    }
    
    time += dt;
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

    // Draw grid lines (optimized - only draw visible lines)
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 0.5;
    
    const gridSpacing = 50;
    const labelSpacingPx = 50;
    const preloadLabels = 5; // Reduced from 20

    // Calculate only visible grid range
    const minX = -offsetX;
    const maxX = canvas.width - offsetX;
    const minY = -offsetY;
    const maxY = canvas.height - offsetY;

    // Draw visible grid lines only
    for (let i = Math.floor(minX / gridSpacing) - preloadLabels; 
             i <= Math.ceil(maxX / gridSpacing) + preloadLabels; i++) {
        // Vertical lines
        const x = offsetX + i * gridSpacing;
        if (x >= -100 && x <= canvas.width + 100) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
    }
    
    for (let i = Math.floor(minY / gridSpacing) - preloadLabels; 
             i <= Math.ceil(maxY / gridSpacing) + preloadLabels; i++) {
        // Horizontal lines
        const y = offsetY + i * gridSpacing;
        if (y >= -100 && y <= canvas.height + 100) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    }

    // Draw axis labels
    ctx.strokeStyle = "white";
    ctx.fillStyle = "white";
    ctx.font = "12px sans-serif";

    // X-axis labels (only visible ones)
    const startXi = Math.floor(minX / labelSpacingPx) - 2;
    const endXi = Math.ceil(maxX / labelSpacingPx) + 2;
    for (let i = startXi; i <= endXi; i++) {
        if (i === 0) continue;
        const px = offsetX + i * labelSpacingPx;
        const value = (i * labelSpacingPx) / scale;
        ctx.fillText(value.toFixed(0), px - 8, offsetY + 15);
    }

    // Y-axis labels (only visible ones)
    const startYi = Math.floor(minY / labelSpacingPx) - 2;
    const endYi = Math.ceil(maxY / labelSpacingPx) + 2;
    for (let i = startYi; i <= endYi; i++) {
        if (i === 0) continue;
        const py = offsetY + i * labelSpacingPx;
        const value = (i * labelSpacingPx) / scale;
        ctx.fillText(value.toFixed(0), offsetX - 25, py + 4);
    }
}

function drawSpring() {
    // Calculate mass position
    const massX = spring.centerX + spring.length * Math.cos(spring.angle);
    const massY = spring.centerY + spring.length * Math.sin(spring.angle);

    const center = worldToCanvas(spring.centerX, spring.centerY);
    const massPos = worldToCanvas(massX, massY);

    // Draw spring line
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(massPos.x, massPos.y);
    ctx.strokeStyle = "#89b4fa";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Draw center pivot
    ctx.beginPath();
    ctx.arc(center.x, center.y, 8, 0, 2 * Math.PI);
    ctx.fillStyle = "#cdd6f4";
    ctx.fill();
    ctx.strokeStyle = "#89b4fa";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw mass
    ctx.beginPath();
    ctx.arc(massPos.x, massPos.y, 10, 0, 2 * Math.PI);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
}

function drawFrame() {
    drawAxes(ctx);
    drawSpring();
}

// ------------------ STATS ------------------
function updateStats() {
    if (!statsEnabled) return;

    const massX = spring.centerX + spring.length * Math.cos(spring.angle);
    const massY = spring.centerY + spring.length * Math.sin(spring.angle);
    
    const stretch = spring.length - restLength;
    const springForce = springConstant * stretch;
    const centrifugalForce = mass * angularSpeed * angularSpeed * spring.length;
    const tangentialVelocity = spring.length * angularSpeed;
    const kineticEnergy = 0.5 * mass * tangentialVelocity * tangentialVelocity;
    const springPotential = 0.5 * springConstant * stretch * stretch;
    const totalEnergy = kineticEnergy + springPotential;

    // Calculate terminal speed (critical angular speed)
    const criticalAngularSpeed = Math.sqrt(springConstant / mass);
    const safetyFactor = angularSpeed > 0 ? criticalAngularSpeed / angularSpeed : 999;
    
    let html = `
        <strong>Spring Properties</strong><br>
        Length: ${spring.length.toFixed(2)} m<br>
        Rest Length: ${restLength.toFixed(2)} m<br>
        Stretch: ${stretch.toFixed(2)} m<br>
        <br>
        <strong>Forces</strong><br>
        Spring Force: ${springForce.toFixed(2)} N<br>
        Centrifugal Force: ${centrifugalForce.toFixed(2)} N<br>
        <br>
        <strong>Motion</strong><br>
        Angular Speed: ${angularSpeed.toFixed(2)} rad/s<br>
        Tangential Velocity: ${tangentialVelocity.toFixed(2)} m/s<br>
        Angle: ${(spring.angle * 180 / Math.PI).toFixed(1)}°<br>
        <br>
        <strong>Energy</strong><br>
        Kinetic Energy: ${kineticEnergy.toFixed(2)} J<br>
        Spring Potential: ${springPotential.toFixed(2)} J<br>
        Total Energy: ${totalEnergy.toFixed(2)} J
    `;

    // Add terminal speed information if enabled
    if (terminalSpeedEnabled) {
        html += `<br><br><strong>Terminal Speed Analysis</strong><br>`;
        html += `Critical Speed: ${criticalAngularSpeed.toFixed(2)} rad/s<br>`;
        html += `Safety Factor: ${safetyFactor.toFixed(2)}×<br>`;
        
        if (safetyFactor < 1.2) {
            html += `<span style="color: red;">⚠️ APPROACHING LIMIT!</span><br>`;
        } else if (safetyFactor < 1.5) {
            html += `<span style="color: orange;">⚠️ CAUTION</span><br>`;
        } else {
            html += `<span style="color: green;">✓ SAFE</span><br>`;
        }
        
        // Show current speed as percentage of critical speed
        const percentOfCritical = criticalAngularSpeed > 0 ? (angularSpeed / criticalAngularSpeed * 100) : 0;
        html += `Current: ${percentOfCritical.toFixed(1)}% of critical speed`;
    }

    if (angularSpeed > 0 && springConstant - mass * angularSpeed * angularSpeed <= 0) {
        html += `<br><br><strong style="color: red;">DANGER: Spring will break!</strong>`;
    }

    statsDiv.innerHTML = html;
}

// ------------------ ANIMATION ------------------
function runAnimation() {
    const dt = 0.016;
    updatePhysics(dt);
    drawFrame();
    
    // Only update stats every 3 frames to improve performance
    frameCount++;
    if (statsEnabled && frameCount % 3 === 0) updateStats();
    
    if (isRunning) {
        animationId = requestAnimationFrame(runAnimation);
    }
}

function toggleSimulation() {
    // Check if spring would break
    const criticalSpeed = Math.sqrt(springConstant / mass);
    if (angularSpeed >= criticalSpeed) {
        alert("Spring cannot handle this speed! Reduce angular speed below " + criticalSpeed.toFixed(2) + " rad/s");
        return;
    }
    
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
    
    time = 0;
    spring.angle = 0;
    spring.length = restLength;
    updateSpringLength();
    
    drawFrame();
    if (statsEnabled) updateStats();
}

function zoomIn() {
    scale *= 1.2;
    drawFrame();
}

function zoomOut() {
    scale /= 1.2;
    drawFrame();
}

// ------------------ SLIDER HANDLERS ------------------
function syncLabels() {
    document.getElementById("angularSpeedValue").innerText = angularSpeedSlider.value + " rad/s";
    document.getElementById("springConstantValue").innerText = springConstantSlider.value + " N/m";
    document.getElementById("restLengthValue").innerText = restLengthSlider.value + " m";
    document.getElementById("massValue").innerText = massSlider.value + " kg";
    document.getElementById("simSpeedValue").innerText = simSpeedSlider.value + "×";
}

angularSpeedSlider.addEventListener("input", e => {
    angularSpeed = parseFloat(e.target.value);
    
    // Calculate critical speed and warn if approaching or exceeding it
    const criticalSpeed = Math.sqrt(springConstant / mass);
    
    // Cap at critical speed (slightly below to allow the value)
    const maxSpeed = criticalSpeed * 0.99;
    if (angularSpeed > maxSpeed) {
        angularSpeed = maxSpeed;
        angularSpeedSlider.value = maxSpeed;
        console.log("Angular speed capped at " + maxSpeed.toFixed(2) + " rad/s (critical: " + criticalSpeed.toFixed(2) + " rad/s)");
    }
    
    syncLabels();
    updateSpringLength();
    if (statsEnabled) updateStats();
    
    // If simulation is running and spring breaks, stop it
    if (angularSpeed >= criticalSpeed && isRunning) {
        isRunning = false;
        cancelAnimationFrame(animationId);
        document.getElementById("runBtn").textContent = "Run";
        updateSpringLength(); // This will show the broken spring
        drawFrame();
    }
});

springConstantSlider.addEventListener("input", e => {
    springConstant = parseFloat(e.target.value);
    syncLabels();
    updateSpringLength();
    if (statsEnabled) updateStats();
});

restLengthSlider.addEventListener("input", e => {
    restLength = parseFloat(e.target.value);
    syncLabels();
    updateSpringLength();
    if (statsEnabled) updateStats();
});

massSlider.addEventListener("input", e => {
    mass = parseFloat(e.target.value);
    syncLabels();
    updateSpringLength();
    if (statsEnabled) updateStats();
});

simSpeedSlider.addEventListener("input", e => {
    simSpeed = parseFloat(e.target.value);
    syncLabels();
});

// ------------------ STATS TOGGLE ------------------
toggleStatsBtn.addEventListener("click", () => {
    statsEnabled = !statsEnabled;
    toggleStatsBtn.textContent = statsEnabled ? "Hide Stats" : "Show Stats";
    if (statsEnabled) updateStats();
    else statsDiv.innerHTML = "";
});

// ------------------ TERMINAL SPEED TOGGLE ------------------
toggleTerminalSpeedBtn.addEventListener("click", () => {
    terminalSpeedEnabled = !terminalSpeedEnabled;
    toggleTerminalSpeedBtn.textContent = terminalSpeedEnabled ? "Hide Terminal Speed" : "Show Terminal Speed";
    if (statsEnabled) updateStats();
});

// ------------------ INIT ------------------
window.onload = () => {
    syncLabels();
    updateSpringLength();
    drawFrame();
};

// Expose functions
window.toggleSimulation = toggleSimulation;
window.resetSimulation = resetSimulation;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
