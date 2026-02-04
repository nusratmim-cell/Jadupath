/**
 * Helper functions to fetch and process textbook images from Supabase Storage
 */

interface TextbookImageInfo {
  url: string;
  pageNumber: number;
}

/**
 * Get textbook image URLs for a topic from Supabase Storage
 */
export async function getTextbookImages(
  classId: string,
  subjectId: string,
  chapterId: string,
  startPage: number,
  endPage: number
): Promise<TextbookImageInfo[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error('Supabase URL not configured');
  }

  const images: TextbookImageInfo[] = [];

  // Generate URLs for all pages in the range
  for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
    const pageStr = String(pageNum).padStart(3, '0');

    // Try JPG first (most common), fallback to PNG
    const jpgUrl = `${supabaseUrl}/storage/v1/object/public/textbook-pages/${classId}/${subjectId}/${chapterId}/page-${pageStr}.jpg`;
    const pngUrl = `${supabaseUrl}/storage/v1/object/public/textbook-pages/${classId}/${subjectId}/${chapterId}/page-${pageStr}.png`;

    // For AI processing, we'll try JPG first
    images.push({
      url: jpgUrl,
      pageNumber: pageNum,
    });
  }

  return images;
}

/**
 * Fetch image as base64 for Gemini Vision API
 */
export async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      // Try PNG fallback
      const pngUrl = url.replace('.jpg', '.png');
      const pngResponse = await fetch(pngUrl);

      if (!pngResponse.ok) {
        return null;
      }

      const buffer = await pngResponse.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      return base64;
    }

    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

/**
 * Get inline data parts for Gemini Vision API
 */
export async function getImagePartsForGemini(imageUrls: string[]): Promise<any[]> {
  const parts = [];

  // Limit to first 5 pages to avoid token limits
  const limitedUrls = imageUrls.slice(0, 5);

  for (const url of limitedUrls) {
    const base64Data = await fetchImageAsBase64(url);

    if (base64Data) {
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType: url.endsWith('.png') ? 'image/png' : 'image/jpeg',
        },
      });
    }
  }

  return parts;
}
