import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Generates a PDF from an HTML element and returns it as a Blob.
 * Optimized for capturing elements even from hidden or off-screen containers.
 */
export const generatePDFBlob = async (element: HTMLElement, fileName: string): Promise<Blob> => {
  if (!element) {
    throw new Error("Element for PDF generation not found.");
  }

  // Ensure images are loaded and layout is stable
  await new Promise(resolve => setTimeout(resolve, 500));

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 1400,
      onclone: (clonedDoc) => {
        // Ensure the target element is visible in the cloned document
        // html2canvas uses an iframe for cloning, so we need to make sure the style doesn't block it.
        const id = element.id;
        if (id) {
          const clonedElement = clonedDoc.getElementById(id);
          if (clonedElement) {
            clonedElement.style.visibility = 'visible';
            clonedElement.style.opacity = '1';
            clonedElement.style.display = 'block';
            clonedElement.style.position = 'relative';
            clonedElement.style.left = '0';
            clonedElement.style.top = '0';
          }
        }
      }
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    let finalWidth = pdfWidth;
    let finalHeight = pdfWidth / ratio;

    if (finalHeight > pdfHeight) {
      finalHeight = pdfHeight;
      finalWidth = pdfHeight * ratio;
    }

    pdf.addImage(imgData, 'JPEG', (pdfWidth - finalWidth) / 2, 0, finalWidth, finalHeight);
    return pdf.output('blob');
  } catch (error) {
    console.error(`[pdfService] Failed to generate PDF for ${fileName}:`, error);
    throw error;
  }
};