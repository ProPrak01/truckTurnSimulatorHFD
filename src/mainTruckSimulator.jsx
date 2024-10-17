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
  });

  const [results, setResults] = useState({
    maxSpeed: 0,
    staticRolloverThreshold: 0,
    loadTransferRatio: 0,
    sideSlipMargin: 0,
  });

  const [speedData, setSpeedData] = useState([]);
  const [truckAngle, setTruckAngle] = useState(0);
  const [trajectoryData, setTrajectoryData] = useState({
    ideal: [],
    actual: [],
  });
  const [speedFactor, setSpeedFactor] = useState(1.0);

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

  const simulateTrajectory = (radius, speed, bankAngle, grade) => {
    const arcAngle = Array.from(
      { length: 50 },
      (_, i) => (i * Math.PI) / (2 * 49)
    );
    const xIdeal = arcAngle.map((angle) => radius * Math.cos(angle));
    const yIdeal = arcAngle.map((angle) => radius * Math.sin(angle));

    const xStraight = Array.from(
      { length: 20 },
      (_, i) => -radius + (i * radius) / 19
    );
    const yStraight = new Array(20).fill(0);

    const xIdealFull = [...xStraight, ...xIdeal];
    const yIdealFull = [...yStraight, ...yIdeal];

    const xActual = [...xIdealFull];
    const yActual = [...yIdealFull];

    const actualPathLength = xActual.length;
    const deviationFactor = speed ** 2 / (radius * params.frictionCoeff * g);

    for (let i = 1; i < actualPathLength; i++) {
      if (i >= 5) {
        const deviation = deviationFactor * 0.05 * (i / actualPathLength) ** 2;
        if (i - 1 < arcAngle.length) {
          xActual[i] += deviation * (1 + Math.sin(arcAngle[i - 1]) * 1.5);
          yActual[i] += deviation * 1.5;
        }
      }
    }

    return {
      ideal: xIdealFull.map((x, i) => ({ x, y: yIdealFull[i] })),
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

    setResults({
      maxSpeed: maxSpeed * 3.6, // Convert to km/h
      staticRolloverThreshold,
      loadTransferRatio,
      sideSlipMargin,
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
          <rect
            x={centerX - truckWidth / 2}
            y={centerY - turnRadius - truckLength / 2}
            width={truckWidth}
            height={truckLength}
            fill="#3b82f6"
            stroke="#2563eb"
            strokeWidth="2"
          />
          {/* Wheels */}
          <circle
            cx={centerX - truckWidth / 2}
            cy={centerY - turnRadius - truckLength / 2}
            r={2}
            fill="#000"
          />
          <circle
            cx={centerX + truckWidth / 2}
            cy={centerY - turnRadius - truckLength / 2}
            r={2}
            fill="#000"
          />
          <circle
            cx={centerX - truckWidth / 2}
            cy={centerY - turnRadius + truckLength / 2}
            r={2}
            fill="#000"
          />
          <circle
            cx={centerX + truckWidth / 2}
            cy={centerY - turnRadius + truckLength / 2}
            r={2}
            fill="#000"
          />
        </g>
      </svg>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto bg-white rounded-lg shadow-lg border border-gray-300">
      <h1 className="text-4xl font-bold mb-8 text-center text-blue-600">
        Truck Turn Simulator
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Parameters
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(params).map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key}
                </label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => handleParamChange(key, e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Results</h2>
          <ul className="space-y-2">
            {Object.entries(results).map(([key, value]) => (
              <li key={key} className="flex justify-between">
                <span className="text-gray-600">{key}:</span>
                <span className="font-semibold text-blue-600">
                  {value.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
            Truck Visualization
          </h2>
          <TruckVisualization />
        </div>
        <div className="bg-gray-50 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">
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
      <div className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Truck Trajectory Simulation
        </h2>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Speed Factor
          </label>
          <input
            type="range"
            min="0.2"
            max="3.0"
            step="0.05"
            value={speedFactor}
            onChange={(e) => setSpeedFactor(parseFloat(e.target.value))}
            className="w-full"
          />
          <span className="text-sm text-gray-600">
            Current Speed Factor: {speedFactor.toFixed(2)}
          </span>
        </div>
        <canvas
          ref={canvasRef}
          width="600"
          height="400"
          className="mx-auto border border-gray-300"
        />
      </div>
    </div>
  );
};

export default TruckTurnSimulator;
