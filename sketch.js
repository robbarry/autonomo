// Neuroevolution Simulator - Main p5.js sketch
// Features: Real-time mating, ray-casting sensors, adaptive mutation

let creatures = [];
let food = [];
let generation = 1;
let paused = false;
let speed = 1;
let speedOptions = [1, 2, 5, 10];
let speedIndex = 0;

// Global settings
window.populationSize = 30;
window.canvasWidth = 600;
window.canvasHeight = 600;

// Stats tracking
let totalBirths = 0;
let totalDeaths = 0;
let allTimeBestFitness = 0;

// Generation tracking (soft generations based on time)
let generationTime = 0;
let generationLength = 2000; // frames per "generation" for stats

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
  generationTime = 0;
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
    generation = 1;
    allTimeBestFitness = 0;
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
  generationTime++;

  // Soft generation tracking
  if (generationTime >= generationLength) {
    generation++;
    generationTime = 0;
  }

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

  // Spawn food periodically
  if (frameCount % 15 === 0 && food.length < 60) {
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

  // Draw soft generation progress bar
  const progress = generationTime / generationLength;
  noStroke();
  fill(78, 204, 163, 80);
  rect(0, height - 3, width * progress, 3);
}

function updateStats() {
  const aliveCount = creatures.filter(c => c.alive).length;

  // Calculate current best and average fitness
  let currentBest = 0;
  let totalFitness = 0;

  for (let c of creatures) {
    const fit = pow(c.foodEaten, 2) * 50 + c.offspring * 200 + c.age * 0.05;
    totalFitness += fit;
    if (fit > currentBest) currentBest = fit;
    if (fit > allTimeBestFitness) allTimeBestFitness = fit;
  }

  const avgFitness = creatures.length > 0 ? totalFitness / creatures.length : 0;

  document.getElementById('generation').textContent = generation;
  document.getElementById('alive').textContent = aliveCount;
  document.getElementById('best-fitness').textContent = Math.round(allTimeBestFitness);
  document.getElementById('avg-fitness').textContent = Math.round(avgFitness);

  // Update births/deaths if elements exist
  const birthsEl = document.getElementById('births');
  const deathsEl = document.getElementById('deaths');
  if (birthsEl) birthsEl.textContent = totalBirths;
  if (deathsEl) deathsEl.textContent = totalDeaths;
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
