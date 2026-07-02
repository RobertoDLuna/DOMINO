-- CreateEnum
CREATE TYPE "TournamentStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TournamentFormat" AS ENUM ('ELIMINATION', 'ROUND_ROBIN');

-- CreateEnum
CREATE TYPE "TournamentGameType" AS ENUM ('CHESS', 'DOMINO', 'QUIZ', 'PEAO', 'VELHA');

-- CreateTable
CREATE TABLE "tournaments" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "game_type" "TournamentGameType" NOT NULL,
    "format" "TournamentFormat" NOT NULL DEFAULT 'ELIMINATION',
    "status" "TournamentStatus" NOT NULL DEFAULT 'OPEN',
    "max_players" INTEGER NOT NULL,
    "created_by_id" TEXT NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournaments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_participants" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" VARCHAR(255) NOT NULL,
    "school_name" VARCHAR(255),
    "seed" INTEGER,
    "final_position" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tournament_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_matches" (
    "id" TEXT NOT NULL,
    "tournament_id" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "player1_id" TEXT,
    "player1_name" VARCHAR(255),
    "player2_id" TEXT,
    "player2_name" VARCHAR(255),
    "winner_id" TEXT,
    "score1" INTEGER,
    "score2" INTEGER,
    "game_room_code" VARCHAR(20),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tournament_ranking" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" VARCHAR(255) NOT NULL,
    "school_id" INTEGER,
    "school_name" VARCHAR(255),
    "championships" INTEGER NOT NULL DEFAULT 0,
    "podiums" INTEGER NOT NULL DEFAULT 0,
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "participated" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tournament_ranking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tournament_participants_tournament_id_user_id_key" ON "tournament_participants"("tournament_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "tournament_ranking_user_id_key" ON "tournament_ranking"("user_id");

-- AddForeignKey
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tournament_matches" ADD CONSTRAINT "tournament_matches_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "tournaments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
