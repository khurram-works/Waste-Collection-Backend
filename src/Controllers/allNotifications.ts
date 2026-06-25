import { Request, Response } from "express";
import { prisma } from "../../lib/prisma";
import { addWaitingClient, removeWaitingClient } from "../service/notificationService";


export async function getnotifications(req: Request, res: Response) {
  const userId = Number(req.user?.id)

  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  const lastId = parseInt(req.query.lastId as string) || 0;

  try {
    const result = await new Promise<{ notifications: any[] } | null>((resolve) => {
      const timer = setTimeout(() => {
        removeWaitingClient(userId, clientEntry);
        resolve({ notifications: [] });
      }, 30000);

      const clientEntry = { resolve, timer };

      addWaitingClient(userId, clientEntry);

      req.on("close", () => {
        clearTimeout(timer);
        removeWaitingClient(userId, clientEntry);
        resolve(null);
      });
    });


    if (result !== null && !res.writableEnded) {
      res.json(result);
    }
  } catch (error) {
    console.error("[getnotifications] Error:", error);
    if (!res.writableEnded) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
}

export async function getUnreadNotifications(req: Request, res: Response) {
  const userId = Number(req.user?.id);
  
  if (isNaN(userId)) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }

  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId,
        isRead: false, 
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ notifications });
  } catch (error) {
    console.error("[getUnreadNotifications] Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}