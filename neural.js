// Neural Network with real matrix math
// Architecture: variable inputs -> variable hidden -> 2 outputs

class NeuralNetwork {
  constructor(inputSize = 10, hiddenSize = 12, outputSize = 4) {
    // 10 inputs: food dist/angle, 4 wall dists, mate dist/angle, energy, speed
    // 4 outputs: turn rate, speed, mate-seeking, mate acceptance
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    // Initialize weights with Xavier initialization
    this.weightsIH = this.randomMatrix(hiddenSize, inputSize, inputSize);
    this.biasH = this.randomArray(hiddenSize);
    this.weightsHO = this.randomMatrix(outputSize, hiddenSize, hiddenSize);
    this.biasO = this.randomArray(outputSize);

    // Adaptive mutation parameters (these evolve too)
    this.mutationMagnitude = 0.3;
    this.mutationRate = 0.15;
  }

  // Xavier initialization for better gradient flow
  randomMatrix(rows, cols, fanIn) {
    const scale = Math.sqrt(2 / fanIn);
    const matrix = [];
    for (let i = 0; i < rows; i++) {
      matrix[i] = [];
      for (let j = 0; j < cols; j++) {
        matrix[i][j] = this.gaussianRandom() * scale;
      }
    }
    return matrix;
  }

  randomArray(size) {
    const arr = [];
    for (let i = 0; i < size; i++) {
      arr[i] = 0;
    }
    return arr;
  }

  // Box-Muller transform for gaussian random numbers
  gaussianRandom() {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  // Activation functions
  tanh(x) {
    return Math.tanh(x);
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  // Forward propagation
  forward(inputs) {
    if (inputs.length !== this.inputSize) {
      console.error(`Expected ${this.inputSize} inputs, got ${inputs.length}`);
      return new Array(this.outputSize).fill(0.5);
    }

    // Hidden layer: tanh(W_ih * inputs + b_h)
    const hidden = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let sum = this.biasH[i];
      for (let j = 0; j < this.inputSize; j++) {
        sum += this.weightsIH[i][j] * inputs[j];
      }
      hidden[i] = this.tanh(sum);
    }

    // Output layer: sigmoid(W_ho * hidden + b_o)
    const outputs = [];
    for (let i = 0; i < this.outputSize; i++) {
      let sum = this.biasO[i];
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += this.weightsHO[i][j] * hidden[j];
      }
      outputs[i] = this.sigmoid(sum);
    }

    return outputs;
  }

  // Clone this network
  clone() {
    const nn = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
    nn.weightsIH = this.copyMatrix(this.weightsIH);
    nn.biasH = [...this.biasH];
    nn.weightsHO = this.copyMatrix(this.weightsHO);
    nn.biasO = [...this.biasO];
    nn.mutationMagnitude = this.mutationMagnitude;
    nn.mutationRate = this.mutationRate;
    return nn;
  }

  copyMatrix(matrix) {
    return matrix.map(row => [...row]);
  }

  // Calculate genomic distance for speciation
  getGenomicDistance(other) {
    let distance = 0;
    let totalParams = 0;

    // Compare input-hidden weights
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        distance += Math.abs(this.weightsIH[i][j] - other.weightsIH[i][j]);
        totalParams++;
      }
      distance += Math.abs(this.biasH[i] - other.biasH[i]);
      totalParams++;
    }

    // Compare hidden-output weights
    for (let i = 0; i < this.outputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        distance += Math.abs(this.weightsHO[i][j] - other.weightsHO[i][j]);
        totalParams++;
      }
      distance += Math.abs(this.biasO[i] - other.biasO[i]);
      totalParams++;
    }

    return distance / totalParams;
  }

  // Blended crossover with another network
  crossover(partner) {
    const child = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);

    const blend = (v1, v2) => {
      const alpha = Math.random();
      return alpha * v1 + (1 - alpha) * v2;
    };

    // Crossover input-hidden weights
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        child.weightsIH[i][j] = blend(this.weightsIH[i][j], partner.weightsIH[i][j]);
      }
      child.biasH[i] = blend(this.biasH[i], partner.biasH[i]);
    }

    // Crossover hidden-output weights
    for (let i = 0; i < this.outputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        child.weightsHO[i][j] = blend(this.weightsHO[i][j], partner.weightsHO[i][j]);
      }
      child.biasO[i] = blend(this.biasO[i], partner.biasO[i]);
    }

    // Blend adaptive mutation parameters
    child.mutationMagnitude = blend(this.mutationMagnitude, partner.mutationMagnitude);
    child.mutationRate = blend(this.mutationRate, partner.mutationRate);

    return child;
  }

  // Mutate weights with adaptive gaussian noise
  mutate() {
    // First, mutate the mutation parameters themselves (meta-evolution)
    if (Math.random() < 0.1) {
      this.mutationMagnitude += this.gaussianRandom() * 0.05;
      this.mutationMagnitude = Math.max(0.01, Math.min(1.0, this.mutationMagnitude));
    }
    if (Math.random() < 0.1) {
      this.mutationRate += this.gaussianRandom() * 0.03;
      this.mutationRate = Math.max(0.01, Math.min(0.5, this.mutationRate));
    }

    const mutateValue = (val) => {
      if (Math.random() < this.mutationRate) {
        return val + this.gaussianRandom() * this.mutationMagnitude;
      }
      return val;
    };

    // Mutate input-hidden weights
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        this.weightsIH[i][j] = mutateValue(this.weightsIH[i][j]);
      }
      this.biasH[i] = mutateValue(this.biasH[i]);
    }

    // Mutate hidden-output weights
    for (let i = 0; i < this.outputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        this.weightsHO[i][j] = mutateValue(this.weightsHO[i][j]);
      }
      this.biasO[i] = mutateValue(this.biasO[i]);
    }
  }
}
