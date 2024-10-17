class TruckModel {
  constructor(params) {
    this.updateParameters(params);
    this.state = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      orientation: { pitch: 0, yaw: 0, roll: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    };
    this.wheels = this.createWheels();
  }

  updateParameters(params) {
    this.mass = params.truckMass;
    this.length = params.truckLength;
    this.width = params.truckWidth;
    this.height = params.truckHeight;
    this.enginePower = params.enginePower;
    this.transmissionEfficiency = params.transmissionEfficiency;
    this.dragCoefficient = params.dragCoefficient;
    this.rollingResistanceCoefficient = params.rollingResistanceCoefficient;
    this.frontalArea = this.width * this.height;
  }

  createWheels() {
    const wheelRadius = 0.5; // meters
    const wheelWidth = 0.3; // meters
    const axleCount = 3;
    const wheels = [];

    for (let i = 0; i < axleCount; i++) {
      const xPosition =
        -this.length / 2 + ((i + 1) * this.length) / (axleCount + 1);
      wheels.push(
        {
          position: { x: xPosition, y: -this.width / 2, z: -this.height / 2 },
          radius: wheelRadius,
          width: wheelWidth,
        },
        {
          position: { x: xPosition, y: this.width / 2, z: -this.height / 2 },
          radius: wheelRadius,
          width: wheelWidth,
        }
      );
    }

    return wheels;
  }

  updateState(newState) {
    this.state = { ...this.state, ...newState };
    this.updateWheelPositions();
  }

  updateWheelPositions() {
    this.wheels.forEach((wheel) => {
      const rotatedPosition = this.rotatePoint(
        wheel.position,
        this.state.orientation.pitch,
        this.state.orientation.yaw,
        this.state.orientation.roll
      );
      wheel.worldPosition = {
        x: this.state.position.x + rotatedPosition.x,
        y: this.state.position.y + rotatedPosition.y,
        z: this.state.position.z + rotatedPosition.z,
      };
    });
  }

  rotatePoint(point, pitch, yaw, roll) {
    // Rotation matrices for pitch, yaw, and roll
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosRoll = Math.cos(roll);
    const sinRoll = Math.sin(roll);

    // Combined rotation matrix
    const rotationMatrix = [
      [cosYaw * cosRoll, -cosYaw * sinRoll, sinYaw],
      [
        sinPitch * sinYaw * cosRoll + cosPitch * sinRoll,
        -sinPitch * sinYaw * sinRoll + cosPitch * cosRoll,
        -sinPitch * cosYaw,
      ],
      [
        -cosPitch * sinYaw * cosRoll + sinPitch * sinRoll,
        cosPitch * sinYaw * sinRoll + sinPitch * cosRoll,
        cosPitch * cosYaw,
      ],
    ];

    // Apply rotation
    return {
      x:
        rotationMatrix[0][0] * point.x +
        rotationMatrix[0][1] * point.y +
        rotationMatrix[0][2] * point.z,
      y:
        rotationMatrix[1][0] * point.x +
        rotationMatrix[1][1] * point.y +
        rotationMatrix[1][2] * point.z,
      z:
        rotationMatrix[2][0] * point.x +
        rotationMatrix[2][1] * point.y +
        rotationMatrix[2][2] * point.z,
    };
  }

  calculateEngineForce() {
    const speed = Math.sqrt(
      this.state.velocity.x ** 2 +
        this.state.velocity.y ** 2 +
        this.state.velocity.z ** 2
    );
    const maxSpeed = 100; // m/s, adjust as needed
    const forceCurve = 1 - (speed / maxSpeed) ** 2;
    return (
      (this.enginePower * this.transmissionEfficiency * forceCurve) /
      Math.max(speed, 0.1)
    );
  }
}

export default TruckModel;
