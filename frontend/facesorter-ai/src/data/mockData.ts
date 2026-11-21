/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Photo, Person, ScanHistory, Settings, Face, BoundingBox } from '../types';

// Unsplash high quality portraits for realistic face detection
export const INITIAL_PEOPLE: Person[] = [
  {
    id: 'p1',
    name: 'Sophie Martin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150',
    photosCount: 3,
    facesCount: 3,
    lastSeen: '2026-06-29 18:24'
  },
  {
    id: 'p2',
    name: 'Thomas Bernard',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150',
    photosCount: 3,
    facesCount: 3,
    lastSeen: '2026-06-28 14:15'
  },
  {
    id: 'p3',
    name: 'Léa Dubois',
    avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150',
    photosCount: 2,
    facesCount: 2,
    lastSeen: '2026-06-29 11:05'
  },
  {
    id: 'p4',
    name: 'Lucas Petit',
    avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150',
    photosCount: 2,
    facesCount: 2,
    lastSeen: '2026-06-25 09:40'
  },
  {
    id: 'p5',
    name: 'Emma Moreau',
    avatarUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150&h=150',
    photosCount: 2,
    facesCount: 2,
    lastSeen: '2026-06-30 10:12'
  }
];

export const INITIAL_PHOTOS: Photo[] = [
  {
    id: 'ph1',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800',
    name: 'DSC_0981.jpg',
    date: '2026-06-29',
    size: '3.4 MB',
    facesCount: 1,
    path: '/user/photos/portraits/DSC_0981.jpg',
    faces: [
      {
        id: 'f1',
        photoId: 'ph1',
        boundingBox: { x: 35, y: 22, w: 30, h: 30 },
        personId: 'p1',
        confidence: 0.98,
        croppedUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  },
  {
    id: 'ph2',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800',
    name: 'DSC_1024.jpg',
    date: '2026-06-28',
    size: '4.1 MB',
    facesCount: 1,
    path: '/user/photos/portraits/DSC_1024.jpg',
    faces: [
      {
        id: 'f2',
        photoId: 'ph2',
        boundingBox: { x: 35, y: 20, w: 30, h: 32 },
        personId: 'p2',
        confidence: 0.96,
        croppedUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  },
  {
    id: 'ph3',
    url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=800',
    name: 'DSC_0821.jpg',
    date: '2026-06-29',
    size: '2.8 MB',
    facesCount: 1,
    path: '/user/photos/vacances/DSC_0821.jpg',
    faces: [
      {
        id: 'f3',
        photoId: 'ph3',
        boundingBox: { x: 36, y: 25, w: 28, h: 28 },
        personId: 'p3',
        confidence: 0.99,
        croppedUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  },
  {
    id: 'ph4',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800',
    name: 'DSC_0045.jpg',
    date: '2026-06-25',
    size: '3.9 MB',
    facesCount: 1,
    path: '/user/photos/travail/DSC_0045.jpg',
    faces: [
      {
        id: 'f4',
        photoId: 'ph4',
        boundingBox: { x: 35, y: 22, w: 30, h: 30 },
        personId: 'p4',
        confidence: 0.95,
        croppedUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  },
  {
    id: 'ph5',
    url: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=800',
    name: 'IMG_20260630_10.jpg',
    date: '2026-06-30',
    size: '5.2 MB',
    facesCount: 1,
    path: '/user/photos/famille/IMG_20260630_10.jpg',
    faces: [
      {
        id: 'f5',
        photoId: 'ph5',
        boundingBox: { x: 35, y: 24, w: 30, h: 30 },
        personId: 'p5',
        confidence: 0.97,
        croppedUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  },
  // Multi-person photo 1: Sophie and Emma
  {
    id: 'ph6',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    name: 'DSC_0512.jpg',
    date: '2026-06-28',
    size: '4.8 MB',
    facesCount: 2,
    path: '/user/photos/soirees/DSC_0512.jpg',
    faces: [
      {
        id: 'f6_1',
        photoId: 'ph6',
        boundingBox: { x: 25, y: 20, w: 18, h: 22 },
        personId: 'p1', // Sophie Martin
        confidence: 0.92,
        croppedUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=100&h=100'
      },
      {
        id: 'f6_2',
        photoId: 'ph6',
        boundingBox: { x: 55, y: 18, w: 18, h: 22 },
        personId: 'p5', // Emma Moreau
        confidence: 0.89,
        croppedUrl: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?auto=format&fit=crop&q=80&w=100&h=100'
      }
    ]
  },
  // Multi-person photo 2: Thomas and Lucas
  {
    id: 'ph7',
    url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
    name: 'IMG_office_lunch.jpg',
    date: '2026-06-24',
    size: '5.5 MB',
    facesCount: 2,
    path: '/user/photos/travail/IMG_office_lunch.jpg',
    faces: [
      {
        id: 'f7_1',
        photoId: 'ph7',
        boundingBox: { x: 28, y: 25, w: 15, h: 20 },
        personId: 'p2', // Thomas Bernard
        confidence: 0.94,
        croppedUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=100&h=100'
      },
      {
        id: 'f7_2',
        photoId: 'ph7',
        boundingBox: { x: 58, y: 23, w: 15, h: 20 },
        personId: 'p4', // Lucas Petit
        confidence: 0.91,
        croppedUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=100&h=100'
      }
    ]
  },
  // Single-person Photo 3: Sophie martin in cafe
  {
    id: 'ph8',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
    name: 'DSC_1082.jpg',
    date: '2026-06-27',
    size: '3.1 MB',
    facesCount: 1,
    path: '/user/photos/vacances/DSC_1082.jpg',
    faces: [
      {
        id: 'f8',
        photoId: 'ph8',
        boundingBox: { x: 38, y: 15, w: 25, h: 28 },
        personId: 'p1', // Sophie Martin
        confidence: 0.97,
        croppedUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  },
  // Single-person Photo 4: Thomas in urban area
  {
    id: 'ph9',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800',
    name: 'DSC_0224.jpg',
    date: '2026-06-25',
    size: '4.6 MB',
    facesCount: 1,
    path: '/user/photos/ville/DSC_0224.jpg',
    faces: [
      {
        id: 'f9',
        photoId: 'ph9',
        boundingBox: { x: 36, y: 20, w: 28, h: 28 },
        personId: 'p2', // Thomas Bernard
        confidence: 0.95,
        croppedUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  },
  // Single-person Photo 5: Léa Dubois
  {
    id: 'ph10',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
    name: 'IMG_20260629_11.jpg',
    date: '2026-06-29',
    size: '3.7 MB',
    facesCount: 1,
    path: '/user/photos/portraits/IMG_20260629_11.jpg',
    faces: [
      {
        id: 'f10',
        photoId: 'ph10',
        boundingBox: { x: 35, y: 18, w: 30, h: 30 },
        personId: 'p3', // Léa Dubois
        confidence: 0.91,
        croppedUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150&h=150'
      }
    ]
  }
];

// Unscanned photos queue located in different folders waiting for a scan
export interface UnscannedPhoto {
  id: string;
  url: string;
  name: string;
  size: string;
  facesToDetect: {
    boundingBox: BoundingBox;
    confidence: number;
    personId: string | 'new'; // 'new' means it will create a new person or be recognized
    personName?: string; // If 'new', what is their suggested name
    avatarUrl: string;
  }[];
}

export const FOLDERS_TO_SCAN = [
  { path: '/user/photos/import_camera_2026', count: 5, description: 'Photos de vacances en Grèce' },
  { path: '/user/photos/anniversaire_lucas', count: 3, description: "Photos de l'anniversaire de Lucas" },
  { path: '/user/photos/bureau_team_building', count: 4, description: "Séminaire de l'entreprise 2026" }
];

export const UNSCANNED_PHOTOS_BY_FOLDER: Record<string, UnscannedPhoto[]> = {
  '/user/photos/import_camera_2026': [
    {
      id: 'un1',
      url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800',
      name: 'GREECE_001.jpg',
      size: '4.5 MB',
      facesToDetect: [
        {
          boundingBox: { x: 36, y: 22, w: 26, h: 26 },
          confidence: 0.94,
          personId: 'p1', // Sophie Martin
          avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    },
    {
      id: 'un2',
      url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
      name: 'GREECE_002.jpg',
      size: '3.8 MB',
      facesToDetect: [
        {
          boundingBox: { x: 34, y: 20, w: 28, h: 28 },
          confidence: 0.97,
          personId: 'p2', // Thomas Bernard
          avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    },
    {
      id: 'un3',
      url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800',
      name: 'GREECE_003.jpg',
      size: '5.1 MB',
      facesToDetect: [
        {
          boundingBox: { x: 38, y: 15, w: 24, h: 26 },
          confidence: 0.93,
          personId: 'new', // Creates a new person
          personName: 'Chloé Masson',
          avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    },
    {
      id: 'un4',
      url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800',
      name: 'GREECE_004.jpg',
      size: '4.2 MB',
      facesToDetect: [
        {
          boundingBox: { x: 35, y: 22, w: 28, h: 28 },
          confidence: 0.95,
          personId: 'p3', // Léa Dubois
          avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    },
    {
      id: 'un5',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      name: 'GREECE_005.jpg',
      size: '4.9 MB',
      facesToDetect: [
        {
          boundingBox: { x: 35, y: 18, w: 30, h: 30 },
          confidence: 0.96,
          personId: 'new', // Creates a new person
          personName: 'Marc Lefevre',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    }
  ],
  '/user/photos/anniversaire_lucas': [
    {
      id: 'un6',
      url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800',
      name: 'LUCAS_BDAY_1.jpg',
      size: '5.6 MB',
      facesToDetect: [
        {
          boundingBox: { x: 38, y: 15, w: 24, h: 26 },
          confidence: 0.98,
          personId: 'p4', // Lucas Petit
          avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    },
    {
      id: 'un7',
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800',
      name: 'LUCAS_BDAY_2.jpg',
      size: '4.3 MB',
      facesToDetect: [
        {
          boundingBox: { x: 36, y: 22, w: 26, h: 26 },
          confidence: 0.96,
          personId: 'p5', // Emma Moreau
          avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    },
    {
      id: 'un8',
      url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=800',
      name: 'LUCAS_BDAY_3.jpg',
      size: '3.9 MB',
      facesToDetect: [
        {
          boundingBox: { x: 35, y: 18, w: 28, h: 28 },
          confidence: 0.91,
          personId: 'p2', // Thomas Bernard
          avatarUrl: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    }
  ],
  '/user/photos/bureau_team_building': [
    {
      id: 'un9',
      url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800',
      name: 'TEAM_BUILD_1.jpg',
      size: '4.8 MB',
      facesToDetect: [
        {
          boundingBox: { x: 36, y: 20, w: 26, h: 26 },
          confidence: 0.92,
          personId: 'p4', // Lucas
          avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    },
    {
      id: 'un10',
      url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      name: 'TEAM_BUILD_2.jpg',
      size: '4.2 MB',
      facesToDetect: [
        {
          boundingBox: { x: 34, y: 22, w: 28, h: 28 },
          confidence: 0.95,
          personId: 'new', // Will be Marc Lefevre if we scanned previous, otherwise new person
          personName: 'Marc Lefevre',
          avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150&h=150'
        }
      ]
    }
  ]
};

export const INITIAL_HISTORY: ScanHistory[] = [
  {
    id: 'h1',
    date: '2026-06-29 18:22',
    folderPath: '/user/photos/vacances_2026_juin',
    photosCount: 24,
    duration: '18.4s',
    status: 'success',
    progress: 100,
    detectedFaces: 32,
    recognizedPeople: 8
  },
  {
    id: 'h2',
    date: '2026-06-28 14:10',
    folderPath: '/user/photos/mariage_lucie',
    photosCount: 154,
    duration: '124.2s',
    status: 'success',
    progress: 100,
    detectedFaces: 215,
    recognizedPeople: 14
  },
  {
    id: 'h3',
    date: '2026-06-24 09:30',
    folderPath: '/user/photos/travail_portraits',
    photosCount: 12,
    duration: '8.1s',
    status: 'success',
    progress: 100,
    detectedFaces: 12,
    recognizedPeople: 5
  },
  {
    id: 'h4',
    date: '2026-06-20 16:45',
    folderPath: '/user/photos/corrupted_folder',
    photosCount: 4,
    duration: '2.1s',
    status: 'failed',
    progress: 35,
    detectedFaces: 1,
    recognizedPeople: 1
  }
];

export const DEFAULT_SETTINGS: Settings = {
  modelName: 'FaceNet-ResNet50v2',
  confidenceThreshold: 0.75,
  minFaceSize: 64,
  copyFiles: true,
  symlinkFiles: false,
  autoMerge: true,
  threads: 4,
  gpuEnabled: true,
  language: 'fr',
  thumbnailSize: 'md'
};
