import * as THREE from 'three';

// --- Configuration ---
const MAZE_WIDTH = 15; // Must be odd
const MAZE_HEIGHT = 15; // Must be odd
const CELL_SIZE = 5; // Size of one cell in the maze
const WALL_HEIGHT = 3;
const WALL_THICKNESS = 0.5; // Make walls slightly thinner than cells for gaps

const PLAYER_HEIGHT = WALL_HEIGHT * 0.6; // Eye level
const PLAYER_SPEED = 3.0;
const PLAYER_TURN_SPEED = Math.PI / 2; // Radians per second (90 degrees)
const PLAYER_RADIUS = 0.4; // For collision detection

// --- Global Variables ---
let scene, camera, renderer;
let mazeGrid = [];
let walls = []; // Store wall objects for collision detection
let floor;
const keysPressed = {};
const clock = new THREE.Clock();

// --- Initialization ---
function init() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); // Black background

    // Camera (First Person)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = PLAYER_HEIGHT; // Set camera height

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // Maze Generation
    mazeGrid = generateMaze(MAZE_WIDTH, MAZE_HEIGHT);

    // Create 3D Geometry from Maze Data
    createMazeGeometry(mazeGrid);

    // Place Camera at Start
    const startPos = findStartPos(mazeGrid);
    camera.position.x = startPos.x * CELL_SIZE;
    camera.position.z = startPos.y * CELL_SIZE;

    // Controls Setup
    setupControls();

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize, false);

    // Start Animation Loop
    animate();
}

// --- Maze Generation (Recursive Backtracker) ---
function generateMaze(width, height) {
    // Initialize grid full of walls (1)
    const grid = Array(height).fill(null).map(() => Array(width).fill(1));
    const stack = [];
    let currentX = 1, currentY = 1; // Start carving from an inner cell

    grid[currentY][currentX] = 0; // Mark start as path
    stack.push({ x: currentX, y: currentY });

    const directions = [
        { dx: 0, dy: -2, wallDx: 0, wallDy: -1 }, // North
        { dx: 2, dy: 0, wallDx: 1, wallDy: 0 },   // East
        { dx: 0, dy: 2, wallDx: 0, wallDy: 1 },   // South
        { dx: -2, dy: 0, wallDx: -1, wallDy: 0 }, // West
    ];

    while (stack.length > 0) {
        const current = stack[stack.length - 1]; // Peek
        currentX = current.x;
        currentY = current.y;

        const neighbors = [];
        // Shuffle directions for randomness
        directions.sort(() => Math.random() - 0.5);

        for (const dir of directions) {
            const nextX = currentX + dir.dx;
            const nextY = currentY + dir.dy;

            // Check bounds and if neighbor is unvisited (still a wall)
            if (nextY >= 0 && nextY < height && nextX >= 0 && nextX < width && grid[nextY][nextX] === 1) {
                neighbors.push({ ...dir, nextX, nextY });
            }
        }

        if (neighbors.length > 0) {
            const chosen = neighbors[0]; // Pick the first (shuffled) neighbor
            const wallX = currentX + chosen.wallDx;
            const wallY = currentY + chosen.wallDy;

            grid[chosen.nextY][chosen.nextX] = 0; // Carve path to neighbor
            grid[wallY][wallX] = 0; // Carve wall between

            stack.push({ x: chosen.nextX, y: chosen.nextY }); // Move to neighbor
        } else {
            stack.pop(); // Backtrack
        }
    }
    // Ensure entrance/exit (optional, here we just start inside)
     grid[1][0] = 0; // Example entrance on the edge if needed
     grid[height-2][width-1] = 0; // Example exit

    return grid;
}

