import express from "express";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import "dotenv/config";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cors());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route to send verification code
  app.post("/api/send-verification", async (req, res) => {
    console.log("POST /api/send-verification received for:", req.body.email);
    const { email, code, role = 'student', name } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    // Load credentials
    const EMAIL_USER = process.env.EMAIL_USER;
    const EMAIL_PASS = process.env.EMAIL_PASS;

    // Check if credentials are missing OR still set to placeholders from .env.example
    const isNotConfigured = !EMAIL_USER || !EMAIL_PASS || 
                           EMAIL_USER.includes("your-email") || 
                           EMAIL_PASS.includes("xxxx-xxxx");

    if (isNotConfigured) {
      console.warn("EMAIL_USER or EMAIL_PASS not properly configured. Fallback to server console.");
      console.log(`\n--- VERIFICATION CODE FOR ${email} (${role.toUpperCase()}): [ ${code} ] ---\n`);
      return res.json({ 
        success: true, 
        message: "Email credentials not configured in Settings. For testing, the code has been logged to the server console.",
        code: code // also returned for testing convenience if credentials not set
      });
    }

    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: EMAIL_USER,
          pass: EMAIL_PASS,
        },
      });

      // Verify connection configuration
      try {
        await transporter.verify();
      } catch (verifyError: any) {
        console.error("SMTP Configuration Error:", verifyError);
        if (verifyError.responseCode === 535 || verifyError.message.includes('Invalid login')) {
          return res.status(401).json({ 
            error: "Gmail Authentication Failed", 
            message: "Invalid credentials. Please make sure you are using a 16-character 'App Password' from Google, not your regular account password.",
            code: "AUTH_FAILED"
          });
        }
        throw verifyError;
      }

      const roleTitle = role === 'professor' ? 'Faculty / Professor' : 'Student';
      const subject = `Your Colegio de Montalban ${roleTitle} Verification Code: ${code}`;

      const mailOptions = {
        from: `"Colegio de Montalban Portal" <${EMAIL_USER}>`,
        to: email,
        subject,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #047857; padding-bottom: 16px; margin-bottom: 20px;">
              <h1 style="color: #064e3b; font-size: 18px; margin: 0; text-transform: uppercase; letter-spacing: 1px;">Colegio de Montalban</h1>
              <p style="color: #047857; font-size: 12px; font-weight: bold; margin: 4px 0 0 0; text-transform: uppercase;">Official Academic Portal Verification</p>
            </div>
            
            <h2 style="color: #0f172a; font-size: 16px; margin-top: 0;">${roleTitle} Account Verification</h2>
            <p style="font-size: 14px; line-height: 1.5; color: #334155;">
              ${name ? `Hello <strong>${name}</strong>,<br/>` : ''}
              Thank you for registering on the CdM Academic Portal. Use the following 6-digit verification code to complete your ${roleTitle.toLowerCase()} account creation:
            </p>
            
            <div style="font-size: 34px; font-weight: bold; letter-spacing: 8px; color: #064e3b; padding: 18px 24px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; text-align: center; margin: 24px 0; font-family: monospace;">
              ${code}
            </div>
            
            <p style="font-size: 12px; color: #64748b; line-height: 1.4;">
              This code will expire shortly. If you did not request this verification, please disregard this message.
            </p>
            <div style="border-top: 1px solid #f1f5f9; margin-top: 24px; padding-top: 12px; text-align: center; font-size: 11px; color: #94a3b8;">
              Colegio de Montalban • Student Information & Enrollment System
            </div>
          </div>
        `,
      };

      await transporter.sendMail(mailOptions);
      res.json({ success: true });
    } catch (error) {
      console.error("Email sending error:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR === 'true' ? false : { port: 3000 }
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Error handling middleware
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled Server Error:", err);
    res.status(500).json({ 
      error: "Internal Server Error", 
      message: err.message || "An unexpected error occurred" 
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
