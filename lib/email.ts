import nodemailer from "nodemailer";

// ── Build transporter once at module load ─────────────────────────────────────
// Gmail App Password: paste the 16 chars WITHOUT spaces, e.g. "abcdabcdabcdabcd"
// The spaces Google shows (xxxx xxxx xxxx xxxx) are just display formatting.
function buildTransporter() {
  const user = (process.env.SMTP_USER || "").trim();
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, ""); // strip all spaces
  const host = (process.env.SMTP_HOST || "").trim();
  const port = parseInt(process.env.SMTP_PORT || "587", 10);

  if (!user || !pass) {
    console.warn(
      "⚠️  [inventoryIQ Email] SMTP_USER or SMTP_PASS not set in .env — emails disabled."
    );
    return null;
  }

  // Use Gmail service when no custom host is given
  const transportOptions = host
    ? {
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      }
    : {
        // Gmail with App Password
        host: "smtp.gmail.com",
        port: 465,
        secure: true,          // SSL — more reliable than STARTTLS for Gmail
        auth: { user, pass },
      };

  const transporter = nodemailer.createTransport(transportOptions);

  // Verify connection on startup (logs to console, doesn't throw)
  transporter.verify((err) => {
    if (err) {
      console.error("❌ [inventoryIQ Email] SMTP connection failed:", err.message);
      console.error("   Check SMTP_USER / SMTP_PASS in your .env file.");
    } else {
      console.log(`✅ [inventoryIQ Email] SMTP ready — sending as ${user}`);
    }
  });

  return transporter;
}

const transporter = buildTransporter();
const FROM_NAME  = process.env.SMTP_FROM_NAME  || "inventoryIQ";
const FROM_EMAIL = (process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || "").trim();