// --- Create 3D Maze Geometry ---
function createMazeGeometry(grid) {
    const wallGeometry = new THREE.BoxGeometry(CELL_SIZE, WALL_HEIGHT, WALL_THICKNESS);
    const wallGeometryZ = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, CELL_SIZE + WALL_THICKNESS); // Adjusted length for corners
    const wallMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff }); // White walls

    const floorSize = Math.max(MAZE_WIDTH, MAZE_HEIGHT) * CELL_SIZE;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xcccccc }); // Lighter gray floor
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2; // Rotate plane to be horizontal
    floor.position.y = -WALL_THICKNESS / 2; // Position floor slightly below walls base
    scene.add(floor);

    walls = []; // Clear previous walls if any

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            if (grid[y][x] === 1) { // If it's a wall cell
                let wallMesh;
                // Determine wall orientation - simple check for adjacent path cells
                let isVerticalWall = y % 2 === 0; // Walls on even rows run horizontally (Z-axis)
                let isHorizontalWall = x % 2 === 0; // Walls on even cols run vertically (X-axis)

                if (isVerticalWall && !isHorizontalWall) { // Horizontal wall segment along Z
                     wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                     wallMesh.position.set(x * CELL_SIZE, WALL_HEIGHT / 2, y * CELL_SIZE);
                } else if (!isVerticalWall && isHorizontalWall) { // Vertical wall segment along X
                    wallMesh = new THREE.Mesh(wallGeometryZ, wallMaterial);
                    wallMesh.position.set(x * CELL_SIZE, WALL_HEIGHT / 2, y * CELL_SIZE);
                } else if (isVerticalWall && isHorizontalWall) { // Corner/Intersection pillar
                    // At intersections (even x, even y), place a cube for solidity
                    const pillarGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_THICKNESS);
                    wallMesh = new THREE.Mesh(pillarGeo, wallMaterial);
                    wallMesh.position.set(x * CELL_SIZE, WALL_HEIGHT / 2, y * CELL_SIZE);
                }


                if (wallMesh) {
                   scene.add(wallMesh);
                   // Prepare for collision detection: store simplified bounding box info
                   wallMesh.updateMatrixWorld(); // Ensure world matrix is computed
                   const bbox = new THREE.Box3().setFromObject(wallMesh);
                   walls.push(bbox); // Store the bounding box directly
                }
            }
        }
    }
     // Add outer bounding walls manually for a contained maze
     const halfWidth = (MAZE_WIDTH * CELL_SIZE) / 2;
     const halfHeight = (MAZE_HEIGHT * CELL_SIZE) / 2;
     const centerOffsetX = CELL_SIZE / 2; // Adjust center because grid cells have size
     const centerOffsetZ = CELL_SIZE / 2;

     const outerWallThickness = CELL_SIZE; // Make outer walls thicker
     const outerWallMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

     // North Wall
     let wallN = new THREE.Mesh(new THREE.BoxGeometry(MAZE_WIDTH * CELL_SIZE + outerWallThickness, WALL_HEIGHT, outerWallThickness), outerWallMaterial);
     wallN.position.set(halfWidth - centerOffsetX, WALL_HEIGHT / 2, -outerWallThickness/2);
     scene.add(wallN);
     walls.push(new THREE.Box3().setFromObject(wallN));

     // South Wall
     let wallS = new THREE.Mesh(new THREE.BoxGeometry(MAZE_WIDTH * CELL_SIZE + outerWallThickness, WALL_HEIGHT, outerWallThickness), outerWallMaterial);
     wallS.position.set(halfWidth - centerOffsetX, WALL_HEIGHT / 2, MAZE_HEIGHT * CELL_SIZE - CELL_SIZE + outerWallThickness/2);
     scene.add(wallS);
     walls.push(new THREE.Box3().setFromObject(wallS));

     // West Wall
     let wallW = new THREE.Mesh(new THREE.BoxGeometry(outerWallThickness, WALL_HEIGHT, MAZE_HEIGHT * CELL_SIZE + outerWallThickness), outerWallMaterial);
     wallW.position.set(-outerWallThickness/2, WALL_HEIGHT / 2, halfHeight - centerOffsetZ);
     scene.add(wallW);
     walls.push(new THREE.Box3().setFromObject(wallW));

     // East Wall
     let wallE = new THREE.Mesh(new THREE.BoxGeometry(outerWallThickness, WALL_HEIGHT, MAZE_HEIGHT * CELL_SIZE + outerWallThickness), outerWallMaterial);
     wallE.position.set(MAZE_WIDTH * CELL_SIZE - CELL_SIZE + outerWallThickness/2, WALL_HEIGHT / 2, halfHeight - centerOffsetZ);
     scene.add(wallE);
     walls.push(new THREE.Box3().setFromObject(wallE));

}

