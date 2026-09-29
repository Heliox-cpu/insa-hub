import type { StudentAssociation, VaEvent, VaFilterOptions } from '../../shared/types/va.types.js';

export function getSampleVaEvents(): VaEvent[] {
  return [
    {
      id: 101,
      title: 'Soirée Blind Test & Jeux de Société',
      association: 'Club K-Fêt',
      category: 'Soirée',
      start: '2026-09-29T20:30:00+02:00',
      end: '2026-09-29T23:30:00+02:00',
      location: 'Foyer Kfet • Bâtiment Dépt. TC',
      description: 'Grand blind test musical inter-départements ! Équipes de 3 à 5 personnes. Boissons sans alcool et snacks artisanaux à prix associatif.',
      isFree: true,
      price: 'Entrée libre',
    },
    {
      id: 102,
      title: 'Tournoi Smash Bros Ultimate & Mario Kart',
      association: 'Club InsAlgo & Gaming',
      category: 'Technique & Sciences',
      start: '2026-09-30T18:30:00+02:00',
      end: '2026-09-30T22:00:00+02:00',
      location: 'Maison des Étudiants (MDE) • Salle polyvalente',
      description: 'Tournoi esport ouvert à toutes les promotions. Lots pour les 3 premiers du tableau principal et du tableau loser.',
      ticketingUrl: 'https://billetweb.fr/tournoi-insalgo-2026',
      isFree: false,
      price: '2€ adhérents / 3€ non-adhérents',
    },
    {
      id: 103,
      title: 'Séance Cinéma Plein Amphi : Interstellar',
      association: 'Ciné-Club INSA',
      category: 'Culture',
      start: '2026-10-01T20:00:00+02:00',
      end: '2026-10-01T23:00:00+02:00',
      location: 'Amphithéâtre Émilie du Châtelet',
      description: 'Projection 4K sur grand écran avec sonorisation cinéma. Popcorn sucré/salé disponible à l’entrée.',
      isFree: false,
      price: '2€ l’entrée (adhésion annuelle 5€)',
    },
    {
      id: 104,
      title: 'Initiation Rock 6 temps & Pratique Salsa',
      association: 'Club Rock INSA',
      category: 'Sport',
      start: '2026-10-01T20:00:00+02:00',
      end: '2026-10-01T22:30:00+02:00',
      location: 'Foyer Génie Industriel (GI)',
      description: 'Cours débutant complet de 20h à 21h, suivi d’une soirée danse libre tous niveaux. Pas besoin de venir en couple.',
      isFree: true,
      price: 'Gratuit',
    },
    {
      id: 105,
      title: 'Ouverture Billetterie Gala INSA Lyon 2026',
      association: 'Comité Gala INSA',
      category: 'Soirée',
      start: '2026-10-02T12:30:00+02:00',
      location: 'En ligne sur Shotgun',
      description: 'Lancement de la première vague de places pour la 37ème édition du Gala de l’INSA Lyon. Thème révélé en direct !',
      ticketingUrl: 'https://shotgun.live/events/gala-insa-lyon-2026',
      isFree: false,
      price: '38€ cotisants / 45€ non-cotisants',
    },
    {
      id: 106,
      title: 'Atelier Autoréparation Vélo & Marquage Bicycode',
      association: 'Green INSA & Pignon sur Rue',
      category: 'Atelier',
      start: '2026-10-02T12:00:00+02:00',
      end: '2026-10-02T14:00:00+02:00',
      location: 'Pelouse des Humanités (face RI)',
      description: 'Outils et pièces d’occasion à disposition pour réparer freins, crevaisons et dérailleurs avec l’aide de mécaniciens bénévoles.',
      isFree: true,
      price: 'Accès libre (pièces à prix coûtant)',
    },
  ];
}

