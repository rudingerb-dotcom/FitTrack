import { PrismaClient } from '@prisma/client';
import { createDefaultExercises } from '../src/lib/default-exercises';

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding default global exercises...");
  await createDefaultExercises();
  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
