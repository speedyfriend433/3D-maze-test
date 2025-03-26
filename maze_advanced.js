import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
// import { BufferGeometryUtils } from 'three/addons/utils/BufferGeometryUtils.js'; // Optional for merging

// --- Configuration ---
const MAZE_WIDTH = 21; // Odd number
const MAZE_HEIGHT = 21; // Odd number
const CELL_SIZE = 4;
const WALL_HEIGHT = 3.5;
const WALL_THICKNESS = 0.4;

const PLAYER_HEIGHT = WALL_HEIGHT * 0.5;
const PLAYER_SPEED = 5.0;
const PLAYER_RADIUS = 0.3; // Collision radius
const GRAVITY = -9.8 * 2; // A bit stronger gravity

const START_TIME = 120; // Seconds
const INTERACT_DISTANCE = 1.5;

// --- Game State ---
let scene, camera, renderer, controls, listener;
let mazeGrid = [];
let collidableObjects = []; // Store meshes/boxes for collision
let floor;
const keysPressed = {};
const clock = new THREE.Clock();
let playerVelocity = new THREE.Vector3();
let canJump = false; // Simple jump state
let timeLeft = START_TIME;
let gameActive = false;
let gameOver = false;
let exitPosition = new THREE.Vector3(); // To store the maze exit world coords
let secretWalls = []; // Store refs to meshes that are secret walls
let portals = []; // { mesh: THREE.Mesh, targetPos: THREE.Vector3, triggerBox: THREE.Box3 }
let aiEntities = []; // { mesh: THREE.Mesh, path: [], target: null }

// --- DOM Elements ---
const blocker = document.getElementById('blocker');
const instructions = document.getElementById('instructions');
const timerElement = document.getElementById('timer');
const messageElement = document.getElementById('message');

// --- Initialization ---
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    // scene.fog = new THREE.Fog(0x000000, CELL_SIZE * 2, CELL_SIZE * MAZE_WIDTH * 0.6); // Optional fog

    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = PLAYER_HEIGHT;

    // Audio Listener
    listener = new THREE.AudioListener();
    camera.add(listener);

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true; // Enable shadows
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    document.body.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x101010); // Very dim ambient light
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2.0); // Strong white light
    directionalLight.position.set(MAZE_WIDTH * CELL_SIZE * 0.3, 30, MAZE_HEIGHT * CELL_SIZE * 0.3);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; // Adjust for quality/performance
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = MAZE_WIDTH * CELL_SIZE * 1.5;
    // Optimize shadow camera frustum
    const shadowCamSize = Math.max(MAZE_WIDTH, MAZE_HEIGHT) * CELL_SIZE / 2;
    directionalLight.shadow.camera.left = -shadowCamSize;
    directionalLight.shadow.camera.right = shadowCamSize;
    directionalLight.shadow.camera.top = shadowCamSize;
    directionalLight.shadow.camera.bottom = -shadowCamSize;
    scene.add(directionalLight);
    // const shadowHelper = new THREE.CameraHelper( directionalLight.shadow.camera ); // Debug shadows
    // scene.add( shadowHelper );


    // Controls (Pointer Lock)
    controls = new PointerLockControls(camera, document.body);
    scene.add(controls.getObject()); // Add camera pivot to scene

    blocker.addEventListener('click', () => {
        controls.lock();
    });
    controls.addEventListener('lock', () => {
        instructions.style.display = 'none';
        blocker.style.display = 'none';
        gameActive = true; // Start game logic when pointer locked
        if (gameOver) resetGame(); // Reset if starting after game over
    });
    controls.addEventListener('unlock', () => {
        blocker.style.display = 'flex';
        instructions.style.display = '';
        gameActive = false;
    });

    // Maze Generation
    mazeGrid = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);

    // Create 3D Geometry
    createMazeGeometry(mazeGrid);
    addSpecialFeatures(mazeGrid); // Add portals, exits etc. after basic walls

    // Place Camera at Start
    const startPos = findStartOrEndPos(mazeGrid, true); // true for start
    controls.getObject().position.x = startPos.x * CELL_SIZE;
    controls.getObject().position.z = startPos.y * CELL_SIZE;
    controls.getObject().position.y = PLAYER_HEIGHT;

    // Find Exit Position
    const endPos = findStartOrEndPos(mazeGrid, false); // false for end
    exitPosition.set(endPos.x * CELL_SIZE, 0, endPos.y * CELL_SIZE); // Store exit world coords

     // Add Placeholder AI
     addAIEntities();

    // Input Listeners
    setupInputListeners();

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Start Animation Loop
    animate();
}

