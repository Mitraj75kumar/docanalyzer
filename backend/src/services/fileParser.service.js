const fs = require('fs/promises');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { createWorker } = require('tesseract.js');
const logger = require('../config/logger');

// Extracts plain text from a stored file based on its detected FileType.
// Returns { text, error } - error is set (and text is null) on failure so
// callers can mark the document as FAILED without throwing.
async function extractText(filePath, fileType) {
  try {
    switch (fileType) {
      case 'PDF': {
        const buffer = await fs.readFile(filePath);
        const data = await pdfParse(buffer);
        return { text: data.text.trim(), error: null };
      }
      case 'DOCX': {
        const { value } = await mammoth.extractRawText({ path: filePath });
        return { text: value.trim(), error: null };
      }
      case 'TXT': {
        const text = await fs.readFile(filePath, 'utf-8');
        return { text: text.trim(), error: null };
      }
      case 'IMAGE': {
        // OCR via tesseract.js
        const worker = await createWorker('eng');
        try {
          const { data } = await worker.recognize(filePath);
          return { text: (data.text || '').trim(), error: null };
        } finally {
          await worker.terminate();
        }
      }
      default:
        return { text: null, error: `Unsupported file type: ${fileType}` };
    }
  } catch (err) {
    logger.error(`Text extraction failed for ${filePath}: ${err.message}`);
    return { text: null, error: err.message };
  }
}

module.exports = { extractText };
