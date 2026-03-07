import nodemailer from "nodemailer";

type SendArgs = { to: string; subject: string; text: string; html?: string };

function hasBrevoApi() {
  return Boolean(process.env.BREVO_API_KEY);
}

function hasSmtp() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function allowConsoleEmailFallback() {
  return process.env.NODE_ENV !== "production" || process.env.ALLOW_CONSOLE_EMAIL_FALLBACK === "1";
}

function parseFrom(fromRaw: string | undefined) {
  const raw = (fromRaw || "").trim();
  // Formats:
  //   "Name <email@x.com>"
  //   "email@x.com"
  const m = raw.match(/^(.*)<([^>]+)>$/);
  if (m) {
    const name = m[1].trim().replace(/^"|"$/g, "");
    const email = m[2].trim();
    return { name: name || undefined, email };
  }
  return { name: undefined, email: raw || undefined };
}

async function sendViaBrevoApi(args: SendArgs) {
  const apiKey = process.env.BREVO_API_KEY!;
  const senderEmail =
    process.env.BREVO_SENDER_EMAIL ||
    parseFrom(process.env.SMTP_FROM || process.env.MAIL_FROM || process.env.SMTP_USER).email ||
    process.env.SMTP_USER;

  if (!senderEmail) {
    throw new Error("BREVO_SENDER_EMAIL (və ya SMTP_FROM/SMTP_USER) set olunmayıb.");
  }

  const senderName =
    process.env.BREVO_SENDER_NAME ||
    parseFrom(process.env.SMTP_FROM || process.env.MAIL_FROM).name ||
    "Şəhər Elanları";

  const payload: any = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: args.to }],
    subject: args.subject,
  };

  if (args.html) payload.htmlContent = args.html;
  // Brevo tələb edir: htmlContent və ya textContent.
  payload.textContent = args.text;

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (process.env.SMTP_DEBUG === "1") {
    // eslint-disable-next-line no-console
    console.log("[BREVO] status", res.status);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // eslint-disable-next-line no-console
    console.error("[BREVO] send FAILED", res.status, body);
    throw new Error("OTP email göndərilə bilmədi. Brevo API sazlamalarını yoxlayın.");
  }

  const data: any = await res.json().catch(() => ({}));
  return { messageId: data?.messageId || data?.messageId?.toString?.() || "brevo" };
}

export async function sendEmail(args: SendArgs) {
  // 1) Brevo API varsa, birinci onu istifadə et (SMTP-dən stabildir)
  if (hasBrevoApi()) {
    return await sendViaBrevoApi(args);
  }

  // 2) SMTP varsa, SMTP ilə göndər
  if (!hasSmtp()) {
    if (!allowConsoleEmailFallback()) {
      throw new Error("Email provider sazlanmayıb. Production-da Brevo və ya SMTP tələb olunur.");
    }

    // SMTP/Brevo yoxdursa, yalnız development və ya explicit icazə verilən mühitdə konsola yaz.
    // eslint-disable-next-line no-console
    console.log("\n[EMAIL MOCK]", { to: args.to, subject: args.subject, text: args.text });
    return { mocked: true };
  }

  const port = Number(process.env.SMTP_PORT || "587");
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465, // 465 = implicit TLS, 587 = STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  if (process.env.SMTP_DEBUG === "1") {
    try {
      await transporter.verify();
      // eslint-disable-next-line no-console
      console.log("[SMTP] verify OK");
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("[SMTP] verify FAILED", e?.message || e);
    }
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  try {
    const info = await transporter.sendMail({
      from,
      to: args.to,
      subject: args.subject,
      text: args.text,
      html: args.html,
    });

    return { messageId: info.messageId };
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.error("[SMTP] sendMail FAILED", e?.message || e);
    throw new Error("OTP email göndərilə bilmədi. SMTP sazlamalarını yoxlayın.");
  }
}