// --- Maze Generation (Recursive Backtracker) ---
function generateMaze(width, height) {
    // Grid: 0=path, 1=wall, 2=start, 3=end, 4=potential secret, 5=potential portal, 6=potential trap
    const grid = Array(height).fill(null).map(() => Array(width).fill(1));
    const stack = [];
    let currentX = 1, currentY = 1;

    grid[currentY][currentX] = 0;
    stack.push({ x: currentX, y: currentY });

    const directions = [ { dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 } ];

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        currentX = current.x; currentY = current.y;

        const neighbors = [];
        directions.sort(() => Math.random() - 0.5); // Shuffle directions

        for (const dir of directions) {
            const nextX = currentX + dir.dx;
            const nextY = currentY + dir.dy;
            if (nextY >= 0 && nextY < height && nextX >= 0 && nextX < width && grid[nextY][nextX] === 1) {
                neighbors.push({ nextX, nextY, wallX: currentX + dir.dx / 2, wallY: currentY + dir.dy / 2 });
            }
        }

        if (neighbors.length > 0) {
            const chosen = neighbors[0];
            grid[chosen.nextY][chosen.nextX] = 0; // Carve path
            grid[chosen.wallY][chosen.wallX] = 0; // Carve wall

             // Occasionally mark walls as potential secrets or path cells for portals/traps
            if (Math.random() < 0.1) { // 10% chance to be a potential secret wall
                 grid[chosen.wallY][chosen.wallX] = 4;
            } else if (Math.random() < 0.05 && grid[chosen.nextY][chosen.nextX] === 0) { // 5% chance for portal on path
                 grid[chosen.nextY][chosen.nextX] = 5;
            } // Add more rules for traps etc.

            stack.push({ x: chosen.nextX, y: chosen.nextY });
        } else {
            stack.pop(); // Backtrack
        }
    }
    // Designate Start and End (ensure they are path cells)
    grid[1][1] = 2; // Start top-left
    grid[height - 2][width - 2] = 3; // End bottom-right

    return grid;
}


