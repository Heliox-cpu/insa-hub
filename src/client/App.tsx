import React, { useState, useEffect, useMemo } from 'react';
import type { AdeCourseEvent, FreeTimeSlot } from '../shared/types/ade.types.js';
import type { CampusRestaurant, DietaryLabel, RestaurantId } from '../shared/types/dining.types.js';
import type { StudentAcademicRecord } from '../shared/types/mdw.types.js';
import type { StudentAssociation, VaEvent } from '../shared/types/va.types.js';
import { apiService } from './services/api.service.js';

type TabId = 'overview' | 'ade' | 'notes' | 'restaurants' | 'va';

export const App: React.FC = () => {
  // Navigation & État global
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return false;
  });
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Données des 4 services
  const [adeEvents, setAdeEvents] = useState<AdeCourseEvent[]>([]);
  const [freeSlots, setFreeSlots] = useState<FreeTimeSlot[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-29');
  const [restaurants, setRestaurants] = useState<CampusRestaurant[]>([]);
  const [selectedRestoId, setSelectedRestoId] = useState<RestaurantId>('ri');
  const [selectedMealType, setSelectedMealType] = useState<'lunch' | 'dinner'>('lunch');
  const [dietaryFilters, setDietaryFilters] = useState<DietaryLabel[]>([]);
  const [academicRecord, setAcademicRecord] = useState<StudentAcademicRecord | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number>(7);
  const [vaEvents, setVaEvents] = useState<VaEvent[]>([]);
  const [vaDirectory, setVaDirectory] = useState<StudentAssociation[]>([]);
  const [vaCategory, setVaCategory] = useState<string>('Tous');
  const [vaSearch, setVaSearch] = useState<string>('');
  const [vaTabMode, setVaTabMode] = useState<'events' | 'directory'>('events');

  // Modales
  const [showCasModal, setShowCasModal] = useState<boolean>(false);
  const [showAdeModal, setShowAdeModal] = useState<boolean>(false);
  const [adeUrlInput, setAdeUrlInput] = useState<string>(() => apiService.getAdeUrl());

  // État du flux CAS + MFA
  const [casUsername, setCasUsername] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('insa_hub_cas_username') || '';
    }
    return '';
  });
  const [casPassword, setCasPassword] = useState<string>('');
  const [casFlowId, setCasFlowId] = useState<string | null>(null);
  const [casTotpCode, setCasTotpCode] = useState<string>('');
  const [casStep, setCasStep] = useState<'LOGIN' | 'TOTP' | 'SUCCESS' | 'ERROR'>('LOGIN');
  const [casErrorMsg, setCasErrorMsg] = useState<string>('');
  const [casConnected, setCasConnected] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('insa_hub_cas_authenticated') === 'true';
    }
    return false;
  });
  const [casModalTab, setCasModalTab] = useState<'CAS' | 'HTML'>('CAS');
  const [apogeeHtmlInput, setApogeeHtmlInput] = useState<string>('');
  const [isParsingHtml, setIsParsingHtml] = useState<boolean>(false);
  const [isCasLoading, setIsCasLoading] = useState<boolean>(false);

  // Écoute de l'état de connectivité réseau
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Chargement initial des données
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const adeUrl = apiService.getAdeUrl();
      const [events, slots, restos, grades, eventsVa, directoryVa] = await Promise.all([
        apiService.getAdeEvents({ url: adeUrl }),
        apiService.getFreeSlots(selectedDate, adeUrl),
        apiService.getCampusRestaurants(dietaryFilters),
        apiService.getGrades(),
        apiService.getVaEvents(),
        apiService.getVaDirectory(),
      ]);

      setAdeEvents(events);
      setFreeSlots(slots);
      setRestaurants(restos);
      if (grades) {
        setAcademicRecord(grades);
        const isAuth = typeof window !== 'undefined' && localStorage.getItem('insa_hub_cas_authenticated') === 'true';
        setCasConnected(isAuth);
      }
      setVaEvents(eventsVa);
      setVaDirectory(directoryVa);
    } catch {
      // Rebondissement silencieux avec les données en cache
    } finally {
      setIsLoading(false);
    }
  };

  // Recharger les créneaux libres si la date change
  useEffect(() => {
    apiService.getFreeSlots(selectedDate, apiService.getAdeUrl()).then(setFreeSlots);
  }, [selectedDate]);

  // Bascule du mode sombre / clair sans FOUC
  const toggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) meta.setAttribute('content', nextDark ? 'dark' : 'light');
  };

  // Filtrage des cours pour la date sélectionnée
  const currentDayEvents = useMemo(() => {
    return adeEvents.filter((e) => e.start.startsWith(selectedDate));
  }, [adeEvents, selectedDate]);

  // Restaurant actuellement sélectionné
  const currentRestaurant = useMemo(() => {
    return restaurants.find((r) => r.id === selectedRestoId) || restaurants[0];
  }, [restaurants, selectedRestoId]);

  // Menu du restaurant sélectionné selon le type de repas
  const currentMealMenu = useMemo(() => {
    if (!currentRestaurant) return null;
    return currentRestaurant.menus.find((m) => m.mealType === selectedMealType) || currentRestaurant.menus[0] || null;
  }, [currentRestaurant, selectedMealType]);

  // Semestre sélectionné
  const currentSemesterTranscript = useMemo(() => {
    if (!academicRecord) return null;
    return academicRecord.semesters.find((s) => s.semesterNumber === selectedSemester) || academicRecord.semesters[0] || null;
  }, [academicRecord, selectedSemester]);

  // Filtrage des événements VA
  const filteredVaEvents = useMemo(() => {
    return vaEvents.filter((event) => {
      if (vaCategory !== 'Tous' && event.category.toLowerCase() !== vaCategory.toLowerCase()) {
        return false;
      }
      if (vaSearch.trim() !== '') {
        const q = vaSearch.toLowerCase();
        const matchTitle = event.title.toLowerCase().includes(q);
        const matchAsso = event.association.toLowerCase().includes(q);
        const matchLoc = event.location.toLowerCase().includes(q);
        if (!matchTitle && !matchAsso && !matchLoc) return false;
      }
      return true;
    });
  }, [vaEvents, vaCategory, vaSearch]);

  // Filtrage de l'annuaire VA
  const filteredVaDirectory = useMemo(() => {
    if (!vaSearch.trim()) return vaDirectory;
    const q = vaSearch.toLowerCase();
    return vaDirectory.filter((a) =>
      a.name.toLowerCase().includes(q) ||
      (a.shortName && a.shortName.toLowerCase().includes(q)) ||
      a.description.toLowerCase().includes(q)
    );
  }, [vaDirectory, vaSearch]);

  // Gestion du flux CAS + MFA TOTP
  const handleStartCasLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!casUsername.trim()) {
      setCasErrorMsg("L'identifiant CAS est requis");
      return;
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('insa_hub_cas_username', casUsername.trim());
    }
    setCasErrorMsg('');
    setIsCasLoading(true);
    try {
      const init = await apiService.initCasMfa(casUsername.trim(), casPassword);
      setCasFlowId(init.flowId);
      setCasStep('TOTP');
    } catch (err: any) {
      console.error('Erreur CAS:', err);
      setCasErrorMsg(err.message || 'Échec de connexion au serveur CAS');
      // On conserve casStep à 'LOGIN' pour que le formulaire reste visible
    } finally {
      setIsCasLoading(false);
    }
  };

  const handleVerifyTotp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!casFlowId) {
      setCasErrorMsg('Session expirée. Veuillez recommencer.');
      setCasStep('LOGIN');
      return;
    }
    setCasErrorMsg('');
    setIsCasLoading(true);

    if (casFlowId === 'demo-flow-fallback') {
      try {
        const record = await apiService.getSampleGrades();
        if (record) {
          apiService.saveEncryptedMdwRecord(record);
          setAcademicRecord(record);
          setCasConnected(true);
          if (record.semesters && record.semesters.length > 0) {
            setSelectedSemester(record.semesters[0].semesterNumber);
          }
        }
        setCasStep('SUCCESS');
        setTimeout(() => {
          setShowCasModal(false);
          setCasStep('LOGIN');
          setCasTotpCode('');
          setIsCasLoading(false);
        }, 1500);
      } catch {
        setIsCasLoading(false);
      }
      return;
    }

    try {
      const record = await apiService.verifyCasMfa(casFlowId, casTotpCode);
      setAcademicRecord(record);
      setCasConnected(true);
      if (record.semesters && record.semesters.length > 0) {
        setSelectedSemester(record.semesters[0].semesterNumber);
      }
      setCasStep('SUCCESS');
      setTimeout(() => {
        setShowCasModal(false);
        setCasStep('LOGIN');
        setCasTotpCode('');
        setIsCasLoading(false);
      }, 1500);
    } catch (err: any) {
      setCasErrorMsg(err.message || 'Code TOTP invalide. Veuillez réessayer.');
    } finally {
      setIsCasLoading(false);
    }
  };

  const handleCasLogout = () => {
    apiService.logoutCas();
    setAcademicRecord(null);
    setCasConnected(false);
    setCasStep('LOGIN');
    setShowCasModal(false);
  };

  const handleImportApogeeHtml = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apogeeHtmlInput.trim()) {
      setCasErrorMsg('Veuillez coller le code source HTML Apogée ou sélectionner un fichier .html');
      return;
    }
    setIsParsingHtml(true);
    setCasErrorMsg('');
    try {
      const record = await apiService.parseApogeeHtml(apogeeHtmlInput);
      setAcademicRecord(record);
      setCasConnected(true);
      setCasStep('SUCCESS');
      setTimeout(() => {
        setShowCasModal(false);
        setCasStep('LOGIN');
        setApogeeHtmlInput('');
        setIsParsingHtml(false);
      }, 1500);
    } catch (err: any) {
      setCasErrorMsg(err.message || "Erreur lors de l'analyse du document HTML Apogée");
      setIsParsingHtml(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result;
      if (typeof content === 'string') {
        setApogeeHtmlInput(content);
      }
    };
    reader.readAsText(file);
  };

  const handleSaveAdeUrl = async () => {
    apiService.saveAdeUrl(adeUrlInput);
    setShowAdeModal(false);
    loadAllData();
  };

  const tabs: { id: TabId; label: string; icon: string; shortLabel: string }[] = [
    { id: 'overview', label: "Vue d'ensemble", icon: '🏠', shortLabel: 'Accueil' },
    { id: 'ade', label: 'Emploi du temps (ADE)', icon: '📅', shortLabel: 'ADE' },
    { id: 'notes', label: 'Notes (MDW)', icon: '📊', shortLabel: 'Notes' },
    { id: 'restaurants', label: 'Restaurants & Menus', icon: '🍽️', shortLabel: 'Restos' },
    { id: 'va', label: 'Portail VA', icon: '🎉', shortLabel: 'Vie Asso' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200">
      
      {/* 1. Header Sticky */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Logo & Titre */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
              <div className="w-10 h-10 rounded-xl bg-[#E42313] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-red-500/20">
                IN
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-[#E42313] to-red-600 bg-clip-text text-transparent">
                    INSA Hub
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 dark:bg-red-950/70 text-[#E42313] border border-red-200 dark:border-red-900/50">
                    Lyon
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ADE • MonDossierWeb • Restos • Portail VA
                </p>
              </div>
            </div>

            {/* Navigation Desktop */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800/70 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Actions à droite : CAS + Thème */}
            <div className="flex items-center gap-3">
              {/* Badge Statut CAS */}
              <button
                onClick={() => setShowCasModal(true)}
                title="Synchronisation sécurisée CAS Keycloak + MFA TOTP"
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/90 hover:border-red-400/50 transition-all text-xs font-medium shadow-sm active:scale-95"
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    casConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="text-slate-700 dark:text-slate-300 hidden sm:inline">
                  {casConnected && academicRecord ? `${academicRecord.name.split(' ')[0]} (CAS ✓)` : (casConnected ? 'CAS: Connecté (MFA ✓)' : 'Connexion CAS + MFA')}
                </span>
                <span className="text-slate-700 dark:text-slate-300 sm:hidden">
                  {casConnected ? (academicRecord ? academicRecord.name.split(' ')[0] : 'CAS ✓') : 'CAS'}
                </span>
              </button>

              {/* Basculeur Mode Sombre */}
              <button
                onClick={toggleTheme}
                aria-label="Basculer le thème"
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {isDark ? (
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>

          </div>
        </div>
      </header>

      {/* 2. Bannière Hors-Ligne conditionnelle */}
      {!isOnline && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-800 dark:text-amber-200 px-4 py-2 text-xs font-medium text-center flex items-center justify-center gap-2">
          <span>⚠️</span>
          <span>Mode hors-ligne : consultation active des données enregistrées dans le coffre-fort local client.</span>
        </div>
      )}

      {/* 3. Conteneur Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">

        {/* ==========================================================
            TAB 1: VUE D'ENSEMBLE (DASHBOARD)
            ========================================================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Bannière de Bienvenue */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#E42313] via-red-600 to-slate-900 text-white p-6 sm:p-8 shadow-xl">
              <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-semibold mb-2 border border-white/20">
                    <span>📅 Mardi 29 Septembre 2026</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>{academicRecord?.program || 'Portail Étudiant INSA Lyon'}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    Bonjour {academicRecord ? academicRecord.name.split(' ')[0] : 'Étudiant'} 👋
                  </h1>
                  <p className="text-white/80 text-sm mt-1">
                    {casConnected && academicRecord ? (
                      <>Connecté en tant que <strong className="text-white">{academicRecord.name}</strong> • Relevé MonDossierWeb synchronisé.</>
                    ) : (
                      <>Vous avez <strong className="text-white">{currentDayEvents.length} cours prévus</strong>, le RI sert votre menu favori ce midi, et 2 événements sont annoncés sur le campus ce soir.</>
                    )}
                  </p>
                </div>
                <button
                  onClick={loadAllData}
                  disabled={isLoading}
                  className="px-4 py-2.5 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-semibold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <svg className={`w-4 h-4 text-[#E42313] ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>{isLoading ? 'Actualisation...' : 'Synchroniser tout'}</span>
                </button>
              </div>
            </div>

            {/* Grille Métriques Clés */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Carte 1 : Prochain Cours */}
              <div
                onClick={() => setActiveTab('ade')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-red-400/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Prochain cours (ADE)
                  </span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">
                    {currentDayEvents[0] ? currentDayEvents[0].start.slice(11, 16) : 'Libre'}
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-red-500 transition-colors">
                  {currentDayEvents[0] ? `${currentDayEvents[0].subjectCode} (${currentDayEvents[0].courseType})` : 'Aucun cours programmé'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {currentDayEvents[0]?.location || 'Campus La Doua'}
                </p>
              </div>

              {/* Carte 2 : Menu du Midi */}
              <div
                onClick={() => setActiveTab('restaurants')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-red-400/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Menu du Midi (RI)
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                    {currentRestaurant?.affluenceDescription?.split('(')[0] || 'Ouvert'}
                  </span>
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-red-500 transition-colors">
                  Curry Pois Chiches / Saumon
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Ligne Végé & Traditionnelle disponibles
                </p>
              </div>

              {/* Carte 3 : Dernière Note */}
              <div
                onClick={() => setActiveTab('notes')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-red-400/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span> Moyenne générale (MDW)
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {currentSemesterTranscript?.juryDecision || (currentSemesterTranscript ? `Semestre ${currentSemesterTranscript.semesterNumber}` : (casConnected ? 'Synchronisé' : 'Non connecté'))}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {currentSemesterTranscript?.average ? currentSemesterTranscript.average.toFixed(2) : (academicRecord ? 'En attente' : '—')}
                  </span>
                  {currentSemesterTranscript?.average ? <span className="text-xs text-slate-400">/ 20</span> : null}
                  {currentSemesterTranscript ? (
                    <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                      {currentSemesterTranscript.acquiredEcts} ECTS
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {(() => {
                    const firstModule = currentSemesterTranscript?.teachingUnits
                      ?.flatMap((u) => u.modules)
                      ?.find((m) => m.grade !== undefined);
                    if (firstModule && firstModule.grade !== undefined) {
                      return `Dernière note : ${firstModule.name} (${firstModule.grade}/20)`;
                    }
                    if (academicRecord) {
                      return `Étudiant : ${academicRecord.name}`;
                    }
                    return 'Cliquez pour vous connecter via CAS Keycloak';
                  })()}
                </p>
              </div>

              {/* Carte 4 : Vie Asso */}
              <div
                onClick={() => setActiveTab('va')}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:border-red-400/50 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span> Soirée Asso (VA)
                  </span>
                  <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">20:30</span>
                </div>
                <div className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-red-500 transition-colors">
                  {vaEvents[0]?.title || 'Blind Test K-Fêt'}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {vaEvents[0]?.association || 'Club K-Fêt'} • Entrée libre
                </p>
              </div>

            </div>

            {/* Aperçu Double Colonne : Planning du Jour + Menu Resto */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Planning du jour synthétique */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>📅</span> Planning du jour ({selectedDate})
                  </h2>
                  <button onClick={() => setActiveTab('ade')} className="text-xs text-red-500 hover:underline font-semibold">
                    Voir la semaine →
                  </button>
                </div>
                {currentDayEvents.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">Aucun cours pour cette journée.</p>
                ) : (
                  <div className="space-y-3">
                    {currentDayEvents.map((evt) => (
                      <div key={evt.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                        <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[50px] pt-0.5">
                          {evt.start.slice(11, 16)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white truncate">{evt.subjectCode}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              evt.courseType === 'CM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                              evt.courseType === 'TD' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                              evt.courseType === 'TP' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                              'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                            }`}>
                              {evt.courseType}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">{evt.location}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Lignes Resto du jour synthétiques */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>🍽️</span> Menu du Restaurant INSA (RI)
                  </h2>
                  <button onClick={() => setActiveTab('restaurants')} className="text-xs text-red-500 hover:underline font-semibold">
                    Tous les restos →
                  </button>
                </div>
                {currentMealMenu?.lines ? (
                  <div className="space-y-3">
                    {currentMealMenu.lines.map((line, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/50">
                        <span className="text-xs font-bold text-[#E42313] dark:text-red-400">{line.name}</span>
                        <div className="mt-1 space-y-1">
                          {line.items.map((it, i) => (
                            <div key={i} className="text-xs text-slate-700 dark:text-slate-300 flex items-center justify-between">
                              <span className="truncate">{it.name}</span>
                              <div className="flex gap-1">
                                {it.labels.map((l) => (
                                  <span key={l} className="text-[9px] px-1 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                    {l}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-6">Menu en cours d'actualisation...</p>
                )}
              </div>

            </div>

          </div>
        )}

        {/* ==========================================================
            TAB 2: EMPLOI DU TEMPS (ADE PLANNING)
            ========================================================== */}
        {activeTab === 'ade' && (
          <div className="space-y-6">
            
            {/* Header avec action de config URL */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Emploi du temps ADE</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Flux iCal officiel INSA Lyon • Mis en cache local pour consultation hors-ligne
                </p>
              </div>
              <button
                onClick={() => setShowAdeModal(true)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <span>⚙️</span>
                <span>Configurer mon flux ADE</span>
              </button>
            </div>

            {/* Sélecteur de date (Jours de la semaine) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {[
                { date: '2026-09-28', label: 'Lun 28' },
                { date: '2026-09-29', label: 'Mar 29 (Aujourd’hui)' },
                { date: '2026-09-30', label: 'Mer 30' },
                { date: '2026-10-01', label: 'Jeu 01' },
                { date: '2026-10-02', label: 'Ven 02' },
              ].map((item) => (
                <button
                  key={item.date}
                  onClick={() => setSelectedDate(item.date)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedDate === item.date
                      ? 'bg-[#E42313] text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Détection des créneaux libres */}
            {freeSlots.length > 0 && (
              <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Créneaux libres :</span>
                {freeSlots.map((slot, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40"
                  >
                    <span>🕒</span>
                    <span>{slot.label} ({slot.start.slice(11, 16)} - {slot.end.slice(11, 16)}) • {slot.durationMinutes} min</span>
                  </span>
                ))}
              </div>
            )}

            {/* Liste des cours du jour */}
            {currentDayEvents.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <span className="text-4xl">🏖️</span>
                <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">Aucun cours programmé</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Profitez de votre journée libre ou révisez à la bibliothèque Marie Curie !
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentDayEvents.map((event) => {
                  const typeColor =
                    event.courseType === 'CM' ? 'border-l-blue-500 bg-blue-500/5' :
                    event.courseType === 'TD' ? 'border-l-emerald-500 bg-emerald-500/5' :
                    event.courseType === 'TP' ? 'border-l-purple-500 bg-purple-500/5' :
                    'border-l-red-500 bg-red-500/5';

                  return (
                    <div
                      key={event.id}
                      className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 border-l-4 ${typeColor} shadow-sm transition-all hover:shadow-md`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-slate-900 dark:text-white">
                            {event.start.slice(11, 16)} - {event.end.slice(11, 16)}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                            event.courseType === 'CM' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                            event.courseType === 'TD' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                            event.courseType === 'TP' ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' :
                            'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                          }`}>
                            {event.courseType}
                          </span>
                          {event.group && (
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                              Groupe {event.group}
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {event.department ? `${event.department} Année ${event.year}` : ''}
                        </span>
                      </div>

                      <div className="mt-2">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {event.subjectCode} — {event.title}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1.5">
                          <span>📍</span>
                          <span>{event.location}</span>
                          {event.instructor && (
                            <>
                              <span className="text-slate-400">•</span>
                              <span>👤 {event.instructor}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        )}

        {/* ==========================================================
            TAB 3: NOTES (MONDOSSIERWEB / APOGÉE)
            ========================================================== */}
        {activeTab === 'notes' && (
          <div className="space-y-6">
            
            {/* Header avec action de synchronisation CAS+MFA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">MonDossierWeb (Apogée)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Notes, UE et crédits ECTS sous authentification sécurisée CAS Keycloak + MFA TOTP
                </p>
              </div>
              <button
                onClick={() => setShowCasModal(true)}
                className="px-4 py-2 rounded-xl bg-[#E42313] hover:bg-[#C4121A] text-white text-xs font-semibold transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <span>🔐</span>
                <span>{casConnected ? 'Resynchroniser (CAS + TOTP)' : 'Synchroniser mes notes'}</span>
              </button>
            </div>

            {academicRecord ? (
              <>
                {/* Résumé académique de l'étudiant */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 shadow-md border border-slate-700">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="text-xs font-mono text-slate-400">N° Étudiant : {academicRecord.studentNumber}</div>
                      <h3 className="text-xl font-bold mt-0.5">{academicRecord.name}</h3>
                      <p className="text-xs text-slate-300 mt-1">{academicRecord.program}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Moyenne Générale</div>
                        <div className="text-2xl font-extrabold text-emerald-400">
                          {currentSemesterTranscript?.average ? currentSemesterTranscript.average.toFixed(2) : '--'} / 20
                        </div>
                      </div>
                      <div className="text-right border-l border-slate-700 pl-4">
                        <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Crédits ECTS</div>
                        <div className="text-2xl font-extrabold text-blue-400">
                          {currentSemesterTranscript?.acquiredEcts} / {currentSemesterTranscript?.totalEcts}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sélecteur de semestre */}
                <div className="flex items-center gap-2">
                  {academicRecord.semesters.map((sem) => (
                    <button
                      key={sem.semesterNumber}
                      onClick={() => setSelectedSemester(sem.semesterNumber)}
                      className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                        selectedSemester === sem.semesterNumber
                          ? 'bg-[#E42313] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      Semestre {sem.semesterNumber} ({sem.academicYear})
                    </button>
                  ))}
                </div>

                {/* Liste des Unités d'Enseignement (UE) */}
                {currentSemesterTranscript && (
                  <div className="space-y-4">
                    {currentSemesterTranscript.teachingUnits.map((ue) => (
                      <div
                        key={ue.code}
                        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-slate-500">{ue.code}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                ue.status === 'VAL' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                              }`}>
                                {ue.status === 'VAL' ? 'Validé' : 'Non Validé'}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white mt-1">{ue.name}</h4>
                          </div>
                          <div className="flex items-baseline gap-3">
                            <span className="text-xs text-slate-400 font-medium">{ue.ectsCredits} ECTS</span>
                            <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                              {ue.average ? ue.average.toFixed(2) : '--'} / 20
                            </span>
                          </div>
                        </div>

                        {/* Modules individuels */}
                        <div className="mt-3 divide-y divide-slate-100 dark:divide-slate-800/60">
                          {ue.modules.map((mod) => (
                            <div key={mod.code} className="py-2.5 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono font-semibold text-slate-700 dark:text-slate-300 mr-2">{mod.code}</span>
                                <span className="text-slate-600 dark:text-slate-400">{mod.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                {mod.coefficient && (
                                  <span className="text-slate-400 text-[11px]">coef {mod.coefficient}</span>
                                )}
                                <span className="font-mono font-bold text-slate-900 dark:text-white">
                                  {mod.grade !== undefined ? mod.grade.toFixed(1) : '--'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                <span className="text-4xl">📊</span>
                <h3 className="mt-2 text-sm font-bold text-slate-800 dark:text-slate-200">Aucune note synchronisée</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                  Connectez-vous via CAS Keycloak avec votre code à 6 chiffres TOTP pour charger vos relevés officiels Apogée.
                </p>
                <button
                  onClick={() => setShowCasModal(true)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#E42313] text-white text-xs font-semibold shadow-md hover:bg-red-600 transition-all"
                >
                  Lancer la synchronisation CAS
                </button>
              </div>
            )}

          </div>
        )}

        {/* ==========================================================
            TAB 4: RESTAURANTS & MENUS
            ========================================================== */}
        {activeTab === 'restaurants' && (
          <div className="space-y-6">
            
            {/* Header Restos */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Restauration Campus</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Menus officiels du Restaurant INSA (RI), de L'Olivier et du CROUS La Doua
                </p>
              </div>
              {/* Sélecteur Midi / Soir */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setSelectedMealType('lunch')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedMealType === 'lunch'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  ☀️ Déjeuner (Midi)
                </button>
                <button
                  onClick={() => setSelectedMealType('dinner')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedMealType === 'dinner'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🌙 Dîner (Soir)
                </button>
              </div>
            </div>

            {/* Onglets des restaurants */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              {restaurants.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedRestoId(r.id)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                    selectedRestoId === r.id
                      ? 'bg-[#E42313] text-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span>{r.id === 'ri' ? '🍴' : r.id === 'olivier' ? '🍕' : '☕'}</span>
                  <span>{r.name}</span>
                </button>
              ))}
            </div>

            {/* Détails du restaurant sélectionné & jauge d'affluence */}
            {currentRestaurant && (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{currentRestaurant.name}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {currentRestaurant.type}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{currentRestaurant.location}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Affluence :</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      currentRestaurant.affluenceLevel === 'low' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' :
                      currentRestaurant.affluenceLevel === 'moderate' ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300' :
                      currentRestaurant.affluenceLevel === 'high' ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300' :
                      'bg-slate-100 dark:bg-slate-800 text-slate-500'
                    }`}>
                      {currentRestaurant.affluenceDescription || currentRestaurant.affluenceLevel}
                    </span>
                  </div>
                </div>

                {/* Filtres diététiques */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-500">Filtres :</span>
                  {(['VEG', 'BIO', 'VF', 'FLF', 'FM'] as DietaryLabel[]).map((label) => {
                    const isSelected = dietaryFilters.includes(label);
                    return (
                      <button
                        key={label}
                        onClick={() => {
                          const next = isSelected
                            ? dietaryFilters.filter((l) => l !== label)
                            : [...dietaryFilters, label];
                          setDietaryFilters(next);
                          apiService.getCampusRestaurants(next).then(setRestaurants);
                        }}
                        className={`text-xs px-2.5 py-1 rounded-lg font-semibold transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {label === 'VEG' ? '🌱 Végétarien' :
                         label === 'BIO' ? '🌿 Bio' :
                         label === 'VF' ? '🇫🇷 Volaille Française' :
                         label === 'FM' ? '🐟 Pêche Responsable' : label}
                      </button>
                    );
                  })}
                </div>

                {/* Contenu du Menu */}
                {currentMealMenu ? (
                  <div className="mt-4 space-y-4">
                    {currentMealMenu.lines ? (
                      currentMealMenu.lines.map((line, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[#E42313] dark:text-red-400 mb-2">
                            {line.name}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {line.items.map((item, i) => (
                              <div key={i} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 flex flex-col justify-between">
                                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
                                <div className="mt-2 flex gap-1">
                                  {item.labels.map((l) => (
                                    <span key={l} className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                      {l}
                                    </span>
                                  ))}
                                  {item.points && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                                      {item.points} pts
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {currentMealMenu.items.map((item, i) => (
                          <div key={i} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800">
                            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{item.name}</span>
                            <div className="mt-2 flex gap-1">
                              {item.labels.map((l) => (
                                <span key={l} className="text-[9px] px-1.5 py-0.5 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                  {l}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-8">Aucun repas disponible pour ce créneau.</p>
                )}
              </div>
            )}

          </div>
        )}

        {/* ==========================================================
            TAB 5: PORTAIL VA (VIE ASSOCIATIVE)
            ========================================================== */}
        {activeTab === 'va' && (
          <div className="space-y-6">
            
            {/* Header VA */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Vie Associative (Portail VA)</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Agenda des événements et annuaire des associations étudiantes de l'INSA Lyon
                </p>
              </div>
              {/* Switcher Événements vs Annuaire */}
              <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setVaTabMode('events')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    vaTabMode === 'events'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🎉 Événements ({filteredVaEvents.length})
                </button>
                <button
                  onClick={() => setVaTabMode('directory')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    vaTabMode === 'directory'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🏢 Annuaire des Assos ({filteredVaDirectory.length})
                </button>
              </div>
            </div>

            {/* Barre de recherche & Filtres */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={vaSearch}
                  onChange={(e) => setVaSearch(e.target.value)}
                  placeholder={vaTabMode === 'events' ? 'Rechercher un événement, une asso, un lieu...' : 'Rechercher un club ou une association...'}
                  className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                />
              </div>
              {vaTabMode === 'events' && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                  {['Tous', 'Soirée', 'Culture', 'Sport', 'Technique & Sciences', 'Atelier'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setVaCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        vaCategory === cat
                          ? 'bg-[#E42313] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vue Événements */}
            {vaTabMode === 'events' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVaEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between hover:border-red-400/50 transition-all"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-[#E42313] dark:text-red-400 truncate">{evt.association}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 font-medium">
                          {evt.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">{evt.title}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{evt.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="text-slate-500">
                        <div>📅 {evt.start.slice(0, 10)} • {evt.start.slice(11, 16)}</div>
                        <div className="truncate max-w-[160px]">📍 {evt.location}</div>
                      </div>
                      {evt.ticketingUrl ? (
                        <a
                          href={evt.ticketingUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#E42313] hover:bg-red-600 text-white font-semibold text-[11px] shadow-sm transition-all"
                        >
                          Billetterie
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                          {evt.price || 'Gratuit'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Vue Annuaire */}
            {vaTabMode === 'directory' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredVaDirectory.map((asso) => (
                  <div
                    key={asso.id}
                    className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">{asso.shortName || asso.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-semibold">
                          {asso.category}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{asso.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-3">{asso.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                      {asso.contactEmail ? (
                        <a href={`mailto:${asso.contactEmail}`} className="text-blue-500 hover:underline truncate">
                          ✉️ {asso.contactEmail}
                        </a>
                      ) : <span />}
                      {asso.websiteUrl && (
                        <a href={asso.websiteUrl} target="_blank" rel="noreferrer" className="text-red-500 hover:underline font-semibold">
                          Site Web →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </main>

      {/* 4. Barre de Navigation Basse Tactile (Mobile uniquement, touch targets >= 44px) */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-2 py-1"
        role="navigation"
        aria-label="Navigation principale mobile"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`min-h-[48px] min-w-[48px] flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-xl text-[10px] font-medium transition-all ${
              activeTab === tab.id
                ? 'text-[#E42313] dark:text-red-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span>{tab.shortLabel}</span>
          </button>
        ))}
      </nav>

      {/* ==========================================================
          5. MODALE CAS KEYCLOAK + MFA TOTP INTERACTIVE
          ========================================================== */}
      {showCasModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowCasModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#E42313] flex items-center justify-center text-white font-extrabold text-lg">
                CAS
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Synchronisation Notes & Scolarité</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">MonDossierWeb Apogée & CAS Keycloak</p>
              </div>
            </div>

            {/* Statut de session si déjà connecté */}
            {casConnected && academicRecord && casStep === 'LOGIN' && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>{academicRecord.name}</span>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                    N° {academicRecord.studentNumber} • {academicRecord.program}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCasLogout}
                  className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 dark:bg-red-950 dark:hover:bg-red-900 text-red-700 dark:text-red-300 text-[11px] font-semibold transition-all"
                >
                  Déconnexion
                </button>
              </div>
            )}

            {/* Onglets de mode : CAS Keycloak ou Import HTML direct */}
            {casStep !== 'SUCCESS' && (
              <div className="flex p-1 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => { setCasModalTab('CAS'); setCasErrorMsg(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    casModalTab === 'CAS'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  🔐 CAS Keycloak
                </button>
                <button
                  type="button"
                  onClick={() => { setCasModalTab('HTML'); setCasErrorMsg(''); }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    casModalTab === 'HTML'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  📄 Import HTML Apogée
                </button>
              </div>
            )}

            {casModalTab === 'HTML' && casStep !== 'SUCCESS' && (
              <form onSubmit={handleImportApogeeHtml} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Importez directement le code source HTML d'un relevé de notes MonDossierWeb enregistré depuis votre navigateur ou réseau local.
                </p>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Code HTML ou extrait Apogée
                    </label>
                    <label className="cursor-pointer text-[11px] font-semibold text-[#E42313] hover:underline">
                      📁 Charger fichier .html
                      <input
                        type="file"
                        accept=".html,.htm"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <textarea
                    rows={6}
                    value={apogeeHtmlInput}
                    onChange={(e) => setApogeeHtmlInput(e.target.value)}
                    placeholder="Collez ici le HTML de MonDossierWeb (ex: <table>...<tr><td>UE-IF-701</td>...)"
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono focus:ring-2 focus:ring-red-500 outline-none resize-none"
                  />
                </div>

                <div className="flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setApogeeHtmlInput(`<table class="notesTable">
  <tr><td>Code Étudiant : 00054321</td><td>Nom : Alexandre Martin</td><td>Cursus : 4ème année Informatique (4IF)</td></tr>
  <tr><td>UE-IF-701</td><td>Ingénierie du Logiciel & Systèmes Distribués</td><td>15.2</td><td>VAL</td><td>6</td></tr>
  <tr><td>IF-SYS-DIST</td><td>Systèmes Distribués et Microservices</td><td>16.0</td><td>VAL</td><td></td></tr>
  <tr><td>IF-COMP</td><td>Compilation et Analyse Statique</td><td>14.4</td><td>VAL</td><td></td></tr>
  <tr><td>UE-IF-702</td><td>Bases de Données & Data Science</td><td>15.0</td><td>VAL</td><td>6</td></tr>
  <tr><td>IF-BDR</td><td>Bases de Données Relationnelles Avancées</td><td>15.5</td><td>VAL</td><td></td></tr>
</table>`);
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                  >
                    ⚡ Insérer un exemple Apogée
                  </button>
                  {apogeeHtmlInput && (
                    <button
                      type="button"
                      onClick={() => setApogeeHtmlInput('')}
                      className="text-[11px] text-slate-400 hover:text-red-500"
                    >
                      Effacer
                    </button>
                  )}
                </div>

                {casErrorMsg && (
                  <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded-lg">{casErrorMsg}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isParsingHtml || !apogeeHtmlInput.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-[#E42313] hover:bg-red-600 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isParsingHtml ? 'Analyse en cours...' : 'Analyser et Enregistrer dans mon coffre-fort ✓'}
                  </button>
                </div>
              </form>
            )}

            {casModalTab === 'CAS' && (casStep === 'LOGIN' || casStep === 'ERROR') && (
              <form onSubmit={handleStartCasLogin} className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Connectez-vous pour synchroniser vos relevés de notes MonDossierWeb. Un défi MFA TOTP vous sera demandé à l'étape suivante.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Identifiant CAS (ex: awilliame)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Identifiant CAS (ex: awilliame)"
                    value={casUsername}
                    onChange={(e) => setCasUsername(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mot de passe INSA
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Votre mot de passe INSA"
                    value={casPassword}
                    onChange={(e) => setCasPassword(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    🔒 Zéro conservation : les identifiants ne sont jamais stockés sur le serveur.
                  </span>
                </div>

                {casErrorMsg && (
                  <div className="space-y-2">
                    <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 p-2.5 rounded-xl border border-red-200 dark:border-red-900/50 flex items-start gap-2">
                      <span className="text-sm">⚠️</span>
                      <span className="flex-1">{casErrorMsg}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCasFlowId('demo-flow-fallback');
                        setCasErrorMsg('');
                        setCasStep('TOTP');
                      }}
                      className="w-full py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[11px] text-slate-600 dark:text-slate-300 font-medium transition-all text-center"
                    >
                      ⚡ Continuer en mode simulation (passer au défi MFA TOTP)
                    </button>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={isCasLoading || !casUsername.trim() || !casPassword.trim()}
                    className="flex-1 py-2.5 rounded-xl bg-[#E42313] hover:bg-red-600 text-white font-semibold text-xs transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCasLoading ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Validation des identifiants...</span>
                      </>
                    ) : (
                      <span>Valider mes identifiants →</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {casModalTab === 'CAS' && casStep === 'TOTP' && (
              <form onSubmit={handleVerifyTotp} className="space-y-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-700 dark:text-blue-300">
                  <span>📱</span> <strong>Double facteur requis</strong> : Ouvrez votre application d'authentification (Google Authenticator, FreeOTP) et saisissez votre code à 6 chiffres.
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Code de sécurité TOTP (6 chiffres)
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    autoFocus
                    placeholder="ex: 482910"
                    value={casTotpCode}
                    onChange={(e) => setCasTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center tracking-[0.5em] font-mono font-bold text-lg px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                </div>

                {/* Bouton d'aide pour tester facilement avec un code valide */}
                <button
                  type="button"
                  onClick={() => setCasTotpCode('582913')}
                  className="w-full text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline text-center"
                >
                  ⚡ Remplir avec un code de démonstration valide (582913)
                </button>

                {casErrorMsg && (
                  <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 p-2 rounded-lg">{casErrorMsg}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setCasStep('LOGIN'); setCasErrorMsg(''); }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={isCasLoading || casTotpCode.length !== 6}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isCasLoading ? (
                      <>
                        <span className="inline-block w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>Vérification TOTP...</span>
                      </>
                    ) : (
                      <span>Valider le code TOTP ✓</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {casStep === 'SUCCESS' && (
              <div className="py-6 text-center space-y-2">
                <span className="text-4xl animate-bounce">🎉</span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">Authentification réussie !</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {academicRecord ? (
                    <>Connecté en tant que <strong className="text-slate-800 dark:text-slate-200">{academicRecord.name}</strong> ({academicRecord.studentNumber}). Vos notes MonDossierWeb ont été synchronisées.</>
                  ) : (
                    <>Vos notes MonDossierWeb ont été synchronisées et chiffrées localement dans votre navigateur.</>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==========================================================
          6. MODALE CONFIGURATION URL ADE
          ========================================================== */}
      {showAdeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => setShowAdeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white text-lg font-bold"
            >
              ✕
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              URL d'abonnement ADE Planning
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Collez ci-dessous votre URL d'export iCal obtenue sur <code>ade-outils.insa-lyon.fr</code>. Une fois configurée, elle ne requiert plus de mot de passe ni de MFA.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL iCal ADE
                </label>
                <input
                  type="text"
                  value={adeUrlInput}
                  onChange={(e) => setAdeUrlInput(e.target.value)}
                  placeholder="https://ade-outils.insa-lyon.fr/ADE-Cal:~login!2026:token"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-red-500 outline-none font-mono"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setAdeUrlInput('')}
                  className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-xs"
                >
                  Réinitialiser
                </button>
                <button
                  onClick={handleSaveAdeUrl}
                  className="flex-1 py-2 rounded-xl bg-[#E42313] hover:bg-red-600 text-white font-semibold text-xs transition-all shadow-md"
                >
                  Enregistrer et Synchroniser
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;
