// API Client to interact with Python FastAPI backend
import { FaceItem } from './types';

export const api = {
  async getStats() {
    const res = await fetch('/api/stats');
    if (!res.ok) throw new Error('Erreur de chargement des stats');
    return res.json();
  },

  async getPeople(search: string = '') {
    const res = await fetch(`/api/people?q=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error('Erreur de chargement des personnes');
    return res.json();
  },

  async getPersonDetail(personId: string | number) {
    const res = await fetch(`/api/people/${personId}`);
    if (!res.ok) throw new Error('Erreur de chargement du profil');
    return res.json();
  },

  async getFaces(page = 1, limit = 80, search = ''): Promise<{ total: number; page: number; limit: number; faces: FaceItem[] }> {
    const res = await fetch(`/api/faces?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    if (!res.ok) throw new Error('Erreur de chargement des visages');
    return res.json();
  },

  async getMergeSuggestions(threshold = 0.55) {
    const res = await fetch(`/api/suggestions?threshold=${threshold}`);
    if (!res.ok) return [];
    return res.json();
  },

  async mergeMultipleFaces(sourcePersonIds: number[], targetPersonId: number) {
    const res = await fetch('/api/faces/merge-multiple', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_person_ids: sourcePersonIds,
        target_person_id: targetPersonId,
      }),
    });
    if (!res.ok) throw new Error('Erreur lors de la fusion multiple');
    return res.json();
  },

  async renamePerson(personId: string | number, newName: string) {
    const res = await fetch(`/api/people/${personId}/rename`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName }),
    });
    if (!res.ok) throw new Error('Erreur lors du renommage');
    return res.json();
  },

  async mergePeople(personId: string | number, targetPersonId: string | number) {
    const res = await fetch(`/api/people/${personId}/merge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_person_id: Number(targetPersonId) }),
    });
    if (!res.ok) throw new Error('Erreur lors de la fusion');
    return res.json();
  },

  async deletePerson(personId: string | number) {
    const res = await fetch(`/api/people/${personId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erreur lors de la suppression');
    return res.json();
  },

  async getPhotos(page = 1, limit = 50, personIds: string = '') {
    const res = await fetch(`/api/photos?page=${page}&limit=${limit}&person_ids=${encodeURIComponent(personIds)}`);
    if (!res.ok) throw new Error('Erreur de chargement des photos');
    return res.json();
  },

  async getPhotoDetail(photoId: string | number) {
    const res = await fetch(`/api/photos/${photoId}`);
    if (!res.ok) throw new Error('Erreur de chargement du détail de la photo');
    return res.json();
  },

  getExportZipUrl(personId?: string | number) {
    return personId ? `/api/export-zip?person_id=${personId}` : `/api/export-zip`;
  },

  async associateFace(data: {
    image_id: number;
    face_box: string;
    old_person_id?: number | null;
    target_person_id?: number | null;
    new_person_name?: string | null;
  }) {
    const res = await fetch('/api/associate-face', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erreur d'association");
    return res.json();
  },

  async browseFolder(title: string = "Sélectionner un dossier") {
    const res = await fetch(`/api/browse-folder?title=${encodeURIComponent(title)}`, { method: 'POST' });
    if (!res.ok) throw new Error('Erreur de sélection du dossier');
    return res.json();
  },

  async startScan(sourceDir: string, outputDir?: string, forceReprocess = false) {
    const res = await fetch('/api/scan/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_dir: sourceDir, output_dir: outputDir, force_reprocess: forceReprocess }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Erreur au démarrage du scan');
    }
    return res.json();
  },

  async pauseScan() {
    const res = await fetch('/api/scan/pause', { method: 'POST' });
    return res.json();
  },

  async resumeScan() {
    const res = await fetch('/api/scan/resume', { method: 'POST' });
    return res.json();
  },

  async cancelScan() {
    const res = await fetch('/api/scan/cancel', { method: 'POST' });
    return res.json();
  },

  async getScanStatus() {
    const res = await fetch('/api/scan/status');
    if (!res.ok) return null;
    return res.json();
  },

  async getSettings() {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Erreur paramètres');
    return res.json();
  },

  async updateSettings(settings: any) {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Erreur mise à jour paramètres');
    return res.json();
  },
};
