/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Image as ImageIcon, 
  Sparkles, 
  Trash2, 
  ArrowLeft, 
  GitMerge, 
  Edit3, 
  Folder,
  Download,
  Filter
} from 'lucide-react';

// Import Types
import { Photo, Person, Settings, ActiveTab, FaceItem } from './types';
import { api } from './api';

// Import Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import StatsCard from './components/StatsCard';
import PersonCard from './components/PersonCard';
import GalleryCard from './components/GalleryCard';
import PhotoViewer from './components/PhotoViewer';
import ScanPanel from './components/ScanPanel';
import FacesView from './components/FacesView';
import SettingsPanel from './components/SettingsPanel';
import Toast, { ToastMessage } from './components/Toast';
import { EmptyState } from './components/Skeletons';
import { 
  RenamePersonModal, 
  MergePeopleModal, 
  DeleteConfirmModal 
} from './components/Modals';

export default function App() {
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [people, setPeople] = useState<Person[]>([]);
  const [faces, setFaces] = useState<FaceItem[]>([]);
  const [mergeSuggestions, setMergeSuggestions] = useState<any[]>([]);
  const [totalFacesCount, setTotalFacesCount] = useState(0);
  const [isFacesLoading, setIsFacesLoading] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [filterPersonIds, setFilterPersonIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<Settings>({
    modelName: 'InsightFace buffalo_l',
    confidenceThreshold: 0.45,
    minFaceSize: 64,
    copyFiles: true,
    symlinkFiles: false,
    autoMerge: true,
    threads: 4,
    gpuEnabled: true,
    language: 'fr',
    thumbnailSize: 'md'
  });
  const [serverStats, setServerStats] = useState<any>({
    total_people: 0,
    total_photos: 0,
    processed_photos: 0,
    total_faces: 0
  });

  // Active Selections / Details
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [personDetailPhotos, setPersonDetailPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Folder scanning states
  const [selectedFolderPath, setSelectedFolderPath] = useState('');
  const [selectedOutputFolderPath, setSelectedOutputFolderPath] = useState('classified');
  const [photosCountInFolder, setPhotosCountInFolder] = useState(0);

  // Loaders
  const [isLoading, setIsLoading] = useState(false);

  // Scan states
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState({
    analyzedCount: 0,
    totalCount: 0,
    currentPhotoUrl: '',
    currentPhotoName: '',
    detectedFacesCount: 0,
    recognizedPeopleCount: 0,
    elapsedTime: '0.0s',
    recentLogs: [] as string[]
  });

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Modals state
  const [modals, setModals] = useState<{
    rename: { isOpen: boolean; person: Person | null };
    merge: { isOpen: boolean; person: Person | null };
    delete: { isOpen: boolean; target: any; type: 'person' | 'photo' | 'association' };
  }>({
    rename: { isOpen: false, person: null },
    merge: { isOpen: false, person: null },
    delete: { isOpen: false, target: null, type: 'person' },
  });

  // --- THEME TOGGLE ---
  const toggleTheme = () => {
    setIsDarkMode(prev => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // --- TOAST HELPER ---
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const newToast: ToastMessage = {
      id: Math.random().toString(),
      message,
      type
    };
    setToasts((prev) => [...prev, newToast]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // --- LOAD INITIAL DATA ---
  const loadData = useCallback(async () => {
    try {
      const [statsRes, peopleRes, photosRes, settingsRes, suggRes] = await Promise.allSettled([
        api.getStats(),
        api.getPeople(''),
        api.getPhotos(1, 60, filterPersonIds.join(',')),
        api.getSettings(),
        api.getMergeSuggestions(0.52)
      ]);

      if (statsRes.status === 'fulfilled') {
        setServerStats(statsRes.value);
        if (statsRes.value.output_dir) {
          setSelectedOutputFolderPath(statsRes.value.output_dir);
        }
      }
      if (peopleRes.status === 'fulfilled') {
        setPeople(peopleRes.value);
      }
      if (photosRes.status === 'fulfilled') {
        setPhotos(photosRes.value.photos || []);
      }
      if (suggRes.status === 'fulfilled') {
        setMergeSuggestions(suggRes.value || []);
      }
      if (settingsRes.status === 'fulfilled') {
        const s = settingsRes.value;
        setSettings(prev => ({
          ...prev,
          modelName: s.modelName,
          confidenceThreshold: s.recognition_threshold ?? 0.45,
          threads: s.cpu_threads ?? 4
        }));
      }
    } catch (err) {
      console.error("Erreur de connexion API:", err);
    }
  }, [filterPersonIds]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load Faces tab data when activated
  const loadFaces = useCallback(async (search = '') => {
    setIsFacesLoading(true);
    try {
      const [facesRes, suggRes] = await Promise.all([
        api.getFaces(1, 100, search),
        api.getMergeSuggestions(0.52)
      ]);
      setFaces(facesRes.faces || []);
      setTotalFacesCount(facesRes.total || 0);
      setMergeSuggestions(suggRes || []);
    } catch (e) {
      console.error("Erreur chargement faces:", e);
    } finally {
      setIsFacesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'faces') {
      loadFaces(searchQuery);
    }
  }, [activeTab, searchQuery, loadFaces]);

  // --- POLL SCAN STATUS ---
  useEffect(() => {
    let interval: any = null;
    const checkStatus = async () => {
      try {
        const status = await api.getScanStatus();
        if (status) {
          setIsScanning(status.isScanning);
          setIsPaused(status.isPaused ?? false);
          setScanProgress(status.progress);
          setScanStatus({
            analyzedCount: status.analyzedCount,
            totalCount: status.totalCount,
            currentPhotoUrl: status.currentPhotoUrl,
            currentPhotoName: status.currentPhotoName,
            detectedFacesCount: status.detectedFacesCount,
            recognizedPeopleCount: status.recognizedPeopleCount,
            elapsedTime: status.elapsedTime,
            recentLogs: status.recentLogs || []
          });

          if (!status.isScanning && isScanning) {
            showToast("Analyse et tri terminés avec succès !", "success");
            loadData();
            if (activeTab === 'faces') loadFaces();
          }
        }
      } catch (err) {
        // silent
      }
    };

    interval = setInterval(checkStatus, isScanning ? 1000 : 3000);
    return () => clearInterval(interval);
  }, [isScanning, loadData, activeTab, loadFaces]);

  // --- LOAD PERSON DETAIL PHOTOS WHEN SELECTED ---
  useEffect(() => {
    if (!selectedPersonId) {
      setPersonDetailPhotos([]);
      return;
    }
    const fetchDetail = async () => {
      setIsLoading(true);
      try {
        const res = await api.getPersonDetail(selectedPersonId);
        setPersonDetailPhotos(res.photos || []);
      } catch (err) {
        showToast("Erreur de chargement des photos de la personne", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchDetail();
  }, [selectedPersonId]);

  // --- BROWSE SOURCE FOLDER ---
  const handleBrowseFolder = async () => {
    try {
      const res = await api.browseFolder("Sélectionner le dossier source des photos");
      if (res.folder) {
        setSelectedFolderPath(res.folder);
        setPhotosCountInFolder(res.photosCount || 0);
        showToast(`Dossier source sélectionné : ${res.folder} (${res.photosCount} photos trouvées)`);
      }
    } catch (err) {
      showToast("Impossible d'ouvrir l'explorateur de dossiers", "error");
    }
  };

  // --- BROWSE OUTPUT FOLDER ---
  const handleBrowseOutputFolder = async () => {
    try {
      const res = await api.browseFolder("Sélectionner le dossier de destination pour classer");
      if (res.folder) {
        setSelectedOutputFolderPath(res.folder);
        showToast(`Dossier destination défini : ${res.folder}`);
      }
    } catch (err) {
      showToast("Impossible d'ouvrir l'explorateur", "error");
    }
  };

  // --- START SCAN ---
  const handleStartScan = async (folderPath: string, outputFolderPath?: string, forceReprocess = false) => {
    try {
      await api.startScan(folderPath, outputFolderPath || selectedOutputFolderPath, forceReprocess);
      setIsScanning(true);
      showToast(
        forceReprocess
          ? "⚡ Retraitement forcé lancé — toutes les photos seront analysées !"
          : "Analyse GPU/DirectML lancée avec comparaison continue !",
        "success"
      );
    } catch (err: any) {
      showToast(err.message || "Erreur au lancement", "error");
    }
  };

  const handlePauseScan = async () => {
    await api.pauseScan();
    setIsPaused(true);
    showToast("Analyse mise en pause", "info");
  };

  const handleResumeScan = async () => {
    await api.resumeScan();
    setIsPaused(false);
    showToast("Analyse reprise", "info");
  };

  const handleCancelScan = async () => {
    await api.cancelScan();
    setIsScanning(false);
    showToast("Analyse interrompue", "info");
    loadData();
  };

  // --- MERGE MULTIPLE FACES ---
  const handleMergeMultipleFaces = async (sourcePersonIds: number[], targetPersonId: number) => {
    try {
      const res = await api.mergeMultipleFaces(sourcePersonIds, targetPersonId);
      showToast(res.message || "Visages fusionnés avec succès !", "success");
      loadFaces();
      loadData();
    } catch (e: any) {
      showToast(e.message || "Erreur de fusion", "error");
    }
  };

  // --- EXPORT ZIP ---
  const handleExportZip = (personId?: string | number) => {
    const url = api.getExportZipUrl(personId);
    window.open(url, '_blank');
    showToast("Téléchargement de l'archive ZIP démarré !", "info");
  };

  // --- PERSON ACTIONS ---
  const handleRenameSubmit = async (personId: string, newName: string) => {
    try {
      await api.renamePerson(personId, newName);
      setPeople(prev => prev.map(p => p.id === personId ? { ...p, name: newName } : p));
      showToast(`Profil renommé en "${newName}"`, "success");
      setModals(prev => ({ ...prev, rename: { isOpen: false, person: null } }));
    } catch (err: any) {
      showToast(err.message || "Erreur renommage", "error");
    }
  };

  const handleMergeSubmit = async (fromPersonId: string, toPersonId: string) => {
    try {
      await api.mergePeople(fromPersonId, toPersonId);
      showToast("Profils fusionnés avec succès !", "success");
      setModals(prev => ({ ...prev, merge: { isOpen: false, person: null } }));
      if (selectedPersonId === fromPersonId) {
        setSelectedPersonId(toPersonId);
      }
      loadData();
    } catch (err: any) {
      showToast(err.message || "Erreur de fusion", "error");
    }
  };

  const handleDeleteSubmit = async (personId: string) => {
    try {
      await api.deletePerson(personId);
      setPeople(prev => prev.filter(p => p.id !== personId));
      if (selectedPersonId === personId) {
        setSelectedPersonId(null);
        setActiveTab('people');
      }
      showToast("Profil supprimé", "info");
      setModals(prev => ({ ...prev, delete: { isOpen: false, target: null, type: 'person' } }));
    } catch (err: any) {
      showToast(err.message || "Erreur suppression", "error");
    }
  };

  // --- PHOTO VIEWER ACTIONS ---
  const handleOpenPhoto = async (photo: Photo) => {
    try {
      const detail = await api.getPhotoDetail(photo.id);
      setSelectedPhoto(detail);
    } catch {
      setSelectedPhoto(photo);
    }
  };

  const handleAssociateFace = async (faceId: string, targetPersonId: string | null) => {
    if (!selectedPhoto) return;
    try {
      const parts = faceId.split('_');
      const oldPid = parts[2] ? parseInt(parts[2]) : null;
      
      await api.associateFace({
        image_id: parseInt(selectedPhoto.id),
        face_box: "0,0,100,100",
        old_person_id: oldPid,
        target_person_id: targetPersonId ? parseInt(targetPersonId) : null
      });

      showToast("Visage mis à jour avec succès !", "success");
      const updated = await api.getPhotoDetail(selectedPhoto.id);
      setSelectedPhoto(updated);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Erreur d'association", "error");
    }
  };

  const handleCreateAndAssociateFace = async (faceId: string, name: string) => {
    if (!selectedPhoto) return;
    try {
      const parts = faceId.split('_');
      const oldPid = parts[2] ? parseInt(parts[2]) : null;

      await api.associateFace({
        image_id: parseInt(selectedPhoto.id),
        face_box: "0,0,100,100",
        old_person_id: oldPid,
        new_person_name: name
      });

      showToast(`Nouveau profil "${name}" créé et associé !`, "success");
      const updated = await api.getPhotoDetail(selectedPhoto.id);
      setSelectedPhoto(updated);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Erreur d'association", "error");
    }
  };

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const q = searchQuery.toLowerCase();
    return people.filter(p => p.name.toLowerCase().includes(q));
  }, [people, searchQuery]);

  const selectedPerson = useMemo(() => {
    return people.find(p => p.id === selectedPersonId) || null;
  }, [people, selectedPersonId]);

  return (
    <div className={`flex h-screen font-sans overflow-hidden transition-colors ${
      isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-[#F8FAFC] text-slate-800'
    }`}>
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'person-detail') setSelectedPersonId(null);
        }}
        serverStatus="online"
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
        onExportAllZip={() => handleExportZip()}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          title={
            activeTab === 'dashboard' ? 'Tableau de Bord' :
            activeTab === 'scanner' ? 'Numérisation & Classement' :
            activeTab === 'people' ? 'Personnes & Profils' :
            activeTab === 'faces' ? 'Visages Extraits (data_faces)' :
            activeTab === 'gallery' ? 'Galerie des Photos' :
            activeTab === 'settings' ? 'Paramètres & Configuration' :
            selectedPerson ? selectedPerson.name : 'Détails'
          }
          subtitle={
            activeTab === 'dashboard' ? 'Accélération GPU DirectML et comparaison continue des visages' :
            activeTab === 'scanner' ? 'Traitement instantané RAW, comparaison avec l’existant et tags IPTC' :
            activeTab === 'people' ? `${people.length} personnes identifiées` :
            activeTab === 'faces' ? 'Suggestions de fusions IA & regroupements de visages' :
            activeTab === 'gallery' ? `${photos.length} photos dans la collection` :
            activeTab === 'settings' ? 'Algorithmes, performances DirectML et dossiers de sortie' :
            'Photos associées à cette personne'
          }
          onNewScan={() => setActiveTab('scanner')}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Rechercher une personne, un visage, une photo..."
          showSearch={activeTab === 'people' || activeTab === 'gallery' || activeTab === 'dashboard' || activeTab === 'faces'}
        />

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8 max-w-7xl mx-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatsCard
                  id="stat-people"
                  title="Personnes Identifiées"
                  value={serverStats.total_people || people.length}
                  icon={Users}
                  color="blue"
                  subtext="Profils prototypes FAISS"
                />
                <StatsCard
                  id="stat-photos"
                  title="Photos Traitées"
                  value={serverStats.processed_photos || photos.length}
                  icon={ImageIcon}
                  color="emerald"
                  subtext={`Sur ${serverStats.total_photos || photos.length} au total`}
                />
                <StatsCard
                  id="stat-faces"
                  title="Visages Extraits"
                  value={serverStats.total_faces || 0}
                  icon={Sparkles}
                  color="indigo"
                  subtext="Dossier data_faces/"
                />
                <StatsCard
                  id="stat-speed"
                  title="Accélération Active"
                  value="GPU DirectML"
                  icon={Download}
                  color="amber"
                  subtext="Traitement RAW instantané"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`lg:col-span-2 p-6 rounded-3xl border shadow-xs space-y-6 ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
                }`}>
                  <div className={`flex items-center justify-between border-b pb-4 ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-100'
                  }`}>
                    <div>
                      <h3 className="text-sm font-extrabold tracking-tight">Personnes Récemment Classées</h3>
                      <p className="text-xs text-slate-400 font-medium">Accès rapide aux profils triés par l'IA</p>
                    </div>
                    <button
                      onClick={() => setActiveTab('people')}
                      className="text-xs font-bold text-blue-600 hover:text-blue-500 flex items-center gap-1 cursor-pointer"
                    >
                      Voir tout ({people.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {people.slice(0, 6).map((person) => (
                      <PersonCard
                        key={person.id}
                        id={`dash-person-${person.id}`}
                        person={person}
                        onOpen={(id) => {
                          setSelectedPersonId(id);
                          setActiveTab('person-detail');
                        }}
                        onRename={(p) => setModals(prev => ({ ...prev, rename: { isOpen: true, person: p } }))}
                        onMerge={(p) => setModals(prev => ({ ...prev, merge: { isOpen: true, person: p } }))}
                        onDelete={(p) => setModals(prev => ({ ...prev, delete: { isOpen: true, target: p, type: 'person' } }))}
                      />
                    ))}
                  </div>
                </div>

                <div className={`p-6 rounded-3xl border shadow-xs flex flex-col justify-between ${
                  isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
                }`}>
                  <div className="space-y-4">
                    <div className={`flex items-center gap-3 border-b pb-4 ${
                      isDarkMode ? 'border-slate-800' : 'border-slate-100'
                    }`}>
                      <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                        <Folder className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-extrabold tracking-tight">Lancer un Nouveau Tri</h3>
                        <p className="text-xs text-slate-400 font-medium">Comparaison automatique avec l'existant</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      L'accélération DirectML utilise votre GPU AMD/Intel/NVIDIA pour reconnaître automatiquement les personnes connues et créer les dossiers.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('scanner')}
                    className="w-full mt-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    Ouvrir le Scanner
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCANNER */}
          {activeTab === 'scanner' && (
            <div className="max-w-7xl mx-auto">
              <ScanPanel
                id="scan-panel-main"
                settings={settings}
                onUpdateSettings={setSettings}
                onStartScan={handleStartScan}
                onPauseScan={handlePauseScan}
                onResumeScan={handleResumeScan}
                onCancelScan={handleCancelScan}
                onBrowseFolder={handleBrowseFolder}
                onBrowseOutputFolder={handleBrowseOutputFolder}
                selectedFolderPath={selectedFolderPath}
                selectedOutputFolderPath={selectedOutputFolderPath}
                photosCountInFolder={photosCountInFolder}
                isScanning={isScanning}
                isPaused={isPaused}
                scanProgress={scanProgress}
                scanStatus={scanStatus}
              />
            </div>
          )}

          {/* TAB 3: VISAGES (data_faces) */}
          {activeTab === 'faces' && (
            <FacesView
              faces={faces}
              totalFaces={totalFacesCount}
              isLoading={isFacesLoading}
              onMergeFaces={handleMergeMultipleFaces}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              mergeSuggestions={mergeSuggestions}
            />
          )}

          {/* TAB 4: PEOPLE LIST */}
          {activeTab === 'people' && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
                {filteredPeople.map((person) => (
                  <PersonCard
                    key={person.id}
                    id={`person-${person.id}`}
                    person={person}
                    onOpen={(id) => {
                      setSelectedPersonId(id);
                      setActiveTab('person-detail');
                    }}
                    onRename={(p) => setModals(prev => ({ ...prev, rename: { isOpen: true, person: p } }))}
                    onMerge={(p) => setModals(prev => ({ ...prev, merge: { isOpen: true, person: p } }))}
                    onDelete={(p) => setModals(prev => ({ ...prev, delete: { isOpen: true, target: p, type: 'person' } }))}
                  />
                ))}
              </div>

              {filteredPeople.length === 0 && (
                <EmptyState
                  title="Aucune personne trouvée"
                  description="Essayez un autre mot-clé ou lancez une numérisation dans l'onglet Scanner."
                />
              )}
            </div>
          )}

          {/* TAB 5: PERSON DETAIL VIEW */}
          {activeTab === 'person-detail' && selectedPerson && (
            <div className="max-w-7xl mx-auto space-y-6">
              <div className={`p-6 rounded-3xl border shadow-xs flex items-center justify-between ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
              }`}>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setSelectedPersonId(null);
                      setActiveTab('people');
                    }}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                    <img
                      src={selectedPerson.avatarUrl}
                      alt={selectedPerson.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">{selectedPerson.name}</h2>
                    <p className="text-xs text-slate-400 font-medium">
                      {personDetailPhotos.length} photo(s) répertoriée(s)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportZip(selectedPerson.id)}
                    className="px-4 py-2 border border-emerald-200 hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> Exporter en ZIP
                  </button>
                  <button
                    onClick={() => setModals(prev => ({ ...prev, rename: { isOpen: true, person: selectedPerson } }))}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-4 h-4" /> Renommer
                  </button>
                  <button
                    onClick={() => setModals(prev => ({ ...prev, merge: { isOpen: true, person: selectedPerson } }))}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <GitMerge className="w-4 h-4" /> Fusionner
                  </button>
                  <button
                    onClick={() => setModals(prev => ({ ...prev, delete: { isOpen: true, target: selectedPerson, type: 'person' } }))}
                    className="px-4 py-2 border border-red-100 hover:bg-red-50 text-red-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-slate-200 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {personDetailPhotos.map((photo) => (
                    <GalleryCard
                      key={photo.id}
                      id={`detail-photo-${photo.id}`}
                      photo={photo}
                      onClick={handleOpenPhoto}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 6: GLOBAL GALLERY WITH COMBINED FILTERING */}
          {activeTab === 'gallery' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Multi-Person Filter Bar */}
              <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200/80'
              }`}>
                <Filter className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="text-xs font-bold uppercase text-slate-500 shrink-0">Filtrer par personnes ensemble :</span>
                <div className="flex flex-wrap gap-2 flex-1">
                  {people.slice(0, 10).map(p => {
                    const isSelected = filterPersonIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => {
                          setFilterPersonIds(prev => 
                            isSelected ? prev.filter(id => id !== p.id) : [...prev, p.id]
                          );
                        }}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-600 text-white' 
                            : isDarkMode ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                  {filterPersonIds.length > 0 && (
                    <button
                      onClick={() => setFilterPersonIds([])}
                      className="text-xs text-red-500 font-bold ml-2 underline cursor-pointer"
                    >
                      Effacer les filtres
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {photos.map((photo) => (
                  <GalleryCard
                    key={photo.id}
                    id={`gallery-photo-${photo.id}`}
                    photo={photo}
                    onClick={handleOpenPhoto}
                  />
                ))}
              </div>

              {photos.length === 0 && (
                <EmptyState
                  title="Aucune photo trouvée"
                  description="Essayez de retirer vos filtres de personnes ou lancez un scan."
                />
              )}
            </div>
          )}

          {/* TAB 7: SETTINGS */}
          {activeTab === 'settings' && (
            <SettingsPanel
              id="settings-panel-view"
              settings={settings}
              onSave={(updated) => {
                setSettings(updated);
                showToast("Paramètres mis à jour", "success");
              }}
            />
          )}
        </div>
      </main>

      {/* MODALS */}
      <RenamePersonModal
        isOpen={modals.rename.isOpen}
        person={modals.rename.person}
        onClose={() => setModals(prev => ({ ...prev, rename: { isOpen: false, person: null } }))}
        onRename={handleRenameSubmit}
      />

      <MergePeopleModal
        isOpen={modals.merge.isOpen}
        sourcePerson={modals.merge.person}
        people={people}
        onClose={() => setModals(prev => ({ ...prev, merge: { isOpen: false, person: null } }))}
        onMerge={handleMergeSubmit}
      />

      <DeleteConfirmModal
        isOpen={modals.delete.isOpen}
        target={modals.delete.target}
        type={modals.delete.type}
        onClose={() => setModals(prev => ({ ...prev, delete: { isOpen: false, target: null, type: 'person' } }))}
        onConfirm={handleDeleteSubmit}
      />

      {/* PHOTO VIEWER OVERLAY */}
      {selectedPhoto && (
        <PhotoViewer
          photo={selectedPhoto}
          people={people}
          onClose={() => setSelectedPhoto(null)}
          onAssociateFace={handleAssociateFace}
          onCreateAndAssociateFace={handleCreateAndAssociateFace}
        />
      )}

      {/* TOAST NOTIFICATIONS CONTAINER */}
      <Toast toasts={toasts} onClose={removeToast} />
    </div>
  );
}
