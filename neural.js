// Neural Network with real matrix math
// Architecture: 8 inputs -> 12 hidden -> 2 outputs

class NeuralNetwork {
  constructor(inputSize = 8, hiddenSize = 12, outputSize = 2) {
    this.inputSize = inputSize;
    this.hiddenSize = hiddenSize;
    this.outputSize = outputSize;

    // Initialize weights with Xavier initialization
    this.weightsIH = this.randomMatrix(hiddenSize, inputSize, inputSize);
    this.biasH = this.randomArray(hiddenSize);
    this.weightsHO = this.randomMatrix(outputSize, hiddenSize, hiddenSize);
    this.biasO = this.randomArray(outputSize);
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
      arr[i] = 0; // Initialize biases to zero
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
    return 1 / (1 + Math.exp(-x));
  }

  // Forward propagation
  forward(inputs) {
    // Input validation
    if (inputs.length !== this.inputSize) {
      console.error(`Expected ${this.inputSize} inputs, got ${inputs.length}`);
      return [0.5, 0.5];
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
    return nn;
  }

  copyMatrix(matrix) {
    return matrix.map(row => [...row]);
  }

  // Uniform crossover with another network
  crossover(partner) {
    const child = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);

    // Crossover input-hidden weights
    for (let i = 0; i < this.hiddenSize; i++) {
      for (let j = 0; j < this.inputSize; j++) {
        child.weightsIH[i][j] = Math.random() < 0.5
          ? this.weightsIH[i][j]
          : partner.weightsIH[i][j];
      }
    }

    // Crossover hidden biases
    for (let i = 0; i < this.hiddenSize; i++) {
      child.biasH[i] = Math.random() < 0.5 ? this.biasH[i] : partner.biasH[i];
    }

    // Crossover hidden-output weights
    for (let i = 0; i < this.outputSize; i++) {
      for (let j = 0; j < this.hiddenSize; j++) {
        child.weightsHO[i][j] = Math.random() < 0.5
          ? this.weightsHO[i][j]
          : partner.weightsHO[i][j];
      }
    }

    // Crossover output biases
    for (let i = 0; i < this.outputSize; i++) {
      child.biasO[i] = Math.random() < 0.5 ? this.biasO[i] : partner.biasO[i];
    }

    return child;
  }

  // Mutate weights with gaussian noise
  mutate(mutationRate) {
    const mutateValue = (val) => {
      if (Math.random() < mutationRate) {
        return val + this.gaussianRandom() * 0.5;
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
