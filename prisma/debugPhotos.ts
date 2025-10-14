import { PrismaClient } from "@prisma/client";

async function main() {
  const prisma = new PrismaClient();

  try {
    const photos = await prisma.photo.findMany({
      select: { id: true, imageUrl: true },
      orderBy: { imageUrl: "asc" },
    });

    console.log(`Found ${photos.length} photos`);
    for (const photo of photos) {
      console.log(`${photo.id}: ${photo.imageUrl}`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
