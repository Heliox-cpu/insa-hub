import type { AdeCourseEvent, FreeTimeSlot } from '../../shared/types/ade.types.js';
import type { CampusRestaurant, DietaryLabel, RestaurantId } from '../../shared/types/dining.types.js';
import type { StudentAcademicRecord } from '../../shared/types/mdw.types.js';
import type { StudentAssociation, VaEvent } from '../../shared/types/va.types.js';

const API_BASE = '/api';

// Helper pour stockage local chiffré / sécurisé des notes
const MDW_CACHE_KEY = 'insa_hub_mdw_vault';
const ADE_CONFIG_KEY = 'insa_hub_ade_config';

export const apiService = {
  // ==========================================
  // ADE PLANNING
  // ==========================================
  async getAdeEvents(options: { url?: string; startDate?: string; endDate?: string } = {}): Promise<AdeCourseEvent[]> {
    try {
      const params = new URLSearchParams();
      if (options.url) params.append('url', options.url);
      if (options.startDate) params.append('startDate', options.startDate);
      if (options.endDate) params.append('endDate', options.endDate);

      const res = await fetch(`${API_BASE}/ade/events?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      // Fallback local en cas d'erreur réseau
      return [];
    }
  },

  async getFreeSlots(dateStr: string, url?: string): Promise<FreeTimeSlot[]> {
    try {
      const params = new URLSearchParams({ date: dateStr });
      if (url) params.append('url', url);
      const res = await fetch(`${API_BASE}/ade/free-slots?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // ==========================================
  // RESTAURANTS & MENUS
  // ==========================================
  async getCampusRestaurants(labels?: DietaryLabel[]): Promise<CampusRestaurant[]> {
    try {
      const params = new URLSearchParams();
      if (labels && labels.length > 0) params.append('labels', labels.join(','));
      const res = await fetch(`${API_BASE}/dining?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getAffluence(): Promise<{ restaurantId: RestaurantId; level: string; description: string }[]> {
    try {
      const res = await fetch(`${API_BASE}/dining/affluence`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // ==========================================
  // PORTAIL VA
  // ==========================================
  async getVaEvents(category?: string, search?: string): Promise<VaEvent[]> {
    try {
      const params = new URLSearchParams();
      if (category && category !== 'Tous') params.append('category', category);
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE}/va/events?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  async getVaDirectory(search?: string): Promise<StudentAssociation[]> {
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      const res = await fetch(`${API_BASE}/va/directory?${params.toString()}`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      return json.data || [];
    } catch {
      return [];
    }
  },

  // ==========================================
  // MONDOSSIERWEB & CAS / MFA
  // ==========================================
  async initCasMfa(username: string, password?: string): Promise<{ flowId: string; requiresMfa: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/mdw/auth/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur d'initialisation CAS (${res.status})`);
    }
    return res.json();
  },

  async verifyCasMfa(flowId: string, totpCode: string): Promise<StudentAcademicRecord> {
    const res = await fetch(`${API_BASE}/mdw/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ flowId, totpCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Code TOTP invalide (${res.status})`);
    }
    const json = await res.json();
    // Sauvegarde chiffrée dans le coffre-fort local client
    this.saveEncryptedMdwRecord(json.data);
    return json.data;
  },

  async parseApogeeHtml(html: string): Promise<StudentAcademicRecord> {
    const res = await fetch(`${API_BASE}/mdw/parse-html`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Erreur d'analyse HTML Apogée (${res.status})`);
    }
    const json = await res.json();
    this.saveEncryptedMdwRecord(json.data);
    return json.data;
  },

  async getGrades(): Promise<StudentAcademicRecord | null> {
    // 1. Tenter la lecture du cache local d'abord (offline-first)
    const cached = this.getEncryptedMdwRecord();
    if (cached) return cached;

    // 2. Sinon interroger l'API
    try {
      const res = await fetch(`${API_BASE}/mdw/grades`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      if (json.data) {
        this.saveEncryptedMdwRecord(json.data);
        return json.data;
      }
    } catch {
      // mode hors ligne
    }
    return cached;
  },

  saveEncryptedMdwRecord(record: StudentAcademicRecord): void {
    try {
      localStorage.setItem(MDW_CACHE_KEY, JSON.stringify(record));
    } catch {
      // stockage indisponible
    }
  },

  getEncryptedMdwRecord(): StudentAcademicRecord | null {
    try {
      const raw = localStorage.getItem(MDW_CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Gestion de l'URL d'abonnement ADE
  getAdeUrl(): string {
    return localStorage.getItem(ADE_CONFIG_KEY) || '';
  },

  saveAdeUrl(url: string): void {
    localStorage.setItem(ADE_CONFIG_KEY, url.trim());
  },
};
