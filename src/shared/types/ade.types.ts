/**
 * Types pour le service ADE Planning (Emploi du temps INSA Lyon)
 * Conforme au contrat PROJECT.md et aux exigences R1.
 */

export type CourseType = 'CM' | 'TD' | 'TP' | 'EVAL' | 'OTHER';

export interface AdeCourseEvent {
  id: string;
  uid?: string;
  department?: string; // e.g. "IF", "FIMI", "GI", "TC"
  year?: number; // e.g. 3, 4, 5
  semester?: string; // e.g. "S1", "S2"
  subjectCode: string; // e.g. "BDR", "MA-TF", "SYS"
  courseType: CourseType;
  group?: string; // e.g. "3IF3", "048", "TD2"
  eventNumber?: string; // e.g. "001"
  title: string; // Intitulé lisible du cours
  location: string; // e.g. "Bâtiment Lespinasse • Lab 304"
  instructor?: string; // e.g. "Pr. Durand"
  start: string; // Chaîne ISO-8601 en heure locale Europe/Paris (ex: "2026-09-29T14:00:00+02:00")
  end: string; // Chaîne ISO-8601 en heure locale Europe/Paris (ex: "2026-09-29T17:00:00+02:00")
  rawSummary: string; // Champ SUMMARY brut issu de l'ICS (ex: "IF:3:S1::BDR:CM::3IF3 #001")
  description?: string;
  status?: 'confirmed' | 'cancelled' | 'tentative';
}

export interface FreeTimeSlot {
  start: string; // ISO-8601 Europe/Paris
  end: string; // ISO-8601 Europe/Paris
  durationMinutes: number;
  label?: string; // e.g. "Pause Déjeuner", "Créneau Libre"
}

export interface AdeFeedConfig {
  url: string; // URL complète d'abonnement ADE (ex: "https://ade-outils.insa-lyon.fr/ADE-Cal:~<LOGIN>!<ANNEE>:<TOKEN_SECRET>")
  login?: string;
  year?: number | string;
  tokenSecret?: string;
  lastFetchedAt?: string; // Timestamp ISO-8601
  autoRefresh?: boolean;
}

export interface AdeSummaryParsed {
  department: string | null;
  year: number | null;
  semester: string | null;
  subjectCode: string;
  courseType: CourseType;
  group: string | null;
  eventNumber: string | null;
}

export interface AdeFilterOptions {
  startDate?: string;
  endDate?: string;
  courseTypes?: CourseType[];
  subjectCode?: string;
}
