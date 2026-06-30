import {prisma} from "../lib/prisma"

async function main() {
  await prisma.zone.createMany({
    data: [
      {
        name: "North Zone",
        description: "Northern operational zone",
        city: "Lahore",
      },
      {
        name: "South Zone",
        description: "Southern operational zone",
        city: "Lahore",
      },
      {
        name: "East Zone",
        city: "Lahore",
      },
      {
        name: "West Zone",
        city: "Lahore",
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Zones seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });