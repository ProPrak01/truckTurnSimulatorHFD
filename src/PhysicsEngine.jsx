class PhysicsEngine {
  calculateForces(truck, environment) {
    const gravity = this.calculateGravity(truck, environment);
    const drag = this.calculateDrag(truck, environment);
    const rolling = this.calculateRollingResistance(truck, environment);
    const traction = this.calculateTraction(truck, environment);
    const lateral = this.calculateLateralForces(truck, environment);
    const suspension = this.calculateSuspensionForces(truck, environment);

    return { gravity, drag, rolling, traction, lateral, suspension };
  }

  calculateGravity(truck, environment) {
    const g = 9.81 * (1 - (2 * environment.altitude) / 6.371e6);
    return {
      x: 0,
      y: -truck.mass * g * Math.sin(environment.terrain.slope),
      z: -truck.mass * g * Math.cos(environment.terrain.slope),
    };
  }

  calculateDrag(truck, environment) {
    const relativeVelocity = {
      x: truck.state.velocity.x - environment.windVector.x,
      y: truck.state.velocity.y - environment.windVector.y,
      z: truck.state.velocity.z - environment.windVector.z,
    };
    const speed = Math.sqrt(
      relativeVelocity.x ** 2 +
        relativeVelocity.y ** 2 +
        relativeVelocity.z ** 2
    );
    const dragMagnitude =
      0.5 *
      environment.airDensity *
      truck.dragCoefficient *
      truck.frontalArea *
      speed ** 2;
    return {
      x: (-dragMagnitude * relativeVelocity.x) / speed,
      y: (-dragMagnitude * relativeVelocity.y) / speed,
      z: (-dragMagnitude * relativeVelocity.z) / speed,
    };
  }

  calculateRollingResistance(truck, environment) {
    const normalForce = this.calculateNormalForce(truck, environment);
    const resistanceMagnitude =
      truck.rollingResistanceCoefficient * normalForce;
    const speed = Math.sqrt(
      truck.state.velocity.x ** 2 +
        truck.state.velocity.y ** 2 +
        truck.state.velocity.z ** 2
    );
    return {
      x:
        speed > 0 ? (-resistanceMagnitude * truck.state.velocity.x) / speed : 0,
      y:
        speed > 0 ? (-resistanceMagnitude * truck.state.velocity.y) / speed : 0,
      z:
        speed > 0 ? (-resistanceMagnitude * truck.state.velocity.z) / speed : 0,
    };
  }

  calculateTraction(truck, environment) {
    const engineForce = truck.calculateEngineForce();
    const tractionLimit = this.calculateTractionLimit(truck, environment);
    const tractionMagnitude = Math.min(engineForce, tractionLimit);
    return {
      x:
        tractionMagnitude *
        Math.cos(truck.state.orientation.yaw) *
        Math.cos(environment.terrain.slope),
      y:
        tractionMagnitude *
        Math.sin(truck.state.orientation.yaw) *
        Math.cos(environment.terrain.slope),
      z: tractionMagnitude * Math.sin(environment.terrain.slope),
    };
  }

  calculateLateralForces(truck, environment) {
    const lateralAcceleration =
      truck.state.velocity.x ** 2 / environment.roadRadius;
    const lateralForce = truck.mass * lateralAcceleration;
    return {
      x: -lateralForce * Math.sin(truck.state.orientation.yaw),
      y: lateralForce * Math.cos(truck.state.orientation.yaw),
      z: 0,
    };
  }

  calculateSuspensionForces(truck, environment) {
    // Simplified suspension model
    const suspensionStiffness = 100000; // N/m
    const suspensionDamping = 10000; // Ns/m
    const restLength = 0.5; // m

    const suspensionForce = truck.wheels.map((wheel) => {
      const compression = Math.max(
        0,
        restLength -
          (wheel.position.z -
            environment.terrain.getHeight(wheel.position.x, wheel.position.y))
      );
      const velocity = -truck.state.velocity.z;
      return suspensionStiffness * compression + suspensionDamping * velocity;
    });

    return {
      x: 0,
      y: 0,
      z: suspensionForce.reduce((sum, force) => sum + force, 0),
    };
  }

  calculateNormalForce(truck, environment) {
    const g = 9.81 * (1 - (2 * environment.altitude) / 6.371e6);
    return truck.mass * g * Math.cos(environment.terrain.slope);
  }

  calculateTractionLimit(truck, environment) {
    const normalForce = this.calculateNormalForce(truck, environment);
    return environment.roadCondition.frictionCoefficient * normalForce;
  }

  integrateState(truck, forces, deltaTime) {
    const totalForce = {
      x:
        forces.gravity.x +
        forces.drag.x +
        forces.rolling.x +
        forces.traction.x +
        forces.lateral.x,
      y:
        forces.gravity.y +
        forces.drag.y +
        forces.rolling.y +
        forces.traction.y +
        forces.lateral.y,
      z:
        forces.gravity.z +
        forces.drag.z +
        forces.rolling.z +
        forces.traction.z +
        forces.lateral.z +
        forces.suspension.z,
    };

    const acceleration = {
      x: totalForce.x / truck.mass,
      y: totalForce.y / truck.mass,
      z: totalForce.z / truck.mass,
    };

    const newVelocity = {
      x: truck.state.velocity.x + acceleration.x * deltaTime,
      y: truck.state.velocity.y + acceleration.y * deltaTime,
      z: truck.state.velocity.z + acceleration.z * deltaTime,
    };

    const newPosition = {
      x: truck.state.position.x + newVelocity.x * deltaTime,
      y: truck.state.position.y + newVelocity.y * deltaTime,
      z: truck.state.position.z + newVelocity.z * deltaTime,
    };

    // Calculate angular acceleration and update orientation
    const angularAcceleration = this.calculateAngularAcceleration(
      truck,
      forces
    );
    const newAngularVelocity = {
      x: truck.state.angularVelocity.x + angularAcceleration.x * deltaTime,
      y: truck.state.angularVelocity.y + angularAcceleration.y * deltaTime,
      z: truck.state.angularVelocity.z + angularAcceleration.z * deltaTime,
    };

    const newOrientation = {
      pitch: truck.state.orientation.pitch + newAngularVelocity.x * deltaTime,
      yaw: truck.state.orientation.yaw + newAngularVelocity.y * deltaTime,
      roll: truck.state.orientation.roll + newAngularVelocity.z * deltaTime,
    };

    return {
      position: newPosition,
      velocity: newVelocity,
      acceleration: acceleration,
      orientation: newOrientation,
      angularVelocity: newAngularVelocity,
    };
  }

  calculateAngularAcceleration(truck, forces) {
    // Simplified angular acceleration calculation
    const torque = {
      x: (forces.lateral.z * truck.height) / 2,
      y: ((forces.traction.x - forces.drag.x) * truck.height) / 2,
      z: (forces.lateral.x * truck.height) / 2,
    };

    const inertia = {
      x: (truck.mass * (truck.width ** 2 + truck.height ** 2)) / 12,
      y: (truck.mass * (truck.length ** 2 + truck.height ** 2)) / 12,
      z: (truck.mass * (truck.length ** 2 + truck.width ** 2)) / 12,
    };

    return {
      x: torque.x / inertia.x,
      y: torque.y / inertia.y,
      z: torque.z / inertia.z,
    };
  }
}

export default PhysicsEngine;
