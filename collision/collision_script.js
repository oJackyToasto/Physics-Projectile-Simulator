// ------------------ GLOBALS ------------------
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

// Canvas settings
const WALL_THICKNESS = 10;
const GROUND_Y = canvas.height - 50;

// Simulation state
let isRunning = false;
let animationId = null;
let frameCount = 0;
let statsEnabled = false;

// Parameters
// Density constant: kg per pixel^2 (for visual representation)
// Using a scale where 1 kg = 1 pixel visually (can be adjusted)
const DENSITY = 1.0; // kg per pixel^2
const MASS_TO_SIZE_SCALE = 10.0; // Scale factor: size = sqrt(mass / DENSITY) * MASS_TO_SIZE_SCALE
const PIXELS_PER_METER = 100; // Conversion: 1 meter = 100 pixels (1 pixel = 1 cm)

let stationaryBlockMass = 100; // kg
let movingBlockMass = 50; // kg
let velocity = 3.0; // meters per second
let force = 200; // Newtons
let friction = 0.1; // Friction coefficient (dimensionless)
let forceEnabled = false; // Default: constant speed
let simSpeed = 1.0;

// Helper function to convert mass (kg) to visual size (pixels)
function massToSize(mass) {
    // For a square block: if mass = density * area, then area = mass / density
    // For a square: area = size^2, so size = sqrt(mass / density)
    return Math.sqrt(mass / DENSITY) * MASS_TO_SIZE_SCALE;
}

// Block states
let stationaryBlock = {
    x: 200,
    mass: 100, // kg
    v: 0,
    a: 0
};

let movingBlock = {
    x: 800,
    y: GROUND_Y, // Will be adjusted based on size
    mass: 50, // kg
    v: -3.0, // m/s (stored in m/s, converted to px/s when updating position)
    a: 0 // m/s^2
};

let collisionCount = 0;

// ------------------ ELEMENTS ------------------
const statsDiv = document.getElementById("stats");
const toggleStatsBtn = document.getElementById("toggleStatsBtn");
const toggleForceBtn = document.getElementById("toggleForceBtn");

const blockSizeSlider = document.getElementById("blockSize");
const movingBlockSizeSlider = document.getElementById("movingBlockSize");
const velocitySlider = document.getElementById("velocity");
const forceSlider = document.getElementById("force");
const frictionSlider = document.getElementById("friction");
const simSpeedSlider = document.getElementById("simSpeed");

// Get force and friction slider containers for show/hide
const forceSliderRow = document.getElementById("forceSliderRow");
const frictionSliderRow = document.getElementById("frictionSliderRow");

