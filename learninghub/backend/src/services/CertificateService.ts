import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import { prisma } from '../prismaClient'
import logger from '../utils/logger'

export class CertificateService {
  /**
   * Generates a PDF certificate for a completed course.
   * If the certificate already exists, returns the existing one.
   */
  async generateCertificate(userId: string, courseId: string): Promise<string> {
    // Verify completion
    const progress = await prisma.userProgress.findUnique({
      where: {
        idx_unique_user_course: {
          userId,
          courseId,
        },
      },
      include: {
        user: { select: { username: true, email: true } },
        course: { select: { title: true, certificate: true } },
      },
    })

    if (progress?.status !== 'COMPLETED') {
      throw new Error('User has not completed this course')
    }

    if (!progress.course.certificate) {
      throw new Error('This course does not offer a certificate')
    }

    // Check if certificate already exists
    const existingCert = await prisma.certificate.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId,
        },
      },
    })

    if (existingCert) {
      return existingCert.certificateUrl
    }

    // Generate PDF
    const userName = progress.user.username ?? 'Student'
    const courseName = progress.course.title
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // File path setup
    const fileName = `cert_${userId}_${courseId}.pdf`
    const certsDir = path.join(__dirname, '../../public/certificates')

    // Ensure directory exists
    if (!fs.existsSync(certsDir)) {
      fs.mkdirSync(certsDir, { recursive: true })
    }

    const filePath = path.join(certsDir, fileName)

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          layout: 'landscape',
          size: 'A4',
        })

        const writeStream = fs.createWriteStream(filePath)
        doc.pipe(writeStream)

        // Draw certificate background / border
        doc
          .rect(20, 20, doc.page.width - 40, doc.page.height - 40)
          .lineWidth(10)
          .stroke('#1a56db') // Brand blue

        doc
          .rect(35, 35, doc.page.width - 70, doc.page.height - 70)
          .lineWidth(2)
          .stroke('#e5e7eb')

        // Content
        doc.moveDown(4)
        doc
          .font('Helvetica-Bold')
          .fontSize(45)
          .fillColor('#111827')
          .text('CERTIFICATE OF COMPLETION', { align: 'center' })

        doc.moveDown(1.5)
        doc
          .font('Helvetica')
          .fontSize(20)
          .fillColor('#6b7280')
          .text('This proudly certifies that', { align: 'center' })

        doc.moveDown(1)
        doc
          .font('Helvetica-Bold')
          .fontSize(35)
          .fillColor('#1a56db')
          .text(userName, { align: 'center' })

        doc.moveDown(1)
        doc
          .font('Helvetica')
          .fontSize(20)
          .fillColor('#6b7280')
          .text('has successfully completed the course', { align: 'center' })

        doc.moveDown(1)
        doc
          .font('Helvetica-Bold')
          .fontSize(28)
          .fillColor('#111827')
          .text(courseName, { align: 'center' })

        doc.moveDown(2)
        doc
          .font('Helvetica')
          .fontSize(16)
          .fillColor('#6b7280')
          .text(`Issued on: ${dateStr}`, { align: 'center' })

        // Signature area
        const signatureY = doc.page.height - 120
        doc
          .moveTo(doc.page.width / 2 - 100, signatureY)
          .lineTo(doc.page.width / 2 + 100, signatureY)
          .lineWidth(1)
          .stroke('#111827')

        doc
          .font('Helvetica')
          .fontSize(14)
          .fillColor('#111827')
          .text('LearningHub Director', doc.page.width / 2 - 100, signatureY + 10, {
            width: 200,
            align: 'center',
          })

        doc.end()

        writeStream.on('finish', async () => {
          const publicUrl = `/certificates/${fileName}`

          // Save to database
          await prisma.certificate.create({
            data: {
              userId,
              courseId,
              certificateUrl: publicUrl,
            },
          })

          logger.info(
            `[CertificateService] Generated certificate for User ${userId} - Course ${courseId}`
          )
          resolve(publicUrl)
        })

        writeStream.on('error', err => {
          reject(err)
        })
      } catch (err: unknown) {
        logger.error(
          '[CertificateService] Error generating PDF',
          err instanceof Error ? err : new Error(String(err))
        )
        reject(err)
      }
    })
  }

  /**
   * Fetch all certificates for a user.
   */
  async getUserCertificates(userId: string) {
    return prisma.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: { title: true, difficulty: true, category: true },
        },
      },
      orderBy: { issuedAt: 'desc' },
    })
  }
}

export const certificateService = new CertificateService()
