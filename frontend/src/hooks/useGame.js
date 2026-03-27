import { useGameContext } from "../context/GameContext";
import { socket } from "../services/socket";

const useGame = () => {
    const {
        room,
        players,
        gameState,
        myHand,
        board,
        currentTurn,
        createRoom,
        joinRoom,
        leaveRoom,
        passTurn,
        startGame,
        makeMove,
        setGameState,
        setMyHand,
        setBoard,
        setCurrentTurn,
        iWon,
        gameOverMsg,
        winner,
        scores,
        currentTheme,
        maxPlayers,
        myId, // <--- PEGANDO DO CONTEXT
        forceEndGame,
        playAgain,
        updateMaxPlayers,
        isConnected
    } = useGameContext();

    return {
        room,
        players,
        gameState,
        myHand,
        board,
        currentTurn,
        createRoom,
        joinRoom,
        leaveRoom,
        passTurn,
        forceEndGame,
        playAgain,
        updateMaxPlayers,
        makeMove,
        startGame,
        setGameState,
        setMyHand,
        setBoard,
        setCurrentTurn,
        iWon,
        gameOverMsg,
        winner,
        scores,
        currentTheme,
        maxPlayers,
        myId, // <--- EXPORTANDO
        isConnected
    };
};

export default useGame;