// --- Create 3D Maze Geometry ---
function createMazeGeometry(grid) {
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff }); // White, reacts to light
    const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    const wallGeometryZ = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE);

    collidableObjects = []; // Reset collidables
    secretWalls = [];

    // Floor
    const floorSize = Math.max(MAZE_WIDTH, MAZE_HEIGHT) * CELL_SIZE * 1.2; // Slightly larger floor
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd }); // Light gray floor
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0; // Floor at y=0
    floor.receiveShadow = true; // Floor receives shadows
    scene.add(floor);
    // Add floor to collidables? Only needed if player can fall off edges, but we add outer walls.

    // Walls from Grid
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cellType = grid[y][x];
            if (cellType === 1 || cellType === 4) { // 1 = Wall, 4 = Secret Wall
                let wallMesh;
                const posX = x * CELL_SIZE;
                const posZ = y * CELL_SIZE;
                const posY = WALL_HEIGHT / 2; // Center wall vertically

                // Basic wall orientation detection (can be improved)
                let isHorizontal = (y > 0 && grid[y - 1][x] !== 1 && grid[y - 1][x] !== 4) || (y < grid.length - 1 && grid[y + 1][x] !== 1 && grid[y + 1][x] !== 4);
                 let isVertical = (x > 0 && grid[y][x - 1] !== 1 && grid[y][x - 1] !== 4) || (x < grid[y].length - 1 && grid[y][x + 1] !== 1 && grid[y][x + 1] !== 4);

                // Prioritize longer segments for geometry choice
                if (isHorizontal && !isVertical) { // Runs along Z
                    wallMesh = new THREE.Mesh(wallGeometry, wallMaterial.clone()); // Clone material if changing props later
                    wallMesh.position.set(posX, posY, posZ);
                } else { // Runs along X or is a pillar (use Z geometry for simplicity here)
                    wallMesh = new THREE.Mesh(wallGeometryZ, wallMaterial.clone());
                    wallMesh.position.set(posX, posY, posZ);
                }

                wallMesh.castShadow = true;
                wallMesh.receiveShadow = true; // Walls can receive shadows too
                scene.add(wallMesh);
                collidableObjects.push(wallMesh); // Add mesh for collision detection

                if (cellType === 4) {
                    wallMesh.isSecret = true; // Mark the mesh
                    // Optionally change appearance slightly (e.g., slightly darker? needs careful handling for B&W)
                    // wallMesh.material.color.set(0xeeeeee);
                    secretWalls.push(wallMesh);
                }
            }
            // Other cell types (0, 2, 3, 5, 6) are paths or handled in addSpecialFeatures
        }
    }

     // Add Outer Bounding Walls (Thicker)
     const outerWallThickness = CELL_SIZE;
     const halfWidth = (MAZE_WIDTH * CELL_SIZE) / 2 - CELL_SIZE / 2;
     const halfHeight = (MAZE_HEIGHT * CELL_SIZE) / 2 - CELL_SIZE / 2;
     const outerMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

     const wallN = new THREE.Mesh(new THREE.BoxGeometry(MAZE_WIDTH * CELL_SIZE + outerWallThickness, WALL_HEIGHT, outerWallThickness), outerMat);
     wallN.position.set(halfWidth, WALL_HEIGHT / 2, -outerWallThickness / 2);
     const wallS = new THREE.Mesh(new THREE.BoxGeometry(MAZE_WIDTH * CELL_SIZE + outerWallThickness, WALL_HEIGHT, outerWallThickness), outerMat);
     wallS.position.set(halfWidth, WALL_HEIGHT / 2, MAZE_HEIGHT * CELL_SIZE - CELL_SIZE + outerWallThickness / 2);
     const wallW = new THREE.Mesh(new THREE.BoxGeometry(outerWallThickness, WALL_HEIGHT, MAZE_HEIGHT * CELL_SIZE + outerWallThickness), outerMat);
     wallW.position.set(-outerWallThickness / 2, WALL_HEIGHT / 2, halfHeight);
     const wallE = new THREE.Mesh(new THREE.BoxGeometry(outerWallThickness, WALL_HEIGHT, MAZE_HEIGHT * CELL_SIZE + outerWallThickness), outerMat);
     wallE.position.set(MAZE_WIDTH * CELL_SIZE - CELL_SIZE + outerWallThickness / 2, WALL_HEIGHT / 2, halfHeight);

     [wallN, wallS, wallW, wallE].forEach(wall => {
         wall.castShadow = true;
         wall.receiveShadow = true;
         scene.add(wall);
         collidableObjects.push(wall);
     });
}

