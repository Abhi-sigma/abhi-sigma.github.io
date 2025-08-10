
// Skip Counting Platformer with Decoys, 3D Targets, UI, Speedometer, No Level Reset + Lanes
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.157.0/build/three.module.js';
import { OrbitControls } from 'https://esm.sh/three@0.157.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://esm.sh/three@0.157.0/examples/jsm/loaders/GLTFLoader.js';
import { FontLoader } from 'https://esm.sh/three@0.157.0/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'https://esm.sh/three@0.157.0/examples/jsm/geometries/TextGeometry.js';
import * as CANNON from 'https://cdn.jsdelivr.net/npm/cannon-es@0.20.0/dist/cannon-es.js';
import { initGamepadControls } from '../joystick.js';
import { setupMobileMode } from './mobileMode.js';
import  {UI} from "./updateui.js";


const mobileMode = setupMobileMode();
let scene, camera, renderer, player, controls, groundMat, roadMat, roadTexture, boxMesh, boxBody;
let cameraPreviewActive = false;
let cameraPreviewTimeout = null;
let cameraPreviewCar = null;
let cameraPreviewOriginalPos = null;
let cameraPreviewOriginalTarget = null;
let carModel, wheelFront, wheelBack, buildingModel;
let skybox;
let clock = new THREE.Clock();
let targetCars = [], decoys = [], font;
let speed = 50, skipCount = 6, score = 0, wrongHits = 0;
const maxWrongHits = 0;
let segmentLength = 1000;
let visibleRoadAhead = 1000;
let lastRoadZ = 0;
let roadSegments = [];
const pressedKeys = {};
const platformLength = 20;
let capturedNumbers = [];
let penaltyTimer = 0;
let highestCaptured = 0;
let expectedNumber = skipCount;
let decoyPool = new Set();  // Track shown decoys to avoid repeats
let pendingExpected = false; // Flag to prevent multiple spawns while loading
let lastExpectedSpawnTime = 0;
const expectedSpawnCooldown = 2; // seconds
const testBoxes = [];
const lastCarZByLane = {
  '-50': -Infinity,
  '0': -Infinity,
  '50': -Infinity
};
const MIN_CAR_SPACING = 400; // Adjust as needed
const ui =  UI();
let gameOver = false;




let world, playerBody;

const DEBUG_PHYSICS = true; // Set to true to visualize physics bodies

// Call after a user gesture — like clicking a start button
document.getElementById('startgame').addEventListener('click', (e) => {
  console.log(e.target)
  e.target.style.display="none";
  mobileMode.activateMobileMode();
  document.getElementById("gamepad").style.visibility="visible";
  document.getElementById("ui").style.display="flex";

  init()
  
     animate()
  
 
});

// init();
// animate();

document.addEventListener('keydown', e => {
  logKeyEvent(e, 'keydown');
});

document.addEventListener('keyup', e => {
  logKeyEvent(e, 'keyup');
});

function logKeyEvent(e, type) {
  const info = `🔑 ${type} — ${e.key}${e.isTrusted ? '' : ' (simulated)'}`;
  const debugBox = document.getElementById('pointer-debug');
  if (debugBox) {
    debugBox.innerText = info;
  }
  console.log(info);
}


function logPointerEvent(e) {
  let x = 0;
  let y = 0;

  if (e.touches && e.touches.length > 0) {
    x = e.touches[0].clientX;
    y = e.touches[0].clientY;
  } else if (e.changedTouches && e.changedTouches.length > 0) {
    x = e.changedTouches[0].clientX;
    y = e.changedTouches[0].clientY;
  } else if (e.clientX !== undefined && e.clientY !== undefined) {
    x = e.clientX;
    y = e.clientY;
  }

  const info = `📌 ${e.type} on ${e.target.id || e.target.tagName}
x: ${Math.round(x)}, y: ${Math.round(y)}
touches: ${e.touches?.length || 0}`;

  const debugBox = document.getElementById('pointer-debug');
  if (debugBox) {
    debugBox.innerText = info;
  }
  console.log(info);
}