// --- Find Starting Position ---
function findStartPos(grid) {
    // Find the first available path cell (typically near 1,1)
    for (let y = 1; y < grid.length; y += 2) {
        for (let x = 1; x < grid[y].length; x += 2) {
            if (grid[y][x] === 0) {
                return { x, y };
            }
        }
    }
    return { x: 1, y: 1 }; // Fallback
}


// --- Controls ---
function setupControls() {
    window.addEventListener('keydown', (event) => {
        keysPressed[event.key.toLowerCase()] = true;
        keysPressed[event.code] = true; // Also store by code for Arrow keys etc.
    });
    window.addEventListener('keyup', (event) => {
        keysPressed[event.key.toLowerCase()] = false;
        keysPressed[event.code] = false;
    });
}

// --- Handle Movement & Collision ---
function handleMovement(deltaTime) {
    const moveSpeed = PLAYER_SPEED * deltaTime;
    const turnSpeed = PLAYER_TURN_SPEED * deltaTime;
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction); // Get current look direction

    let moved = false;
    let rotated = false;
    let potentialPosition = camera.position.clone();
    const currentPosition = camera.position.clone(); // Store original position

    // Rotation
    if (keysPressed['arrowleft']) {
        camera.rotation.y += turnSpeed;
        rotated = true;
    }
    if (keysPressed['arrowright']) {
        camera.rotation.y -= turnSpeed;
        rotated = true;
    }

     // Forward/Backward Movement
    if (keysPressed['arrowup']) {
        // Calculate potential forward position
        potentialPosition.addScaledVector(direction, moveSpeed);
        moved = true;
    }
    if (keysPressed['arrowdown']) {
        // Calculate potential backward position
        potentialPosition.addScaledVector(direction, -moveSpeed);
        moved = true;
    }

    // Strafe (Optional - using A/D keys)
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, direction).normalize(); // Get right vector

    if (keysPressed['a']) {
         potentialPosition.addScaledVector(right, -moveSpeed); // Move left
         moved = true;
     }
     if (keysPressed['d']) {
         potentialPosition.addScaledVector(right, moveSpeed); // Move right
         moved = true;
     }


    // Collision Detection
    if (moved) {
        if (!checkCollision(potentialPosition)) {
            camera.position.copy(potentialPosition); // Move if no collision
        } else {
            // If collision, try moving only along X or Z axis (sliding)
            let potentialX = potentialPosition.clone();
            potentialX.z = currentPosition.z; // Try only X movement
            if (!checkCollision(potentialX)) {
                camera.position.x = potentialX.x;
            } else {
                let potentialZ = potentialPosition.clone();
                potentialZ.x = currentPosition.x; // Try only Z movement
                if (!checkCollision(potentialZ)) {
                    camera.position.z = potentialZ.z;
                }
                // If both fail, don't move
            }
        }
    }
}


function checkCollision(potentialPos) {
    const playerBox = new THREE.Box3(
        new THREE.Vector3(potentialPos.x - PLAYER_RADIUS, potentialPos.y - PLAYER_HEIGHT / 2, potentialPos.z - PLAYER_RADIUS),
        new THREE.Vector3(potentialPos.x + PLAYER_RADIUS, potentialPos.y + PLAYER_HEIGHT / 2, potentialPos.z + PLAYER_RADIUS)
    );

    for (const wallBox of walls) {
        if (playerBox.intersectsBox(wallBox)) {
            return true; // Collision detected
        }
    }

    // Check collision with floor boundaries (optional, usually handled by outer walls)
    // const floorBox = new THREE.Box3().setFromObject(floor);
    // if (!playerBox.intersectsBox(floorBox)) { // A bit simplistic for a plane
    //     // More accurately check if x/z are outside floor bounds
    // }

    return false; // No collision
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const deltaTime = clock.getDelta();

    handleMovement(deltaTime);

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
