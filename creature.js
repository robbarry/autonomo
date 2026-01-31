// Creature with evolving morphology, predation, and diverse movement

class Creature {
  constructor(x, y, genome = null) {
    this.pos = createVector(x, y);
    this.vel = createVector(random(-1, 1), random(-1, 1));
    this.angle = random(TWO_PI);

    // Initialize genome (morphology + brain)
    this.genome = genome ? this.cloneGenome(genome) : this.randomGenome();

    // Derived traits from genome
    this.radius = this.genome.bodySize;
    this.maxSpeed = map(this.genome.bodySize, 5, 40, 5, 1.5); // smaller = faster
    this.maxSpeed *= (1 + this.genome.appendages * 0.15); // appendages boost speed

    // Energy system - bigger creatures store more
    this.energy = 50 + this.genome.bodySize;
    this.maxEnergy = 80 + this.genome.bodySize * 2;

    // Base energy drain scales with size and appendages
    this.baseDrain = 0.03 + (this.genome.bodySize / 500) + (this.genome.appendages * 0.015);

    // Mating
    this.matingCooldown = 0;

    // Stats
    this.foodEaten = 0;
    this.creaturesEaten = 0;
    this.offspring = 0;
    this.age = 0;
    this.alive = true;

    // Movement state
    this.burstCooldown = 0;
    this.isBursting = false;

    // Neural network - inputs now include creature detection
    // 12 inputs: food dist/angle, wall dists (4), energy, speed, nearest-smaller dist/angle, nearest-larger dist/angle
    this.brain = new NeuralNetwork(12, 10, 4);
    if (genome && genome.brainWeights) {
      this.brain.setWeights(genome.brainWeights);
    }
  }

  randomGenome() {
    return {
      bodySize: random(8, 30),
      appendages: floor(random(0, 7)),      // 0-6 appendages
      appendageLength: random(0.3, 1.2),
      bodyShape: random(0, 1),              // 0 = round, 1 = pointed
      burstiness: random(0, 1),             // 0 = cruise, 1 = burst movement
      hue: random(360),
      patternType: floor(random(0, 3)),     // 0 = solid, 1 = stripes, 2 = spots
      mutationRate: 0.15,
      brainWeights: null
    };
  }

  cloneGenome(g) {
    return {
      bodySize: g.bodySize,
      appendages: g.appendages,
      appendageLength: g.appendageLength,
      bodyShape: g.bodyShape,
      burstiness: g.burstiness,
      hue: g.hue,
      patternType: g.patternType,
      mutationRate: g.mutationRate,
      brainWeights: g.brainWeights ? [...g.brainWeights] : null
    };
  }

  mutateGenome(g) {
    const mutate = (val, min, max, strength = 0.1) => {
      if (random() < g.mutationRate) {
        val += randomGaussian() * (max - min) * strength;
        return constrain(val, min, max);
      }
      return val;
    };

    return {
      bodySize: mutate(g.bodySize, 5, 45, 0.15),
      appendages: random() < g.mutationRate * 0.5 ? constrain(g.appendages + (random() < 0.5 ? -1 : 1), 0, 6) : g.appendages,
      appendageLength: mutate(g.appendageLength, 0.2, 1.5, 0.1),
      bodyShape: mutate(g.bodyShape, 0, 1, 0.1),
      burstiness: mutate(g.burstiness, 0, 1, 0.1),
      hue: (g.hue + randomGaussian() * 15 + 360) % 360,
      patternType: random() < g.mutationRate * 0.3 ? floor(random(0, 3)) : g.patternType,
      mutationRate: mutate(g.mutationRate, 0.05, 0.3, 0.05),
      brainWeights: null // Will be set separately
    };
  }

  blendGenomes(g1, g2) {
    const blend = (a, b) => random() < 0.5 ? a : b;
    const blendNum = (a, b) => lerp(a, b, random());

    return {
      bodySize: blendNum(g1.bodySize, g2.bodySize),
      appendages: blend(g1.appendages, g2.appendages),
      appendageLength: blendNum(g1.appendageLength, g2.appendageLength),
      bodyShape: blendNum(g1.bodyShape, g2.bodyShape),
      burstiness: blendNum(g1.burstiness, g2.burstiness),
      hue: blendNum(g1.hue, g2.hue),
      patternType: blend(g1.patternType, g2.patternType),
      mutationRate: blendNum(g1.mutationRate, g2.mutationRate),
      brainWeights: null
    };
  }

