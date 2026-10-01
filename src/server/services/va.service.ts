import type { StudentAssociation, VaEvent, VaFilterOptions } from '../../shared/types/va.types.js';

export function getSampleVaEvents(): VaEvent[] {
  return [
    {
      id: 2743,
      title: 'Oktoberfest',
      association: 'Lorelei INSA (K-Fêt)',
      category: 'Soirée',
      start: '2026-10-01T19:00:00+02:00',
      end: '2026-10-02T01:00:00+02:00',
      location: 'K-Fêt',
      description: 'Fête bavaroise avec activités, vente de nourritures et de boissons allemandes pour célébrer l’Oktoberfest ! Au menu : bières, bretzels, currywurst et frites.',
      ticketingUrl: 'https://www.instagram.com/asso.lorelei/',
      isFree: true,
      price: 'Entrée libre',
    },
    {
      id: 2725,
      title: 'Atelier Magnets',
      association: 'Lézarts',
      category: 'Atelier',
      start: '2026-10-03T13:30:00+02:00',
      end: '2026-10-03T16:30:00+02:00',
      location: 'Résidence B - RdC',
      description: 'Pour le premier atelier de l’année, les Lézarts vous proposent de fabriquer votre propre magnet en pâte fimo pour décorer votre frigo.',
      ticketingUrl: 'http://lezarts-insa.odoo.com',
      isFree: true,
      price: 'Entrée libre',
    },
    {
      id: 2714,
      title: 'Stage deb² (2)',
      association: 'Club Rock',
      category: 'Atelier',
      start: '2026-10-04T16:00:00+02:00',
      end: '2026-10-04T19:00:00+02:00',
      location: 'Résidence F - RdC',
      description: 'Stage rapide pour les deb² afin de combler les dernières petites lacunes et pouvoir suivre les cours inter cette année.',
      isFree: true,
      price: 'Entrée libre',
    },
    {
      id: 2755,
      title: 'AG de recrutement CLES-FACIL',
      association: 'CLES-FACIL',
      category: 'Animation',
      start: '2026-10-06T18:15:00+02:00',
      end: '2026-10-06T19:30:00+02:00',
      location: 'Amphi Séguin',
      description: 'Assemblée générale de recrutement du club CLES-FACIL en Amphi Séguin.',
      ticketingUrl: 'https://cles-facil.org',
      isFree: true,
      price: 'Entrée libre',
    },
    {
      id: 2741,
      title: 'Repas de recrutement',
      association: 'Les Sang-Culottes',
      category: 'Animation',
      start: '2026-10-07T12:00:00+02:00',
      end: '2026-10-07T14:00:00+02:00',
      location: 'Résidence B - RdC',
      description: 'Envie de t’investir, de rencontrer du monde, de proposer des projets ou simplement de découvrir ce qu’on fait ? Tu es la·le bienvenu·e !',
      ticketingUrl: 'https://www.instagram.com/sangculottesinsa',
      isFree: true,
      price: 'Entrée libre',
    },
    {
      id: 2721,
      title: 'Week-end découverte (WED)',
      association: 'Club Montagne INSA',
      category: 'Sport',
      start: '2026-10-17T06:30:00+02:00',
      end: '2026-10-18T19:00:00+02:00',
      location: 'Falaise & Camping',
      description: 'Activités autour de l’escalade en falaise (initiation et grandes voies) et randonnées en montagne pour tous niveaux.',
      isFree: false,
      price: '60€',
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

    let response = await fetch(
      `https://portail.asso-insa-lyon.fr/api/v1/events/?since=${today}&until=${inTwoMonths}`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'INSA-Hub-Webapp/1.0.0 (contact@insa-lyon.fr)' },
      }
    );

    // Fallback sans paramètres si l'endpoint filtré échoue
    if (!response.ok) {
      response = await fetch('https://portail.asso-insa-lyon.fr/api/v1/events/', {
        signal: AbortSignal.timeout(5000),
        headers: { 'User-Agent': 'INSA-Hub-Webapp/1.0.0 (contact@insa-lyon.fr)' },
      });
    }

    if (response.ok) {
      const data = (await response.json()) as any;
      if (Array.isArray(data) && data.length > 0) {
        const events: VaEvent[] = data.map((item: any, idx: number) => {
          const categoryName = typeof item.type === 'object' && item.type?.name
            ? item.type.name
            : (typeof item.category === 'object' && item.category?.name
                ? item.category.name
                : (typeof item.category === 'string' ? item.category : 'Animation'));

          const locationName = typeof item.location === 'object' && item.location?.name
            ? item.location.name
            : (typeof item.location === 'string' && item.location ? item.location : 'Campus La Doua');

          const startIso = item.begins_at
            ? (item.begins_at.includes('Z') || item.begins_at.includes('+') ? item.begins_at : `${item.begins_at}+02:00`)
            : (item.start || item.start_date || new Date().toISOString());

          const endIso = item.ends_at
            ? (item.ends_at.includes('Z') || item.ends_at.includes('+') ? item.ends_at : `${item.ends_at}+02:00`)
            : (item.end || item.end_date);

          const hasPrice = Array.isArray(item.prices) && item.prices.length > 0;
          const priceStr = hasPrice ? `${item.prices[0]}€` : (item.price ? `${item.price}€` : 'Entrée libre');
          const isFree = !hasPrice && (!item.price || item.price === 0 || item.price === '0');

          return {
            id: item.id || idx + 1,
            title: item.name || item.title || 'Événement associatif',
            association: item.association?.name || item.organizer || 'Association INSA',
            category: categoryName,
            start: startIso,
            end: endIso,
            location: locationName,
            description: item.short_description || item.description || '',
            ticketingUrl: item.website_url || item.ticket_url || item.url,
            isFree,
            price: isFree ? 'Entrée libre' : priceStr,
          };
        });

        // Trier par date chronologique
        events.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

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
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'INSA-Hub-Webapp/1.0.0 (contact@insa-lyon.fr)' },
    });

    if (response.ok) {
      const data = (await response.json()) as any;
      if (Array.isArray(data) && data.length > 0) {
        const directory: StudentAssociation[] = data.map((item: any, idx: number) => {
          const categoryName = typeof item.category === 'object' && item.category?.name
            ? item.category.name
            : (typeof item.category === 'string' ? item.category : 'Animation');

          return {
            id: item.id || idx + 1,
            name: item.name || 'Association INSA',
            shortName: item.acronym || item.short_name || item.name,
            category: categoryName,
            description: item.short_description || item.description || '',
            contactEmail: item.email || item.contact || '',
            websiteUrl: item.website_url || item.website || item.instagram_url || item.facebook_url,
          };
        });

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
