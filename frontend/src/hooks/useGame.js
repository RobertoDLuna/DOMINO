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
        startingPieceId,
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
        lobbyTheme,
        maxPlayers,
        myId,
        playerId,
        forceEndGame,
        playAgain,
        updateMaxPlayers,
        selectTheme,
        isConnected
    } = useGameContext();

    return {
        room,
        players,
        gameState,
        myHand,
        board,
        currentTurn,
        startingPieceId,
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
        lobbyTheme,
        maxPlayers,
        myId,
        playerId,
        selectTheme,
        isConnected
    };
};

export default useGame;
