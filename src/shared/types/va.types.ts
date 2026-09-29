/**
 * Types pour le service Portail Vie Associative (Portail VA)
 * Conforme au contrat PROJECT.md et aux exigences R1.
 */

export type VaCategory = 
  | 'Soirée'
  | 'Culture'
  | 'Sport'
  | 'Conférence'
  | 'Atelier'
  | 'Animation'
  | 'Technique & Sciences'
  | 'Humanitaire'
  | 'Autre';

export interface VaEvent {
  id: number | string;
  title: string;
  association: string; // Nom de l'asso organisatrice (ex: "BdE INSA Lyon", "Club K-Fêt")
  category: string;
  start: string; // ISO-8601 (ex: "2026-09-29T20:30:00+02:00")
  end?: string;
  location: string; // e.g. "K-Fêt", "Maison des Étudiants (MDE)", "Pelouse Humanités"
  description: string;
  ticketingUrl?: string; // Lien billetterie (HelloAsso, Billetweb, Shotgun)
  posterUrl?: string; // URL de l'affiche / visuel
  isFree?: boolean;
  price?: string; // e.g. "Gratuit", "3€ adhérent / 5€ non-adhérent"
}

export interface StudentAssociation {
  id: number | string;
  name: string;
  shortName?: string; // e.g. "CdM", "K-Fêt", "BDE"
  category: string;
  description: string;
  contactEmail?: string;
  logoUrl?: string;
  websiteUrl?: string;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    discord?: string;
  };
}

export interface VaFilterOptions {
  category?: string;
  associationId?: number | string;
  upcomingOnly?: boolean;
  searchQuery?: string;
}