// Common pointer/touch events to watch
['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'touchend', 'mousedown', 'mousemove', 'mouseup'].forEach(eventName => {
  window.addEventListener(eventName, logPointerEvent, { passive: false });
});


function setUp() {
  
  // Scene setup
  const loaderGTLF = new GLTFLoader();
  scene = new THREE.Scene();
  scene.background = new THREE.Color('#87ceeb');

  // Physics world setup FIRST
  world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
  // Ground physics
  const groundBody = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
  groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(groundBody);

  // Camera setup
  camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(20, 50, -50);
  console.log(camera.position)

  // Renderer setup
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById("game");
  game.appendChild(renderer.domElement);

  // Controls setup
  controls = new OrbitControls(camera, renderer.domElement);
  // controls.enablePan = true;
  // controls.enableZoom = true;
  // controls.enableRotate = true;

  // Lighting setup
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(10, 20, 10);
  scene.add(light);
  const ambient = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambient);

}

function uiSetup() {
  // ui grid
  const grid = document.createElement('div');
  grid.id = 'capture-grid';
  grid.style.position = 'absolute';
  grid.style.top = '50px';
  grid.style.right = '10px';
  grid.style.width = '180px';
  grid.style.maxHeight = '400px';
  grid.style.overflowY = 'auto';
  grid.style.background = 'rgba(0,0,0,0.6)';
  grid.style.padding = '10px';
  grid.style.borderRadius = '8px';
  grid.style.color = '#fff';
  grid.style.fontFamily = 'sans-serif';
  grid.style.fontSize = '16px';
  grid.innerHTML = `<b>Captured Numbers:</b><br><div id="captured-list" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 5px;"></div>`;
  document.body.appendChild(grid);

  // UI for speed and catches
  const ui = document.createElement('div');
  ui.id = 'ui';
  ui.style.position = 'absolute';
  ui.style.top = '10px';
  ui.style.left = '10px';
  ui.style.color = '#fff';
  ui.style.fontSize = '20px';
  ui.innerHTML = `Speed: ${Math.round(speed * 20)} km/h `;
  document.body.appendChild(ui);

}

function dropTestBox() {
  // THREE.js visual box
  const boxSize = 20;
  const boxMesh = new THREE.Mesh(
    new THREE.BoxGeometry(boxSize, boxSize, boxSize),
    new THREE.MeshNormalMaterial({ wireframe: false })
  );
  scene.add(boxMesh);

  // Cannon-es physics body
  const boxShape = new CANNON.Box(new CANNON.Vec3(boxSize / 2, boxSize / 2, boxSize / 2));
  const boxBody = new CANNON.Body({
    mass: 1,
    position: new CANNON.Vec3(50, 5, 50), // Start high to fall
    shape: boxShape
  });
  world.addBody(boxBody);

  // Optional debug wireframe
  if (DEBUG_PHYSICS) {
    const debugMesh = new THREE.Mesh(
      new THREE.BoxGeometry(boxSize, boxSize, boxSize),
      new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true })
    );
    scene.add(debugMesh);
    boxMesh.userData.debugMesh = debugMesh;
  }

  // Animation sync — store in array if you want more later
  testBoxes.push({ mesh: boxMesh, body: boxBody });
}


function debugPhysics() {
  if (DEBUG_PHYSICS) {
    // Debug mesh for ground physics body
    const groundDebug = new THREE.Mesh(
      new THREE.PlaneGeometry(1000, 1000),
      new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: false })
    );
    groundDebug.rotation.x = -Math.PI / 2;
    groundDebug.position.y = 1.2;
    // scene.add(groundDebug);
    // dropTestBox();
  }
}

function skyBoxSetup() {
  const loaderSkyBox = new THREE.CubeTextureLoader();
  const skybox = loaderSkyBox.load([
    './assets/skybox/cartoontown/px.png', // right
    './assets/skybox/cartoontown/nx.png', // left
    './assets/skybox/cartoontown/py.png', // top
    './assets/skybox/cartoontown/ny.png', // bottom
    './assets/skybox/cartoontown/pz.png', // front
    './assets/skybox/cartoontown/nz.png'  // back
  ])
  scene.background = skybox;

}

