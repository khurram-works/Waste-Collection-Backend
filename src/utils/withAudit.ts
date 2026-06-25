import { auditLogger } from "./auditLogger";
import { maskSensitiveData } from "./maskSensitiveData";
import { AuditAction, AuditTargetType } from "../../generated/prisma/enums";

type WithAuditParams = {
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string;
  user: any;
  req?: any;
  getOldValue?: () => Promise<any>;
  operation: () => Promise<any>;
};

export async function withAudit({
  action,
  targetType,
  targetId,
  user,
  req,
  getOldValue,
  operation,
}: WithAuditParams) {
  let oldValue = null;
  if (getOldValue) {
    oldValue = await getOldValue();
  }

  try {
    const result = await operation();
    await auditLogger({
      userId: user.id,
      userRole: user.role,
      action,
      targetType,
      targetId,
      oldValue: maskSensitiveData(oldValue),
      newValue: maskSensitiveData(result),
      req,
      status: "SUCCESS",
    });

    return result;
  } catch (error) {
    await auditLogger({
      userId: user.id,
      userRole: user.role,
      action,
      targetType,
      targetId,
      oldValue,
      newValue: null,
      req,
      status: "FAILED",
    });

    throw error;
  }
}
