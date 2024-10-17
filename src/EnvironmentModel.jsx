class EnvironmentModel {
  getEnvironment(params, time) {
    return {
      gravity: this.calculateGravity(params.latitude, params.altitude),
      airDensity: this.calculateAirDensity(
        params.temperature,
        params.humidity,
        params.altitude
      ),
      windVector: this.calculateWind(
        params.windSpeed,
        params.windDirection,
        time
      ),
      roadCondition: this.calculateRoadCondition(
        params.roadType,
        params.weather,
        time
      ),
      terrain: this.generateTerrain(params.terrainType, time),
      roadRadius: params.roadRadius,
      altitude: params.altitude,
    };
  }

  calculateGravity(latitude, altitude) {
    const g0 = 9.80665; // m/s^2
    const re = 6371000; // Earth's radius in meters
    return (
      g0 *
      (1 - (2 * altitude) / re) *
      (1 +
        0.0053024 * Math.sin(latitude) ** 2 -
        0.0000058 * Math.sin(2 * latitude) ** 2)
    );
  }

  calculateAirDensity(temperature, humidity, altitude) {
    const p0 = 101325; // Sea level standard atmospheric pressure in Pa
    const T0 = 288.15; // Sea level standard temperature in K
    const L = 0.0065; // Temperature lapse rate in K/m
    const M = 0.0289644; // Molar mass of dry air in kg/mol
    const R = 8.31447; // Universal gas constant in J/(mol·K)
    const g = 9.80665; // Acceleration due to gravity in m/s^2

    const T = T0 - L * altitude;
    const p = p0 * Math.pow(1 - (L * altitude) / T0, (g * M) / (R * L));

    const pv =
      humidity *
      611.2 *
      Math.exp((17.67 * (temperature - 273.15)) / (temperature - 29.65));
    const pd = p - pv;

    return (pd * M + pv * 0.018016) / (R * T);
  }

  calculateWind(windSpeed, windDirection, time) {
    // Add some variability to wind over time
    const variability = 0.1;
    const speed = windSpeed * (1 + variability * Math.sin(time / 10));
    const direction = windDirection + 5 * Math.sin(time / 20);

    return {
      x: speed * Math.cos((direction * Math.PI) / 180),
      y: speed * Math.sin((direction * Math.PI) / 180),
      z: 0,
    };
  }

  calculateRoadCondition(roadType, weather, time) {
    const baseConditions = {
      asphalt: { frictionCoefficient: 0.8 },
      concrete: { frictionCoefficient: 0.7 },
      gravel: { frictionCoefficient: 0.6 },
      dirt: { frictionCoefficient: 0.5 },
    };

    const weatherEffects = {
      clear: 1,
      cloudy: 0.95,
      rainy: 0.7,
      snowy: 0.3,
      icy: 0.1,
    };

    let condition = baseConditions[roadType] || baseConditions.asphalt;
    condition.frictionCoefficient *=
      weatherEffects[weather] || weatherEffects.clear;

    // Add some time-based variability
    condition.frictionCoefficient *= 1 + 0.05 * Math.sin(time / 30);

    return condition;
  }

  generateTerrain(terrainType, time) {
    const terrainTypes = {
      flat: { baseHeight: 0, maxVariation: 0.1, frequency: 0.01 },
      hilly: { baseHeight: 0, maxVariation: 10, frequency: 0.005 },
      mountainous: { baseHeight: 100, maxVariation: 500, frequency: 0.002 },
    };

    const terrain = terrainTypes[terrainType] || terrainTypes.flat;

    return {
      getHeight: (x, y) => {
        const noise = this.perlinNoise(
          x * terrain.frequency,
          y * terrain.frequency,
          time * 0.01
        );
        return terrain.baseHeight + terrain.maxVariation * noise;
      },
      slope: Math.atan(terrain.maxVariation * terrain.frequency),
    };
  }

  perlinNoise(x, y, z) {
    // Simplified Perlin noise implementation
    function fade(t) {
      return t * t * t * (t * (t * 6 - 15) + 10);
    }
    function lerp(t, a, b) {
      return a + t * (b - a);
    }
    function grad(hash, x, y, z) {
      const h = hash & 15;
      const u = h < 8 ? x : y;
      const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
      return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }

    const p = new Array(512);
    for (let i = 0; i < 256; i++)
      p[i] = p[i + 256] = Math.floor(Math.random() * 256);

    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = fade(x);
    const v = fade(y);
    const w = fade(z);

    const A = p[X] + Y,
      AA = p[A] + Z,
      AB = p[A + 1] + Z;
    const B = p[X + 1] + Y,
      BA = p[B] + Z,
      BB = p[B + 1] + Z;

    return lerp(
      w,
      lerp(
        v,
        lerp(u, grad(p[AA], x, y, z), grad(p[BA], x - 1, y, z)),
        lerp(u, grad(p[AB], x, y - 1, z), grad(p[BB], x - 1, y - 1, z))
      ),
      lerp(
        v,
        lerp(u, grad(p[AA + 1], x, y, z - 1), grad(p[BA + 1], x - 1, y, z - 1)),
        lerp(
          u,
          grad(p[AB + 1], x, y - 1, z - 1),
          grad(p[BB + 1], x - 1, y - 1, z - 1)
        )
      )
    );
  }
}

export default EnvironmentModel;
