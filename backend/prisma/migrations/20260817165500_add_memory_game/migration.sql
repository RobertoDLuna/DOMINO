-- CreateEnum
CREATE TYPE "MemoryGameMode" AS ENUM ('SINGLE_PLAYER');

-- CreateTable
CREATE TABLE "memory_games" (
    "id" TEXT NOT NULL,
    "room_code" VARCHAR(20),
    "mode" "MemoryGameMode" NOT NULL DEFAULT 'SINGLE_PLAYER',
    "theme_id" TEXT,
    "user_id" TEXT,
    "user_name" VARCHAR(255),
    "total_pairs" INTEGER NOT NULL DEFAULT 6,
    "pairs_found" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "consecutive_errors" INTEGER NOT NULL DEFAULT 0,
    "time_spent_secs" INTEGER NOT NULL DEFAULT 0,
    "final_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "memory_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memory_ranking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" VARCHAR(255) NOT NULL,
    "school_id" INTEGER,
    "school_name" VARCHAR(255),
    "games_played" INTEGER NOT NULL DEFAULT 0,
    "total_score" INTEGER NOT NULL DEFAULT 0,
    "best_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memory_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "memory_games_room_code_key" ON "memory_games"("room_code");

-- CreateIndex
CREATE UNIQUE INDEX "memory_ranking_user_id_key" ON "memory_ranking"("user_id");

-- AddForeignKey
ALTER TABLE "memory_games" ADD CONSTRAINT "memory_games_theme_id_fkey" FOREIGN KEY ("theme_id") REFERENCES "themes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