// --- Add Special Features ---
function addSpecialFeatures(grid) {
    portals = [];
    const portalMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide, transparent: true, opacity: 0.5 }); // Placeholder visual
    const portalGeometry = new THREE.PlaneGeometry(CELL_SIZE * 0.6, WALL_HEIGHT * 0.8);
    let portalPair = [];

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === 5) { // Potential Portal Location
                const posX = x * CELL_SIZE;
                const posZ = y * CELL_SIZE;

                // Simple: Create pairs as they are found
                if (portalPair.length === 0) {
                    portalPair.push({x: posX, z: posZ});
                } else {
                    const posA = portalPair[0];
                    const posB = {x: posX, z: posZ};
                    portalPair = []; // Reset for next pair

                    // Create portal A
                    const portalA = new THREE.Mesh(portalGeometry, portalMaterial);
                    portalA.position.set(posA.x, WALL_HEIGHT / 2, posA.z);
                     // Orient portal visualization (basic)
                    if (x > 0 && grid[y][x-1] === 1) portalA.rotation.y = Math.PI / 2; // Facing right
                    else if (x < grid[0].length-1 && grid[y][x+1] === 1) portalA.rotation.y = -Math.PI / 2; // Facing left
                    else if (y < grid.length-1 && grid[y+1][x] === 1) portalA.rotation.y = Math.PI; // Facing back

                    const boxA = new THREE.Box3().setFromCenterAndSize(
                        portalA.position,
                        new THREE.Vector3(WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS * 2) // Trigger volume
                    );
                    scene.add(portalA);
                    portals.push({ mesh: portalA, targetPos: new THREE.Vector3(posB.x, PLAYER_HEIGHT, posB.z), triggerBox: boxA });

                    // Create portal B
                    const portalB = new THREE.Mesh(portalGeometry, portalMaterial);
                    portalB.position.set(posB.x, WALL_HEIGHT / 2, posB.z);
                     if (x > 0 && grid[y][x-1] === 1) portalB.rotation.y = Math.PI / 2;
                    else if (x < grid[0].length-1 && grid[y][x+1] === 1) portalB.rotation.y = -Math.PI / 2;
                    else if (y < grid.length-1 && grid[y+1][x] === 1) portalB.rotation.y = Math.PI;

                    const boxB = new THREE.Box3().setFromCenterAndSize(
                        portalB.position,
                         new THREE.Vector3(WALL_THICKNESS * 2, WALL_HEIGHT, WALL_THICKNESS * 2)
                    );
                    scene.add(portalB);
                    portals.push({ mesh: portalB, targetPos: new THREE.Vector3(posA.x, PLAYER_HEIGHT, posA.z), triggerBox: boxB });

                     // Make the grid spaces non-collidable if a portal is there
                     // This assumes portals replace walls/are in openings. More complex logic needed otherwise.
                }
            }
            // Add logic for traps (cellType 6), fake exits etc. here
        }
    }
}


// --- Add Placeholder AI ---
function addAIEntities() {
    // Simple Example: Add one AI sphere
    const aiGeometry = new THREE.SphereGeometry(PLAYER_RADIUS * 1.5, 16, 8);
    const aiMaterial = new THREE.MeshStandardMaterial({ color: 0xeeeeee }); // Slightly off-white AI
    const aiMesh = new THREE.Mesh(aiGeometry, aiMaterial);
    aiMesh.castShadow = true;

    // Find a starting path cell for the AI
    let aiStartX = 5, aiStartY = 5; // Example start
    for (let y = 1; y < mazeGrid.length - 1; y+=2) {
        for (let x = 1; x < mazeGrid[0].length - 1; x+=2) {
            if (mazeGrid[y][x] === 0) { // Find first path cell
                 aiStartX = x; aiStartY = y; break;
            }
        }
         if(mazeGrid[aiStartY][aiStartX] === 0) break;
    }


    aiMesh.position.set(aiStartX * CELL_SIZE, PLAYER_RADIUS * 1.5, aiStartY * CELL_SIZE);
    scene.add(aiMesh);
    aiEntities.push({ mesh: aiMesh, path: [], target: null }); // Add pathfinding data later
     collidableObjects.push(aiMesh); // AI can also be an obstacle
}

// --- Find Start/End ---
function findStartOrEndPos(grid, findStart) {
    const targetType = findStart ? 2 : 3; // 2 for start, 3 for end
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === targetType) {
                return { x, y };
            }
        }
    }
    return { x: 1, y: 1 }; // Fallback
}

// --- Input Handling ---
function setupInputListeners() {
    window.addEventListener('keydown', (event) => {
        keysPressed[event.code] = true;
        // Interaction Key
        if (event.code === 'KeyE' && gameActive && !gameOver) {
            interact();
        }
    });
    window.addEventListener('keyup', (event) => {
        keysPressed[event.code] = false;
    });
}

// --- Interaction Logic ---
function interact() {
     // Simple Raycast for interaction
     const raycaster = new THREE.Raycaster(camera.position, camera.getWorldDirection(new THREE.Vector3()), 0, INTERACT_DISTANCE);
     const intersects = raycaster.intersectObjects(secretWalls); // Only check against secret walls

     if (intersects.length > 0) {
         const intersectedWall = intersects[0].object;
         if (intersectedWall.isSecret) {
             console.log("Found secret wall!");
             // Reveal the wall: remove it visually and from collision checks
             scene.remove(intersectedWall);
             collidableObjects = collidableObjects.filter(obj => obj !== intersectedWall);
             secretWalls = secretWalls.filter(wall => wall !== intersectedWall);
             // Play sound effect (placeholder)
             playSound('reveal');
         }
     }
 }

