import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const { valueItems } = await import("../src/content/items.ts");
  const { defaultValueCurrencySettings } = await import("../src/lib/valueCurrency.ts");

  await prisma.valueSetting.upsert({
    create: {
      data: defaultValueCurrencySettings,
      id: "market",
    },
    update: {
      data: defaultValueCurrencySettings,
    },
    where: { id: "market" },
  });

  for (const item of valueItems) {
    await prisma.valueItem.upsert({
      create: {
        data: item,
        id: item.id,
      },
      update: {
        data: item,
      },
      where: { id: item.id },
    });
  }

  console.log(`Seeded ${valueItems.length} value items into Supabase.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