// ── Core send helper ──────────────────────────────────────────────────────────
async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  if (!transporter) {
    console.warn(`⚠️  [Email skipped — not configured] To: ${opts.to} | ${opts.subject}`);
    return false;
  }
  try {
    const info = await transporter.sendMail({
      from:    `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to:      opts.to,
      subject: opts.subject,
      html:    opts.html,
    });
    console.log(`✉️  [Email sent] To: ${opts.to} | ${opts.subject} | msgId: ${info.messageId}`);
    return true;
  } catch (err) {
    console.error("❌ [Email failed]", err);
    return false;
  }
}

// ── Shared HTML template ──────────────────────────────────────────────────────
function template(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title></head>
<body style="margin:0;padding:0;background:#0f0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0a0f;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#150f15;border-radius:16px;border:1px solid #3b1a3b;overflow:hidden;max-width:560px;width:100%;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:28px 32px;text-align:center;">
            <div style="font-size:32px;">🌸</div>
            <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700;">inventoryIQ</h1>
            <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:11px;letter-spacing:1.5px;text-transform:uppercase;">Inventory Management</p>
          </td>
        </tr>
        <tr><td style="padding:32px;">${body}</td></tr>
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #2d1a2d;text-align:center;">
            <p style="margin:0;color:#6b4c6b;font-size:11px;">© ${new Date().getFullYear()} inventoryIQ · Automated notification</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── 1. New order → email ALL admins ──────────────────────────────────────────
export async function sendNewOrderNotification(params: {
  adminEmail: string;
  adminName: string;
  requesterName: string;
  requesterEmail: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  notes?: string;
  orderId: string;
  reviewUrl: string;
}): Promise<boolean> {
  const total = (params.unitPrice * params.quantity).toFixed(2);

  const body = `
    <h2 style="margin:0 0 4px;color:#f0abfc;font-size:20px;font-weight:700;">New Product Request 📦</h2>
    <p style="margin:0 0 24px;color:#c084fc;font-size:14px;">Hi ${params.adminName}, a new inventory request needs your review.</p>

    <div style="background:#1a0f1a;border:1px solid #3b1a3b;border-radius:12px;padding:16px 20px;margin-bottom:14px;">
      <p style="margin:0 0 4px;color:#9d6b9d;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Requested by</p>
      <p style="margin:0;color:#f0e0f0;font-size:15px;font-weight:600;">${params.requesterName}</p>
      <p style="margin:2px 0 0;color:#9d6b9d;font-size:13px;">${params.requesterEmail}</p>
    </div>

    <div style="background:#1a0f1a;border:1px solid #3b1a3b;border-radius:12px;padding:16px 20px;margin-bottom:14px;">
      <p style="margin:0 0 12px;color:#9d6b9d;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Product Details</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:3px 0;color:#9d6b9d;font-size:13px;">Product</td><td style="padding:3px 0;color:#f0e0f0;font-weight:600;text-align:right;font-size:13px;">${params.productName}</td></tr>
        <tr><td style="padding:3px 0;color:#9d6b9d;font-size:13px;">SKU</td><td style="padding:3px 0;color:#c084fc;font-family:monospace;text-align:right;font-size:12px;">${params.productSku}</td></tr>
        <tr><td style="padding:3px 0;color:#9d6b9d;font-size:13px;">Quantity</td><td style="padding:3px 0;color:#f0e0f0;font-weight:600;text-align:right;font-size:13px;">${params.quantity} units</td></tr>
        <tr><td style="padding:3px 0;color:#9d6b9d;font-size:13px;">Unit Price</td><td style="padding:3px 0;color:#f0e0f0;text-align:right;font-size:13px;">$${params.unitPrice.toFixed(2)}</td></tr>
        <tr style="border-top:1px solid #3b1a3b;">
          <td style="padding:10px 0 0;color:#f0abfc;font-size:15px;font-weight:700;">Est. Total</td>
          <td style="padding:10px 0 0;color:#f0abfc;font-size:17px;font-weight:700;text-align:right;">$${total}</td>
        </tr>
      </table>
    </div>

    ${params.notes ? `
    <div style="background:#1a0f1a;border-left:3px solid #c084fc;border-radius:0 12px 12px 0;padding:14px 18px;margin-bottom:14px;">
      <p style="margin:0 0 5px;color:#9d6b9d;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Notes</p>
      <p style="margin:0;color:#f0e0f0;font-size:14px;line-height:1.6;">${params.notes}</p>
    </div>` : ""}

    <div style="text-align:center;margin-top:28px;">
      <a href="${params.reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;padding:14px 36px;border-radius:12px;font-size:15px;font-weight:700;">
        ✅ Review Request
      </a>
    </div>
    <p style="text-align:center;margin:12px 0 0;color:#6b4c6b;font-size:11px;">
      Order ID: <span style="color:#9d6b9d;font-family:monospace;">${params.orderId.slice(-12).toUpperCase()}</span>
    </p>`;

  return sendMail({
    to:      params.adminEmail,
    subject: `🌸 New Request: ${params.productName} ×${params.quantity} — inventoryIQ`,
    html:    template("New Product Request", body),
  });
}

// ── 2. Order status update → email the requester ──────────────────────────────
export async function sendOrderStatusEmail(params: {
  userEmail: string;
  userName: string;
  productName: string;
  quantity: number;
  status: "APPROVED" | "REJECTED" | "FULFILLED";
  reviewUrl: string;
}): Promise<boolean> {
  const meta = {
    APPROVED:  { emoji: "✅", label: "Approved",  color: "#10b981", msg: "Your request has been approved and will be fulfilled shortly." },
    REJECTED:  { emoji: "❌", label: "Rejected",  color: "#ef4444", msg: "Your request was not approved. Please contact your admin for more details." },
    FULFILLED: { emoji: "📦", label: "Fulfilled", color: "#a855f7", msg: "Your items have been dispatched. They are on their way to you!" },
  }[params.status];

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:52px;">${meta.emoji}</div>
      <h2 style="margin:12px 0 6px;color:${meta.color};font-size:22px;font-weight:700;">Request ${meta.label}</h2>
      <p style="margin:0;color:#c084fc;font-size:14px;">Hi ${params.userName}</p>
    </div>

    <div style="background:#1a0f1a;border:1px solid #3b1a3b;border-left:3px solid ${meta.color};border-radius:12px;padding:16px 20px;margin-bottom:20px;">
      <p style="margin:0 0 8px;color:#9d6b9d;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Your Request</p>
      <p style="margin:0;color:#f0e0f0;font-size:15px;font-weight:600;">${params.productName}</p>
      <p style="margin:4px 0 0;color:#9d6b9d;font-size:13px;">${params.quantity} unit${params.quantity > 1 ? "s" : ""}</p>
    </div>

    <p style="color:#c9a0c9;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">${meta.msg}</p>

    <div style="text-align:center;">
      <a href="${params.reviewUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#db2777);color:#fff;text-decoration:none;padding:12px 30px;border-radius:12px;font-size:14px;font-weight:700;">
        View My Requests
      </a>
    </div>`;

  return sendMail({
    to:      params.userEmail,
    subject: `${meta.emoji} Your inventoryIQ request was ${meta.label}: ${params.productName}`,
    html:    template(`Request ${meta.label}`, body),
  });
}
