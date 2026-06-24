import { prisma } from "../../lib/prisma";
import { Role, RouteType, UserStatus } from "../../generated/prisma/enums";
import bcrypt from 'bcrypt'
import { worker } from "node:cluster";
import { auditLogger } from "../utils/auditLogger";
import { maskSensitiveData } from "../utils/maskSensitiveData";


export class WorkerService{

  async findWorkerByEmail(email: string){
    try{
      const Worker = await prisma.user.findUnique({where: { email }});
      return Worker;
    }catch(error){
      console.error("Failed to find the User.", error);
      throw error;
    }
  }

  async createWorker(name: string, email: string, phone: string, zoneId: number, vehicle: string, assignedRoute: string, status: string, password: string,req:any){
    try{
      const hashedPassword = await bcrypt.hash(password, 10);
      const newWorker = await prisma.user.create({
        data: {name,email,phone,zoneId,vehicle,status: UserStatus.ACTIVE ,password:hashedPassword,role:Role.WORKER, responsibleFor: assignedRoute === "recycling" ? RouteType.recycling : RouteType.landfill}
      })
      await auditLogger({
        userId: newWorker.userId,
        userRole: newWorker.role,
        action: "CREATE",
        targetType: "USER",
        targetId: String(newWorker.userId),
        newValue: maskSensitiveData(newWorker),
        status: "SUCCESS",
        req

      })
      return newWorker;
    }catch(error){
      await auditLogger({
        action: "CREATE",
        targetType: "USER",
        status: "FAILED",
        req
      }).catch(() => {});
      console.error("Failed to create Worker.", error);
      throw error;
    }
  }

}