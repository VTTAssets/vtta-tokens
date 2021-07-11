class Dimension {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }

  diagonalLength() {
    return Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2));
  }
}

export default Dimension;
