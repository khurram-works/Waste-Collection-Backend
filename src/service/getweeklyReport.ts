import { prisma } from "../../lib/prisma";

function getLast5WorkingDays() {
  const days = [];
  let date = new Date();

  while (days.length < 7) {
    date.setDate(date.getDate() - 1);
    const day = date.getDay();

    const isWorkingDay = day >= 1 && day <= 7;

    if (isWorkingDay) {
      days.push(new Date(date));
    }
  }

  return days.reverse();
}

export async function getPickupStats() {
  const days = getLast5WorkingDays();
  const results = [];

  for (const day of days) {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);

    const end = new Date(day);
    end.setHours(23, 59, 59, 999);

    const [completed, pending, paid] = await Promise.all([
      prisma.pickupRequest.count({
        where: {
          status: {
            in: ["COLLECTED", "VERIFIED"],
          },
          collectionDate: {
            gte: start,
            lte: end,
          },
        },
      }),


      prisma.pickupRequest.count({
        where: {
          status: {
            in: ["PENDING", "ASSIGNED"],
          },
          requestDate: {
            gte: start,
            lte: end,
          },
        },
      }),

      prisma.withdrawalRequest.count({
        where: {
          status: {
            in: ["APPROVED", "PAID"],
          },
          createdAt: {
            gte: start,
            lte: end,
          },
        },
      }),
    ]);

    results.push({
      date: start.toISOString().split("T")[0],
      completed,
      pending,
      paid,
    });
  }


  const formatted = results.map(item => {
    const date = new Date(item.date);

    return {
      label: date.toLocaleDateString("en-US", { weekday: "short" }),
      pending: item.pending,
      collected: item.completed,
      paid: item.paid,
    };
  });


  return formatted;
}
