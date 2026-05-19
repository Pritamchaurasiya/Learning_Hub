"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const logger_1 = __importDefault(require("../utils/logger"));
class EmailService {
    transporter = null;
    isConfigured = false;
    constructor() {
        this.initialize();
    }
    initialize() {
        const host = process.env.SMTP_HOST;
        const port = parseInt(process.env.SMTP_PORT || '587', 10);
        const user = process.env.SMTP_USER;
        const pass = process.env.SMTP_PASS;
        const from = process.env.FROM_EMAIL || 'noreply@learninghub.com';
        if (!host || !user || !pass) {
            logger_1.default.warn('[EmailService] SMTP not configured. Emails will be logged only.');
            return;
        }
        try {
            this.transporter = nodemailer_1.default.createTransport({
                host,
                port,
                secure: port === 465,
                auth: { user, pass },
            });
            this.isConfigured = true;
            logger_1.default.info('[EmailService] SMTP configured successfully');
        }
        catch (error) {
            logger_1.default.error('[EmailService] Failed to configure SMTP', error instanceof Error ? error : new Error(String(error)));
        }
    }
    async send(options) {
        if (!this.isConfigured || !this.transporter) {
            logger_1.default.info(`[EmailService] ${options.subject} - Would send to: ${options.to}`);
            return true;
        }
        try {
            const from = process.env.FROM_EMAIL || 'noreply@learninghub.com';
            await this.transporter.sendMail({
                from: `LearningHub <${from}>`,
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text || this.stripHtml(options.html),
            });
            logger_1.default.info(`[EmailService] Sent "${options.subject}" to ${options.to}`);
            return true;
        }
        catch (error) {
            logger_1.default.error(`[EmailService] Failed to send "${options.subject}" to ${options.to}`, error instanceof Error ? error : new Error(String(error)));
            return false;
        }
    }
    async sendVerificationEmail(to, token, username) {
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
        const html = this.templates.verification(username || 'User', verificationUrl);
        return this.send({
            to,
            subject: 'Verify your LearningHub account',
            html,
        });
    }
    async sendPasswordResetEmail(to, token, username) {
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
        const html = this.templates.passwordReset(username || 'User', resetUrl);
        return this.send({
            to,
            subject: 'Reset your LearningHub password',
            html,
        });
    }
    async sendWelcomeEmail(to, username) {
        const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;
        const html = this.templates.welcome(username || 'User', dashboardUrl);
        return this.send({
            to,
            subject: 'Welcome to LearningHub!',
            html,
        });
    }
    async sendContestNotification(to, contestTitle, startTime, username) {
        const contestUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/contests`;
        const html = this.templates.contestNotification(username || 'User', contestTitle, startTime, contestUrl);
        return this.send({
            to,
            subject: `Upcoming Contest: ${contestTitle}`,
            html,
        });
    }
    async sendSubscriptionConfirmation(to, tierName, amount, username) {
        const html = this.templates.subscriptionConfirmation(username || 'User', tierName, amount);
        return this.send({
            to,
            subject: `Subscription Confirmed: ${tierName}`,
            html,
        });
    }
    getConfigStatus() {
        return this.isConfigured;
    }
    templates = {
        verification: (name, url) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Email Verification</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">LearningHub</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #333; margin-top: 0;">Verify Your Email</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Thanks for joining LearningHub! Click the button below to verify your email address and start your learning journey.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Verify Email</a>
            </div>
            <p style="color: #999; font-size: 14px;">Or copy this link: <a href="${url}">${url}</a></p>
            <p style="color: #999; font-size: 14px;">This link expires in 24 hours.</p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; text-align: center; color: #999; font-size: 12px;">
            <p>If you didn't create an account, ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        passwordReset: (name, url) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Password Reset</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Password Reset</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">We received a request to reset your password. Click the button below to set a new password.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Reset Password</a>
            </div>
            <p style="color: #999; font-size: 14px;">This link expires in 1 hour.</p>
            <p style="color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        welcome: (name, dashboardUrl) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Welcome</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to LearningHub!</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #333; margin-top: 0;">Let's Get Started</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Your account is ready! Here's what you can do:</p>
            <ul style="color: #666; font-size: 16px; line-height: 1.8;">
              <li>Take AI-generated practice tests</li>
              <li>Track your progress with detailed analytics</li>
              <li>Join contests and compete with others</li>
              <li>Access premium content with subscriptions</li>
            </ul>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">Go to Dashboard</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
        contestNotification: (name, title, startTime, url) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Contest Alert</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">⚡ Contest Alert</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #333; margin-top: 0;">${title}</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Hi ${name},</p>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">A new contest is starting soon!</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333;"><strong>Start Time:</strong> ${startTime.toLocaleString()}</p>
            </div>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${url}" style="display: inline-block; background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">View Contest</a>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
        subscriptionConfirmation: (name, tier, amount) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><title>Subscription Confirmed</title></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); padding: 40px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">✅ Subscription Active</h1>
          </div>
          <div style="padding: 40px;">
            <h2 style="color: #333; margin-top: 0;">Thank You, ${name}!</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Your subscription to <strong>${tier}</strong> is now active.</p>
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #333;"><strong>Amount:</strong> ${amount}</p>
              <p style="margin: 10px 0 0; color: #333;"><strong>Status:</strong> Active</p>
            </div>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">Enjoy unlimited access to all premium features!</p>
          </div>
        </div>
      </body>
      </html>
    `,
    };
    stripHtml(html) {
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
exports.default = exports.emailService;
