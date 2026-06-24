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
    // ── STEP 1: Check if there's already new data waiting ──────────────
    // This handles the case where the user was offline and notifications
    // piled up in the database. We send them immediately without holding.
    // const existing = await prisma.notification.findMany({
    //   where: {
    //     userId,
    //     id: { gt: lastId }, // "gt" means "greater than" — only new ones
    //   },
    //   orderBy: { createdAt: "asc" },
    // });

    // if (existing.length > 0) {
    //   // There's already data. No need to wait. Respond immediately.
    //   res.json({ notifications: existing });
    //   return;
    // }

    // ── STEP 2: No new data yet. HOLD the request. ──────────────────────
    // We create a Promise and store its `resolve` function in the waiting room.
    // This request literally freezes here — Node.js is free to handle
    // other requests while this one is suspended.
    const result = await new Promise<{ notifications: any[] } | null>((resolve) => {
      // Set a 28-second timeout. If nothing happens, we send an empty response.
      // The client will immediately reconnect and ask again. This is normal.
      const timer = setTimeout(() => {
        removeWaitingClient(userId, clientEntry);
        resolve({ notifications: [] }); // empty = "nothing new, please reconnect"
      }, 30000);

      const clientEntry = { resolve, timer };

      // Add this connection to the waiting room.
      // If createNotification() runs for this userId, it will call resolve()
      // from the notificationService, which wakes up this frozen Promise.
      addWaitingClient(userId, clientEntry);

      // If the user closes their browser tab, clean up so we don't leak memory.
      req.on("close", () => {
        clearTimeout(timer);
        removeWaitingClient(userId, clientEntry);
        resolve(null); // null tells us not to try sending a response
      });
    });

    // ── STEP 3: The Promise woke up. Send the response. ─────────────────
    // result is null only when the browser tab was closed. In that case,
    // the connection is gone and we cannot send anything.
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