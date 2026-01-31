// Neural Network with real matrix math

class NeuralNetwork {
  constructor(inputSize = 12, hiddenSize = 10, outputSize = 4) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    // Initialize weights with Xavier initialization
    this.weightsIH = this.randomMatrix(hiddenSize, inputSize, inputSize);
    this.biasH = this.randomArray(hiddenSize);
    this.weightsHO = this.randomMatrix(outputSize, hiddenSize, hiddenSize);
    this.biasO = this.randomArray(outputSize);

    this.mutationRate = 0.15;
    this.mutationMagnitude = 0.3;
  }

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

  gaussianRandom() {
    let u1 = Math.random();
    let u2 = Math.random();
    while (u1 === 0) u1 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  tanh(x) {
    return Math.tanh(x);
  }

  sigmoid(x) {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  forward(inputs) {
    if (inputs.length !== this.inputSize) {
      return new Array(this.outputSize).fill(0.5);
    }

    // Sanitize inputs
    for (let i = 0; i < inputs.length; i++) {
      if (!isFinite(inputs[i])) inputs[i] = 0;
    }

    // Hidden layer
    const hidden = [];
    for (let i = 0; i < this.hiddenSize; i++) {
      let sum = this.biasH[i] || 0;
      for (let j = 0; j < this.inputSize; j++) {
        sum += (this.weightsIH[i][j] || 0) * inputs[j];
      }
      hidden[i] = this.tanh(sum);
    }

    // Output layer
    const outputs = [];
    for (let i = 0; i < this.outputSize; i++) {
      let sum = this.biasO[i] || 0;
      for (let j = 0; j < this.hiddenSize; j++) {
        sum += (this.weightsHO[i][j] || 0) * hidden[j];
      }
      outputs[i] = this.sigmoid(sum);
    }

    return outputs;
  }

  // Flatten all weights into a single array
  getWeights() {
    const weights = [];

    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        weights.push(this.weightsIH[i][j]);
      }
      weights.push(this.biasH[i]);
    }

    for (let i = 0; i < this.outputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        weights.push(this.weightsHO[i][j]);
      }
      weights.push(this.biasO[i]);
    }

    return weights;
  }

  // Set weights from a flat array
  setWeights(weights) {
    if (!weights || weights.length === 0) return;

    let idx = 0;

    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        this.weightsIH[i][j] = weights[idx++] || 0;
      }
      this.biasH[i] = weights[idx++] || 0;
    }

    for (let i = 0; i < this.outputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        this.weightsHO[i][j] = weights[idx++] || 0;
      }
      this.biasO[i] = weights[idx++] || 0;
    }
  }

  clone() {
    const nn = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
    nn.setWeights(this.getWeights());
    nn.mutationRate = this.mutationRate;
    nn.mutationMagnitude = this.mutationMagnitude;
    return nn;
  }

  crossover(partner) {
    const child = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);
    const w1 = this.getWeights();
    const w2 = partner.getWeights();
    const childWeights = [];

    for (let i = 0; i < w1.length; i++) {
      // Blend weights
      const alpha = Math.random();
      childWeights.push(alpha * w1[i] + (1 - alpha) * w2[i]);
    }

    child.setWeights(childWeights);
    child.mutationRate = (this.mutationRate + partner.mutationRate) / 2;
    child.mutationMagnitude = (this.mutationMagnitude + partner.mutationMagnitude) / 2;

    return child;
  }

  mutate() {
    // Mutate mutation parameters
    if (Math.random() < 0.1) {
      this.mutationMagnitude += this.gaussianRandom() * 0.05;
      this.mutationMagnitude = Math.max(0.05, Math.min(0.8, this.mutationMagnitude));
    }
    if (Math.random() < 0.1) {
      this.mutationRate += this.gaussianRandom() * 0.03;
      this.mutationRate = Math.max(0.05, Math.min(0.4, this.mutationRate));
    }

    // Mutate weights
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        if (Math.random() < this.mutationRate) {
          this.weightsIH[i][j] += this.gaussianRandom() * this.mutationMagnitude;
        }
      }
      if (Math.random() < this.mutationRate) {
        this.biasH[i] += this.gaussianRandom() * this.mutationMagnitude;
      }
    }

    for (let i = 0; i < this.outputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        if (Math.random() < this.mutationRate) {
          this.weightsHO[i][j] += this.gaussianRandom() * this.mutationMagnitude;
        }
      }
      if (Math.random() < this.mutationRate) {
        this.biasO[i] += this.gaussianRandom() * this.mutationMagnitude;
      }
    }
  }
}