  // Sense environment
  getSensorInputs(food, creatures, w, h) {
    const maxDist = 200;

    // Find nearest food
    let nearestFoodDist = maxDist;
    let nearestFoodAngle = 0;
    for (const f of food) {
      const d = dist(this.pos.x, this.pos.y, f.x, f.y);
      if (d < nearestFoodDist) {
        nearestFoodDist = d;
        nearestFoodAngle = this.angleToPoint(f.x, f.y);
      }
    }

    // Find nearest smaller creature (prey)
    let nearestPreyDist = maxDist;
    let nearestPreyAngle = 0;
    // Find nearest larger creature (threat)
    let nearestThreatDist = maxDist;
    let nearestThreatAngle = 0;

    for (const c of creatures) {
      if (c === this || !c.alive) continue;
      const d = dist(this.pos.x, this.pos.y, c.pos.x, c.pos.y);

      if (this.canEat(c) && d < nearestPreyDist) {
        nearestPreyDist = d;
        nearestPreyAngle = this.angleToPoint(c.pos.x, c.pos.y);
      }
      if (c.canEat(this) && d < nearestThreatDist) {
        nearestThreatDist = d;
        nearestThreatAngle = this.angleToPoint(c.pos.x, c.pos.y);
      }
    }

    // Wall distances
    const wallTop = this.pos.y / h;
    const wallBottom = (h - this.pos.y) / h;
    const wallLeft = this.pos.x / w;
    const wallRight = (w - this.pos.x) / w;

    return [
      1 - nearestFoodDist / maxDist,
      nearestFoodAngle / PI,
      wallTop, wallBottom, wallLeft, wallRight,
      this.energy / this.maxEnergy,
      this.vel.mag() / this.maxSpeed,
      1 - nearestPreyDist / maxDist,
      nearestPreyAngle / PI,
      1 - nearestThreatDist / maxDist,
      nearestThreatAngle / PI
    ];
  }

  angleToPoint(px, py) {
    const targetAngle = atan2(py - this.pos.y, px - this.pos.x);
    let diff = targetAngle - this.angle;
    while (diff > PI) diff -= TWO_PI;
    while (diff < -PI) diff += TWO_PI;
    return diff;
  }

  think(food, creatures, w, h) {
    if (!this.alive) return;

    const inputs = this.getSensorInputs(food, creatures, w, h);
    const outputs = this.brain.forward(inputs);

    // Output 0: turn rate
    const turnRate = (outputs[0] - 0.5) * 0.2;
    this.angle += turnRate;

    // Output 1: speed (0-1)
    let targetSpeed = outputs[1] * this.maxSpeed;

    // Output 2: burst trigger (if burstiness is high)
    if (this.genome.burstiness > 0.5 && outputs[2] > 0.7 && this.burstCooldown === 0) {
      this.isBursting = true;
      this.burstCooldown = 60;
      targetSpeed *= 2.5;
    }

    // Apply movement based on appendages
    if (this.genome.appendages === 0) {
      // Passive drifter - very slow, random drift
      this.vel.mult(0.98);
      this.vel.add(p5.Vector.random2D().mult(0.1));
    } else {
      // Active movement
      const targetVel = p5.Vector.fromAngle(this.angle).mult(targetSpeed);
      this.vel.lerp(targetVel, 0.1);
    }
  }

  update(w, h) {
    if (!this.alive) return;

    this.pos.add(this.vel);

    // Bounce off walls
    if (this.pos.x < this.radius) { this.pos.x = this.radius; this.vel.x *= -0.5; }
    if (this.pos.x > w - this.radius) { this.pos.x = w - this.radius; this.vel.x *= -0.5; }
    if (this.pos.y < this.radius) { this.pos.y = this.radius; this.vel.y *= -0.5; }
    if (this.pos.y > h - this.radius) { this.pos.y = h - this.radius; this.vel.y *= -0.5; }

    // Energy drain
    let drain = this.baseDrain;
    drain *= (1 + this.vel.mag() / this.maxSpeed); // movement cost
    if (this.isBursting) drain *= 3;
    this.energy -= drain;

    // Cooldowns
    if (this.burstCooldown > 0) this.burstCooldown--;
    if (this.burstCooldown === 0) this.isBursting = false;
    if (this.matingCooldown > 0) this.matingCooldown--;

    this.age++;

    if (this.energy <= 0) {
      this.alive = false;
    }
  }

