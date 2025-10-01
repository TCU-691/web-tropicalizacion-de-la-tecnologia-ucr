/**
 * Delete a document from Firebase along with its associated ImageKit images
 */
export async function deleteDocumentWithImages(
  collection: string, 
  documentId: string
): Promise<{ success: boolean; message: string; imageDeleteResult?: any }> {
  try {
    const response = await fetch(
      `/api/delete-with-images?collection=${collection}&id=${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete document');
    }

    return {
      success: true,
      message: result.message,
      imageDeleteResult: result.imageDeleteResult
    };
  } catch (error) {
    console.error('Error deleting document with images:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}