function createPlayerBodyWithOffset(playerMesh, radius = 3, mass = 100) {
  const body = new CANNON.Body({ mass });
  const shape = new CANNON.Sphere(radius);

  // Offset shape downward so the body sits at the bottom of the visual mesh
  const shapeOffset = new CANNON.Vec3(0, -radius, 0);
  body.addShape(shape, shapeOffset);

  // Set initial position based on mesh
  body.position.copy(playerMesh.position);
  body.linearDamping = 0.9;

  // Attach to mesh for easy syncing
  if (!playerMesh.userData) playerMesh.userData = {};
  playerMesh.userData.body = body;

  // Optional debug mesh
  if (DEBUG_PHYSICS) {
    const debugMesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true })
    );
    debugMesh.name = 'playerDebug';
    scene.add(debugMesh);
    playerMesh.userData.debugMesh = debugMesh;
  }

  return body;
}

function playerSetup() {
  const loaderGTLF = new GLTFLoader();
  loaderGTLF.load('./assets/cars/policeCar_m_d.glb', gltf => {
    carModel = gltf.scene;
    carModel.scale.set(10, 10, 10);
    // carModel.position.set(0, 0, 100);
    scene.add(carModel);
    player = carModel;
    

    player.position.set(0, 4, 0); // Starting position
    playerBody = createPlayerBodyWithOffset(player); // Radius defaults to 12
    world.addBody(playerBody);
    carModel.traverse(obj => {
      const name = obj.name.toLowerCase();
      if (name.includes('frontwheel')) {
        wheelFront = obj;
      }
      else if (name.includes('backwheel')) {
        wheelBack = obj;
      }
    });

    console.log('Wheels assigned:', {
      front: wheelFront?.name,
      back: wheelBack?.name
    });

  });


}


function init() {
  setUp();
  skyBoxSetup();
  debugPhysics();
  playerSetup();
  initGamepadControls(pressedKeys)
  // spawn initial road segments
  for (let i = 0; i < visibleRoadAhead / segmentLength; i++) {
    spawnRoadSegment(i * segmentLength);
  }
  // Add lane markers
  //add multiple lane lines


  new FontLoader().load('https://threejs.org/examples/fonts/helvetiker_regular.typeface.json', f => {
    font = f;
    spawnCars();
  });

  window.addEventListener('resize', onWindowResize);
  window.addEventListener('keydown', e => pressedKeys[e.key] = true);
  window.addEventListener('keyup', e => pressedKeys[e.key] = false);
  document.addEventListener('keydown', e => pressedKeys[e.key] = true);

  uiSetup();



}

// Camera preview in front of player and car before collision
function previewCameraOnPlayerAndCar(car) {
  if (cameraPreviewActive) return;
  cameraPreviewActive = true;
  cameraPreviewCar = car;
  cameraPreviewOriginalPos = camera.position.clone();
  cameraPreviewOriginalTarget = controls.target.clone();
  // Initial placement (will be updated in animate)
  if (cameraPreviewTimeout) clearTimeout(cameraPreviewTimeout);
  // Set camera position in front of player
  cameraPreviewTimeout = setTimeout(() => {
    camera.position.copy(cameraPreviewOriginalPos);
    controls.target.copy(player.position);
    controls.update();
    cameraPreviewActive = false;
    cameraPreviewCar = null;
    cameraPreviewOriginalPos = null;
    cameraPreviewOriginalTarget = null;
  }, 3000);
}
// --- Preview camera update logic ---
function updatePreviewCamera() {
  if (!cameraPreviewCar) return;
  const playerPos = player.position.clone();
  const carPos = cameraPreviewCar.position.clone();
  const mid = playerPos.clone().lerp(carPos, 0.5);
  const dir = carPos.clone().sub(playerPos).normalize();
  const camOffset = dir.clone().multiplyScalar(-15).add(new THREE.Vector3(50, 100, 50));
  camera.position.copy(mid.clone().add(camOffset));
  controls.target.copy(mid);
  controls.update();
}

