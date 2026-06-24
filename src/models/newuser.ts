import { prisma } from "../../lib/prisma";
import { Role, UserStatus } from '../../generated/prisma/client';
import bcrypt from 'bcrypt';
import { auditLogger } from "../utils/auditLogger";
import { maskSensitiveData } from "../utils/maskSensitiveData";

export class Userservice {


  async findUserByEmail(email: string){
    try{
      const User = await prisma.user.findUnique({where: { email }});
      return User;
    }catch(error){
      console.error("Failed to find the User.", error);
      throw error;
    }
  }

  async createUser(name: string, email: string, password:string, address: string, zoneId:number,req:any){
    
    try{
      const hashedPassword = await bcrypt.hash(password, 10);
      const User = await prisma.user.create({
        data: {name, email, password: hashedPassword, address, role: Role.CITIZEN, status:UserStatus.ACTIVE,zoneId,},
      })

      await auditLogger({
        userId: User.userId,
        userRole: User.role,
        action: "CREATE",
        targetType: "USER",
        targetId: String(User.userId),
        newValue: maskSensitiveData(User),
        req
      });

      return User;
    }catch (error) {
      await auditLogger({
        action: "CREATE",
        targetType: "USER",
        status: "FAILED",
        req
      }).catch(() => {});
      console.error("Failed to create user:", error);
      throw error; 
    }
  }

  async deleteUser(email: string) {
    try {
      const deletedUser = await prisma.user.delete({
        where: { email },
      });
      return deletedUser; 
    } catch (error) {
      console.error("Failed to delete user:", error);
      throw error; 
    }
  }
  
}
