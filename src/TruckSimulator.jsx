import React, { useState, useEffect, useRef } from "react";
import PhysicsEngine from "./PhysicsEngine";
import EnvironmentModel from "./EnvironmentModel";
import TruckModel from "./TruckModel";
import Visualizer from "./Visualizer";
import ControlPanel from "./ControlPanel";

const TruckSimulator = () => {
  const [simulationState, setSimulationState] = useState({
    time: 0,
    isRunning: false,
    data: [],
  });
  const [params, setParams] = useState({
    truckMass: 15000, // kg
    truckLength: 16, // m
    truckWidth: 2.5, // m
    truckHeight: 4, // m
    enginePower: 400, // kW
    transmissionEfficiency: 0.9,
    dragCoefficient: 0.7,
    rollingResistanceCoefficient: 0.01,
    roadRadius: 100, // m
    roadBankAngle: 5, // degrees
    roadGrade: 3, // degrees
    latitude: 45, // degrees
    altitude: 500, // m
    temperature: 20, // Celsius
    humidity: 0.5, // 50%
    windSpeed: 10, // m/s
    windDirection: 45, // degrees
    roadType: "asphalt",
    weather: "clear",
    terrainType: "hilly",
  });

  const physicsEngine = useRef(new PhysicsEngine());
  const environmentModel = useRef(new EnvironmentModel());
  const truckModel = useRef(new TruckModel(params));

  useEffect(() => {
    let animationFrameId;

    const runSimulation = () => {
      if (simulationState.isRunning) {
        const deltaTime = 1 / 60; // Assuming 60 FPS
        const environment = environmentModel.current.getEnvironment(
          params,
          simulationState.time
        );
        const forces = physicsEngine.current.calculateForces(
          truckModel.current,
          environment
        );
        const newState = physicsEngine.current.integrateState(
          truckModel.current,
          forces,
          deltaTime
        );

        truckModel.current.updateState(newState);

        setSimulationState((prevState) => ({
          ...prevState,
          time: prevState.time + deltaTime,
          data: [...prevState.data, { time: prevState.time, ...newState }],
        }));

        animationFrameId = requestAnimationFrame(runSimulation);
      }
    };

    if (simulationState.isRunning) {
      animationFrameId = requestAnimationFrame(runSimulation);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [simulationState.isRunning, params]);

  const handleParamChange = (newParams) => {
    setParams(newParams);
    truckModel.current.updateParameters(newParams);
  };

  const toggleSimulation = () => {
    setSimulationState((prevState) => ({
      ...prevState,
      isRunning: !prevState.isRunning,
    }));
  };

  return (
    <div>
      <h1>Advanced Truck Simulator</h1>
      <ControlPanel params={params} onParamChange={handleParamChange} />
      <button onClick={toggleSimulation}>
        {simulationState.isRunning ? "Pause" : "Start"} Simulation
      </button>
      <Visualizer
        truckModel={truckModel.current}
        environmentModel={environmentModel.current}
        simulationData={simulationState.data}
      />
    </div>
  );
};

export default TruckSimulator;