function spawnRoadSegment(zPos) {

  // Terrain
  const terrainTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/terrain/grasslight-big.jpg');
  terrainTexture.wrapS = THREE.RepeatWrapping;
  terrainTexture.wrapT = THREE.RepeatWrapping;
  terrainTexture.repeat.set(100, 100);
  const terrainMaterial = new THREE.MeshLambertMaterial({ map: terrainTexture });
  const terrainGeometry = new THREE.PlaneGeometry(1000, segmentLength, 100, 100);
  const terrain = new THREE.Mesh(terrainGeometry, terrainMaterial);
  terrain.rotation.x = -Math.PI / 2;
  terrain.position.set(0, 0, zPos);
  scene.add(terrain);

  // Road
  const textureLoader = new THREE.TextureLoader();
  roadTexture = textureLoader.load('https://cdn.polyhaven.com/asset_img/primary/asphalt_02.png');
  roadTexture.wrapS = THREE.RepeatWrapping;
  roadTexture.wrapT = THREE.RepeatWrapping;
  roadTexture.repeat.set(1, 1000);
  roadMat = new THREE.MeshLambertMaterial({ map: roadTexture });
  const roadGeo = new THREE.PlaneGeometry(100, segmentLength);
  const road = new THREE.Mesh(roadGeo, roadMat);
  // No rotation needed, inherits terrain's orientation
  road.position.set(0, 0, 1.1); // 1 unit above terrain surface, centered
  terrain.add(road);
  roadSegments.push(road);
  lastRoadZ = zPos;

  // Add lane markers
  for (let i = 1; i <= 2; i += 1) {
    let laneWidth = 25;
    const laneLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const laneGeo = new THREE.PlaneGeometry(0.1, 2000);
    const laneLeft = new THREE.Mesh(laneGeo, laneLineMat);
    const laneRight = new THREE.Mesh(laneGeo, laneLineMat);
    // laneLeft.rotation.x = -Math.PI / 2;
    // laneRight.rotation.x = -Math.PI / 2;
    laneLeft.position.set(-laneWidth * i, 0, 1.15);
    laneRight.position.set(laneWidth * i, 0, 1.15);

    road.add(laneLeft, laneRight);
  }
}


function updateCapturedGrid() {
  const list = document.getElementById('captured-list');
  list.innerHTML = ''; // clear existing
  capturedNumbers.forEach(num => {
    const cell = document.createElement('div');
    cell.innerText = num;
    cell.style.background = '#2a9d8f';
    cell.style.padding = '5px';
    cell.style.borderRadius = '4px';
    cell.style.textAlign = 'center';
    list.appendChild(cell);
  });
}


function spawnCars() {
  const loader = new GLTFLoader();

  
  // spawn the correct car
  spawnCar(loader, expectedNumber, true);

  // spawn 5 smart decoys near that number
  for (let i = 0; i <= 2; i++) {
    const decoy = generateSimpleDecoys(expectedNumber, skipCount);
    if (decoy !== null) {
      spawnCar(loader, decoy[i], false);
    }
  }
}

function spawnExpectedCarIfMissing(loader, expectedNumber, skipCount) {
  
  const now = clock.getElapsedTime();

  if (pendingExpected) return; // Don't spawn if already loading

  const existing = targetCars.find(c =>
    c.userData.isCorrect &&
    c.userData.number === expectedNumber &&
    !c.userData.hit
  );

  const shouldRespawn = !existing || existing.position.z < player.position.z - 700;
  //  console.log('Should respawn expected car:', shouldRespawn, 'at number:', expectedNumber);
  if (shouldRespawn && now - lastExpectedSpawnTime > expectedSpawnCooldown) {
    console.log("spawning because missing")
    pendingExpected = true;
    spawnCar(loader, expectedNumber, true, () => {
      pendingExpected = false;
      spawnDecoysNear(expectedNumber, skipCount);
    });
    lastExpectedSpawnTime = now;
  }
}



