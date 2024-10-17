import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import TruckSimulator from "./TruckSimulator";
import TruckTurnSimulator from "./mainTruckSimulator";
function App() {
  const [count, setCount] = useState(0);

  return <TruckTurnSimulator />;
}

export default App;
