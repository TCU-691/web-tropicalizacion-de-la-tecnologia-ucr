import ImageKit from 'imagekit';

// Initialize ImageKit instance for server-side operations
let imagekit: ImageKit | null = null;

function getImageKitInstance(): ImageKit {
  if (!imagekit) {
    if (!process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_PRIVATE_KEY) {
      throw new Error('ImageKit keys are not configured in environment variables');
    }
    
    imagekit = new ImageKit({
      publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
      privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
      urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || `https://ik.imagekit.io/${process.env.IMAGEKIT_PUBLIC_KEY}`,
    });
  }
  return imagekit;
}

/**
 * Extract file ID from ImageKit URL
 * ImageKit URLs typically follow the pattern: https://ik.imagekit.io/your-id/path/filename_fileId.ext
 */
export function extractFileIdFromUrl(imageUrl: string): string | null {
  try {
    // Handle different ImageKit URL patterns
    const url = new URL(imageUrl);
    
    // Pattern 1: File ID in the path (most common)
    const pathSegments = url.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    
    // Check if the last segment contains an underscore (indicating file ID)
    if (lastSegment.includes('_')) {
      const parts = lastSegment.split('_');
      if (parts.length >= 2) {
        // Remove file extension from the file ID
        const fileIdWithExt = parts[parts.length - 1];
        const fileId = fileIdWithExt.split('.')[0];
        return fileId;
      }
    }
    
    // Pattern 2: File ID as query parameter
    const fileId = url.searchParams.get('fileId');
    if (fileId) {
      return fileId;
    }
    
    // Pattern 3: Try to extract from the full path
    const fullPath = url.pathname.substring(1); // Remove leading slash
    return fullPath;
    
  } catch (error) {
    console.error('Error extracting file ID from URL:', error);
    return null;
  }
}

/**
 * Delete a single image from ImageKit
 */
export async function deleteImageFromImageKit(imageUrl: string): Promise<boolean> {
  try {
    const fileId = extractFileIdFromUrl(imageUrl);
    if (!fileId) {
      console.error('Could not extract file ID from URL:', imageUrl);
      return false;
    }

    const imagekitInstance = getImageKitInstance();
    await imagekitInstance.deleteFile(fileId);
    console.log(`Successfully deleted image from ImageKit: ${fileId}`);
    return true;
  } catch (error) {
    console.error('Error deleting image from ImageKit:', error);
    return false;
  }
}

/**
 * Delete multiple images from ImageKit
 */
export async function deleteImagesFromImageKit(imageUrls: string[]): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (const imageUrl of imageUrls) {
    const result = await deleteImageFromImageKit(imageUrl);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Extract all image URLs from a project's blocks
 */
export function extractProjectImageUrls(project: any): string[] {
  const imageUrls: string[] = [];
  
  // Add cover image
  if (project.coverImageUrl) {
    imageUrls.push(project.coverImageUrl);
  }

  // Extract images from blocks
  if (project.blocks && Array.isArray(project.blocks)) {
    project.blocks.forEach((block: any) => {
      switch (block.type) {
        case 'image':
          if (block.imageUrl) {
            imageUrls.push(block.imageUrl);
          }
          break;
        case 'carousel':
          if (block.images && Array.isArray(block.images)) {
            block.images.forEach((img: any) => {
              if (img.imageUrl) {
                imageUrls.push(img.imageUrl);
              }
            });
          }
          break;
      }
    });
  }

  return imageUrls;
}

/**
 * Extract image URLs from an article
 */
export function extractArticleImageUrls(article: any): string[] {
  const imageUrls: string[] = [];
  
  // Add cover image
  if (article.coverImageUrl) {
    imageUrls.push(article.coverImageUrl);
  }

  return imageUrls;
}

/**
 * Extract image URLs from a tour
 */
export function extractTourImageUrls(tour: any): string[] {
  const imageUrls: string[] = [];
  
  // Add main image
  if (tour.imageUrl) {
    imageUrls.push(tour.imageUrl);
  }

  return imageUrls;
}

/**
 * Extract image URLs from a course
 */
export function extractCourseImageUrls(course: any): string[] {
  const imageUrls: string[] = [];
  
  // Add cover image
  if (course.imagenUrl) {
    imageUrls.push(course.imagenUrl);
  }

  return imageUrls;
}
