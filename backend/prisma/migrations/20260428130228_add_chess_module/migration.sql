-- CreateEnum
CREATE TYPE "ChessGameStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "ChessResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "ChessGameMode" AS ENUM ('PVP', 'PVC');

-- CreateTable
CREATE TABLE "chess_games" (
    "id" TEXT NOT NULL,
    "room_code" VARCHAR(20) NOT NULL,
    "mode" "ChessGameMode" NOT NULL DEFAULT 'PVP',
    "status" "ChessGameStatus" NOT NULL DEFAULT 'WAITING',
    "result" "ChessResult",
    "fen" TEXT NOT NULL DEFAULT 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    "moves" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "white_id" TEXT,
    "white_name" VARCHAR(255),
    "black_id" TEXT,
    "black_name" VARCHAR(255),
    "ai_level" INTEGER DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "chess_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chess_ranking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" VARCHAR(255) NOT NULL,
    "school_id" INTEGER,
    "school_name" VARCHAR(255),
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chess_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chess_games_room_code_key" ON "chess_games"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "chess_ranking_user_id_key" ON "chess_ranking"("user_id");
