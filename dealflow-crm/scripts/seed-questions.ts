/** Seeds only the PE@Broad MCQ bank. Usage: npm run seed:questions */
import { PrismaClient } from "@prisma/client";
import { seedPebQuestions } from "../prisma/seed/questions-peb-v1";

const prisma = new PrismaClient();
seedPebQuestions(prisma)
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
