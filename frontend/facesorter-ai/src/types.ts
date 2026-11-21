/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BoundingBox {
  x: number; // percentage from left (0-100)
  y: number; // percentage from top (0-100)
  w: number; // percentage width (0-100)
  h: number; // percentage height (0-100)
}

export interface FaceItem {
  id: string;
  face_id: string;
  person_id: number;
  person_name: string;
  image_id: number;
  image_path: string;
  face_box: string;
  confidence: number;
  thumbnail_url: string;
  date?: string;
}

export interface Face {
  id: string;
  photoId: string;
  boundingBox: BoundingBox;
  personId: string | null;
  confidence: number;
  croppedUrl: string; // URL to the cropped face
}

export interface Photo {
  id: string;
  url: string;
  name: string;
  date: string;
  size: string; // e.g. "4.2 MB"
  facesCount: number;
  faces: Face[];
  path: string;
}

export interface Person {
  id: string;
  name: string;
  avatarUrl: string; // URL of the face crop
  photosCount: number;
  facesCount: number;
  lastSeen: string;
}

export interface ScanHistory {
  id: string;
  date: string;
  folderPath: string;
  photosCount: number;
  duration: string;
  status: 'success' | 'processing' | 'failed';
  progress: number;
  detectedFaces: number;
  recognizedPeople: number;
}

export interface Settings {
  modelName: string;
  confidenceThreshold: number;
  minFaceSize: number;
  copyFiles: boolean;
  symlinkFiles: boolean;
  autoMerge: boolean;
  threads: number;
  gpuEnabled: boolean;
  language: 'fr' | 'en';
  thumbnailSize: 'sm' | 'md' | 'lg';
}

export type ActiveTab = 
  | 'dashboard'
  | 'scanner'
  | 'people'
  | 'faces'
  | 'gallery'
  | 'processing'
  | 'settings'
  | 'person-detail';
