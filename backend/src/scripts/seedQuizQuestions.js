require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const digitais = require("../data/quiz-seed/digitais");
const matematica = require("../data/quiz-seed/matematica");
const portugues = require("../data/quiz-seed/portugues");

async function seed() {
  console.log("🌱 Starting Quiz Seed...");

  try {
    // 1. Ensure we have an admin user to own these quizzes
    let admin = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });

    if (!admin) {
      console.log("⚠️ No ADMIN user found. Creating a default admin for seed...");
      admin = await prisma.user.create({
        data: {
          fullName: 'EduGames Admin',
          email: 'admin_quiz@edugames.local',
          password: 'hashed_password_placeholder', // Dummy password
          role: 'ADMIN'
        }
      });
    }

    // Function to process a subject array
    const processSubject = async (subjectName, data) => {
      console.log(`\n📚 Processing ${subjectName}...`);
      
      // Group by yearGrade
      const grouped = data.reduce((acc, curr) => {
        if (!acc[curr.yearGrade]) acc[curr.yearGrade] = [];
        acc[curr.yearGrade].push(curr);
        return acc;
      }, {});

      for (const [grade, questions] of Object.entries(grouped)) {
        const quizTitle = `Banco BNCC - ${subjectName} (${grade})`;
        
        // Check if exists
        const existing = await prisma.quizGame.findFirst({
          where: { title: quizTitle }
        });

        if (existing) {
          console.log(`⏭️  Skipping existing: ${quizTitle}`);
          continue;
        }

        // Create Quiz Game
        await prisma.quizGame.create({
          data: {
            title: quizTitle,
            description: `Questões oficiais BNCC para ${subjectName} - ${grade}`,
            type: 'PEDAGOGICO',
            discipline: subjectName,
            educStage: questions[0].educStage,
            yearGrade: grade,
            isPublic: true, // Visible to all teachers
            createdById: admin.id,
            questions: {
              create: questions.map((q, qIndex) => ({
                bnccCode: q.bnccCode,
                bnccSkill: q.bnccSkill,
                questionText: q.questionText,
                order: qIndex,
                answers: {
                  create: q.answers.map((a, aIndex) => ({
                    answerText: a.answerText,
                    isCorrect: a.isCorrect,
                    order: aIndex
                  }))
                }
              }))
            }
          }
        });
        console.log(`✅ Created: ${quizTitle} with ${questions.length} questions.`);
      }
    };

    await processSubject('Competências Digitais', digitais);
    await processSubject('Matemática', matematica);
    await processSubject('Língua Portuguesa', portugues);

    console.log("\n✨ Quiz Seed completed successfully!");

  } catch (error) {
    console.error("❌ Error during Quiz Seed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