// ------------------ PHYSICS ------------------
function updatePhysics(dt) {
    dt = dt * simSpeed;
    
    // Get visual sizes from masses
    const movingSize = massToSize(movingBlock.mass);
    const stationarySize = massToSize(stationaryBlock.mass);
    
    // Apply force if enabled
    if (forceEnabled) {
        // Apply force in the direction of current velocity, or left if at rest
        const forceDirection = movingBlock.v < 0 ? -1 : (movingBlock.v > 0 ? 1 : -1);
        const appliedForce = force * forceDirection;
        
        // Apply friction (opposes motion)
        const frictionForce = -Math.sign(movingBlock.v) * friction * movingBlock.mass * 9.81; // Friction = μ * m * g
        const netForce = appliedForce + frictionForce;
        
        movingBlock.a = netForce / movingBlock.mass; // m/s^2
        movingBlock.v += movingBlock.a * dt; // m/s
        
        // Stop if velocity becomes very small due to friction
        if (Math.abs(movingBlock.v) < 0.01) {
            movingBlock.v = 0;
        }
    }
    
    // Update positions first (convert m/s to px/s for position updates)
    movingBlock.x += movingBlock.v * PIXELS_PER_METER * dt;
    stationaryBlock.x += stationaryBlock.v * PIXELS_PER_METER * dt;
    
    // Get block edges after movement
    const movingLeft = movingBlock.x - movingSize / 2;
    const movingRight = movingBlock.x + movingSize / 2;
    const stationaryLeft = stationaryBlock.x - stationarySize / 2;
    const stationaryRight = stationaryBlock.x + stationarySize / 2;
    
    // Check collision with left wall for moving block
    if (movingLeft <= WALL_THICKNESS) {
        movingBlock.x = WALL_THICKNESS + movingSize / 2 + 0.5;
        if (movingBlock.v < 0) {
            // Only bounce if moving into the wall
            movingBlock.v = -movingBlock.v; // Bounce right
            collisionCount++;
        }
    }
    
    // Check collision with left wall for stationary block
    if (stationaryLeft <= WALL_THICKNESS) {
        stationaryBlock.x = WALL_THICKNESS + stationarySize / 2 + 0.5;
        if (stationaryBlock.v < 0) {
            // Only bounce if moving into the wall
            stationaryBlock.v = -stationaryBlock.v; // Bounce right
            collisionCount++;
        }
    }
    
    // Check collision between blocks
    if (movingRight >= stationaryLeft && movingLeft <= stationaryRight) {
        // Use masses directly (already in kg)
        const m1 = movingBlock.mass;
        const m2 = stationaryBlock.mass;
        
        // Calculate velocities before collision
        const v1 = movingBlock.v;
        const v2 = stationaryBlock.v;
        
        // Elastic collision: calculate new velocities
        const newV1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
        const newV2 = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
        
        movingBlock.v = newV1;
        stationaryBlock.v = newV2;
        
        collisionCount++;
        
        // Separate blocks to prevent clipping
        // Determine overlap and separate based on which block is moving faster into the other
        const overlap = Math.min(movingRight - stationaryLeft, stationaryRight - movingLeft);
        
        if (movingBlock.x < stationaryBlock.x) {
            // Moving block is on the left
            movingBlock.x = stationaryLeft - movingSize / 2 - 0.01;
        } else {
            // Moving block is on the right
            movingBlock.x = stationaryRight + movingSize / 2 + 0.01;
        }
    }
    
    // Keep stationary block in bounds (only constrain position, don't stop velocity)
    const statLeft = stationaryBlock.x - stationarySize / 2;
    const statRight = stationaryBlock.x + stationarySize / 2;
    
    if (statLeft < WALL_THICKNESS) {
        stationaryBlock.x = WALL_THICKNESS + stationarySize / 2;
        // Velocity is handled by wall collision check above, don't reset it to 0
    }
    
    if (statRight > canvas.width) {
        stationaryBlock.x = canvas.width - stationarySize / 2;
        // Pause and reset simulation when stationary block reaches right edge
        if (stationaryBlock.v > 0) {
            stationaryBlock.v = 0;
            // Pause and reset
            isRunning = false;
            document.getElementById("runBtn").textContent = "Run";
            resetSimulation();
        }
    }
    
    frameCount++;
}

// ------------------ DRAWING ------------------
function drawWall() {
    ctx.fillStyle = "#89b4fa";
    ctx.fillRect(0, GROUND_Y, WALL_THICKNESS, canvas.height - GROUND_Y);
    
    // Draw top surface of the wall
    ctx.fillRect(0, GROUND_Y - 5, WALL_THICKNESS, 5);
}

function drawGround() {
    ctx.fillStyle = "#313244";
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    
    // Draw grid lines on ground
    ctx.strokeStyle = "#44475a";
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, GROUND_Y);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
    }
}

function drawBlock(x, y, size, color) {
    const blockX = x - size / 2;
    const blockY = y - size / 2;
    
    // Draw block shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(blockX + 3, blockY + 3, size, size);
    
    // Draw block
    ctx.fillStyle = color;
    ctx.fillRect(blockX, blockY, size, size);
    
    // Draw border
    ctx.strokeStyle = "#cdd6f4";
    ctx.lineWidth = 2;
    ctx.strokeRect(blockX, blockY, size, size);
}

function drawStationaryBlock() {
    const size = massToSize(stationaryBlock.mass);
    const y = GROUND_Y - size / 2; // Bottom edge at GROUND_Y
    drawBlock(stationaryBlock.x, y, size, "#cdd6f4");
    
    // Draw "S" label for stationary
    ctx.fillStyle = "#1e1e2e";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("S", stationaryBlock.x, y + 8);
}

function drawMovingBlock() {
    const size = massToSize(movingBlock.mass);
    const y = GROUND_Y - size / 2; // Bottom edge at GROUND_Y
    drawBlock(movingBlock.x, y, size, "#f38ba8");
    
    // Draw arrow indicating velocity direction
    ctx.strokeStyle = "#a6e3a1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const arrowLength = 30;
    if (movingBlock.v < 0) {
        // Moving left - arrow should point left
        ctx.moveTo(movingBlock.x, y);
        ctx.lineTo(movingBlock.x - arrowLength, y);
        // Arrow head
        ctx.lineTo(movingBlock.x - arrowLength + 5, y - 5);
        ctx.moveTo(movingBlock.x - arrowLength, y);
        ctx.lineTo(movingBlock.x - arrowLength + 5, y + 5);
    } else if (movingBlock.v > 0) {
        // Moving right - arrow should point right
        ctx.moveTo(movingBlock.x, y);
        ctx.lineTo(movingBlock.x + arrowLength, y);
        // Arrow head
        ctx.lineTo(movingBlock.x + arrowLength - 5, y - 5);
        ctx.moveTo(movingBlock.x + arrowLength, y);
        ctx.lineTo(movingBlock.x + arrowLength - 5, y + 5);
    }
    ctx.stroke();
}

