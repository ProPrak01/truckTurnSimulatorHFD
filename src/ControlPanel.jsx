import React from "react";

const ControlPanel = ({ params, onParamChange }) => {
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    onParamChange({ ...params, [name]: parseFloat(value) });
  };

  const handleSelectChange = (e) => {
    const { name, value } = e.target;
    onParamChange({ ...params, [name]: value });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        gap: "10px",
      }}
    >
      <div>
        <label>Truck Mass (kg):</label>
        <input
          type="number"
          name="truckMass"
          value={params.truckMass}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Truck Length (m):</label>
        <input
          type="number"
          name="truckLength"
          value={params.truckLength}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Truck Width (m):</label>
        <input
          type="number"
          name="truckWidth"
          value={params.truckWidth}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Truck Height (m):</label>
        <input
          type="number"
          name="truckHeight"
          value={params.truckHeight}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Engine Power (kW):</label>
        <input
          type="number"
          name="enginePower"
          value={params.enginePower}
          onChange={handleInputChange}
        />
      </div>
      <div>
        <label>Transmission Efficiency:</label>
        <input
          type="number"
          name="transmissionEfficiency"
          value={params.transmissionEfficiency}
          onChange={handleInputChange}
          step="0.01"
          min="0"
          max="1"
        />
      </div>
      <div>
        <label>Drag Coefficient:</label>
        <input
          type="number"
          name="dragCoefficient"
          value={params.dragCoefficient}
          onChange={handleInputChange}
          step="0.01"
          min="0"
          max="2"
        />
      </div>
      <div>
        <label>Rolling Resistance Coefficient:</label>
        <input
          type="number"
          name="rollingResistanceCoefficient"
          value={params.rollingResistanceCoefficient}
          onChange={handleInputChange}
          step="0.001"
          min="0"
          max="0.1"
        />
      </div>
      <div>
        <label>Road Radius (m):</label>
        <input
          type="number"
          name="roadRadius"
          value={params.roadRadius}
          onChange={handleInputChange}
          min="0"
        />
      </div>
      <div>
        <label>Road Bank Angle (degrees):</label>
        <input
          type="number"
          name="roadBankAngle"
          value={params.roadBankAngle}
          onChange={handleInputChange}
          min="-45"
          max="45"
        />
      </div>
      <div>
        <label>Road Grade (degrees):</label>
        <input
          type="number"
          name="roadGrade"
          value={params.roadGrade}
          onChange={handleInputChange}
          min="-45"
          max="45"
        />
      </div>
      <div>
        <label>Latitude (degrees):</label>
        <input
          type="number"
          name="latitude"
          value={params.latitude}
          onChange={handleInputChange}
          min="-90"
          max="90"
        />
      </div>
      <div>
        <label>Altitude (m):</label>
        <input
          type="number"
          name="altitude"
          value={params.altitude}
          onChange={handleInputChange}
          min="0"
          max="8848"
        />
      </div>
      <div>
        <label>Temperature (°C):</label>
        <input
          type="number"
          name="temperature"
          value={params.temperature}
          onChange={handleInputChange}
          min="-50"
          max="50"
        />
      </div>
      <div>
        <label>Humidity (%):</label>
        <input
          type="number"
          name="humidity"
          value={params.humidity * 100}
          onChange={(e) =>
            handleInputChange({
              target: {
                name: "humidity",
                value: parseFloat(e.target.value) / 100,
              },
            })
          }
          min="0"
          max="100"
        />
      </div>
      <div>
        <label>Wind Speed (m/s):</label>
        <input
          type="number"
          name="windSpeed"
          value={params.windSpeed}
          onChange={handleInputChange}
          min="0"
          max="100"
        />
      </div>
      <div>
        <label>Wind Direction (degrees):</label>
        <input
          type="number"
          name="windDirection"
          value={params.windDirection}
          onChange={handleInputChange}
          min="0"
          max="359"
        />
      </div>
      <div>
        <label>Road Type:</label>
        <select
          name="roadType"
          value={params.roadType}
          onChange={handleSelectChange}
        >
          <option value="asphalt">Asphalt</option>
          <option value="concrete">Concrete</option>
          <option value="gravel">Gravel</option>
          <option value="dirt">Dirt</option>
        </select>
      </div>
      <div>
        <label>Weather:</label>
        <select
          name="weather"
          value={params.weather}
          onChange={handleSelectChange}
        >
          <option value="clear">Clear</option>
          <option value="cloudy">Cloudy</option>
          <option value="rainy">Rainy</option>
          <option value="snowy">Snowy</option>
          <option value="icy">Icy</option>
        </select>
      </div>
      <div>
        <label>Terrain Type:</label>
        <select
          name="terrainType"
          value={params.terrainType}
          onChange={handleSelectChange}
        >
          <option value="flat">Flat</option>
          <option value="hilly">Hilly</option>
          <option value="mountainous">Mountainous</option>
        </select>
      </div>
    </div>
  );
};

export default ControlPanel;
