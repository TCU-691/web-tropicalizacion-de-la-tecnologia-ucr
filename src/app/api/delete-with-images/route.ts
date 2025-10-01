import { NextRequest, NextResponse } from 'next/server';
import { deleteDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { 
  deleteImagesFromImageKit, 
  extractProjectImageUrls, 
  extractArticleImageUrls, 
  extractTourImageUrls, 
  extractCourseImageUrls 
} from '@/lib/imagekit-utils';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const collection = searchParams.get('collection');
    const documentId = searchParams.get('id');

    if (!collection || !documentId) {
      return NextResponse.json(
        { error: 'Collection and document ID are required' },
        { status: 400 }
      );
    }

    if (!db) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Get the document first to extract image URLs
    const docRef = doc(db, collection, documentId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const documentData = { id: docSnap.id, ...docSnap.data() };
    let imageUrls: string[] = [];

    // Extract image URLs based on collection type
    switch (collection) {
      case 'projects':
        imageUrls = extractProjectImageUrls(documentData);
        break;
      case 'articles':
        imageUrls = extractArticleImageUrls(documentData);
        break;
      case 'tours':
        imageUrls = extractTourImageUrls(documentData);
        break;
      case 'courses':
        imageUrls = extractCourseImageUrls(documentData);
        break;
      default:
        return NextResponse.json(
          { error: 'Unsupported collection type' },
          { status: 400 }
        );
    }

    // Delete images from ImageKit first
    let imageDeleteResult = { success: 0, failed: 0 };
    if (imageUrls.length > 0) {
      imageDeleteResult = await deleteImagesFromImageKit(imageUrls);
      console.log(`ImageKit deletion result:`, imageDeleteResult);
    }

    // Delete the document from Firebase
    await deleteDoc(docRef);

    return NextResponse.json({
      message: 'Document and associated images deleted successfully',
      imageDeleteResult,
      deletedImageUrls: imageUrls
    });

  } catch (error) {
    console.error('Error in delete-with-images API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
