-- CreateEnum
CREATE TYPE "PeaoGameStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "PeaoResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "PeaoGameMode" AS ENUM ('PVP', 'PVC');

-- CreateTable
CREATE TABLE "peao_games" (
    "id" TEXT NOT NULL,
    "room_code" VARCHAR(20) NOT NULL,
    "mode" "PeaoGameMode" NOT NULL DEFAULT 'PVP',
    "status" "PeaoGameStatus" NOT NULL DEFAULT 'WAITING',
    "result" "PeaoResult",
    "moves" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "white_id" TEXT,
    "white_name" VARCHAR(255),
    "black_id" TEXT,
    "black_name" VARCHAR(255),
    "ai_level" INTEGER DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "peao_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "peao_ranking" (
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

    CONSTRAINT "peao_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "peao_games_room_code_key" ON "peao_games"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "peao_ranking_user_id_key" ON "peao_ranking"("user_id");
