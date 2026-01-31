// Creature with neural network brain and real-time mating

class Creature {
  constructor(x, y, brain = null) {
    this.pos = createVector(x, y);
    this.vel = createVector(0, 0);
    this.angle = random(TWO_PI);

    this.radius = 10;
    this.maxSpeed = 3.5;

    // Energy and survival
    this.energy = 100;
    this.maxEnergy = 150;
    this.energyDrain = 0.1;
    this.energyFromFood = 40;
    this.matingThreshold = 110;
    this.matingCost = 35;
    this.matingCooldown = 0;
    this.matingCooldownTime = 150;

    // Fitness tracking
    this.foodEaten = 0;
    this.offspring = 0;
    this.age = 0;
    this.fitness = 0;

    // Neural network brain - simplified inputs
    // 10 inputs: food dist, food angle, 4 wall dists, mate dist, mate angle, energy, speed
    // 4 outputs: turn rate, speed, mate-seeking, mate acceptance
    this.brain = brain ? brain.clone() : new NeuralNetwork(10, 12, 4);

    // Visual
    this.hue = random(360);
    this.alive = true;
    this.seekingMate = false;
    this.lastTurnRate = 0;
  }

  // Simplified sensing - find nearest food and mate
  getSensorInputs(food, creatures, canvasWidth, canvasHeight) {
    const maxSenseDistance = 250;

    // Find nearest food
    let nearestFoodDist = maxSenseDistance;
    let nearestFoodAngle = 0;
    for (const f of food) {
      const d = dist(this.pos.x, this.pos.y, f.x, f.y);
      if (d < nearestFoodDist) {
        nearestFoodDist = d;
        const angle = atan2(f.y - this.pos.y, f.x - this.pos.x);
        nearestFoodAngle = this.normalizeAngle(angle - this.angle);
      }
    }

    // Find nearest potential mate
    let nearestMateDist = maxSenseDistance;
    let nearestMateAngle = 0;
    for (const c of creatures) {
      if (c === this || !c.alive || !c.canMate()) continue;
      const d = dist(this.pos.x, this.pos.y, c.pos.x, c.pos.y);
      if (d < nearestMateDist) {
        nearestMateDist = d;
        const angle = atan2(c.pos.y - this.pos.y, c.pos.x - this.pos.x);
        nearestMateAngle = this.normalizeAngle(angle - this.angle);
      }
    }

    // Wall distances (normalized 0-1, closer = higher)
    const wallTop = 1 - this.pos.y / canvasHeight;
    const wallBottom = 1 - (canvasHeight - this.pos.y) / canvasHeight;
    const wallLeft = 1 - this.pos.x / canvasWidth;
    const wallRight = 1 - (canvasWidth - this.pos.x) / canvasWidth;

    return [
      1 - nearestFoodDist / maxSenseDistance,  // Food proximity (0-1)
      nearestFoodAngle / PI,                    // Food angle (-1 to 1)
      wallTop,
      wallBottom,
      wallLeft,
      wallRight,
      1 - nearestMateDist / maxSenseDistance,  // Mate proximity
      nearestMateAngle / PI,                    // Mate angle
      this.energy / this.maxEnergy,             // Energy level
      this.vel.mag() / this.maxSpeed            // Current speed
    ];
  }

  normalizeAngle(angle) {
    while (angle > PI) angle -= TWO_PI;
    while (angle < -PI) angle += TWO_PI;
    return angle;
  }

  think(food, creatures, canvasWidth, canvasHeight) {
    if (!this.alive) return;

    const inputs = this.getSensorInputs(food, creatures, canvasWidth, canvasHeight);
    const outputs = this.brain.forward(inputs);

    // Apply outputs
    const turnRate = (outputs[0] - 0.5) * 0.2;
    const speed = outputs[1] * this.maxSpeed;
    this.seekingMate = outputs[2] > 0.5 && this.canMate();

    this.lastTurnRate = turnRate;
    this.angle += turnRate;

    this.vel.x = cos(this.angle) * speed;
    this.vel.y = sin(this.angle) * speed;
  }