export function getSampleStudentAssociations(): StudentAssociation[] {
  return [
    {
      id: 1,
      name: 'Bureau des Élèves INSA Lyon',
      shortName: 'BdE INSA',
      category: 'Animation',
      description: 'Fédération de la vie associative et représentation de l’ensemble des élèves-ingénieurs de l’INSA Lyon.',
      contactEmail: 'contact@bde-insa-lyon.fr',
      websiteUrl: 'https://bde-insa-lyon.fr',
    },
    {
      id: 2,
      name: 'Club K-Fêt',
      shortName: 'K-Fêt',
      category: 'Soirée',
      description: 'Foyer étudiant associatif historique du campus de La Doua, lieu de convivialité, jeux et animations quotidiennes.',
      contactEmail: 'kfet@insa-lyon.fr',
    },
    {
      id: 3,
      name: 'Club Rock INSA Lyon',
      shortName: 'Rock INSA',
      category: 'Sport',
      description: 'Association de danses de couple (Rock 4 et 6 temps, Lindy Hop, Salsa cubaine et Bachata) organisant des cours et soirées.',
      contactEmail: 'clubrock@insa-lyon.fr',
    },
    {
      id: 4,
      name: 'InsAlgo — Club d’Algorithmique & Informatique',
      shortName: 'InsAlgo',
      category: 'Technique & Sciences',
      description: 'Ateliers de code, préparation aux concours de programmation compétitive (SWERC, Google HashCode) et projets open-source.',
      contactEmail: 'contact@insalgo.fr',
      websiteUrl: 'https://insalgo.fr',
    },
    {
      id: 5,
      name: 'Karnaval Humanitaire',
      shortName: 'Karna',
      category: 'Humanitaire',
      description: 'Plus grand festival associatif et solidaire étudiant de France : conférences, concerts sous chapiteau et actions caritatives.',
      websiteUrl: 'https://karnaval.fr',
    },
    {
      id: 6,
      name: 'Ciné-Club INSA',
      shortName: 'Ciné-Club',
      category: 'Culture',
      description: 'Projections hebdomadaires de grands classiques et de films contemporains en amphithéâtre pour les étudiants et personnels.',
    },
    {
      id: 7,
      name: 'Forum Organisation',
      shortName: 'Forum Rhône-Alpes',
      category: 'Animation',
      description: 'Organisation du plus grand salon de recrutement d’ingénieurs de province réunissant chaque année 200 entreprises et 4000 étudiants.',
      websiteUrl: 'https://forum-rhone-alpes.org',
    },
  ];
}

// Cache mémoire Portail VA avec TTL de 20 minutes
interface VaCacheEntry {
  events: VaEvent[];
  directory: StudentAssociation[];
  fetchedAt: number;
}
let vaCache: VaCacheEntry | null = null;
const VA_CACHE_TTL_MS = 20 * 60 * 1000;

/**
 * Récupère les événements du Portail VA (en interrogeant l'API Django publique avec fallback)
 */
