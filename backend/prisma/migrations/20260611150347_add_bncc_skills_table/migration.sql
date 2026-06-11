-- CreateTable
CREATE TABLE "bncc_skills" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "stage" VARCHAR(100) NOT NULL,
    "component" VARCHAR(100),
    "axis" VARCHAR(100),
    "topic" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pedagogical" TEXT,
    "activity" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bncc_skills_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bncc_skills_code_key" ON "bncc_skills"("code");