  eat(food) {
    if (!this.alive) return false;
    for (let i = food.length - 1; i >= 0; i--) {
      const d = dist(this.pos.x, this.pos.y, food[i].x, food[i].y);
      if (d < this.radius + food[i].radius) {
        this.energy = min(this.energy + 25, this.maxEnergy);
        this.foodEaten++;
        food.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  // Predation - can this creature eat another?
  canEat(other) {
    return this.radius >= other.radius * 1.4; // Need to be 40% bigger
  }

  tryEatCreature(creatures) {
    if (!this.alive) return null;

    for (const other of creatures) {
      if (other === this || !other.alive) continue;
      if (!this.canEat(other)) continue;

      const d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (d < this.radius + other.radius * 0.5) {
        // Eat the creature!
        const energyGain = other.energy * 0.5 + other.radius;
        this.energy = min(this.energy + energyGain, this.maxEnergy);
        this.creaturesEaten++;
        other.alive = false;
        return other;
      }
    }
    return null;
  }

  canMate() {
    return this.alive && this.energy > this.maxEnergy * 0.7 && this.matingCooldown === 0;
  }

  tryMate(creatures) {
    if (!this.canMate()) return null;

    for (const other of creatures) {
      if (other === this || !other.alive || !other.canMate()) continue;
      // Similar size creatures mate
      if (abs(this.radius - other.radius) > 10) continue;

      const d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      if (d < this.radius + other.radius + 10) {
        return this.mateWith(other);
      }
    }
    return null;
  }

  mateWith(partner) {
    const cost = 30;
    this.energy -= cost;
    partner.energy -= cost;
    this.matingCooldown = 200;
    partner.matingCooldown = 200;
    this.offspring++;
    partner.offspring++;

    // Create child genome
    let childGenome = this.blendGenomes(this.genome, partner.genome);
    childGenome = this.mutateGenome(childGenome);

    // Child brain from crossover
    const childBrain = this.brain.crossover(partner.brain);
    childBrain.mutate();
    childGenome.brainWeights = childBrain.getWeights();

    const childX = (this.pos.x + partner.pos.x) / 2 + random(-20, 20);
    const childY = (this.pos.y + partner.pos.y) / 2 + random(-20, 20);

    const child = new Creature(childX, childY, childGenome);
    child.brain.setWeights(childGenome.brainWeights);
    child.energy = 60;

    return child;
  }

  display() {
    if (!this.alive) return;

    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    const energyRatio = this.energy / this.maxEnergy;
    colorMode(HSB, 360, 100, 100, 1);

    // Glow for high energy
    if (energyRatio > 0.7) {
      noStroke();
      fill(this.genome.hue, 50, 80, 0.2);
      ellipse(0, 0, this.radius * 3, this.radius * 3);
    }

    // Draw appendages first (behind body)
    this.drawAppendages();

    // Body color
    const sat = 60 + energyRatio * 30;
    const bri = 40 + energyRatio * 40;
    fill(this.genome.hue, sat, bri);
    stroke(this.genome.hue, sat - 20, bri + 20);
    strokeWeight(2);

    // Draw body shape based on genome
    this.drawBody();

    // Pattern overlay
    this.drawPattern();

    // Mating indicator
    if (this.canMate()) {
      noStroke();
      fill(0, 100, 100);
      ellipse(0, -this.radius - 8, 5, 5);
    }

    pop();
    colorMode(RGB, 255);
  }

  drawBody() {
    const r = this.radius;
    const shape = this.genome.bodyShape;

    beginShape();
    if (shape < 0.3) {
      // Round - circle-ish
      for (let a = 0; a < TWO_PI; a += 0.3) {
        vertex(cos(a) * r, sin(a) * r * 0.9);
      }
    } else if (shape < 0.7) {
      // Oval - elongated
      for (let a = 0; a < TWO_PI; a += 0.3) {
        vertex(cos(a) * r * 1.3, sin(a) * r * 0.7);
      }
    } else {
      // Pointed - predator shape
      vertex(r * 1.5, 0);
      vertex(-r * 0.5, -r * 0.8);
      vertex(-r, 0);
      vertex(-r * 0.5, r * 0.8);
    }
    endShape(CLOSE);
  }

  drawAppendages() {
    if (this.genome.appendages === 0) return;

    const len = this.radius * this.genome.appendageLength;
    stroke(this.genome.hue, 40, 70);
    strokeWeight(2);
    noFill();

    for (let i = 0; i < this.genome.appendages; i++) {
      const baseAngle = PI + map(i, 0, this.genome.appendages, -0.8, 0.8);
      const wiggle = sin(frameCount * 0.15 + i * 1.5) * 0.4;

      beginShape();
      curveVertex(-this.radius * 0.5, 0);
      curveVertex(-this.radius * 0.5, 0);
      const midX = cos(baseAngle + wiggle * 0.5) * len * 0.5 - this.radius * 0.3;
      const midY = sin(baseAngle + wiggle * 0.5) * len * 0.5;
      curveVertex(midX, midY);
      const endX = cos(baseAngle + wiggle) * len - this.radius * 0.3;
      const endY = sin(baseAngle + wiggle) * len;
      curveVertex(endX, endY);
      curveVertex(endX, endY);
      endShape();
    }
  }

  drawPattern() {
    if (this.genome.patternType === 0) return; // solid

    noStroke();
    colorMode(HSB, 360, 100, 100, 1);
    fill(this.genome.hue, 30, 90, 0.4);

    if (this.genome.patternType === 1) {
      // Stripes
      for (let i = -2; i <= 2; i++) {
        rect(i * this.radius * 0.4 - 2, -this.radius, 4, this.radius * 2);
      }
    } else {
      // Spots
      for (let i = 0; i < 4; i++) {
        const sx = random(-this.radius * 0.5, this.radius * 0.5);
        const sy = random(-this.radius * 0.4, this.radius * 0.4);
        ellipse(sx, sy, this.radius * 0.3);
      }
    }
  }
}

// Food particle
class Food {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 5;
  }

  display() {
    noStroke();
    fill(120, 220, 120);
    ellipse(this.x, this.y, this.radius * 2);
    fill(120, 220, 120, 60);
    ellipse(this.x, this.y, this.radius * 3.5);
  }
}
