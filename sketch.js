// Neuroevolution Simulator with morphological diversity and predation

let creatures = [];
let food = [];
let paused = false;
let speed = 1;
let speedOptions = [1, 2, 5, 10];
let speedIndex = 0;

window.populationSize = 25;
window.canvasWidth = 600;
window.canvasHeight = 600;
window.foodSpawnRate = 1;

let totalBirths = 0;
let totalDeaths = 0;
let totalPredations = 0;

function setup() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  window.canvasWidth = w;
  window.canvasHeight = h;

  const canvas = createCanvas(w, h);
  canvas.parent('canvas-container');

  initPopulation();

  for (let i = 0; i < 50; i++) {
    spawnFood();
  }

  setupUI();
}

function initPopulation() {
  creatures = [];
  for (let i = 0; i < window.populationSize; i++) {
    creatures.push(new Creature(
      random(100, window.canvasWidth - 100),
      random(100, window.canvasHeight - 100)
    ));
  }
  totalBirths = 0;
  totalDeaths = 0;
  totalPredations = 0;
}

function setupUI() {
  const controls = document.getElementById('controls');
  const controlsHeader = document.getElementById('controls-header');

  if (controlsHeader && controls) {
    controlsHeader.addEventListener('click', () => {
      controls.classList.toggle('collapsed');
    });
  }

  const pauseBtn = document.getElementById('pause-btn');
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.textContent = paused ? 'Resume' : 'Pause';
    pauseBtn.classList.toggle('paused', paused);
  });

  const speedBtn = document.getElementById('speed-btn');
  speedBtn.addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speedOptions.length;
    speed = speedOptions[speedIndex];
    speedBtn.textContent = speed + 'x';
  });

  const resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', () => {
    initPopulation();
    food = [];
    for (let i = 0; i < 50; i++) {
      spawnFood();
    }
    updateStats();
  });

  const popSlider = document.getElementById('pop-size');
  const popVal = document.getElementById('pop-val');
  if (popSlider) {
    popSlider.addEventListener('input', () => {
      window.populationSize = parseInt(popSlider.value);
      popVal.textContent = window.populationSize;
    });
  }

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
  // Think and update
  for (let c of creatures) {
    c.think(food, creatures, window.canvasWidth, window.canvasHeight);
    c.update(window.canvasWidth, window.canvasHeight);
    c.eat(food);
  }

  // Predation - bigger creatures eat smaller ones
  for (let c of creatures) {
    const victim = c.tryEatCreature(creatures);
    if (victim) {
      totalPredations++;
    }
  }

  // Mating
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

  creatures.push(...newborns);

  // Remove dead
  const beforeCount = creatures.length;
  creatures = creatures.filter(c => c.alive);
  totalDeaths += beforeCount - creatures.length;

  // Maintain minimum population
  if (creatures.length < 8) {
    for (let i = 0; i < 5; i++) {
      creatures.push(new Creature(
        random(100, window.canvasWidth - 100),
        random(100, window.canvasHeight - 100)
      ));
    }
  }

  // Spawn food
  const spawnInterval = max(1, floor(12 / window.foodSpawnRate));
  const maxFood = 50 + window.foodSpawnRate * 25;
  if (frameCount % spawnInterval === 0 && food.length < maxFood) {
    spawnFood();
  }
}

function render() {
  background(12, 15, 25);

  // Draw food
  for (let f of food) {
    f.display();
  }

  // Draw creatures (smaller ones first so big ones appear on top)
  creatures.sort((a, b) => a.radius - b.radius);
  for (let c of creatures) {
    c.display();
  }
}

function updateStats() {
  const alive = creatures.filter(c => c.alive);

  // Find extremes
  let smallest = Infinity, largest = 0;
  let mostAppendages = 0;

  for (let c of alive) {
    if (c.radius < smallest) smallest = c.radius;
    if (c.radius > largest) largest = c.radius;
    if (c.genome.appendages > mostAppendages) mostAppendages = c.genome.appendages;
  }

  document.getElementById('alive').textContent = alive.length;
  document.getElementById('births').textContent = totalBirths;
  document.getElementById('deaths').textContent = totalDeaths;
  document.getElementById('food-count').textContent = food.length;

  const predEl = document.getElementById('predations');
  if (predEl) predEl.textContent = totalPredations;

  const sizeEl = document.getElementById('size-range');
  if (sizeEl && alive.length > 0) {
    sizeEl.textContent = Math.round(smallest) + '-' + Math.round(largest);
  }
}

function spawnFood() {
  const margin = 40;
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
