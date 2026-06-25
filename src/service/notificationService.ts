import { prisma } from "../../lib/prisma";
import { NotificationType } from "../../generated/prisma/enums";
import { sendNotificationEmail } from "./emailService";

const waitingClients = new Map<
  number,
  Array<{
    resolve: (value: any) => void;
    timer: ReturnType<typeof setTimeout>;
  }>
>();

export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = {},
}: {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: object;
}) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, metadata, isRead: false },
  });
  const userConnections = waitingClients.get(userId);

  if (userConnections && userConnections.length > 0) {
    userConnections.forEach(({ resolve, timer }) => {
      clearTimeout(timer); 
      resolve({ notifications: [notification] });
    });

    waitingClients.delete(userId);
  }

  const user = await prisma.user.findUnique({
    where: { userId },
    select: { email: true },
  });

  if (user?.email) {
    sendNotificationEmail({
      toEmail: user.email,
      type,
      title,
      message,
    });
  }

  return notification;
}



export function addWaitingClient(
  userId: number,
  clientEntry: {
    resolve: (value: any) => void;
    timer: ReturnType<typeof setTimeout>;
  },
) {
  if (!waitingClients.has(userId)) {
    waitingClients.set(userId, []);
  }
  waitingClients.get(userId)!.push(clientEntry);
}

export function removeWaitingClient(
  userId: number,
  clientEntry: {
    resolve: (value: any) => void;
    timer: ReturnType<typeof setTimeout>;
  },
) {
  const connections = waitingClients.get(userId);
  if (!connections) return;

  const remaining = connections.filter((c) => c !== clientEntry);

  if (remaining.length === 0) {
    waitingClients.delete(userId);
  } else {
    waitingClients.set(userId, remaining);
  }
}
