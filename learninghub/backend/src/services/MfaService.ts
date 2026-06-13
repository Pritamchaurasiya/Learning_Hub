import speakeasy from 'speakeasy'
import QRCode from 'qrcode'
import { prisma } from '../config'

export class MfaService {
  /**
   * Generates a new TOTP secret for a user and returns it along with a QR code data URL.
   */
  static async generateSecret(userId: string, email: string) {
    const secret = speakeasy.generateSecret({
      name: `LearningHub Admin (${email})`,
      length: 20,
    })

    if (!secret.otpauth_url) {
      throw new Error('Failed to generate MFA URL')
    }

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url)

    // Save secret temporarily or directly (if we enforce setup immediately)
    await prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret.base32 },
    })

    return {
      secret: secret.base32,
      qrCodeUrl,
    }
  }

  /**
   * Verifies a TOTP token against the user's stored secret.
   * If this is the initial setup, it will also enable MFA.
   */
  static async verifyAndEnable(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user?.mfaSecret) {
      return false
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1, // Allow 1 step (30 seconds) drift
    })

    if (verified && !user.mfaEnabled) {
      await prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      })
    }

    return verified
  }

  /**
   * Validates an incoming MFA token during login.
   */
  static async validateToken(userId: string, token: string): Promise<boolean> {
    const user = await prisma.user.findUnique({ where: { id: userId } })

    if (!user?.mfaSecret || !user.mfaEnabled) {
      return false
    }

    return speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token,
      window: 1,
    })
  }
}
