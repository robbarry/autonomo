// Creature with neural network brain and genetics

class Creature {
  constructor(x, y, brain = null) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.angle = random(TWO_PI);

    this.radius = 10;
    this.maxSpeed = 4;
    this.maxForce = 0.3;

    // Energy and survival
    this.energy = 100;
    this.maxEnergy = 150;
    this.energyDrain = 0.15; // Energy lost per frame
    this.energyFromFood = 40;
    this.reproductionThreshold = 120;
    this.reproductionCost = 60;

    // Fitness tracking
    this.foodEaten = 0;
    this.age = 0;
    this.fitness = 0;

    // Neural network brain
    this.brain = brain ? brain.clone() : new NeuralNetwork();

    // Visual
    this.hue = random(360);
    this.alive = true;
  }

  // Sense the environment and make decisions
  think(food, canvasWidth, canvasHeight) {
    if (!this.alive) return;

    // Find nearest food
    let nearestFood = null;
    let nearestDist = Infinity;
    for (let f of food) {
      let d = dist(this.pos.x, this.pos.y, f.x, f.y);
      if (d < nearestDist) {
        nearestDist = d;
        nearestFood = f;
      }
    }

    // Calculate inputs for neural network
    const inputs = this.getSensorInputs(nearestFood, nearestDist, canvasWidth, canvasHeight);

    // Get neural network outputs
    const outputs = this.brain.forward(inputs);

    // Apply outputs: turn rate and speed
    const turnRate = (outputs[0] - 0.5) * 0.2; // -0.1 to 0.1 radians
    const speed = outputs[1] * this.maxSpeed;

    this.angle += turnRate;

    // Set velocity based on angle and speed
    this.vel.x = cos(this.angle) * speed;
    this.vel.y = sin(this.angle) * speed;
  }

  getSensorInputs(nearestFood, nearestDist, canvasWidth, canvasHeight) {
    // 8 inputs for the neural network:
    // 1. Distance to nearest food (normalized 0-1)
    // 2. Angle to nearest food (normalized -1 to 1)
    // 3-6. Distance to walls (top, bottom, left, right)
    // 7. Current energy level (normalized)
    // 8. Current speed (normalized)

    // Food distance (normalized, closer = higher value)
    const maxSenseDistance = 300;
    let foodDist = nearestFood
      ? 1 - min(nearestDist / maxSenseDistance, 1)
      : 0;

    // Angle to food (normalized -1 to 1)
    let foodAngle = 0;
    if (nearestFood) {
      const targetAngle = atan2(nearestFood.y - this.pos.y, nearestFood.x - this.pos.x);
      let angleDiff = targetAngle - this.angle;
      // Normalize angle difference to -PI to PI
      while (angleDiff > PI) angleDiff -= TWO_PI;
      while (angleDiff < -PI) angleDiff += TWO_PI;
      foodAngle = angleDiff / PI; // -1 to 1
    }

    // Wall distances (normalized 0-1, closer = lower value)
    const wallTop = this.pos.y / canvasHeight;
    const wallBottom = (canvasHeight - this.pos.y) / canvasHeight;
    const wallLeft = this.pos.x / canvasWidth;
    const wallRight = (canvasWidth - this.pos.x) / canvasWidth;

    // Current energy (normalized)
    const energyLevel = this.energy / this.maxEnergy;

    // Current speed (normalized)
    const speedLevel = this.vel.mag() / this.maxSpeed;

    return [
      foodDist,
      foodAngle,
      wallTop,
      wallBottom,
      wallLeft,
      wallRight,
      energyLevel,
      speedLevel
    ];
  }

  update(canvasWidth, canvasHeight) {
    if (!this.alive) return;

    // Update position
    this.pos.add(this.vel);

    // Bounce off walls
    if (this.pos.x < this.radius) {
      this.pos.x = this.radius;
      this.vel.x *= -0.5;
      this.angle = PI - this.angle;
    }
    if (this.pos.x > canvasWidth - this.radius) {
      this.pos.x = canvasWidth - this.radius;
      this.vel.x *= -0.5;
      this.angle = PI - this.angle;
    }
    if (this.pos.y < this.radius) {
      this.pos.y = this.radius;
      this.vel.y *= -0.5;
      this.angle = -this.angle;
    }
    if (this.pos.y > canvasHeight - this.radius) {
      this.pos.y = canvasHeight - this.radius;
      this.vel.y *= -0.5;
      this.angle = -this.angle;
    }

    // Drain energy (more drain for faster movement)
    const speedFactor = 1 + this.vel.mag() / this.maxSpeed;
    this.energy -= this.energyDrain * speedFactor;

    // Age
    this.age++;

    // Check death
    if (this.energy <= 0) {
      this.alive = false;
      this.calculateFitness();
    }
  }

  eat(food) {
    if (!this.alive) return false;

    for (let i = food.length - 1; i >= 0; i--) {
      let d = dist(this.pos.x, this.pos.y, food[i].x, food[i].y);
      if (d < this.radius + food[i].radius) {
        this.energy = min(this.energy + this.energyFromFood, this.maxEnergy);
        this.foodEaten++;
        food.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  canReproduce() {
    return this.alive && this.energy >= this.reproductionThreshold;
  }

  reproduce() {
    if (!this.canReproduce()) return null;

    this.energy -= this.reproductionCost;

    // Create offspring with mutated brain
    const childBrain = this.brain.clone();
    childBrain.mutate(window.mutationRate || 0.1);

    const child = new Creature(
      this.pos.x + random(-20, 20),
      this.pos.y + random(-20, 20),
      childBrain
    );

    // Child inherits some energy
    child.energy = 60;
    child.hue = (this.hue + random(-20, 20) + 360) % 360;

    return child;
  }

  calculateFitness() {
    // Fitness = food eaten (weighted heavily) + survival time bonus
    this.fitness = this.foodEaten * 100 + this.age * 0.1;
  }

  display() {
    if (!this.alive) return;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    // Body color based on energy
    const energyRatio = this.energy / this.maxEnergy;
    colorMode(HSB);
    fill(this.hue, 70, 50 + energyRatio * 50);
    stroke(this.hue, 50, 80);
    strokeWeight(2);

    // Draw body (triangle pointing in direction of movement)
    beginShape();
    vertex(this.radius * 1.5, 0);
    vertex(-this.radius, -this.radius * 0.8);
    vertex(-this.radius * 0.5, 0);
    vertex(-this.radius, this.radius * 0.8);
    endShape(CLOSE);

    // Draw energy indicator
    noStroke();
    fill(120, 80, 80);
    rect(-this.radius, -this.radius - 6, this.radius * 2 * energyRatio, 3);

    pop();
    colorMode(RGB);
  }

  // Create offspring through crossover with another creature
  static crossover(parent1, parent2, mutationRate) {
    const childBrain = parent1.brain.crossover(parent2.brain);
    childBrain.mutate(mutationRate);

    const child = new Creature(
      random(50, window.canvasWidth - 50),
      random(50, window.canvasHeight - 50),
      childBrain
    );

    // Blend parent colors
    child.hue = (parent1.hue + parent2.hue) / 2 + random(-10, 10);
    child.hue = (child.hue + 360) % 360;

    return child;
  }
}

// Food particle
class Food {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 6;
  }

  display() {
    noStroke();
    fill(120, 230, 120);
    ellipse(this.x, this.y, this.radius * 2);

    // Glow effect
    fill(120, 230, 120, 50);
    ellipse(this.x, this.y, this.radius * 4);
  }
}
