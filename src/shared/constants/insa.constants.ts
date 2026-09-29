/**
 * Constantes officielles de l'INSA Lyon et paramètres de l'application INSA Hub
 */

import type { RestaurantId } from '../types/dining.types.js';

// ==========================================
// 1. Couleurs & Identité Visuelle INSA Lyon
// ==========================================
export const INSA_COLORS = {
  // Rouge officiel INSA
  primary: '#E42313',
  primaryDark: '#C4121A',
  primaryCrimson: '#9B000A',
  primaryLight: '#FEF2F2',
  primaryTint100: '#FFE1E1',
  primaryTint200: '#FCA5A5',

  // Nuances Neutres Slate (Dark / Light)
  slate950: '#020617', // Fond sombre profond
  slate900: '#0F172A', // Cartes & surfaces sombres
  slate800: '#1E293B', // Bordures & éléments élevés
  slate700: '#334155', // Bordures secondaires
  slate600: '#475569',
  slate500: '#64748B', // Textes secondaires
  slate400: '#94A3B8',
  slate300: '#CBD5E1', // Bordures claires
  slate200: '#E2E8F0',
  slate100: '#F1F5F9', // Surfaces claires
  slate50: '#F8FAFC',  // Fond de page clair

  // Badges & Types de Cours ADE
  courseTypes: {
    CM: { text: '#1D4ED8', bg: '#DBEAFE', darkText: '#93C5FD', darkBg: 'rgba(30, 58, 138, 0.4)' },
    TD: { text: '#047857', bg: '#D1FAE5', darkText: '#6EE7B7', darkBg: 'rgba(6, 78, 59, 0.4)' },
    TP: { text: '#B45309', bg: '#FEF3C7', darkText: '#FCD34D', darkBg: 'rgba(120, 53, 15, 0.4)' },
    EVAL: { text: '#B91C1C', bg: '#FEE2E2', darkText: '#FCA5A5', darkBg: 'rgba(127, 29, 29, 0.4)' },
    OTHER: { text: '#475569', bg: '#F1F5F9', darkText: '#CBD5E1', darkBg: 'rgba(51, 65, 85, 0.4)' }
  },

  // Statuts & Indicateurs
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6'
  }
} as const;

// ==========================================
// 2. URLs Officielles du Campus & Services
// ==========================================
export const CAMPUS_URLS = {
  ADE_BASE_CAL: 'https://ade-outils.insa-lyon.fr/ADE-Cal:',
  ADE_PORTAL: 'https://ade-outils.insa-lyon.fr/',
  CAS_KEYCLOAK_LOGIN: 'https://idauth.insa-lyon.fr/realms/insa-lyon/protocol/cas/login',
  MDW_PORTAL: 'https://mondossierweb.insa-lyon.fr/',
  BDE_MENU_API: 'https://utils.bde-insa-lyon.fr/menu/data/menu.json',
  CROUS_API_BASE: 'https://api.croustillant.menu/v1/',
  PORTAIL_VA_API_BASE: 'https://portail.asso-insa-lyon.fr/api/v1/',
  VPN_CISR: 'https://sslvpn.cisr.fr'
} as const;

// Fuseau horaire canonique pour les calculs de planning
export const CAMPUS_TIMEZONE = 'Europe/Paris';

// ==========================================
// 3. Paramètres Cryptographiques & Vault
// ==========================================
export const CRYPTO_CONFIG = {
  PBKDF2_ITERATIONS: 100_000,
  AES_KEY_BITS: 256,
  IV_LENGTH_BYTES: 12,
  SALT_LENGTH_BYTES: 16,
  TAG_LENGTH_BITS: 128,
  VAULT_DB_NAME: 'insa_hub_vault',
  VAULT_STORE_NAME: 'academic_vault',
  VAULT_RECORD_KEY: 'student_academic_record'
} as const;

// ==========================================
// 4. Métadonnées des Restaurants du Campus
// ==========================================
export const RESTAURANT_IDS: RestaurantId[] = [
  'ri',
  'olivier',
  'puvis',
  'astree',
  'archimede'
];

export interface RestaurantMeta {
  id: RestaurantId;
  name: string;
  type: 'INSA' | 'CROUS';
  crousId?: number;
  campus: string;
  defaultOpeningHours: {
    lunch: string;
    dinner?: string;
  };
  features: string[];
}

export const RESTAURANTS_METADATA: Record<RestaurantId, RestaurantMeta> = {
  ri: {
    id: 'ri',
    name: 'Restaurant INSA (RI)',
    type: 'INSA',
    campus: 'La Doua - Centre',
    defaultOpeningHours: {
      lunch: '11:15 - 13:45',
      dinner: '18:45 - 20:30'
    },
    features: ['Ligne Traditionnelle', 'Ligne Végétarienne', 'Ligne Monde', 'Grillades']
  },
  olivier: {
    id: 'olivier',
    name: "Pizzeria L'Olivier",
    type: 'INSA',
    campus: 'La Doua - Centre (Face au RI)',
    defaultOpeningHours: {
      lunch: '11:30 - 14:00'
    },
    features: ['Pizzas au feu de bois', 'Salades fraîches', 'Desserts maison']
  },
  puvis: {
    id: 'puvis',
    name: 'RU Puvis de Chavannes',
    type: 'CROUS',
    crousId: 2265,
    campus: 'La Doua - Ouest',
    defaultOpeningHours: {
      lunch: '11:30 - 13:45'
    },
    features: ['Formule Izly 1 à 4 points', 'Plat chaud', 'Barquette à emporter']
  },
  astree: {
    id: 'astree',
    name: 'RU Astrée',
    type: 'CROUS',
    crousId: 589,
    campus: 'La Doua - Sud (Sciences)',
    defaultOpeningHours: {
      lunch: '11:30 - 14:00'
    },
    features: ['Buffet entrées', 'Plat du jour', 'Pâtisseries']
  },
  archimede: {
    id: 'archimede',
    name: 'RU Archimède / Einstein',
    type: 'CROUS',
    crousId: 609,
    campus: 'La Doua - Nord',
    defaultOpeningHours: {
      lunch: '11:30 - 13:45'
    },
    features: ['Cafétéria rapide', 'Sandwichs chauds', 'Formule étudiante']
  }
};
