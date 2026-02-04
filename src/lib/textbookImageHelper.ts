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

/**
 * Check if running in production (Vercel) where local file access isn't available
 */
function isProduction(): boolean {
  return process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
}

/**
 * Fetch local training image as base64 for Gemini Vision API
 * Training images are stored locally in the content folder
 * Note: This only works in development. In production, images should be served from CDN.
 */
export async function fetchLocalImageAsBase64(imagePath: string): Promise<string | null> {
  // Skip local file reading in production (Vercel)
  if (isProduction()) {
    console.log('Skipping local file read in production:', imagePath);
    return null;
  }

  try {
    // Dynamic import only in development
    const fs = await import('fs/promises');
    const path = await import('path');

    // Build absolute path from project root
    const absolutePath = path.join(process.cwd(), imagePath);

    // Check if file exists
    try {
      await fs.access(absolutePath);
    } catch {
      console.error('Training image not found:', absolutePath);
      return null;
    }

    const buffer = await fs.readFile(absolutePath);
    const base64 = buffer.toString('base64');
    return base64;
  } catch (error) {
    console.error('Error reading local image:', error);
    return null;
  }
}

/**
 * Get inline data parts for training images (local files)
 * In production, returns empty array - quiz will generate from topic name only
 */
export async function getTrainingImagePartsForGemini(imagePaths: string[]): Promise<any[]> {
  // In production, skip local file reading entirely
  if (isProduction()) {
    console.log('Production mode: Skipping local training images, quiz will use topic name only');
    return [];
  }

  const parts = [];

  // Limit to first 8 pages to avoid token limits but get enough content
  const limitedPaths = imagePaths.slice(0, 8);

  for (const imagePath of limitedPaths) {
    const base64Data = await fetchLocalImageAsBase64(imagePath);

    if (base64Data) {
      const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    }
  }

  return parts;
}
