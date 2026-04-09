-- CreateEnum
CREATE TYPE "WinType" AS ENUM ('NORMAL', 'CARROCA', 'LAILOA', 'LAILOA_CARROCA', 'TRANCOU_MENOS', 'TRANCOU_EMPATE');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ranking_points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "game_matches" (
    "id" TEXT NOT NULL,
    "winner_id" TEXT,
    "win_type" "WinType" NOT NULL,
    "points" INTEGER NOT NULL,
    "room_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_matches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "game_matches" ADD CONSTRAINT "game_matches_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