function drawInfo() {
    ctx.fillStyle = "#89b4fa";
    ctx.font = "16px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("Wall", WALL_THICKNESS + 15, GROUND_Y - 20);
    
    if (forceEnabled) {
        ctx.fillStyle = "#a6e3a1";
        ctx.fillText("Force Mode: ON", 15, 30);
    } else {
        ctx.fillStyle = "#f38ba8";
        ctx.fillText("Constant Speed", 15, 30);
    }
    
    ctx.fillStyle = "#cdd6f4";
    ctx.fillText(`Collisions: ${collisionCount}`, 15, 60);
}

function drawFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    drawGround();
    drawWall();
    drawStationaryBlock();
    drawMovingBlock();
    drawInfo();
}

// ------------------ STATS ------------------
function updateStats() {
    if (!statsEnabled) return;
    
    const m1 = movingBlock.mass;
    const m2 = stationaryBlock.mass;
    const kinetic1 = 0.5 * m1 * movingBlock.v * movingBlock.v;
    const kinetic2 = 0.5 * m2 * stationaryBlock.v * stationaryBlock.v;
    const totalKinetic = kinetic1 + kinetic2;
    
    let html = `
        <strong>Moving Block</strong><br>
        Position: ${movingBlock.x.toFixed(1)} px<br>
        Velocity: ${movingBlock.v.toFixed(2)} m/s<br>
        Mass: ${m1.toFixed(1)} kg<br>
        Size: ${massToSize(m1).toFixed(1)} px<br>
        KE: ${kinetic1.toFixed(2)} J<br>
        <br>
        <strong>Stationary Block</strong><br>
        Position: ${stationaryBlock.x.toFixed(1)} px<br>
        Velocity: ${stationaryBlock.v.toFixed(2)} m/s<br>
        Mass: ${m2.toFixed(1)} kg<br>
        Size: ${massToSize(m2).toFixed(1)} px<br>
        KE: ${kinetic2.toFixed(2)} J<br>
        <br>
        <strong>Total Energy</strong><br>
        KE: ${totalKinetic.toFixed(2)} J<br>
        <br>
        <strong>Collisions</strong><br>
        Count: ${collisionCount}<br>
        <br>
        <strong>Mode</strong><br>
        ${forceEnabled ? 'Force: ON' : 'Force: OFF'}
    `;
    
    if (forceEnabled) {
        html += `<br>Force: ${force.toFixed(0)} N`;
    }
    
    statsDiv.innerHTML = html;
}

// ------------------ ANIMATION ------------------
function runAnimation() {
    const dt = 0.016;
    
    if (isRunning) {
        updatePhysics(dt);
    }
    
    drawFrame();
    
    if (statsEnabled) {
        if (frameCount % 3 === 0) updateStats();
    }
    
    animationId = requestAnimationFrame(runAnimation);
}

function toggleSimulation() {
    isRunning = !isRunning;
    if (isRunning) {
        document.getElementById("runBtn").textContent = "Pause";
    } else {
        document.getElementById("runBtn").textContent = "Run";
    }
}

function startAnimation() {
    if (animationId === null) {
        runAnimation();
    }
}

function resetSimulation() {
    isRunning = false;
    cancelAnimationFrame(animationId);
    animationId = null;
    document.getElementById("runBtn").textContent = "Run";
    
    collisionCount = 0;
    
    // Reset positions
    stationaryBlock.mass = stationaryBlockMass;
    stationaryBlock.v = 0;
    stationaryBlock.a = 0;
    stationaryBlock.x = 200;
    
    movingBlock.mass = movingBlockMass;
    movingBlock.v = -velocity; // Start moving left (m/s)
    movingBlock.a = 0;
    // Position moving block to avoid overlap, ensuring gap between blocks
    const stationarySize = massToSize(stationaryBlock.mass);
    const movingSize = massToSize(movingBlock.mass);
    movingBlock.x = Math.max(canvas.width - 150, stationaryBlock.x + stationarySize / 2 + movingSize / 2 + 50);
    movingBlock.y = GROUND_Y - movingSize / 2; // Bottom edge at GROUND_Y
    
    syncLabels(); // Update slider labels
    drawFrame();
    if (statsEnabled) updateStats();
    
    // Restart animation loop
    runAnimation();
}

