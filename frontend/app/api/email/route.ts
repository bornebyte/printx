import { NextResponse } from "next/server";
import { connect } from "node:tls";

export const runtime = "nodejs";

type MailRequest = {
  to?: string;
  subject?: string;
  text?: string;
};

type SmtpSocket = ReturnType<typeof connect>;

function cleanHeader(value: string) {
  return value.replace(/[\r\n]/g, " ").trim();
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function waitForResponse(socket: SmtpSocket) {
  return new Promise<string>((resolve, reject) => {
    let response = "";
    const onData = (chunk: Buffer) => {
      response += chunk.toString("utf8");
      const lines = response.split(/\r?\n/).filter(Boolean);
      const last = lines.at(-1) ?? "";
      if (/^\d{3} /.test(last)) {
        socket.off("data", onData);
        resolve(last);
      }
    };
    const onError = (error: Error) => {
      socket.off("data", onData);
      reject(error);
    };
    socket.on("data", onData);
    socket.once("error", onError);
  });
}

async function smtpCommand(socket: SmtpSocket, command: string, expected: number[]) {
  socket.write(`${command}\r\n`);
  const response = await waitForResponse(socket);
  const status = Number(response.slice(0, 3));
  if (!expected.includes(status)) throw new Error(`Gmail SMTP rejected command (${status}).`);
}

async function sendGmailMessage(to: string, subject: string, text: string) {
  const username = process.env.GMAIL_USER;
  const appPassword = process.env.GMAIL_APP_PASSWORD;
  const host = process.env.GMAIL_SMTP_HOST ?? "smtp.gmail.com";
  const port = Number(process.env.GMAIL_SMTP_PORT ?? 465);
  const from = cleanHeader(process.env.MAIL_FROM ?? username ?? "");

  if (!username || !appPassword || !from) throw new Error("Gmail SMTP is not configured.");

  const socket = connect({ host, port, servername: host });
  await new Promise<void>((resolve, reject) => {
    socket.once("secureConnect", resolve);
    socket.once("error", reject);
  });
  await waitForResponse(socket);
  await smtpCommand(socket, `EHLO printx.local`, [250]);
  await smtpCommand(socket, "AUTH LOGIN", [334]);
  await smtpCommand(socket, Buffer.from(username).toString("base64"), [334]);
  await smtpCommand(socket, Buffer.from(appPassword).toString("base64"), [235]);
  await smtpCommand(socket, `MAIL FROM:<${from}>`, [250]);
  await smtpCommand(socket, `RCPT TO:<${to}>`, [250, 251]);
  await smtpCommand(socket, "DATA", [354]);

  const body = text.replace(/^\./gm, "..");
  socket.write([
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${cleanHeader(subject)}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
    ".",
    "",
  ].join("\r\n"));
  await waitForResponse(socket);
  await smtpCommand(socket, "QUIT", [221]);
  socket.end();
}

export async function POST(request: Request) {
  const payload = await request.json() as MailRequest;
  const to = cleanHeader(payload.to ?? "");
  const subject = cleanHeader(payload.subject ?? "PrintX notification");
  const text = (payload.text ?? "").slice(0, 5000);

  if (!isEmail(to) || !text) return NextResponse.json({ error: "A valid recipient and message are required." }, { status: 400 });
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return NextResponse.json({ error: "Gmail SMTP is not configured." }, { status: 503 });

  try {
    await sendGmailMessage(to, subject, text);
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("PrintX Gmail notification failed", error);
    return NextResponse.json({ error: "Notification email could not be sent." }, { status: 502 });
  }
}
