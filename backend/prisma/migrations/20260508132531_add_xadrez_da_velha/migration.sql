-- CreateEnum
CREATE TYPE "VelhaGameStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "VelhaResult" AS ENUM ('WHITE_WIN', 'BLACK_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "VelhaGameMode" AS ENUM ('PVP', 'PVC');

-- CreateTable
CREATE TABLE "velha_games" (
    "id" TEXT NOT NULL,
    "room_code" VARCHAR(20) NOT NULL,
    "mode" "VelhaGameMode" NOT NULL DEFAULT 'PVP',
    "status" "VelhaGameStatus" NOT NULL DEFAULT 'WAITING',
    "result" "VelhaResult",
    "boardState" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moves" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "white_id" TEXT,
    "white_name" VARCHAR(255),
    "black_id" TEXT,
    "black_name" VARCHAR(255),
    "ai_level" INTEGER DEFAULT 3,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "velha_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "velha_ranking" (
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

    CONSTRAINT "velha_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "velha_games_room_code_key" ON "velha_games"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "velha_ranking_user_id_key" ON "velha_ranking"("user_id");
