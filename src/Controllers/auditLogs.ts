import {prisma} from "../../lib/prisma";
import e from "express";

export async function auditLogs(req:e.Request,res:e.Response){
  try{
    const auditLogs = await prisma.auditLog.findMany({orderBy:{createdAt:'desc'}});
    const serializedLogs = auditLogs.map(log => ({
      ...log,
      auditId: log.auditId.toString(), // Replace 'id' with whatever field is the BigInt
    }));
    return res.status(200).json({auditLogs:serializedLogs, success:true})
  }catch(err){
    console.log(err);
    return res.status(500).json({error:"Error fetching audit logs", success:false})
  }
}