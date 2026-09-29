/**
 * Types pour MonDossierWeb (Apogée) et Authentification CAS Keycloak + MFA TOTP
 * Conforme au contrat PROJECT.md et aux exigences R1/R2.
 */

export type GradeStatus = 'VAL' | 'NON_VAL' | 'EN_COURS' | 'DEF' | 'ABS';

export interface CourseGrade {
  code: string; // e.g. "IF-BDR", "MA-TF"
  name: string; // e.g. "Bases de Données Relationnelles"
  grade?: number; // Note obtenue sur maxGrade (ex: 14.5)
  maxGrade?: number; // Barème (par défaut 20)
  coefficient?: number; // Coefficient de pondération
  session?: '1' | '2'; // 1ère session ou 2nde session (rattrapages)
  status?: GradeStatus;
  letterGrade?: string; // e.g. "A", "B", "C"
}

export interface TeachingUnit {
  code: string; // e.g. "UE-IF-301"
  name: string; // e.g. "Ingénierie des Données & des Systèmes"
  average?: number; // Moyenne calculée de l'UE
  ectsCredits: number; // Crédits ECTS affectés (ex: 6)
  status: 'VAL' | 'NON_VAL' | 'EN_COURS';
  modules: CourseGrade[];
}

export interface SemesterTranscript {
  semesterNumber: number; // e.g. 5, 6, 7
  academicYear: string; // e.g. "2025-2026"
  average?: number; // Moyenne générale du semestre
  totalEcts: number; // Total des crédits du semestre (ex: 30)
  acquiredEcts: number; // Crédits ECTS validés
  teachingUnits: TeachingUnit[];
  juryDecision?: string; // e.g. "Semestre Validé (ADMIS)"
}

export interface StudentAcademicRecord {
  studentNumber: string; // Numéro d'étudiant Apogée (ex: "00012345")
  name: string; // Nom et prénom de l'étudiant
  program: string; // Cursus académique (ex: "3ème année Informatique")
  semesters: SemesterTranscript[];
  lastSyncTimestamp: string; // Date ISO-8601 de la dernière synchronisation
}

export type CasMfaStep = 
  | 'AWAITING_CREDENTIALS' 
  | 'AWAITING_TOTP' 
  | 'FETCHING_APOGEE' 
  | 'COMPLETED' 
  | 'ERROR';

export interface CasMfaSessionInit {
  flowId: string; // Identifiant de session éphémère (UUID v4)
  requiresMfa: boolean;
  step: CasMfaStep;
  message?: string;
  sessionExpiresAt?: string; // Timestamp ISO-8601 (TTL de 120s max en mémoire)
}

export interface CasCredentialsPayload {
  username: string;
  password?: string;
}

export interface CasMfaChallengePayload {
  flowId: string;
  totpCode: string; // Code à 6 chiffres
}
