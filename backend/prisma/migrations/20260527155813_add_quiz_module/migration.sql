-- CreateEnum
CREATE TYPE "QuizType" AS ENUM ('PEDAGOGICO', 'COMEMORATIVO');

-- CreateEnum
CREATE TYPE "QuizStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'LIVE', 'ASYNC', 'FINISHED');

-- CreateEnum
CREATE TYPE "StudentLevel" AS ENUM ('INICIANTE', 'EM_CONSTRUCAO', 'PROFICIENTE', 'AVANCADO');

-- CreateTable
CREATE TABLE "quiz_games" (
    "id" TEXT NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "type" "QuizType" NOT NULL DEFAULT 'PEDAGOGICO',
    "status" "QuizStatus" NOT NULL DEFAULT 'DRAFT',
    "discipline" VARCHAR(100),
    "educStage" VARCHAR(50),
    "yearGrade" VARCHAR(20),
    "time_per_question" INTEGER NOT NULL DEFAULT 30,
    "room_code" VARCHAR(20),
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "shuffle_questions" BOOLEAN NOT NULL DEFAULT true,
    "shuffle_answers" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quiz_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "bncc_code" VARCHAR(30),
    "bncc_skill" TEXT,
    "question_text" TEXT NOT NULL,
    "image_url" VARCHAR(500),
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_answers" (
    "id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_sessions" (
    "id" TEXT NOT NULL,
    "quiz_id" TEXT NOT NULL,
    "user_id" TEXT,
    "user_name" VARCHAR(255) NOT NULL,
    "school_id" INTEGER,
    "total_questions" INTEGER NOT NULL DEFAULT 0,
    "correct_answers" INTEGER NOT NULL DEFAULT 0,
    "total_points" INTEGER NOT NULL DEFAULT 0,
    "time_spent_secs" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "student_level" "StudentLevel",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_responses" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "answer_id" TEXT,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,
    "time_taken_secs" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_games_room_code_key" ON "quiz_games"("room_code");

-- AddForeignKey
ALTER TABLE "quiz_games" ADD CONSTRAINT "quiz_games_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_answers" ADD CONSTRAINT "quiz_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_sessions" ADD CONSTRAINT "quiz_sessions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quiz_games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_responses" ADD CONSTRAINT "quiz_responses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "quiz_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_responses" ADD CONSTRAINT "quiz_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_responses" ADD CONSTRAINT "quiz_responses_answer_id_fkey" FOREIGN KEY ("answer_id") REFERENCES "quiz_answers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