  update(canvasWidth, canvasHeight) {
    if (!this.alive) return;

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

    // Drain energy (speed + turning costs)
    const speedFactor = 1 + this.vel.mag() / this.maxSpeed;
    const turnFactor = 1 + abs(this.lastTurnRate) * 2;
    this.energy -= this.energyDrain * speedFactor * turnFactor;

    if (this.matingCooldown > 0) this.matingCooldown--;
    this.age++;

    if (this.energy <= 0) {
      this.alive = false;
      this.calculateFitness();
    }
  }

  eat(food) {
    if (!this.alive) return false;

    for (let i = food.length - 1; i >= 0; i--) {
      const d = dist(this.pos.x, this.pos.y, food[i].x, food[i].y);
      if (d < this.radius + food[i].radius) {
        this.energy = min(this.energy + this.energyFromFood, this.maxEnergy);
        this.foodEaten++;
        food.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  canMate() {
    return this.alive && this.energy >= this.matingThreshold && this.matingCooldown === 0;
  }

  tryMate(creatures) {
    if (!this.canMate()) return null;

    for (const other of creatures) {
      if (other === this || !other.alive || !other.canMate()) continue;

      const d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (d < this.radius + other.radius + 15) {
        return this.mateWith(other);
      }
    }
    return null;
  }

  mateWith(partner) {
    this.energy -= this.matingCost;
    partner.energy -= this.matingCost;
    this.matingCooldown = this.matingCooldownTime;
    partner.matingCooldown = partner.matingCooldownTime;

    this.offspring++;
    partner.offspring++;

    const childBrain = this.brain.crossover(partner.brain);
    childBrain.mutate();

    const childX = (this.pos.x + partner.pos.x) / 2 + random(-20, 20);
    const childY = (this.pos.y + partner.pos.y) / 2 + random(-20, 20);

    const child = new Creature(childX, childY, childBrain);
    child.energy = 80;
    child.hue = (this.hue + partner.hue) / 2 + random(-20, 20);
    child.hue = (child.hue + 360) % 360;

    return child;
  }

  calculateFitness() {
    this.fitness = pow(this.foodEaten, 2) * 50 + this.offspring * 200 + this.age * 0.05;
  }

  display() {
    if (!this.alive) return;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    const energyRatio = this.energy / this.maxEnergy;
    colorMode(HSB, 360, 100, 100);

    if (this.seekingMate && this.canMate()) {
      const pulse = (sin(frameCount * 0.2) + 1) / 2;
      fill(this.hue, 90, 60 + pulse * 40);
      stroke(this.hue, 60, 100);
    } else {
      fill(this.hue, 70, 40 + energyRatio * 50);
      stroke(this.hue, 50, 80);
    }
    strokeWeight(2);

    // Body shape
    beginShape();
    vertex(this.radius * 1.5, 0);
    vertex(-this.radius, -this.radius * 0.8);
    vertex(-this.radius * 0.5, 0);
    vertex(-this.radius, this.radius * 0.8);
    endShape(CLOSE);

    // Energy bar
    noStroke();
    fill(120, 80, 80);
    rect(-this.radius, -this.radius - 6, this.radius * 2 * energyRatio, 3);

    // Mating indicator
    if (this.canMate()) {
      fill(0, 100, 100);
      ellipse(0, -this.radius - 12, 6, 6);
    }

    pop();
    colorMode(RGB, 255);
  }

  static crossover(parent1, parent2) {
    const childBrain = parent1.brain.crossover(parent2.brain);
    childBrain.mutate();

    const child = new Creature(
      random(50, window.canvasWidth - 50),
      random(50, window.canvasHeight - 50),
      childBrain
    );

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
    fill(120, 230, 120, 50);
    ellipse(this.x, this.y, this.radius * 4);
  }
}
