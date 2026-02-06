import * as pdfjs from 'pdfjs-dist';

// Ensure worker is configured (using same CDN version as PdfViewer to match)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@4.8.69/build/pdf.worker.min.mjs`;

interface PageRange {
    startPage: number;
    endPage: number;
}

export const extractTextFromLocalFile = async (file: File, range?: PageRange): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = '';
        const totalPages = pdf.numPages;

        const start = range?.startPage ? Math.max(1, range.startPage) : 1;
        const end = range?.endPage ? Math.min(totalPages, range.endPage) : totalPages;

        console.log(`Analyzing pages ${start} to ${end} of ${totalPages}`);

        for (let i = start; i <= end; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                // @ts-ignore - 'str' exists on TextItem
                .map((item) => item.str)
                .join(' ');

            fullText += `[Page ${i}]\n${pageText}\n\n`;
        }

        return fullText;
    } catch (error) {
        console.error('PDF Extraction Error:', error);
        throw new Error('Failed to extract text from PDF');
    }
};

export const convertPdfToImages = async (file: File, range?: PageRange, maxPages = 5): Promise<string[]> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        const images: string[] = [];

        const start = range?.startPage ? Math.max(1, range.startPage) : 1;
        const totalPages = pdf.numPages;

        // Determine end page: User range OR Max pages limit from start
        let end = range?.endPage ? Math.min(totalPages, range.endPage) : Math.min(totalPages, start + maxPages - 1);

        // Safety: ensure we don't process too many images if range is huge
        if (end - start + 1 > maxPages) {
            end = start + maxPages - 1;
        }

        console.log(`Converting pages ${start} to ${end} to images`);

        for (let i = start; i <= end; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 2.0 }); // High quality

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            if (!context) continue;

            // @ts-ignore - Type definition mismatch for RenderParameters
            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const base64 = canvas.toDataURL('image/jpeg', 0.8);
            images.push(base64.split(',')[1]); // Remove prefix for API
        }

        return images;
    } catch (error) {
        console.error('PDF to Image Conversion Error:', error);
        throw new Error('Failed to convert PDF to images');
    }
};

export const getPdfPageCount = async (file: File): Promise<number> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        return pdf.numPages;
    } catch (error) {
        console.error('Failed to get page count:', error);
        return 0;
    }
};