// ------------------ SLIDER HANDLERS ------------------
function syncLabels() {
    document.getElementById("blockSizeValue").innerText = blockSizeSlider.value + " kg";
    document.getElementById("movingBlockSizeValue").innerText = movingBlockSizeSlider.value + " kg";
    document.getElementById("velocityValue").innerText = velocitySlider.value + " m/s";
    document.getElementById("forceValue").innerText = forceSlider.value + " N";
    document.getElementById("frictionValue").innerText = frictionSlider.value;
    document.getElementById("simSpeedValue").innerText = simSpeedSlider.value + "×";
}

blockSizeSlider.addEventListener("input", e => {
    stationaryBlockMass = parseFloat(e.target.value);
    // Stop and reset simulation when mass changes
    resetSimulation();
});

movingBlockSizeSlider.addEventListener("input", e => {
    movingBlockMass = parseFloat(e.target.value);
    // Stop and reset simulation when mass changes
    resetSimulation();
});

velocitySlider.addEventListener("input", e => {
    velocity = parseFloat(e.target.value);
    // Stop and reset simulation when velocity changes
    resetSimulation();
});

forceSlider.addEventListener("input", e => {
    force = parseFloat(e.target.value);
    // Update acceleration immediately if force is enabled
    if (forceEnabled) {
        const forceDirection = movingBlock.v < 0 ? -1 : (movingBlock.v > 0 ? 1 : -1);
        const appliedForce = force * forceDirection;
        const frictionForce = -Math.sign(movingBlock.v) * friction * movingBlock.mass * 9.81;
        const netForce = appliedForce + frictionForce;
        movingBlock.a = netForce / movingBlock.mass;
    }
    syncLabels();
    if (statsEnabled) updateStats();
});

frictionSlider.addEventListener("input", e => {
    friction = parseFloat(e.target.value);
    // Update acceleration immediately if force is enabled
    if (forceEnabled) {
        const forceDirection = movingBlock.v < 0 ? -1 : (movingBlock.v > 0 ? 1 : -1);
        const appliedForce = force * forceDirection;
        const frictionForce = -Math.sign(movingBlock.v) * friction * movingBlock.mass * 9.81;
        const netForce = appliedForce + frictionForce;
        movingBlock.a = netForce / movingBlock.mass;
    }
    syncLabels();
    if (statsEnabled) updateStats();
});

simSpeedSlider.addEventListener("input", e => {
    simSpeed = parseFloat(e.target.value);
    syncLabels();
});

// ------------------ TOGGLE BUTTONS ------------------
toggleStatsBtn.addEventListener("click", () => {
    statsEnabled = !statsEnabled;
    toggleStatsBtn.textContent = statsEnabled ? "Hide Stats" : "Show Stats";
    if (statsEnabled) updateStats();
    else statsDiv.innerHTML = "";
});

toggleForceBtn.addEventListener("click", () => {
    forceEnabled = !forceEnabled;
    toggleForceBtn.textContent = forceEnabled ? "Disable Force" : "Enable Force";
    
    // Show/hide force and friction sliders
    if (forceSliderRow) {
        forceSliderRow.style.display = forceEnabled ? "flex" : "none";
    }
    if (frictionSliderRow) {
        frictionSliderRow.style.display = forceEnabled ? "flex" : "none";
    }
    
    if (forceEnabled) {
        // Apply force in the direction of current velocity (or left if stationary)
        const forceDirection = movingBlock.v < 0 ? -1 : (movingBlock.v > 0 ? 1 : -1);
        const appliedForce = force * forceDirection;
        const frictionForce = -Math.sign(movingBlock.v) * friction * movingBlock.mass * 9.81;
        const netForce = appliedForce + frictionForce;
        movingBlock.a = netForce / movingBlock.mass;
    } else {
        // Reset to constant velocity
        movingBlock.a = 0;
        if (movingBlock.v < 0) {
            movingBlock.v = -velocity; // m/s
        } else {
            movingBlock.v = velocity; // m/s
        }
    }
    
    if (statsEnabled) updateStats();
});

// ------------------ INIT ------------------
window.onload = () => {
    syncLabels();
    // Initially hide force and friction sliders
    if (forceSliderRow) {
        forceSliderRow.style.display = "none";
    }
    if (frictionSliderRow) {
        frictionSliderRow.style.display = "none";
    }
    resetSimulation();
    // Animation loop already started by resetSimulation
};

// Expose functions
window.toggleSimulation = toggleSimulation;
window.resetSimulation = resetSimulation;

