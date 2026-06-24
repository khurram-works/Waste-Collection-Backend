import { prisma } from "../../lib/prisma";
import e from "express";
import bcrypt from "bcrypt";
import Joi from "joi";
import { withAudit } from "../utils/withAudit";

const passwordSchema = Joi.object({
  currentPassword: Joi.string().required(),

  newPassword: Joi.string()
    .min(8)
    .pattern(/[A-Z]/)
    .pattern(/[!@#$%^&*(),.?":{}|<>]/)
    .required(),
});

export async function updatePassword(req: e.Request, res: e.Response) {
  const { error, value } = passwordSchema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { currentPassword, newPassword } = value;

  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.user?.id }
    });

    if (!user) {
      return res.status(404).json({
        error: "User not found.",
        success: false
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        error: "Current password is incorrect.",
        success: false
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // ✅ ONLY ONE UPDATE USING withAudit
    const updatedUser = await withAudit({
      action: "UPDATE",
      targetType: "USER",
      targetId: String(req.user?.id),
      user: req.user,
      req,

      getOldValue: () =>
        prisma.user.findUnique({
          where: { userId: req.user?.id }
        }),

      operation: () =>
        prisma.user.update({
          where: { userId: req.user?.id },
          data: {
            password: hashedPassword
          }
        })
    });

    return res.status(200).json({
      message: "Password updated successfully.",
      success: true
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: "Error updating password.",
      success: false
    });
  }
}
