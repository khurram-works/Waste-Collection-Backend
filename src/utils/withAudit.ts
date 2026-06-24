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

  // STEP 1: get old data (if needed)
  if (getOldValue) {
    oldValue = await getOldValue();
  }

  try {
    // STEP 2: run actual DB operation
    const result = await operation();

    // STEP 3: log success
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
