import { useCallback, useState } from 'react'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

interface ExportOptions {
  filename?: string
  format?: 'pdf' | 'csv'
}

interface ExportState {
  isExporting: boolean
  progress: number
  error: Error | null
}

export function useExport() {
  const [state, setState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    error: null,
  })

  const exportToPDF = useCallback(
    async (elementId: string, options: ExportOptions = {}): Promise<void> => {
      const { filename = 'export.pdf' } = options

      setState({ isExporting: true, progress: 0, error: null })

      try {
        const element = document.getElementById(elementId)
        if (!element) {
          throw new Error(`Element with id "${elementId}" not found`)
        }

        // Capture the element as canvas
        setState(prev => ({ ...prev, progress: 20 }))
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
        })

        setState(prev => ({ ...prev, progress: 50 }))

        // Create PDF
        const imgData = canvas.toDataURL('image/png')
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4',
        })

        const imgWidth = 210 // A4 width in mm
        const pageHeight = 297 // A4 height in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        let heightLeft = imgHeight
        let position = 0

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight

        // Add additional pages if content overflows
        while (heightLeft > 0) {
          position = heightLeft - imgHeight
          pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
          heightLeft -= pageHeight
        }

        setState(prev => ({ ...prev, progress: 80 }))

        // Download the PDF
        pdf.save(filename)

        setState({ isExporting: false, progress: 100, error: null })
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Export failed')
        setState({ isExporting: false, progress: 0, error: err })
        throw err
      }
    },
    []
  )

  const exportToCSV = useCallback(
    <T extends Record<string, unknown>>(data: T[], options: ExportOptions = {}): void => {
      const { filename = 'export.csv' } = options

      setState({ isExporting: true, progress: 0, error: null })

      try {
        if (data.length === 0) {
          throw new Error('No data to export')
        }

        // Get headers from first object
        const headers = Object.keys(data[0])

        // Create CSV content
        const csvContent = [
          // Header row
          headers.join(','),
          // Data rows
          ...data.map(row =>
            headers
              .map(header => {
                // eslint-disable-next-line security/detect-object-injection
                const value = row[header]
                // Escape values with commas or quotes
                const stringValue = value === null || value === undefined ? '' : String(value)
                if (
                  stringValue.includes(',') ||
                  stringValue.includes('"') ||
                  stringValue.includes('\n')
                ) {
                  return `"${stringValue.replace(/"/g, '""')}"`
                }
                return stringValue
              })
              .join(',')
          ),
        ].join('\n')

        setState(prev => ({ ...prev, progress: 50 }))

        // Create and download blob
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)

        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'

        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)

        // Revoke blob URL to prevent memory leak
        URL.revokeObjectURL(url)

        setState({ isExporting: false, progress: 100, error: null })
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Export failed')
        setState({ isExporting: false, progress: 0, error: err })
        throw err
      }
    },
    []
  )

  const exportData = useCallback(
    <T extends Record<string, unknown>>(
      dataOrElementId: T[] | string,
      options: ExportOptions = {}
    ): void | Promise<void> => {
      const { format = 'csv' } = options

      if (format === 'pdf') {
        if (typeof dataOrElementId !== 'string') {
          throw new Error('PDF export requires an element ID')
        }
        return exportToPDF(dataOrElementId, options)
      }

      if (typeof dataOrElementId === 'string') {
        throw new Error('CSV export requires data array')
      }

      exportToCSV(dataOrElementId, options)
    },
    [exportToCSV, exportToPDF]
  )

  return {
    ...state,
    exportToPDF,
    exportToCSV,
    exportData,
  }
}
