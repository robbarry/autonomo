// Creature with neural network brain, ray-casting sensors, and real-time mating

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
    this.energyDrain = 0.12;
    this.energyFromFood = 35;
    this.matingThreshold = 100;
    this.matingCost = 40;
    this.matingCooldown = 0;
    this.matingCooldownTime = 120; // frames before can mate again

    // Fitness tracking
    this.foodEaten = 0;
    this.offspring = 0;
    this.age = 0;
    this.fitness = 0;

    // Neural network brain
    // 18 inputs: 8 food rays + 8 wall rays + energy + speed
    // 4 outputs: turn rate, speed, mate-seeking intensity, mate acceptance
    this.brain = brain ? brain.clone() : new NeuralNetwork(18, 16, 4);

    // Visual
    this.hue = random(360);
    this.alive = true;

    // Ray-casting config
    this.numRays = 8;
    this.rayLength = 150;

    // Mating state
    this.seekingMate = false;
    this.lastTurnRate = 0;
  }

  // Ray-casting sensor system
  castRays(food, creatures, canvasWidth, canvasHeight) {
    const foodDistances = [];
    const wallDistances = [];
    const mateDistances = [];

    for (let i = 0; i < this.numRays; i++) {
      const rayAngle = this.angle + (i / this.numRays) * TWO_PI - PI;
      const rayDirX = cos(rayAngle);
      const rayDirY = sin(rayAngle);

      // Find closest food on this ray
      let closestFoodDist = 1.0;
      for (const f of food) {
        const d = this.rayCircleIntersection(
          this.pos.x, this.pos.y, rayDirX, rayDirY,
          f.x, f.y, f.radius
        );
        if (d > 0 && d < closestFoodDist) {
          closestFoodDist = d;
        }
      }
      foodDistances.push(1 - closestFoodDist); // Closer = higher value

      // Find closest wall on this ray
      const wallDist = this.rayWallIntersection(
        this.pos.x, this.pos.y, rayDirX, rayDirY,
        canvasWidth, canvasHeight
      );
      wallDistances.push(1 - wallDist); // Closer = higher value

      // Find closest potential mate on this ray
      let closestMateDist = 1.0;
      for (const c of creatures) {
        if (c === this || !c.alive || !c.canMate()) continue;
        const d = this.rayCircleIntersection(
          this.pos.x, this.pos.y, rayDirX, rayDirY,
          c.pos.x, c.pos.y, c.radius
        );
        if (d > 0 && d < closestMateDist) {
          closestMateDist = d;
        }
      }
      mateDistances.push(1 - closestMateDist);
    }

    return { foodDistances, wallDistances, mateDistances };
  }

  // Ray-circle intersection, returns normalized distance (0-1) or -1 if no hit
  rayCircleIntersection(ox, oy, dx, dy, cx, cy, r) {
    const fx = ox - cx;
    const fy = oy - cy;

    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return -1;

    const t = (-b - sqrt(discriminant)) / (2 * a);
    if (t < 0) return -1;

    const hitDist = t / this.rayLength;
    return hitDist > 1 ? -1 : hitDist;
  }

  // Ray-wall intersection, returns normalized distance (0-1)
  rayWallIntersection(ox, oy, dx, dy, w, h) {
    let minT = Infinity;

    // Left wall (x = 0)
    if (dx < 0) {
      const t = -ox / dx;
      if (t > 0) minT = min(minT, t);
    }
    // Right wall (x = w)
    if (dx > 0) {
      const t = (w - ox) / dx;
      if (t > 0) minT = min(minT, t);
    }
    // Top wall (y = 0)
    if (dy < 0) {
      const t = -oy / dy;
      if (t > 0) minT = min(minT, t);
    }
    // Bottom wall (y = h)
    if (dy > 0) {
      const t = (h - oy) / dy;
      if (t > 0) minT = min(minT, t);
    }

    return min(minT / this.rayLength, 1.0);
  }

  // Sense the environment and make decisions
  think(food, creatures, canvasWidth, canvasHeight) {
    if (!this.alive) return;

    const rays = this.castRays(food, creatures, canvasWidth, canvasHeight);

    // Build input vector (18 inputs)
    const inputs = [
      ...rays.foodDistances,     // 8 food ray distances
      ...rays.wallDistances,     // 8 wall ray distances
      this.energy / this.maxEnergy,  // Current energy
      this.vel.mag() / this.maxSpeed // Current speed
    ];

    // Get neural network outputs
    const outputs = this.brain.forward(inputs);

    // Apply outputs
    const turnRate = (outputs[0] - 0.5) * 0.25; // -0.125 to 0.125 radians
    const speed = outputs[1] * this.maxSpeed;
    this.seekingMate = outputs[2] > 0.5 && this.canMate();
    // outputs[3] is mate acceptance threshold

    this.lastTurnRate = turnRate;
    this.angle += turnRate;

    // Set velocity based on angle and speed
    this.vel.x = cos(this.angle) * speed;
    this.vel.y = sin(this.angle) * speed;
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

    // Drain energy (speed + turning costs)
    const speedFactor = 1 + this.vel.mag() / this.maxSpeed;
    const turnFactor = 1 + abs(this.lastTurnRate) * 3;
    this.energy -= this.energyDrain * speedFactor * turnFactor;

    // Mating cooldown
    if (this.matingCooldown > 0) this.matingCooldown--;

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
    return this.alive &&
           this.energy >= this.matingThreshold &&
           this.matingCooldown === 0;
  }

  // Try to mate with nearby creatures - returns child if successful
  tryMate(creatures) {
    if (!this.canMate()) return null;

    // Find nearby potential mates
    for (const other of creatures) {
      if (other === this || !other.alive || !other.canMate()) continue;

      const d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (d < this.radius + other.radius + 10) {
        // Both creatures want to mate - create offspring
        return this.mateWith(other);
      }
    }
    return null;
  }

  mateWith(partner) {
    // Both pay the mating cost
    this.energy -= this.matingCost;
    partner.energy -= this.matingCost;
    this.matingCooldown = this.matingCooldownTime;
    partner.matingCooldown = partner.matingCooldownTime;

    // Track offspring for fitness
    this.offspring++;
    partner.offspring++;

    // Create child through crossover
    const childBrain = this.brain.crossover(partner.brain);
    childBrain.mutate();

    // Spawn child between parents
    const childX = (this.pos.x + partner.pos.x) / 2 + random(-15, 15);
    const childY = (this.pos.y + partner.pos.y) / 2 + random(-15, 15);

    const child = new Creature(childX, childY, childBrain);
    child.energy = 70;

    // Blend parent colors with slight mutation
    child.hue = (this.hue + partner.hue) / 2 + random(-15, 15);
    child.hue = (child.hue + 360) % 360;

    return child;
  }

  calculateFitness() {
    // Squared food reward strongly favors high performers
    // Plus offspring bonus and survival time
    this.fitness = pow(this.foodEaten, 2) * 50 +
                   this.offspring * 200 +
                   this.age * 0.05;
  }

  display() {
    if (!this.alive) return;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    // Body color based on energy and mating state
    const energyRatio = this.energy / this.maxEnergy;
    colorMode(HSB);

    if (this.seekingMate && this.canMate()) {
      // Pulsing glow when seeking mate
      const pulse = (sin(frameCount * 0.2) + 1) / 2;
      fill(this.hue, 90, 60 + pulse * 40);
      stroke(this.hue, 60, 100);
    } else {
      fill(this.hue, 70, 40 + energyRatio * 50);
      stroke(this.hue, 50, 80);
    }
    strokeWeight(2);

    // Draw body (triangle pointing in direction of movement)
    beginShape();
    vertex(this.radius * 1.5, 0);
    vertex(-this.radius, -this.radius * 0.8);
    vertex(-this.radius * 0.5, 0);
    vertex(-this.radius, this.radius * 0.8);
    endShape(CLOSE);

    // Draw energy bar
    noStroke();
    fill(120, 80, 80);
    rect(-this.radius, -this.radius - 6, this.radius * 2 * energyRatio, 3);

    // Mating indicator
    if (this.canMate()) {
      fill(0, 100, 100); // Red heart-ish indicator
      ellipse(0, -this.radius - 12, 6, 6);
    }

    pop();
    colorMode(RGB);
  }

  // For generation-end crossover (backup)
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

    // Glow effect
    fill(120, 230, 120, 50);
    ellipse(this.x, this.y, this.radius * 4);
  }
}
