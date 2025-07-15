
import type { Timestamp } from 'firebase/firestore';

// Base interfaces for blocks
interface BlockBase {
    id: string;
    type: string;
    title: string;
}

export interface TextBlock extends BlockBase {
    type: 'text';
    content: string;
}

export interface VideoBlock extends BlockBase {
    type: 'video';
    youtubeUrl: string;
}

export interface ImageBlock extends BlockBase {
    type: 'image';
    imageUrl: string;
    description: string;
}

export interface LinkBlock extends BlockBase {
    type: 'link';
    url: string;
    description: string;
}

export interface CarouselImage {
    id: string;
    imageUrl: string;
}

export interface CarouselBlock extends BlockBase {
    type: 'carousel';
    description: string;
    images: CarouselImage[];
}

export interface ContactBlock extends BlockBase {
    type: 'contact';
    name: string;
    email: string;
    phone?: string;
    socialLink?: string;
}

export interface Paper {
    id: string;
    title: string;
    authors: string;
    link: string;
    year: string;
}

export interface PapersBlock extends BlockBase {
    type: 'papers';
    papers: Paper[];
}

export interface Resource {
    id: string;
    title: string;
    description?: string;
    link: string;
}

export interface ResourcesBlock extends BlockBase {
    type: 'resources';
    resources: Resource[];
}

export interface RelatedCoursesBlock extends BlockBase {
    type: 'relatedCourses';
    courseIds: string[];
}

// Union type for all possible blocks
export type ProjectBlock = 
    | TextBlock 
    | VideoBlock 
    | ImageBlock 
    | LinkBlock
    | CarouselBlock
    | ContactBlock
    | PapersBlock
    | ResourcesBlock
    | RelatedCoursesBlock;

// The main type for a project document in Firestore
export interface FirestoreProject {
    id: string; // Firestore document ID
    slug: string;
    name: string;
    description: string;
    longDescription: string;
    category: string;
    coverImageUrl: string;
    blocks: ProjectBlock[];
    createdBy: string; // User UID
    createdAt: Timestamp;
    updatedAt: Timestamp;
    parentId?: string | null; // ID of the parent project, if it's a subproject
}

// Type extension for hierarchical view
export interface HierarchicalProject extends FirestoreProject {
    subProjects: FirestoreProject[];
}