// --- Movement & Collision ---
function handleMovementAndCollision(deltaTime) {
    const speed = PLAYER_SPEED;
    const moveDirection = new THREE.Vector3(); // Direction relative to player's view
    let moveDistance = 0;

    // Calculate movement direction based on input
    if (keysPressed['KeyW'] || keysPressed['ArrowUp']) {
        moveDirection.z = -1;
    }
    if (keysPressed['KeyS'] || keysPressed['ArrowDown']) {
        moveDirection.z = 1;
    }
    if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) {
        moveDirection.x = -1;
    }
    if (keysPressed['KeyD'] || keysPressed['ArrowRight']) {
        moveDirection.x = 1;
    }

    moveDirection.normalize(); // Ensure consistent speed diagonally

    // Apply movement if keys are pressed
    if (moveDirection.lengthSq() > 0) {
         // Get camera's world direction (horizontal plane)
        const cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);
        cameraDirection.y = 0; // Project onto XZ plane
        cameraDirection.normalize();

        // Calculate right vector
        const right = new THREE.Vector3().crossVectors(camera.up, cameraDirection).normalize();

        // Combine forward/backward and strafe movements
        const worldMoveDirection = new THREE.Vector3();
        worldMoveDirection.addScaledVector(cameraDirection, moveDirection.z);
        worldMoveDirection.addScaledVector(right, moveDirection.x);
        worldMoveDirection.normalize();

        moveDistance = speed * deltaTime;

        // --- Collision Detection ---
        const currentPos = controls.getObject().position;
        let potentialPos = currentPos.clone().addScaledVector(worldMoveDirection, moveDistance);

        if (!checkCollision(potentialPos)) {
            controls.getObject().position.copy(potentialPos);
        } else {
             // Sliding: Try moving only along X or Z component of worldMoveDirection
            let potentialX = currentPos.clone().addScaledVector(new THREE.Vector3(worldMoveDirection.x, 0, 0).normalize(), moveDistance);
            let potentialZ = currentPos.clone().addScaledVector(new THREE.Vector3(0, 0, worldMoveDirection.z).normalize(), moveDistance);

             if (!checkCollision(potentialX)) {
                controls.getObject().position.x = potentialX.x;
             }
             if (!checkCollision(potentialZ)) { // Check Z independently
                 controls.getObject().position.z = potentialZ.z;
             }
        }
    }

    // --- Gravity and Jumping ---
    playerVelocity.y += GRAVITY * deltaTime;
    controls.getObject().position.y += playerVelocity.y * deltaTime;

    // Floor collision / Ground check
    if (controls.getObject().position.y < PLAYER_HEIGHT) {
        controls.getObject().position.y = PLAYER_HEIGHT;
        playerVelocity.y = 0;
        canJump = true; // Allow jumping when on floor
    } else {
        canJump = false;
    }

    // Simple jump
    if (keysPressed['Space'] && canJump) {
        playerVelocity.y = Math.sqrt(-2 * GRAVITY * (WALL_HEIGHT * 0.6)); // Jump velocity to reach certain height
        canJump = false;
        playSound('jump'); // Placeholder
    }

     // --- Portal Collision ---
     checkPortalCollision(controls.getObject().position);
}

function checkCollision(potentialPos) {
    const playerBox = new THREE.Box3(
        new THREE.Vector3(potentialPos.x - PLAYER_RADIUS, potentialPos.y - PLAYER_HEIGHT, potentialPos.z - PLAYER_RADIUS),
        new THREE.Vector3(potentialPos.x + PLAYER_RADIUS, potentialPos.y, potentialPos.z + PLAYER_RADIUS)
    );

    for (const obj of collidableObjects) {
        // Assuming collidableObjects contains Meshes
        const wallBox = new THREE.Box3().setFromObject(obj);
        if (playerBox.intersectsBox(wallBox)) {
             playSound('bump'); // Placeholder
            return true; // Collision detected
        }
    }
    return false; // No collision
}

