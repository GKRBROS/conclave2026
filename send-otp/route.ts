    import nodemailer from "nodemailer";

    export const runtime = "nodejs";

    import fs from "fs";
    import path from "path";

    export async function POST(req: Request) {
      try {
        const { to, subject, otp } = await req.json();

        // Load HTML template
        const templatePath = path.join(
          process.cwd(),
          "app",
          "api",
          "send-otp",
          "mail.html"
        );
        let html = fs.readFileSync(templatePath, "utf-8");

        // Replace placeholder
        html = html.replace("{{OTP}}", otp);
    console.log("SMTP_USER:", process.env.SMTP_USER,process.env.SMTP_PASS,process.env.SMTP_HOST_NAME,process.env.SMTP_PORT);

        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST_NAME,
          port: Number(process.env.SMTP_PORT),
          secure: Number(process.env.SMTP_PORT) === 465, // ✅ FIX
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: `"ScaleUp" <${process.env.SMTP_USER}>`,
          to,
          subject,
          html,
        });

        return Response.json({ success: true });
      } catch (error: any) {
        console.error("SMTP ERROR:", error);
        return Response.json(
          { success: false, error: error.message },
          { status: 500 }
        );
      }
    }

