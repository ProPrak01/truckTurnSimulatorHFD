import React, { useState, useEffect } from "react";
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
    mass: 40000, // kg
    wheelbase: 6.5, // meters
    trackWidth: 2.5, // meters
    cgHeight: 2.0, // meters
    frictionCoeff: 0.7,
    radius: 50, // meters
    bankAngle: 5, // degrees
    grade: 3, // degrees
  });

  const [results, setResults] = useState({
    maxSpeed: 0,
    staticRolloverThreshold: 0,
    loadTransferRatio: 0,
    sideSlipMargin: 0,
  });

  const [speedData, setSpeedData] = useState([]);
  const [truckAngle, setTruckAngle] = useState(0);

  const g = 9.81; // gravitational acceleration (m/s²)

  const calculateMaxSpeed = (radius, bankAngle, grade) => {
    const bankRad = (bankAngle * Math.PI) / 180;
    const gradeRad = (grade * Math.PI) / 180;

    const gLateral = g * Math.sin(bankRad);
    const gNormal = g * Math.cos(bankRad) * Math.cos(gradeRad);

    const solveForSpeed = (v) => {
      const aCent = v ** 2 / radius;
      const FzTotal = params.mass * gNormal;
      const FyRequired = params.mass * (aCent - gLateral);
      const deltaFz =
        (params.mass * aCent * params.cgHeight) / params.trackWidth;
      const FzInner = FzTotal / 2 - deltaFz;
      const FFriction = params.frictionCoeff * FzTotal;

      return Math.min(FFriction - Math.abs(FyRequired), FzInner);
    };

    let maxSpeed = 0;
    for (let v = 0; v <= 50; v += 0.1) {
      if (solveForSpeed(v) > 0) {
        maxSpeed = v;
      } else {
        break;
      }
    }

    return maxSpeed;
  };

  const updateResults = () => {
    const maxSpeed = calculateMaxSpeed(
      params.radius,
      params.bankAngle,
      params.grade
    );
    const staticRolloverThreshold = params.trackWidth / (2 * params.cgHeight);
    const loadTransferRatio =
      (params.mass * (maxSpeed ** 2 / params.radius) * params.cgHeight) /
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
      const speed = calculateMaxSpeed(r, params.bankAngle, params.grade);
      newSpeedData.push({ radius: r, speed: speed * 3.6 });
    }
    setSpeedData(newSpeedData);
  };

  useEffect(() => {
    updateResults();
    // Animate truck turning
    const interval = setInterval(() => {
      setTruckAngle((prevAngle) => (prevAngle + 1) % 360);
    }, 50);
    return () => clearInterval(interval);
  }, [params]);

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
    </div>
  );
};

export default TruckTurnSimulator;