function generateSimpleDecoys(currentNumber, skipCount) {
  const decoys = [];
  for (let i = 1; i <= 4; i++) {
    const candidate = currentNumber + skipCount + i;
    if (candidate % skipCount !== 0) {
      decoys.push(candidate);
    }
  }
  return decoys;
}
function spawnDecoysNear(number, skipCount) {
  const decoys = generateSimpleDecoys(number, skipCount);
  decoys.forEach(num => {
    spawnCar(new GLTFLoader(), num, false); // false = decoy
  });
}



function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
 
  requestAnimationFrame(animate);
  
  
  ui.updateScore(score);
  ui.updateSpeed(speed);
  ui.updateLifeDisplay(maxWrongHits,wrongHits);
  const delta = clock.getDelta();
  if (penaltyTimer > 0) penaltyTimer -= delta;

  // Step physics world
  if (world) world.step(1 / 60, delta);

  if (player && playerBody) {
    // Sync player mesh to physics body
    // console.log("playerbody in animate",player.userData.body.position)
      player.position.copy(player.userData.body.position);
    
 
   
    if (DEBUG_PHYSICS && player.userData.debugMesh) {
      console.log()
      player.userData.debugMesh.position.copy(playerBody.position);
    }

    let wheelSpin = speed * delta * 2;

    if (player.position.z + visibleRoadAhead > lastRoadZ) {
      console.log('Player position:', player.position.z, 'Last road Z:', lastRoadZ);
      console.log('Spawning new road segment at', lastRoadZ + segmentLength);
      spawnRoadSegment(lastRoadZ + segmentLength);
    }

    // Optional: clean old segments behind
    roadSegments = roadSegments.filter(seg => {
      if (player.position.z - seg.position.z > visibleRoadAhead) {
        scene.remove(seg);
        return false;
      }
      return true;
    });

    // move road texture based for realistic effect
    roadTexture.offset.y = player.position.z * 0.005;

    if (wheelFront) wheelFront.rotation.x -= wheelSpin;
    if (wheelBack) wheelBack.rotation.x -= wheelSpin;

    const adjustedSpeed = penaltyTimer > 0 ? speed * 0.5 : speed;
    // console.log("adjusted_speed",adjustedSpeed)
    // Apply movement to physics body
    if (pressedKeys['ArrowUp']){
      // console.log("increasing speed")
        player.userData.body.position.z += adjustedSpeed * delta;
        player.position.copy(player.userData.body.position);
    }
    
    if (pressedKeys['ArrowDown']) player.userData.body.position.z -= adjustedSpeed * delta;
    if (pressedKeys['ArrowLeft']) player.userData.body.position.x += adjustedSpeed * delta;
    if (pressedKeys['ArrowRight']) player.userData.body.position.x -= adjustedSpeed * delta;

    // Only update camera if not in preview mode
    if (!cameraPreviewActive) {
      camera.position.z = player.position.z - 150;
      camera.position.x = player.position.x - 5;
      camera.position.y = player.position.y + 30;
      controls.target.set(player.position.x, player.position.y, player.position.z);
      controls.update();
    } else if (cameraPreviewCar) {
      updatePreviewCamera();
    }

  }
  checkCarCollisions();
  //move the spawned cars forward
  targetCars.forEach(car => {
    // Sync mesh to physics body
    // car.position.z += car.userData.speed * delta;
    // console.log(car.userData.body.position, "car position");
    //  console.log("car",car.userData.body.position)
    car.position.copy(car.userData.body.position);
    if (DEBUG_PHYSICS && car.userData.debugMesh) {
      car.position.copy(car.userData.debugMesh.position);
    }
    // move the cars for the first time
    if (car.userData.speed === 0) {
        car.userData.speed = 5;
      
    }
    if (!car.userData.hit && car.userData.body) {
      // Move car forward using physics velocity
      // car.userData.body.velocity.z = car.userData.speed;
      // console.log("car_speed",car.userData.speed)
      car.userData.body.position.z += car.userData.speed * delta;
      // console.log("carPosition",car.position)
      car.position.copy(car.userData.body.position);
      car.userData.debugMesh.position.copy(car.position);
    }

      // Lane switching logic
      car.userData.switchTimer -= delta;
      if (car.userData.switchTimer <= 0) {
        const laneOptions = [-4, 0, 4];
        const currentLane = car.userData.laneIndex;
        let newLane;
        do {
          newLane = Math.floor(Math.random() * 3);
        } while (newLane === currentLane);
        // Set velocity in x direction for lane switch
        car.userData.body.velocity.x = (laneOptions[newLane] - car.userData.body.position.x) / 0.5; // reach lane in ~0.5s
        car.userData.laneIndex = newLane;
        car.userData.switchTimer = Math.random() * 3 + 2;
      } else {
        // Dampen x velocity after lane switch
        car.userData.body.velocity.x *= 0.9;
      }

    

    // Add this inside the loop to update label position
    const label = car.userData.labelElement;
    if (!label || car.userData.hit) return;
    if (label && !car.userData.hit) {
      const pos = car.position.clone();
      pos.y += 3;

      const projected = pos.project(camera);
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

      label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      label.style.display = (projected.z > 1 || projected.z < -1) ? 'none' : 'block';
      // console.log(`Label for ${car.userData.number} at z=${projected.z}`);

    }
    // console.log(car.userData,"update loop");
  });
  //filter out cars that are too far behind
  targetCars = targetCars.filter(c => {
    if (c.userData.hit) return true;

    const tooFarBehind = c.position.z < player.position.z - 500;
    if (tooFarBehind) {
      scene.remove(c);
      if (c.userData.labelElement) c.userData.labelElement.remove();
      return false; // remove from array
    }
    return true;
  });


  const expectedNumber = capturedNumbers.length > 0
    ? capturedNumbers[capturedNumbers.length - 1] + skipCount
    : skipCount;
    

  spawnExpectedCarIfMissing(new GLTFLoader(), expectedNumber, skipCount);



  renderer.render(scene, camera);
}
function spawnCar(loader, number, isCorrect) {
  console.log("normal car spawn");

  let onAdded = null;
  if (typeof isCorrect === 'function') {
    onAdded = isCorrect;
    isCorrect = undefined;
  } else if (typeof arguments[3] === 'function') {
    onAdded = arguments[3];
  }
  if (!player) { if (onAdded) onAdded(); return; }

  const candidateLanes = [-50, 0, 50];
  const spawnZ = player.position.z + 200 + Math.random() * 500;

  // Filter lanes where spacing is safe
  const availableLanes = candidateLanes.filter(x => {
    return Math.abs(spawnZ - lastCarZByLane[x]) >= MIN_CAR_SPACING;
  });

  if (availableLanes.length === 0) {
    console.log("No safe lanes to spawn car, skipping.");
    if (onAdded) onAdded();
    return;
  }

  const laneX = availableLanes[Math.floor(Math.random() * availableLanes.length)];
  lastCarZByLane[laneX] = spawnZ; // update last spawnZ for that lane

  loader.load('./assets/cars/carSimple.glb', gltf => {
    const car = gltf.scene.clone();
    car.scale.set(10, 10, 10);

    const carBody = new CANNON.Body({ mass: 50 });
    const sphereRadius = 1;
    const carSphere = new CANNON.Sphere(sphereRadius);
    carBody.addShape(carSphere);

    car.position.set(laneX, 1.4, spawnZ);
    carBody.position.copy(car.position);
    carBody.linearDamping = 0.9;
    world.addBody(carBody);

    if (DEBUG_PHYSICS) {
      const carDebug = new THREE.Mesh(
        new THREE.SphereGeometry(sphereRadius, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true })
      );
      carDebug.name = 'carDebug';
      scene.add(carDebug);
      car.userData.debugMesh = carDebug;
    }

    const label = document.createElement('div');
    label.className = 'car-label';
    label.innerText = number;
    document.getElementById('labels-container').appendChild(label);

    Object.assign(car.userData, {
      number,
      isCorrect,
      hit: false,
      speed: 0,
      laneIndex: [0, 1, 2].indexOf(Math.floor((laneX + 4) / 4)),
      switchTimer: Math.random() * 3 + 2,
      labelElement: label,
      body: carBody
    });

    window.speed = car.userData.speed;
    scene.add(car);
    targetCars.push(car);
    if (onAdded) onAdded();
  });
}


