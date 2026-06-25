import { prisma } from "../../lib/prisma";
import { Role,AuditAction,AuditTargetType } from "../../generated/prisma/enums";

type AuditLogParams = {
  userId?: number;
  userRole?: Role;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  oldValue?: any;
  newValue?: any;
  req?: any;
  status?: "SUCCESS" | "FAILED";
};

export async function auditLogger(params: AuditLogParams) {
  await prisma.auditLog.create({
    data: {
      userId: params.userId,
      userRole: params.userRole,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      oldValue: params.oldValue,
      newValue: params.newValue,
      ipAddress: params.req?.ip,
      userAgent: params.req?.headers["user-agent"],
      status: params.status || "SUCCESS"
    }
  });
}