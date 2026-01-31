// Neuroevolution Simulator - Main p5.js sketch
// Features: Real-time mating, ray-casting sensors, adaptive mutation

let creatures = [];
let food = [];
let paused = false;
let speed = 1;
let speedOptions = [1, 2, 5, 10];
let speedIndex = 0;

// Global settings
window.populationSize = 30;
window.canvasWidth = 600;
window.canvasHeight = 600;
window.foodSpawnRate = 1; // multiplier for food spawning

// Stats tracking
let totalBirths = 0;
let totalDeaths = 0;


function setup() {
  // Canvas fills the full window
  window.canvasWidth = windowWidth;
  window.canvasHeight = windowHeight;

  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent('canvas-container');

  initPopulation();
  console.log('Setup: created', creatures.length, 'creatures');

  for (let i = 0; i < 40; i++) {
    spawnFood();
  }

  setupUI();
}

function initPopulation() {
  creatures = [];
  for (let i = 0; i < window.populationSize; i++) {
    creatures.push(new Creature(
      random(50, window.canvasWidth - 50),
      random(50, window.canvasHeight - 50)
    ));
  }
  totalBirths = 0;
  totalDeaths = 0;
}

function setupUI() {
  // Collapsible controls - toggle the whole panel
  const controls = document.getElementById('controls');
  const controlsHeader = document.getElementById('controls-header');

  if (controlsHeader && controls) {
    controlsHeader.addEventListener('click', () => {
      controls.classList.toggle('collapsed');
    });
  }

  // Pause button
  const pauseBtn = document.getElementById('pause-btn');
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.classList.toggle('paused', paused);
  });

  // Speed button
  const speedBtn = document.getElementById('speed-btn');
  speedBtn.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speedOptions.length;
    speed = speedOptions[speedIndex];
    speedBtn.textContent = speed + 'x';
  });

  // Reset button
  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', () => {
    initPopulation();
    food = [];
    for (let i = 0; i < 40; i++) {
      spawnFood();
    }
    updateStats();
  });

  // Population size slider
  const popSlider = document.getElementById('pop-size');
  const popVal = document.getElementById('pop-val');
  if (popSlider) {
    popSlider.addEventListener('input', () => {
      window.populationSize = parseInt(popSlider.value);
      popVal.textContent = window.populationSize;
    });
  }

  // Food spawn rate slider
  const foodSlider = document.getElementById('food-rate');
  const foodVal = document.getElementById('food-val');
  if (foodSlider) {
    foodSlider.addEventListener('input', () => {
      window.foodSpawnRate = parseInt(foodSlider.value);
      foodVal.textContent = window.foodSpawnRate + 'x';
    });
  }
}

function draw() {
  if (paused) return;

  for (let s = 0; s < speed; s++) {
    simulationStep();
  }

  render();
  updateStats();
}

function simulationStep() {
  // Think, update, eat for all creatures
  for (let c of creatures) {
    c.think(food, creatures, window.canvasWidth, window.canvasHeight);
    c.update(window.canvasWidth, window.canvasHeight);
    c.eat(food);
  }

  // Real-time mating - creatures that touch and both can mate will reproduce
  const newborns = [];
  const matedThisFrame = new Set();

  for (let c of creatures) {
    if (!c.alive || !c.canMate() || matedThisFrame.has(c)) continue;

    const child = c.tryMate(creatures);
    if (child) {
      newborns.push(child);
      matedThisFrame.add(c);
      totalBirths++;
    }
  }

  // Add newborns to population
  creatures.push(...newborns);

  // Remove dead creatures
  const beforeCount = creatures.length;
  creatures = creatures.filter(c => c.alive);
  totalDeaths += beforeCount - creatures.length;

  // Population control: if too many, let natural selection work
  // If too few, spawn some random creatures to maintain diversity
  if (creatures.length < 5) {
    for (let i = 0; i < 5; i++) {
      creatures.push(new Creature(
        random(50, window.canvasWidth - 50),
        random(50, window.canvasHeight - 50)
      ));
    }
  }

  // Spawn food periodically (rate affected by slider)
  const spawnInterval = max(1, floor(15 / window.foodSpawnRate));
  const maxFood = 40 + window.foodSpawnRate * 20;
  if (frameCount % spawnInterval === 0 && food.length < maxFood) {
    spawnFood();
  }
}

function render() {
  background(15, 15, 26);

  // Draw food
  for (let f of food) {
    f.display();
  }

  // Draw creatures
  for (let c of creatures) {
    c.display();
  }
}

function updateStats() {
  const aliveCreatures = creatures.filter(c => c.alive);
  const aliveCount = aliveCreatures.length;

  // Find creatures with most food eaten and most offspring
  let mostFood = 0;
  let mostOffspring = 0;

  for (let c of aliveCreatures) {
    if (c.foodEaten > mostFood) mostFood = c.foodEaten;
    if (c.offspring > mostOffspring) mostOffspring = c.offspring;
  }

  document.getElementById('alive').textContent = aliveCount;
  document.getElementById('births').textContent = totalBirths;
  document.getElementById('deaths').textContent = totalDeaths;
  document.getElementById('food-count').textContent = food.length;
  document.getElementById('most-food').textContent = mostFood;
  document.getElementById('most-offspring').textContent = mostOffspring;
}

function spawnFood() {
  const margin = 30;
  food.push(new Food(
    random(margin, window.canvasWidth - margin),
    random(margin, window.canvasHeight - margin)
  ));
}

function windowResized() {
  window.canvasWidth = windowWidth;
  window.canvasHeight = windowHeight;
  resizeCanvas(windowWidth, windowHeight);
}
