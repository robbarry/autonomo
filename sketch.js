// Neuroevolution Simulator - Main p5.js sketch

let creatures = [];
let food = [];
let generation = 1;
let paused = false;
let speed = 1;
let speedOptions = [1, 2, 5, 10];
let speedIndex = 0;

// Global settings
window.mutationRate = 0.1;
window.populationSize = 30;
window.canvasWidth = 600;
window.canvasHeight = 600;

// Generation tracking
let generationTime = 0;
let maxGenerationTime = 1500; // frames before forced new generation
let allTimeBestFitness = 0;
let generationBestFitness = 0;

// Elitism
const eliteCount = 2;

function setup() {
  // Calculate canvas size based on container
  const container = document.getElementById('canvas-container');
  const containerRect = container.getBoundingClientRect();

  // Use smaller dimension to keep canvas square, max 800px
  const size = min(containerRect.width, containerRect.height, 800);
  window.canvasWidth = size;
  window.canvasHeight = size;

  const canvas = createCanvas(size, size);
  canvas.parent('canvas-container');

  // Initialize population
  initPopulation();

  // Spawn initial food
  for (let i = 0; i < 30; i++) {
    spawnFood();
  }

  // Set up UI event listeners
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
}

function setupUI() {
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
    generationBestFitness = 0;
    initPopulation();
    food = [];
    for (let i = 0; i < 30; i++) {
      spawnFood();
    }
    updateStats();
  });

  // Mutation rate slider
  const mutationSlider = document.getElementById('mutation-rate');
  const mutationVal = document.getElementById('mutation-val');
  mutationSlider.addEventListener('input', () => {
    window.mutationRate = parseFloat(mutationSlider.value);
    mutationVal.textContent = window.mutationRate.toFixed(2);
  });

  // Population size slider
  const popSlider = document.getElementById('pop-size');
  const popVal = document.getElementById('pop-val');
  popSlider.addEventListener('input', () => {
    window.populationSize = parseInt(popSlider.value);
    popVal.textContent = window.populationSize;
  });
}

function draw() {
  if (paused) return;

  // Run multiple simulation steps per frame for speed
  for (let s = 0; s < speed; s++) {
    simulationStep();
  }

  // Render
  render();
  updateStats();
}

function simulationStep() {
  generationTime++;

  // Think and update all creatures
  for (let c of creatures) {
    c.think(food, window.canvasWidth, window.canvasHeight);
    c.update(window.canvasWidth, window.canvasHeight);
    c.eat(food);

    // Asexual reproduction when energy is high
    if (c.canReproduce() && creatures.length < window.populationSize * 1.5) {
      const child = c.reproduce();
      if (child) creatures.push(child);
    }
  }

  // Spawn food periodically
  if (frameCount % 20 === 0 && food.length < 50) {
    spawnFood();
  }

  // Check for generation end
  const aliveCount = creatures.filter(c => c.alive).length;

  if (aliveCount === 0 || generationTime >= maxGenerationTime) {
    nextGeneration();
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

  // Draw generation progress bar
  const progress = generationTime / maxGenerationTime;
  noStroke();
  fill(78, 204, 163, 100);
  rect(0, height - 4, width * progress, 4);
}

function updateStats() {
  const aliveCreatures = creatures.filter(c => c.alive);

  // Calculate current best and average fitness
  let currentBest = 0;
  let totalFitness = 0;

  for (let c of creatures) {
    const fit = c.foodEaten * 100 + c.age * 0.1;
    totalFitness += fit;
    if (fit > currentBest) currentBest = fit;
    if (fit > generationBestFitness) generationBestFitness = fit;
  }

  if (generationBestFitness > allTimeBestFitness) {
    allTimeBestFitness = generationBestFitness;
  }

  const avgFitness = creatures.length > 0 ? totalFitness / creatures.length : 0;

  document.getElementById('generation').textContent = generation;
  document.getElementById('alive').textContent = aliveCreatures.length;
  document.getElementById('best-fitness').textContent = Math.round(allTimeBestFitness);
  document.getElementById('avg-fitness').textContent = Math.round(avgFitness);
}

function nextGeneration() {
  generation++;
  generationBestFitness = 0;

  // Calculate fitness for all creatures
  for (let c of creatures) {
    c.calculateFitness();
  }

  // Sort by fitness (descending)
  creatures.sort((a, b) => b.fitness - a.fitness);

  // Create new population
  const newCreatures = [];

  // Elitism: keep top performers unchanged
  for (let i = 0; i < eliteCount && i < creatures.length; i++) {
    const elite = new Creature(
      random(50, window.canvasWidth - 50),
      random(50, window.canvasHeight - 50),
      creatures[i].brain
    );
    elite.hue = creatures[i].hue;
    newCreatures.push(elite);
  }

  // Fill rest with offspring from tournament selection
  while (newCreatures.length < window.populationSize) {
    const parent1 = tournamentSelect(creatures);
    const parent2 = tournamentSelect(creatures);

    if (parent1 && parent2) {
      const child = Creature.crossover(parent1, parent2, window.mutationRate);
      newCreatures.push(child);
    } else if (parent1) {
      // Asexual reproduction if can't find second parent
      const childBrain = parent1.brain.clone();
      childBrain.mutate(window.mutationRate);
      const child = new Creature(
        random(50, window.canvasWidth - 50),
        random(50, window.canvasHeight - 50),
        childBrain
      );
      newCreatures.push(child);
    } else {
      // Random new creature if no parents available
      newCreatures.push(new Creature(
        random(50, window.canvasWidth - 50),
        random(50, window.canvasHeight - 50)
      ));
    }
  }

  creatures = newCreatures;
  generationTime = 0;

  // Reset food
  food = [];
  for (let i = 0; i < 30; i++) {
    spawnFood();
  }
}

// Tournament selection: pick 3 random, return best
function tournamentSelect(population) {
  if (population.length === 0) return null;

  const tournamentSize = min(3, population.length);
  let best = null;
  let bestFitness = -Infinity;

  for (let i = 0; i < tournamentSize; i++) {
    const candidate = random(population);
    if (candidate.fitness > bestFitness) {
      bestFitness = candidate.fitness;
      best = candidate;
    }
  }

  return best;
}

function spawnFood() {
  const margin = 30;
  food.push(new Food(
    random(margin, window.canvasWidth - margin),
    random(margin, window.canvasHeight - margin)
  ));
}

// Handle window resize
function windowResized() {
  const container = document.getElementById('canvas-container');
  const containerRect = container.getBoundingClientRect();
  const size = min(containerRect.width, containerRect.height, 800);
  window.canvasWidth = size;
  window.canvasHeight = size;
  resizeCanvas(size, size);
}
