import React from "react";
import { GameProvider } from "./context/GameContext";
import GameContainer from "./components/GameContainer";

/**
 * Main App Entry Point
 * Wraps the application in necessary providers and renders the main container.
 */
function App() {
  return (
    <GameProvider>
       <GameContainer />
    </GameProvider>
  );
}

export default App;
