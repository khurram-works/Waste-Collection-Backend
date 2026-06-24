import {prisma} from "../../lib/prisma";
import e from "express";


export async function updateNotifications(req:e.Request, res: e.Response){
  try{
      const id = Number(req.params.id);
    
      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });
    
      return res.status(200).json({ success: true });
  }catch(err){
    console.log(err);
    return res.status(500).json({error:"Failed to update the notification", success: false})
  }
}