export async function fetchVaEvents(forceRefresh = false): Promise<{
  events: VaEvent[];
  source: 'remote' | 'cache' | 'sample';
  fetchedAt: string;
}> {
  const now = Date.now();

  if (!forceRefresh && vaCache && now - vaCache.fetchedAt < VA_CACHE_TTL_MS) {
    return {
      events: vaCache.events,
      source: 'cache',
      fetchedAt: new Date(vaCache.fetchedAt).toISOString(),
    };
  }

  try {
    const today = new Date().toISOString().slice(0, 10);
    const inTwoMonths = new Date(now + 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const response = await fetch(
      `https://portail.asso-insa-lyon.fr/api/v1/events/?since=${today}&until=${inTwoMonths}`,
      {
        signal: AbortSignal.timeout(4000),
        headers: { 'User-Agent': 'INSA-Hub-Webapp/1.0.0' },
      }
    );

    if (response.ok) {
      const data = (await response.json()) as any;
      if (Array.isArray(data)) {
        const events: VaEvent[] = data.map((item: any, idx: number) => ({
          id: item.id || idx + 1,
          title: item.name || item.title || 'Événement associatif',
          association: item.association?.name || item.organizer || 'Association INSA',
          category: item.category || 'Animation',
          start: item.start || item.start_date || new Date().toISOString(),
          end: item.end || item.end_date,
          location: item.location || 'Campus La Doua',
          description: item.description || '',
          ticketingUrl: item.ticket_url || item.url,
          isFree: item.price ? item.price === 0 || item.price === '0' : true,
          price: item.price ? `${item.price}€` : 'Gratuit',
        }));

        if (!vaCache) {
          vaCache = { events, directory: getSampleStudentAssociations(), fetchedAt: now };
        } else {
          vaCache.events = events;
          vaCache.fetchedAt = now;
        }

        return {
          events,
          source: 'remote',
          fetchedAt: new Date(now).toISOString(),
        };
      }
    }
  } catch (error) {
    // Rebondissement gracieux sur le sample
  }

  const sampleEvents = getSampleVaEvents();
  if (!vaCache) {
    vaCache = { events: sampleEvents, directory: getSampleStudentAssociations(), fetchedAt: now };
  } else {
    vaCache.events = sampleEvents;
    vaCache.fetchedAt = now;
  }

  return {
    events: sampleEvents,
    source: 'sample',
    fetchedAt: new Date(now).toISOString(),
  };
}

/**
 * Récupère l'annuaire des associations du Portail VA
 */
export async function fetchVaDirectory(forceRefresh = false): Promise<{
  directory: StudentAssociation[];
  source: 'remote' | 'cache' | 'sample';
  fetchedAt: string;
}> {
  const now = Date.now();

  if (!forceRefresh && vaCache?.directory && now - vaCache.fetchedAt < VA_CACHE_TTL_MS) {
    return {
      directory: vaCache.directory,
      source: 'cache',
      fetchedAt: new Date(vaCache.fetchedAt).toISOString(),
    };
  }

  try {
    const response = await fetch('https://portail.asso-insa-lyon.fr/api/v1/directory/', {
      signal: AbortSignal.timeout(4000),
      headers: { 'User-Agent': 'INSA-Hub-Webapp/1.0.0' },
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      if (Array.isArray(data)) {
        const directory: StudentAssociation[] = data.map((item: any, idx: number) => ({
          id: item.id || idx + 1,
          name: item.name || 'Association INSA',
          shortName: item.short_name || item.name,
          category: item.category || 'Général',
          description: item.description || '',
          contactEmail: item.email || item.contact,
          websiteUrl: item.website,
        }));

        if (!vaCache) {
          vaCache = { events: getSampleVaEvents(), directory, fetchedAt: now };
        } else {
          vaCache.directory = directory;
        }

        return {
          directory,
          source: 'remote',
          fetchedAt: new Date(now).toISOString(),
        };
      }
    }
  } catch {
    // Rebondissement gracieux
  }

  const sample = getSampleStudentAssociations();
  if (!vaCache) {
    vaCache = { events: getSampleVaEvents(), directory: sample, fetchedAt: now };
  } else {
    vaCache.directory = sample;
  }

  return {
    directory: sample,
    source: 'sample',
    fetchedAt: new Date(now).toISOString(),
  };
}

/**
 * Filtrage des événements associatifs
 */
export function filterVaEvents(events: VaEvent[], options: VaFilterOptions): VaEvent[] {
  return events.filter((event) => {
    if (options.category && event.category.toLowerCase() !== options.category.toLowerCase()) {
      return false;
    }
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.toLowerCase();
      const matchTitle = event.title.toLowerCase().includes(q);
      const matchAsso = event.association.toLowerCase().includes(q);
      const matchDesc = event.description.toLowerCase().includes(q);
      const matchLoc = event.location.toLowerCase().includes(q);
      if (!matchTitle && !matchAsso && !matchDesc && !matchLoc) {
        return false;
      }
    }
    if (options.upcomingOnly) {
      const nowIso = new Date().toISOString();
      if (event.start < nowIso) return false;
    }
    return true;
  });
}
