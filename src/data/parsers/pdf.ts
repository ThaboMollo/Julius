export interface PdfExtractionResult {
  text: string
  pageCount: number
}

export class PdfPasswordRequired extends Error {
  constructor() {
    super('This PDF is password-protected. Please enter the password.')
    this.name = 'PdfPasswordRequired'
  }
}

export class PdfScannedImage extends Error {
  constructor() {
    super('This PDF appears to be a scanned image. Please download your bank\'s digital/text-based PDF statement.')
    this.name = 'PdfScannedImage'
  }
}

const MIN_TEXT_LENGTH = 50

export async function extractTextFromPdf(file: File, password?: string): Promise<string> {
  // Lazy-load pdfjs-dist to keep initial bundle small (~1.5MB only loaded when needed)
  const pdfjsLib = await import('pdfjs-dist')

  // Configure worker for Vite
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.mjs',
    import.meta.url
  ).toString()

  const arrayBuffer = await file.arrayBuffer()

  let pdf
  try {
    pdf = await pdfjsLib.getDocument({
      data: arrayBuffer,
      password: password ?? undefined,
    }).promise
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'PasswordException') {
      throw new PdfPasswordRequired()
    }
    throw new Error(`Could not read ${file.name}. Make sure it's a valid PDF.`)
  }

  const lines: string[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items
      .filter((item) => 'str' in item)
      .map((item) => (item as { str: string }).str)
      .join(' ')
    if (pageText.trim()) {
      lines.push(pageText)
    }
  }

  const fullText = lines.join('\n')

  // Detect scanned/image PDFs
  if (fullText.length < MIN_TEXT_LENGTH) {
    throw new PdfScannedImage()
  }

  return fullText
}
