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
let blockSize = 100;
let movingBlockSize = 50;
let velocity = 300; // pixels per second
let force = 200; // Newtons
let forceEnabled = false; // Default: constant speed
let simSpeed = 1.0;

// Block states
let stationaryBlock = {
    x: 200,
    size: 100,
    v: 0,
    a: 0
};

let movingBlock = {
    x: 800,
    y: GROUND_Y - 50, // Start above ground
    size: 50,
    v: -300,
    a: 0
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
const simSpeedSlider = document.getElementById("simSpeed");

// ------------------ PHYSICS ------------------
function updatePhysics(dt) {
    dt = dt * simSpeed;
    
    // Apply force if enabled
    if (forceEnabled) {
        const mass = movingBlock.size * movingBlock.size;
        movingBlock.a = force / mass;
        movingBlock.v += movingBlock.a * dt;
    }
    
    // Update positions first
    movingBlock.x += movingBlock.v * dt;
    stationaryBlock.x += stationaryBlock.v * dt;
    
    // Get block edges after movement
    const movingLeft = movingBlock.x - movingBlock.size / 2;
    const movingRight = movingBlock.x + movingBlock.size / 2;
    const stationaryLeft = stationaryBlock.x - stationaryBlock.size / 2;
    const stationaryRight = stationaryBlock.x + stationaryBlock.size / 2;
    
    // Check collision with left wall for moving block
    if (movingLeft <= WALL_THICKNESS) {
        movingBlock.x = WALL_THICKNESS + movingBlock.size / 2 + 0.5;
        if (movingBlock.v < 0) {
            // Only bounce if moving into the wall
            movingBlock.v = -movingBlock.v; // Bounce right
            collisionCount++;
        }
    }
    
    // Check collision with left wall for stationary block
    if (stationaryLeft <= WALL_THICKNESS) {
        stationaryBlock.x = WALL_THICKNESS + stationaryBlock.size / 2 + 0.5;
        if (stationaryBlock.v < 0) {
            // Only bounce if moving into the wall
            stationaryBlock.v = -stationaryBlock.v; // Bounce right
            collisionCount++;
        }
    }
    
    // Check collision between blocks
    if (movingRight >= stationaryLeft && movingLeft <= stationaryRight) {
        // Determine which side the collision is on before calculating velocities
        const collisionFromLeft = movingBlock.v > 0;
        
        // Calculate masses
        const m1 = movingBlock.size * movingBlock.size;
        const m2 = stationaryBlock.size * stationaryBlock.size;
        
        // Calculate velocities before collision
        const v1 = movingBlock.v;
        const v2 = stationaryBlock.v;
        
        // Elastic collision: calculate new velocities
        const newV1 = ((m1 - m2) * v1 + 2 * m2 * v2) / (m1 + m2);
        const newV2 = ((m2 - m1) * v2 + 2 * m1 * v1) / (m1 + m2);
        
        movingBlock.v = newV1;
        stationaryBlock.v = newV2;
        
        collisionCount++;
        
        // Separate blocks based on where the collision came from
        if (collisionFromLeft) {
            // Collision from left, moving block goes to left of stationary
            movingBlock.x = stationaryLeft - movingBlock.size / 2 - 0.01;
        } else {
            // Collision from right, moving block goes to right of stationary
            movingBlock.x = stationaryRight + movingBlock.size / 2 + 0.01;
        }
    }
    
    // Keep stationary block in bounds (only constrain position, don't stop velocity)
    const statLeft = stationaryBlock.x - stationaryBlock.size / 2;
    const statRight = stationaryBlock.x + stationaryBlock.size / 2;
    
    if (statLeft < WALL_THICKNESS) {
        stationaryBlock.x = WALL_THICKNESS + stationaryBlock.size / 2;
        // Velocity is handled by wall collision check above, don't reset it to 0
    }
    
    if (statRight > canvas.width) {
        stationaryBlock.x = canvas.width - stationaryBlock.size / 2;
        // Only stop velocity if hitting right edge (no wall there)
        if (stationaryBlock.v > 0) {
            stationaryBlock.v = 0;
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
    drawBlock(stationaryBlock.x, GROUND_Y - stationaryBlock.size / 2, stationaryBlock.size, "#cdd6f4");
    
    // Draw "S" label for stationary
    ctx.fillStyle = "#1e1e2e";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("S", stationaryBlock.x, GROUND_Y - stationaryBlock.size / 2 + 8);
}

function drawMovingBlock() {
    drawBlock(movingBlock.x, movingBlock.y, movingBlock.size, "#f38ba8");
    
    // Draw arrow indicating velocity direction
    ctx.strokeStyle = "#a6e3a1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const arrowLength = 30;
    if (movingBlock.v < 0) {
        // Moving left - arrow should point left
        ctx.moveTo(movingBlock.x, movingBlock.y);
        ctx.lineTo(movingBlock.x - arrowLength, movingBlock.y);
        // Arrow head
        ctx.lineTo(movingBlock.x - arrowLength + 5, movingBlock.y - 5);
        ctx.moveTo(movingBlock.x - arrowLength, movingBlock.y);
        ctx.lineTo(movingBlock.x - arrowLength + 5, movingBlock.y + 5);
    } else if (movingBlock.v > 0) {
        // Moving right - arrow should point right
        ctx.moveTo(movingBlock.x, movingBlock.y);
        ctx.lineTo(movingBlock.x + arrowLength, movingBlock.y);
        // Arrow head
        ctx.lineTo(movingBlock.x + arrowLength - 5, movingBlock.y - 5);
        ctx.moveTo(movingBlock.x + arrowLength, movingBlock.y);
        ctx.lineTo(movingBlock.x + arrowLength - 5, movingBlock.y + 5);
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
    
    const m1 = movingBlock.size * movingBlock.size;
    const m2 = stationaryBlock.size * stationaryBlock.size;
    const kinetic1 = 0.5 * m1 * movingBlock.v * movingBlock.v;
    const kinetic2 = 0.5 * m2 * stationaryBlock.v * stationaryBlock.v;
    const totalKinetic = kinetic1 + kinetic2;
    
    let html = `
        <strong>Moving Block</strong><br>
        Position: ${movingBlock.x.toFixed(1)} px<br>
        Velocity: ${movingBlock.v.toFixed(1)} px/s<br>
        Mass: ${m1.toFixed(1)} kg<br>
        KE: ${kinetic1.toFixed(2)} J<br>
        <br>
        <strong>Stationary Block</strong><br>
        Position: ${stationaryBlock.x.toFixed(1)} px<br>
        Velocity: ${stationaryBlock.v.toFixed(1)} px/s<br>
        Mass: ${m2.toFixed(1)} kg<br>
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
    stationaryBlock.size = blockSize;
    stationaryBlock.v = 0;
    stationaryBlock.a = 0;
    stationaryBlock.x = 200;
    
    movingBlock.size = movingBlockSize;
    movingBlock.v = -velocity; // Start moving left
    movingBlock.a = 0;
    // Position moving block to avoid overlap, ensuring gap between blocks
    movingBlock.x = Math.max(canvas.width - 150, stationaryBlock.x + blockSize + movingBlockSize + 50);
    movingBlock.y = GROUND_Y - 50;
    
    drawFrame();
    if (statsEnabled) updateStats();
    
    // Restart animation loop
    runAnimation();
}

// ------------------ SLIDER HANDLERS ------------------
function syncLabels() {
    document.getElementById("blockSizeValue").innerText = blockSizeSlider.value + " px";
    document.getElementById("movingBlockSizeValue").innerText = movingBlockSizeSlider.value + " px";
    document.getElementById("velocityValue").innerText = velocitySlider.value + " px/s";
    document.getElementById("forceValue").innerText = forceSlider.value + " N";
    document.getElementById("simSpeedValue").innerText = simSpeedSlider.value + "×";
}

blockSizeSlider.addEventListener("input", e => {
    blockSize = parseInt(e.target.value);
    stationaryBlock.size = blockSize;
    // Ensure blocks don't overlap
    if (stationaryBlock.x + stationaryBlock.size / 2 >= movingBlock.x - movingBlock.size / 2 - 10) {
        stationaryBlock.x = movingBlock.x - movingBlock.size / 2 - stationaryBlock.size / 2 - 10;
    }
    syncLabels();
    if (!isRunning) drawFrame();
    if (statsEnabled) updateStats();
});

movingBlockSizeSlider.addEventListener("input", e => {
    movingBlockSize = parseInt(e.target.value);
    movingBlock.size = movingBlockSize;
    // Ensure blocks don't overlap
    if (movingBlock.x - movingBlock.size / 2 <= stationaryBlock.x + stationaryBlock.size / 2 + 10) {
        movingBlock.x = stationaryBlock.x + stationaryBlock.size / 2 + movingBlock.size / 2 + 10;
    }
    if (!forceEnabled) {
        // Adjust velocity to maintain momentum if needed
        const oldMass = movingBlock.size * movingBlock.size;
        const newMass = movingBlockSize * movingBlockSize;
        movingBlock.v = (movingBlock.v * oldMass) / newMass;
    }
    syncLabels();
    if (!isRunning) drawFrame();
    if (statsEnabled) updateStats();
});

velocitySlider.addEventListener("input", e => {
    velocity = parseInt(e.target.value);
    if (!forceEnabled) {
        // Only update velocity if force is not enabled
        movingBlock.v = -velocity;
    }
    syncLabels();
    if (statsEnabled) updateStats();
});

forceSlider.addEventListener("input", e => {
    force = parseInt(e.target.value);
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
    
    if (forceEnabled) {
        movingBlock.a = force / (movingBlock.size * movingBlock.size);
    } else {
        // Reset to constant velocity
        movingBlock.a = 0;
        if (movingBlock.v < 0) {
            movingBlock.v = -velocity;
        } else {
            movingBlock.v = velocity;
        }
    }
    
    if (statsEnabled) updateStats();
});

// ------------------ INIT ------------------
window.onload = () => {
    syncLabels();
    resetSimulation();
    // Animation loop already started by resetSimulation
};

// Expose functions
window.toggleSimulation = toggleSimulation;
window.resetSimulation = resetSimulation;

