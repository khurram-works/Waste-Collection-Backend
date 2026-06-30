import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

type NotificationType =
  | "PICKUP_SUBMITTED"
  | "PICKUP_ASSIGNED"
  | "PICKUP_SCHEDULED"
  | "PICKUP_COLLECTED"
  | "PICKUP_VERIFIED"
  | "PICKUP_CANCELLED"
  | "PAYMENT_CREDITED"
  | "WITHDRAWAL_REQUESTED"
  | "WITHDRAWAL_APPROVED"
  | "WITHDRAWAL_PAID"
  | "WITHDRAWAL_REJECTED";

function getEmailSubject(type: NotificationType): string {
  const subjects: Record<string, string> = {
    PICKUP_SUBMITTED: "✅ Pickup Request Submitted — SmartWaste",
    PICKUP_ASSIGNED: "🚛 A Worker Has Been Assigned to Your Request",
    PICKUP_SCHEDULED: "📅 Your Pickup Has Been Scheduled",
    PICKUP_COLLECTED: "📦 Your Waste Has Been Collected",
    PICKUP_VERIFIED: "✔️ Your Pickup Has Been Verified",
    PICKUP_CANCELLED: "❌ Your Pickup Request Was Cancelled",
    PAYMENT_CREDITED: "💰 Your Wallet Has Been Credited — SmartWaste",
    WITHDRAWAL_REQUESTED: "📤 Withdrawal Request Received",
    WITHDRAWAL_APPROVED: "✅ Your Withdrawal Has Been Approved",
    WITHDRAWAL_PAID: "💸 Your Withdrawal Has Been Paid",
    WITHDRAWAL_REJECTED: "❌ Your Withdrawal Request Was Declined",
  };

  return subjects[type] || "📬 New Notification — SmartWaste";
}

function buildEmailHTML(
  title: string,
  message: string,
  type: NotificationType,
): string {
  const isPositive = [
    "PICKUP_ASSIGNED",
    "PICKUP_COLLECTED",
    "PICKUP_VERIFIED",
    "PAYMENT_CREDITED",
    "WITHDRAWAL_APPROVED",
    "WITHDRAWAL_PAID",
  ].includes(type);
  const isNegative = ["PICKUP_CANCELLED", "WITHDRAWAL_REJECTED"].includes(type);

  const bannerColor = isNegative
    ? "#ef4444"
    : isPositive
      ? "#10b981"
      : "#0d9488";

  return `
    <!DOCTYPE html>
    <html>
      <body style="margin:0; padding:0; background:#f3f4f6; font-family: Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" 
                     style="background:#ffffff; border-radius:12px; overflow:hidden; 
                            box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
                
                <tr>
                  <td style="background:${bannerColor}; padding: 24px 32px;">
                    <p style="margin:0; color:#ffffff; font-size:20px; font-weight:bold;">
                      ♻️ SmartWaste
                    </p>
                    <p style="margin:4px 0 0; color:rgba(255,255,255,0.85); font-size:13px;">
                      Citizen Notification
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 12px; color: #111827; font-size: 20px;">
                      ${title}
                    </h2>
                    
                    <p style="margin: 0 0 24px; color: #4b5563; font-size: 15px; line-height: 1.6;">
                      ${message}
                    </p>

                    <a href="${process.env.FRONTEND_URL}" 
                       style="display:inline-block; background:${bannerColor}; color:#ffffff; 
                              text-decoration:none; padding: 12px 24px; border-radius:8px; 
                              font-size:14px; font-weight:bold;">
                      View in App →
                    </a>
                  </td>
                </tr>


                <tr>
                  <td style="padding: 16px 32px; background:#f9fafb; border-top: 1px solid #e5e7eb;">
                    <p style="margin:0; color:#9ca3af; font-size:12px;">
                      SmartWaste Platform
© 2026 SmartWaste
This is an automated email. Please do not reply.
                    </p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendNotificationEmail({
  toEmail,
  type,
  title,
  message,
}: {
  toEmail: string;
  type: NotificationType;
  title: string;
  message: string;
}): Promise<void> {
  try {
    const info = await transporter.sendMail({
      from: `"SmartWaste Platform" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: getEmailSubject(type),
      html: buildEmailHTML(title, message, type),
    });

    await transporter.verify((err) => {
      if (err) console.error(err);
      else console.log("SMTP Ready");
    });

    console.log(
      `[Email] Sent "${type}" to ${toEmail}. Message ID: ${info.messageId}`,
    );
  } catch (error) {
    console.error(`[Email] Failed to send to ${toEmail}:`, error);
  }
}