function checkPortalCollision(playerPos) {
     const playerBoxSimple = new THREE.Box3( // Simplified box centered at player feet
        new THREE.Vector3(playerPos.x - PLAYER_RADIUS, playerPos.y - PLAYER_HEIGHT, playerPos.z - PLAYER_RADIUS),
        new THREE.Vector3(playerPos.x + PLAYER_RADIUS, playerPos.y, playerPos.z + PLAYER_RADIUS)
    );

    for (const portal of portals) {
        if (playerBoxSimple.intersectsBox(portal.triggerBox)) {
            // Teleport the player instantly
            controls.getObject().position.copy(portal.targetPos);
            playerVelocity.y = 0; // Reset vertical velocity after teleport
            playSound('portal'); // Placeholder
            // Add cooldown maybe? To prevent instant return teleport
            break; // Assume only one portal can be triggered at a time
        }
    }
}

// --- Update AI (Placeholder) ---
function updateAI(deltaTime) {
    aiEntities.forEach(ai => {
        // Simple patrol or pathfinding logic would go here
        // Example: Move AI slightly
        // ai.mesh.position.x += 0.5 * deltaTime;
        // Need collision detection for AI too
    });
}

// --- Game Logic (Timer, Win/Lose) ---
function updateGameLogic(deltaTime) {
    if (gameOver) return;

    // Timer
    timeLeft -= deltaTime;
    timerElement.textContent = `Time: ${Math.max(0, Math.ceil(timeLeft))}`;

    if (timeLeft <= 0) {
        // Game Over - Time Ran Out
        gameOver = true;
        gameActive = false; // Stop movement processing
        showMessage("Time's Up!");
        controls.unlock(); // Release pointer lock
        playSound('lose'); // Placeholder
    }

    // Check Win Condition
    const playerPos = controls.getObject().position;
    const distanceToExit = playerPos.distanceTo(exitPosition);

    if (distanceToExit < CELL_SIZE * 0.7) { // Player is near the exit
        gameOver = true;
        gameActive = false;
        showMessage("You Escaped!");
        controls.unlock();
        playSound('win'); // Placeholder
    }
}

// --- UI Messages ---
function showMessage(text, duration = 3000) {
    messageElement.textContent = text;
    messageElement.style.display = 'block';
    if (duration > 0) {
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, duration);
    }
}

// --- Sound Placeholders ---
const soundEffects = {
    // Load actual AudioBuffers here using THREE.AudioLoader
    'footstep': null, 'jump': null, 'bump': null,
    'portal': null, 'reveal': null, 'win': null, 'lose': null
};

function playSound(name) {
    console.log(`Playing sound: ${name}`); // Log instead of playing
    // Implementation requires loading sounds first
    // Example:
    // const sound = new THREE.Audio(listener);
    // if (soundEffects[name]) {
    //     sound.setBuffer(soundEffects[name]);
    //     sound.setVolume(0.5);
    //     sound.play();
    // }
}

// --- Reset Game ---
function resetGame() {
    console.log("Resetting game...");
    timeLeft = START_TIME;
    gameOver = false;
    gameActive = false; // Will become true on next pointer lock
    messageElement.style.display = 'none';

    // Reset player position to start
    const startPos = findStartOrEndPos(mazeGrid, true);
    controls.getObject().position.set(startPos.x * CELL_SIZE, PLAYER_HEIGHT, startPos.y * CELL_SIZE);
    playerVelocity.set(0, 0, 0);

    // Reset any dynamic elements (like revealed secret walls - harder, might need regeneration)
    // For simplicity, we might just regenerate the maze or reload the page
    // Or, rebuild the geometry if secret walls were only hidden/moved
    // NOTE: Simple reset here doesn't restore removed secret walls. Full reset = regenerate/reload.

    // Clear keys pressed
    for (const key in keysPressed) {
        keysPressed[key] = false;
    }
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    if (controls.isLocked === true && gameActive && !gameOver) {
        handleMovementAndCollision(deltaTime);
        updateGameLogic(deltaTime);
        updateAI(deltaTime); // Update AI logic
    }

    renderer.render(scene, camera);
}

// --- Utility ---
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- Start ---
init();