function checkCarCollisions() {

  targetCars.forEach(car => {
    const p = playerBody.position;
    const c = car.userData.body.position;

    const r1 = playerBody.shapes[0].radius;
    const r2 = car.userData.body.shapes[0].radius;
   

    const distSquared = p.distanceSquared(c);
    // console.log("distancesquared",distSquared);
    // console.log("r1+r2",r1+r2)
    const radiusSum = r1 + r2;
    const colliding = distSquared <= 200;
    if (!car.userData.hit && playerBody && car.userData.body) {
      // console.log("distsq",distSquared,`on car${car.userData.number}`)
        if (!car.userData.hit && distSquared <= 1000) {
          previewCameraOnPlayerAndCar(car);
        }
   
      if (colliding) {
       
      
        if (!car.userData.hit && colliding) {
          console.log('Collision detected with car:', car.userData.number, "distSquared",distSquared, )
          car.userData.hit = true;
          car.userData.hitZ = playerBody.position.z;
          console.log(car, 'hit');
          // --- Jerk and slide off effect ---
          // Randomly choose left or right
          const jerkDir = Math.random() < 0.5 ? -1 : 1;
          // Player jerk
          if (playerBody) {
            playerBody.velocity.set(jerkDir * 10, 30, speed * 0.5);
          }
          // Car slide away
          car.userData.slidingAway = true;
          car.userData.slideStartTime = performance.now();
          if (car.userData.body) {
            car.userData.body.applyImpulse(new CANNON.Vec3(jerkDir * 10, 30, speed * 0.5));

          }
          // Remove label immediately
          if (car.userData.labelElement) {
            car.userData.labelElement.remove();
          }
          // --- End jerk/slide ---
          // Focus camera on hit car for a moment
          // focusOnHitCar(car);
          if (car.userData.isCorrect && car.userData.number === expectedNumber) {
            highestCaptured = expectedNumber;
            expectedNumber += skipCount;
            capturedNumbers.push(car.userData.number);
            console.log('Captured number:', car.userData.number);
            console.log(capturedNumbers, '"all captured numbers"');
            speed += 10;
            score += 10;
            ui.updateSpeed(speed);
            ui.updateScore(score);
            updateCapturedGrid();
            spawnCars()
          } 
          else {
            wrongHits++;
            penaltyTimer = 2;
            if(wrongHits>=maxWrongHits){
               gameOver=true;
              alert("gameover",game)
             
            }
            ui.handleCollisionUI(car.userData.isCorrect,maxWrongHits,wrongHits)
            
          }
        
        }
      }
    }

    


    // Handle sliding away animation for hit cars
    if (car.userData.hit && car.userData.slidingAway) {
      // Fade out and remove after sliding far enough
      const slideDuration = 1200; // ms
      const slideStart = car.userData.slideStartTime || performance.now();
      const elapsed = performance.now() - slideStart;
      // Fade out
      if (car.material) {
        car.traverse(obj => {
          if (obj.material && obj.material.opacity !== undefined) {
            obj.material.transparent = true;
            obj.material.opacity = Math.max(0, 1 - elapsed / slideDuration);
          }
        });
      }
      // Remove after sliding off road or after duration
      if (Math.abs(car.position.x) > 30 || elapsed > slideDuration) {
        scene.remove(car);
        if (car.userData.debugMesh) scene.remove(car.userData.debugMesh);
        car.userData.slidingAway = false;
      }
    }

    // ✅ Add this inside the loop to update label position
    const label = car.userData.labelElement;
    if (!label || car.userData.hit) return;
    if (label && !car.userData.hit) {
      const pos = car.position.clone();
      pos.y += 3;

      const projected = pos.project(camera);
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

      label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
      label.style.display = (projected.z > 1 || projected.z < -1) ? 'none' : 'block';
      // console.log(`Label for ${car.userData.number} at z=${projected.z}`);

    }
    // console.log(car.userData,"update loop");
  });
};

