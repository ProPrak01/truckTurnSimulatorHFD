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
} from "recharts";

const TruckTurnSimulator = () => {
  const [params, setParams] = useState({
    mass: 12000, // kg
    h_cg: 1.2, // meters
    wheelbase: 4.5, // meters
    trackWidth: 2.5, // meters
    frictionCoeff: 0.8,
    radius: 10, // meters
    bankAngle: 5, // degrees
    grade: 10, // degrees
    steeringAngle: 15, // degrees
    suspensionStiffness: 50000, // N/m
    dampingCoefficient: 5000, // Ns/m
    rollCenterHeight: 0.5, // meters
    airDensity: 1.225, // kg/m³
    dragCoefficient: 0.8,
    frontalArea: 10, // m²
    enginePower: 300, // kW
    transmissionEfficiency: 0.9,
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
    const theta = (bankAngle * Math.PI) / 180;
    const alpha = (grade * Math.PI) / 180;

    const lateralAcc =
      (params.frictionCoeff * g * Math.cos(alpha)) /
      (1 + (params.h_cg * Math.sin(theta)) / radius);

    return Math.sqrt(radius * lateralAcc);
  };

  const calculateRollAngle = (lateralAcceleration) => {
    const rollStiffness = params.suspensionStiffness * params.trackWidth ** 2;
    const rollMoment = params.mass * params.h_cg * lateralAcceleration;
    return (Math.atan(rollMoment / rollStiffness) * 180) / Math.PI;
  };

  const calculateLateralAcceleration = (speed, radius) => {
    return speed ** 2 / radius;
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

  const updateResults = () => {
    const maxSpeed = calculateMaxSafeSpeed(
      params.radius,
      params.bankAngle,
      params.grade
    );
    const staticRolloverThreshold = params.trackWidth / (2 * params.h_cg);
    const loadTransferRatio =
      (params.mass * (maxSpeed ** 2 / params.radius) * params.h_cg) /
      (params.trackWidth *
        params.mass *
        g *
        Math.cos((params.bankAngle * Math.PI) / 180) *
        Math.cos((params.grade * Math.PI) / 180));
    const sideSlipMargin =
      params.frictionCoeff *
        g *
        Math.cos((params.bankAngle * Math.PI) / 180) *
        Math.cos((params.grade * Math.PI) / 180) -
      maxSpeed ** 2 / params.radius;

    const lateralAcceleration = calculateLateralAcceleration(
      maxSpeed,
      params.radius
    );
    const rollAngle = calculateRollAngle(lateralAcceleration);
    const tractionLimit = calculateTractionLimit();

    setResults({
      maxSpeed: maxSpeed * 3.6, // Convert to km/h
      staticRolloverThreshold,
      loadTransferRatio,
      sideSlipMargin,
      rollAngle,
      lateralAcceleration,
      tractionLimit,
    });

    // Generate speed data for different radii
    const newSpeedData = [];
    for (let r = 20; r <= 100; r += 5) {
      const speed = calculateMaxSafeSpeed(r, params.bankAngle, params.grade);
      newSpeedData.push({ radius: r, speed: speed * 3.6 });
    }
    setSpeedData(newSpeedData);

    // Update trajectory data
    const trajectoryData = simulateTrajectory(
      params.radius,
      maxSpeed * speedFactor,
      params.bankAngle,
      params.grade
    );
    setTrajectoryData(trajectoryData);
  };

  useEffect(() => {
    updateResults();
    // Animate truck turning
    const interval = setInterval(() => {
      setTruckAngle((prevAngle) => (prevAngle + 1) % 360);
      setSimulationTime((prevTime) => prevTime + 0.1);
    }, 50);
    return () => clearInterval(interval);
  }, [params, speedFactor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const scale = 5;

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

  return (
    <div className="p-8 max-w-7xl mx-auto bg-gradient-to-br from-gray-100 to-white rounded-xl shadow-2xl border border-gray-200 transition-all duration-300 hover:shadow-lg hover:border-blue-300">
      <h1 className="text-5xl font-extrabold mb-12 text-center text-blue-700 tracking-tight">
        Truck Turn Simulator
      </h1>

      {/* Parameters and Results Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Parameters Card */}
        <div className="bg-white p-8 rounded-lg shadow-md transform hover:scale-105 transition duration-300">
          <h2 className="text-3xl font-semibold mb-6 text-gray-800">
            Parameters
          </h2>
          <div className="grid grid-cols-2 gap-6">
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {key}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Results Card */}
        <div className="bg-white p-8 rounded-lg shadow-md transform hover:scale-105 transition duration-300">
          <h2 className="text-3xl font-semibold mb-6 text-gray-800">Results</h2>
          <ul className="space-y-3">
            {Object.entries(results).map(([key, value]) => (
              <li key={key} className="flex justify-between text-lg">
                <span className="text-gray-600">{key}:</span>
                <span className="font-semibold text-blue-600">
                  {value.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Visualization and Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-12">
        {/* Truck Visualization Card */}
        <div className="bg-white p-8 rounded-lg shadow-md transform hover:scale-105 transition duration-300">
          <h2 className="text-3xl font-semibold mb-6 text-gray-800">
            Truck Visualization
          </h2>
          <TruckVisualization />
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
        <div className="bg-white p-8 rounded-lg shadow-md transform hover:scale-105 transition duration-300">
          <h2 className="text-3xl font-semibold mb-6 text-gray-800">
            Speed vs. Turn Radius
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={speedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="radius"
                label={{ value: "Turn Radius (m)", position: "bottom" }}
                tick={{ fill: "#4B5563" }}
              />
              <YAxis
                label={{
                  value: "Max Safe Speed (km/h)",
                  angle: -90,
                  position: "left",
                  fill: "#4B5563",
                }}
                tick={{ fill: "#4B5563" }}
              />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#3b82f6"
                strokeWidth={3}
                dot={{ stroke: "#3b82f6", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Truck Trajectory Simulation Section */}
      <div className="bg-white p-8 rounded-lg shadow-md transform hover:scale-105 transition duration-300">
        <h2 className="text-3xl font-semibold mb-6 text-gray-800">
          Truck Trajectory Simulation
        </h2>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Speed Factor
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
          <span className="text-sm text-gray-600 mt-2 block">
            Current Speed Factor: {speedFactor.toFixed(2)}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width="600"
          height="400"
          className="mx-auto border border-gray-300 rounded-md"
        />
      </div>
    </div>
  );
};

export default TruckTurnSimulator;
