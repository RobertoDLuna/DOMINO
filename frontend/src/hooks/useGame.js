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
        scores
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
        passTurn,
        makeMove,
        startGame,
        setGameState,
        setMyHand,
        setBoard,
        setCurrentTurn,
        iWon,
        gameOverMsg,
        winner,
        scores
    };
};

export default useGame;
