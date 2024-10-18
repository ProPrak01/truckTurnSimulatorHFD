import React, { useState, useEffect, useRef } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

const TruckTurnSimulator = () => {
  const [params, setParams] = useState({
    mass: 16000, // kg
    h_cg: 1.2, // meters
    wheelbase: 4.2, // meters
    trackWidth: 2.0, // meters
    frictionCoeff: 0.7,
    radius: 40, // meters
    bankAngle: 5, // degrees
    grade: 10, // degrees
    steeringAngle: 35, // degrees
    suspensionStiffness: 400000, // N/m
    dampingCoefficient: 15000, // Ns/m
    rollCenterHeight: 0.5, // meters
    airDensity: 1.225, // kg/m³
    dragCoefficient: 0.8,
    frontalArea: 9, // m²
    enginePower: 180, // kW
    transmissionEfficiency: 0.85,
  });

  const [results, setResults] = useState({
    maxSpeed: 0,
    staticRolloverThreshold: 0,
    loadTransferRatio: 0,
    sideSlipMargin: 0,
    rollAngle: 0,
    lateralAcceleration: 0,
    tractionLimit: 0,
  });
  const [suspensionData, setSuspensionData] = useState({
    verticalDisplacement: [],
    rollEnergy: [],
  });

  const [tireForces, setTireForces] = useState({
    frontLeft: 0,
    frontRight: 0,
    rearLeft: 0,
    rearRight: 0,
  });

  const [energyMetrics, setEnergyMetrics] = useState({
    kineticEnergy: 0,
    potentialEnergy: 0,
    rollingResistance: 0,
    aerodynamicLoss: 0,
    totalEnergyConsumption: 0,
  });

  const [speedData, setSpeedData] = useState([]);
  const [truckAngle, setTruckAngle] = useState(0);
  const [trajectoryData, setTrajectoryData] = useState({
    ideal: [],
    actual: [],
  });
  const [speedFactor, setSpeedFactor] = useState(1.0);
  const [simulationTime, setSimulationTime] = useState(0);

  const canvasRef = useRef(null);

  const g = 9.81; // gravitational acceleration (m/s²)

  const calculateMaxSafeSpeed = (radius, bankAngle, grade) => {
    const theta = (bankAngle * Math.PI) / 180; // bank angle in radians
    const alpha = (grade * Math.PI) / 180; // grade angle in radians

    // Corrected formula considering banking effect
    const numerator =
      g * radius * (params.frictionCoeff * Math.cos(theta) + Math.sin(theta));
    const denominator =
      Math.cos(theta) - params.frictionCoeff * Math.sin(theta);

    return Math.sqrt(numerator / denominator);
  };
  const calculateRollAngle = (lateralAcceleration) => {
    const rollStiffness = params.suspensionStiffness * params.trackWidth ** 2;
    const rollMoment = params.mass * params.h_cg * lateralAcceleration;
    return (Math.atan(rollMoment / rollStiffness) * 180) / Math.PI;
  };

  const calculateLateralAcceleration = (speed, radius, bankAngle) => {
    const theta = (bankAngle * Math.PI) / 180;
    // Corrected lateral acceleration with banking
    return speed ** 2 / radius - g * Math.sin(theta);
  };

  const calculateTractionLimit = () => {
    return params.frictionCoeff * params.mass * g;
  };

  const calculateAerodynamicDrag = (speed) => {
    return (
      0.5 *
      params.airDensity *
      params.dragCoefficient *
      params.frontalArea *
      speed ** 2
    );
  };

  const simulateTrajectory = (radius, speed, bankAngle, grade) => {
    const dt = 0.1; // Time step
    const simulationDuration = 10; // Total simulation time
    const steps = Math.floor(simulationDuration / dt);

    let x = 0;
    let y = 0;
    let heading = 0;
    let v = speed;

    const xIdeal = [];
    const yIdeal = [];
    const xActual = [];
    const yActual = [];

    for (let i = 0; i < steps; i++) {
      const time = i * dt;
      const idealX = radius * Math.cos((v * time) / radius);
      const idealY = radius * Math.sin((v * time) / radius);
      xIdeal.push(idealX);
      yIdeal.push(idealY);

      // Calculate forces
      const lateralAcceleration = calculateLateralAcceleration(v, radius);
      const rollAngle = calculateRollAngle(lateralAcceleration);
      const tractionForce = calculateTractionLimit();
      const dragForce = calculateAerodynamicDrag(v);

      // Update velocity
      const accelerationMagnitude =
        (params.enginePower * params.transmissionEfficiency * 1000) /
          (params.mass * v) -
        dragForce / params.mass;
      v += accelerationMagnitude * dt;

      // Update position and heading
      const angularVelocity = v / radius;
      heading += angularVelocity * dt;
      x += v * Math.cos(heading) * dt;
      y += v * Math.sin(heading) * dt;

      xActual.push(x);
      yActual.push(y);
    }

    return {
      ideal: xIdeal.map((x, i) => ({ x, y: yIdeal[i] })),
      actual: xActual.map((x, i) => ({ x, y: yActual[i] })),
    };
  };
  const calculateSuspensionDynamics = (speed, time, bankAngle) => {
    const data = [];
    const bankRadians = (bankAngle * Math.PI) / 180;
    const baseDisplacement = (Math.sin(bankRadians) * params.trackWidth) / 2;

    // Generate more data points for smoother animation
    for (let t = 0; t <= 10; t += 0.1) {
      // Enhanced suspension movement simulation
      const lateralAccel = (speed * speed) / params.radius;
      const rollInfluence = (lateralAccel * params.h_cg) / params.trackWidth;

      // Combine multiple oscillation effects
      const displacement =
        baseDisplacement +
        0.05 *
          Math.exp((-params.dampingCoefficient * t) / params.mass) *
          Math.cos(Math.sqrt(params.suspensionStiffness / params.mass) * t) +
        rollInfluence * Math.sin((2 * Math.PI * t) / 5);

      // Calculate suspension energy
      const springForce = params.suspensionStiffness * displacement;
      const dampingForce = params.dampingCoefficient * (displacement / 0.1); // approximate velocity
      const suspensionEnergy =
        0.5 * params.suspensionStiffness * displacement * displacement;

      // Add data point
      data.push({
        time: t.toFixed(1),
        displacement: displacement.toFixed(4),
        velocity: (displacement / 0.1).toFixed(4),
        energy: (suspensionEnergy / 1000).toFixed(2), // Convert to kJ
        springForce: springForce.toFixed(0),
        dampingForce: dampingForce.toFixed(0),
      });
    }

    return data;
  };

  const calculateTireForces = (lateralAcceleration, rollAngle) => {
    const weightPerWheel = (params.mass * g) / 4;
    const bankRadians = (params.bankAngle * Math.PI) / 180;
    const rollRadians = (rollAngle * Math.PI) / 180;

    // Calculate combined roll moment from lateral acceleration and banking
    const rollMoment =
      params.mass *
      params.h_cg *
      (lateralAcceleration * Math.cos(bankRadians) + g * Math.sin(bankRadians));

    // Calculate load transfer considering banking
    const loadTransfer =
      (rollMoment / params.trackWidth) * Math.cos(rollRadians);

    return {
      frontLeft: weightPerWheel - loadTransfer * 0.6,
      frontRight: weightPerWheel + loadTransfer * 0.6,
      rearLeft: weightPerWheel - loadTransfer * 0.4,
      rearRight: weightPerWheel + loadTransfer * 0.4,
    };
  };

  const calculateEnergyMetrics = (speed, bankAngle) => {
    const speedMs = speed / 3.6; // Convert to m/s
    const bankRadians = (bankAngle * Math.PI) / 180;
    const gradeRadians = (params.grade * Math.PI) / 180;

    // Calculate kinetic energy
    const kineticEnergy = 0.5 * params.mass * speedMs * speedMs;

    // Calculate potential energy considering both grade and banking
    const heightChange =
      Math.sin(gradeRadians) * params.radius +
      ((1 - Math.cos(bankRadians)) * params.trackWidth) / 2;
    const potentialEnergy = params.mass * g * heightChange;

    // Calculate rolling resistance considering banking and grade
    const normalForce =
      params.mass * g * Math.cos(gradeRadians) * Math.cos(bankRadians);
    const rollingResistance = 0.01 * normalForce * params.radius;

    // Calculate aerodynamic loss
    const airResistance = calculateAerodynamicDrag(speedMs) * params.radius;

    return {
      kineticEnergy,
      potentialEnergy,
      rollingResistance,
      aerodynamicLoss: airResistance,
      totalEnergyConsumption:
        kineticEnergy + potentialEnergy + rollingResistance + airResistance,
    };
  };
  const updateResults = () => {
    // Calculate maximum safe speed considering banking and grade
    const maxSpeed = calculateMaxSafeSpeed(
      params.radius,
      params.bankAngle,
      params.grade
    );

    // Calculate lateral acceleration with banking effect
    const lateralAcceleration = calculateLateralAcceleration(
      maxSpeed,
      params.radius,
      params.bankAngle
    );

    // Calculate static rollover threshold with banking consideration
    const staticRolloverThreshold =
      (params.trackWidth / (2 * params.h_cg)) *
      Math.cos((params.bankAngle * Math.PI) / 180);

    // Calculate load transfer ratio considering banking and grade
    const bankRadians = (params.bankAngle * Math.PI) / 180;
    const gradeRadians = (params.grade * Math.PI) / 180;

    const loadTransferRatio =
      (params.mass * lateralAcceleration * params.h_cg) /
      (params.trackWidth *
        params.mass *
        g *
        Math.cos(bankRadians) *
        Math.cos(gradeRadians));

    // Calculate side slip margin with banking effect
    const sideSlipMargin =
      params.frictionCoeff *
        g *
        Math.cos(bankRadians) *
        Math.cos(gradeRadians) -
      lateralAcceleration;

    // Calculate roll angle based on lateral acceleration and banking
    const rollAngle =
      calculateRollAngle(lateralAcceleration) + params.bankAngle;

    // Calculate traction limit considering grade and banking
    const tractionLimit =
      params.frictionCoeff *
      params.mass *
      g *
      Math.cos(bankRadians) *
      Math.cos(gradeRadians);

    setResults({
      maxSpeed: maxSpeed * 3.6, // Convert to km/h
      staticRolloverThreshold,
      loadTransferRatio,
      sideSlipMargin,
      rollAngle,
      lateralAcceleration,
      tractionLimit,
    });

    // Generate speed vs radius data with banking consideration
    const newSpeedData = [];
    for (let r = 20; r <= 100; r += 5) {
      const speed = calculateMaxSafeSpeed(r, params.bankAngle, params.grade);
      newSpeedData.push({ radius: r, speed: speed * 3.6 });
    }
    setSpeedData(newSpeedData);

    // Update trajectory simulation
    const trajectoryData = simulateTrajectory(
      params.radius,
      maxSpeed * speedFactor,
      params.bankAngle,
      params.grade
    );
    setTrajectoryData(trajectoryData);

    // Calculate suspension dynamics with banking effect
    const suspensionData = calculateSuspensionDynamics(
      maxSpeed,
      simulationTime,
      params.bankAngle
    );
    setSuspensionData(suspensionData);

    // Calculate tire forces considering banking and load transfer
    const newTireForces = calculateTireForces(lateralAcceleration, rollAngle);
    setTireForces(newTireForces);

    // Calculate energy metrics with banking consideration
    const newEnergyMetrics = calculateEnergyMetrics(maxSpeed, params.bankAngle);
    setEnergyMetrics(newEnergyMetrics);
  };

  useEffect(() => {
    updateResults();
    const suspensionData = calculateSuspensionDynamics(
      results.maxSpeed,
      simulationTime,
      params.bankAngle
    );
    setSuspensionData(suspensionData);
    // Animate truck turning
    const interval = setInterval(() => {
      setTruckAngle((prevAngle) => (prevAngle + 1) % 360);
      setSimulationTime((prevTime) => prevTime + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, [params, speedFactor, simulationTime]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const scale = 1.2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(scale, -scale);

    // Draw ideal path
    ctx.beginPath();
    ctx.strokeStyle = "#000";
    ctx.setLineDash([5, 5]);
    trajectoryData.ideal.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    // Draw actual path
    ctx.beginPath();
    ctx.strokeStyle = "#f00";
    ctx.setLineDash([]);
    trajectoryData.actual.forEach((point, i) => {
      if (i === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.stroke();

    ctx.restore();
  }, [trajectoryData]);

  const handleParamChange = (name, value) => {
    setParams((prevParams) => ({ ...prevParams, [name]: parseFloat(value) }));
  };
  const TruckVisualization = () => {
    const scale = 2;
    const truckLength = params.wheelbase * scale;
    const truckWidth = params.trackWidth * scale;
    const centerX = 150;
    const centerY = 150;
    const turnRadius = params.radius * scale;

    // Calculate truck tilt based on roll angle
    const truckTilt = results.rollAngle;

    return (
      <svg width="300" height="300" viewBox="0 0 300 300">
        {/* Turn radius */}
        <circle
          cx={centerX}
          cy={centerY}
          r={turnRadius}
          fill="none"
          stroke="#ddd"
          strokeWidth="1"
        />

        {/* Truck */}
        <g transform={`rotate(${truckAngle}, ${centerX}, ${centerY})`}>
          <g
            transform={`translate(${centerX}, ${
              centerY - turnRadius
            }) rotate(${truckTilt})`}
          >
            {/* Truck body */}
            <rect
              x={-truckWidth / 2}
              y={-truckLength / 2}
              width={truckWidth}
              height={truckLength}
              fill="#3b82f6"
              stroke="#2563eb"
              strokeWidth="2"
            />
            {/* Wheels */}
            <circle
              cx={-truckWidth / 2}
              cy={-truckLength / 2}
              r={3}
              fill="#000"
            />
            <circle
              cx={truckWidth / 2}
              cy={-truckLength / 2}
              r={3}
              fill="#000"
            />
            <circle
              cx={-truckWidth / 2}
              cy={truckLength / 2}
              r={3}
              fill="#000"
            />
            <circle
              cx={truckWidth / 2}
              cy={truckLength / 2}
              r={3}
              fill="#000"
            />
            {/* Center of gravity */}
            <circle cx={0} cy={0} r={2} fill="#ff0000" />
            {/* Steering angle indicator */}
            <line
              x1={0}
              y1={-truckLength / 2}
              x2={Math.sin((params.steeringAngle * Math.PI) / 180) * 20}
              y2={
                -truckLength / 2 -
                Math.cos((params.steeringAngle * Math.PI) / 180) * 20
              }
              stroke="#00ff00"
              strokeWidth="2"
            />
          </g>
        </g>
      </svg>
    );
  };
  const SuspensionGraph = () => {
    // Format tooltip values
    const CustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-white p-2 border border-gray-200 rounded shadow-sm">
            <p className="text-sm">Time: {label}s</p>
            {payload.map((entry, index) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {entry.value}
              </p>
            ))}
          </div>
        );
      }
      return null;
    };

    return (
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-2 text-gray-800">
          Suspension Dynamics
        </h2>
        <div className="grid grid-cols-1 gap-4">
          {/* Displacement Graph */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">
              Displacement & Energy
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={suspensionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis
                  dataKey="time"
                  label={{ value: "Time (s)", position: "bottom" }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  label={{
                    value: "Displacement (m)",
                    angle: -90,
                    position: "insideLeft",
                  }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  label={{
                    value: "Energy (kJ)",
                    angle: 90,
                    position: "insideRight",
                  }}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="displacement"
                  stroke="#3b82f6"
                  dot={false}
                  name="Displacement"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="energy"
                  stroke="#ef4444"
                  dot={false}
                  name="Energy"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Forces Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-sm font-medium text-gray-600">
                Spring Force (N)
              </p>
              <p className="text-lg font-bold text-blue-600">
                {suspensionData[Math.floor(simulationTime * 10)]?.springForce ||
                  "0"}
              </p>
            </div>
            <div className="bg-gray-50 p-2 rounded">
              <p className="text-sm font-medium text-gray-600">
                Damping Force (N)
              </p>
              <p className="text-lg font-bold text-blue-600">
                {suspensionData[Math.floor(simulationTime * 10)]
                  ?.dampingForce || "0"}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TireForcesCard = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">
        Tire Forces (N)
      </h2>
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(tireForces).map(([wheel, force]) => (
          <div key={wheel} className="text-center p-2 bg-gray-50 rounded">
            <div className="text-sm font-medium text-gray-600">{wheel}</div>
            <div className="text-lg font-bold text-blue-600">
              {force.toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const EnergyConsumptionCard = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm border-2 border-grey mt-2">
      <h2 className="text-xl font-semibold mb-2 text-gray-800">
        Energy Analysis (kJ)
      </h2>
      <ul className="space-y-1 text-sm">
        {Object.entries(energyMetrics).map(([metric, value]) => (
          <li key={metric} className="flex justify-between">
            <span className="text-gray-600">
              {metric.replace(/([A-Z])/g, " $1").trim()}:
            </span>
            <span className="font-semibold text-blue-600">
              {(value / 1000).toFixed(2)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="p-4 mx-auto bg-gradient-to-br from-gray-100 to-white shadow-lg">
      <h1 className="text-3xl font-bold mb-4 text-center text-blue-700">
        Truck Turn Simulator HFD
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Parameters Section */}
        <div className="bg-white p-4 rounded-lg shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Parameters
          </h2>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <label className="text-xs font-medium text-gray-700">
                  {key}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  className="w-full px-2 py-1 bg-gray-50 border border-gray-300 rounded-sm text-xs"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">Results</h2>
          <ul className="space-y-1 text-sm">
            {Object.entries(results).map(([key, value]) => (
              <li key={key} className="flex justify-between">
                <span className="text-gray-600">{key}:</span>
                <span className="font-semibold text-blue-600">
                  {value.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
          <EnergyConsumptionCard />
        </div>

        {/* Truck Visualization Section */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Truck Visualization
          </h2>
          <TruckVisualization />
          <div className="mt-2">
            <label className="block text-xs font-medium text-gray-700">
              Simulation Time: {simulationTime.toFixed(1)} s
            </label>
            <input
              type="range"
              min="0"
              max="10"
              step="0.1"
              value={simulationTime}
              onChange={(e) => setSimulationTime(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
        </div>

        {/* Speed vs. Turn Radius Chart */}
        <div className="bg-white p-4 rounded-lg shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Speed vs. Turn Radius
          </h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="radius" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Truck Trajectory Simulation */}
        <div className="bg-white p-4 rounded-lg shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
          <h2 className="text-xl font-semibold mb-2 text-gray-800">
            Trajectory Simulation
          </h2>
          <div className="flex items-center mb-2">
            <label className="text-xs font-medium text-gray-700 mr-2 whitespace-nowrap">
              Speed Factor: {speedFactor.toFixed(2)}x
            </label>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.05"
              value={speedFactor}
              onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
              className="w-full accent-blue-600"
            />
          </div>
          <canvas
            ref={canvasRef}
            width="300"
            height="200"
            className="w-full border border-gray-300 rounded-md"
          />
        </div>
        <SuspensionGraph />
        <TireForcesCard />
      </div>
    </div>
  );
};

export default TruckTurnSimulator;
