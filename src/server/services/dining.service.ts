import type {
  CampusRestaurant,
  DietaryLabel,
  MealMenu,
  MenuItem,
  RestaurantId,
  AffluenceLevel,
} from '../../shared/types/dining.types.js';

/**
 * Extraction des labels diététiques INSA / CROUS (<BIO>, <VEG>, <VF>, etc.)
 * et des points Izly CROUS (ex: "(3 pts)" ou "(2 pts")
 */
const LABEL_REGEX = /<(BIO|VF|FLF|FM|VEG|BBC|HVE)>/gi;
const POINTS_REGEX = /\s*\(([0-9]+)\s*(?:pts?|points?)\)?/i;

export function extractDietaryLabels(rawName: string): { cleanName: string; labels: DietaryLabel[]; points?: number } {
  if (!rawName) return { cleanName: '', labels: [] };

  const labels: DietaryLabel[] = [];
  let match: RegExpExecArray | null;

  while ((match = LABEL_REGEX.exec(rawName)) !== null) {
    const tag = match[1].toUpperCase() as DietaryLabel;
    if (!labels.includes(tag)) {
      labels.push(tag);
    }
  }

  // Nettoyage des balises du nom affiché
  let cleanName = rawName.replace(LABEL_REGEX, '').replace(/\s+/g, ' ').trim();

  // Extraction et nettoyage des points CROUS Izly éventuels (ex: "(3 pts)", "(2 points)", "(2 pts")
  let points: number | undefined;
  const pointsMatch = cleanName.match(POINTS_REGEX);
  if (pointsMatch) {
    const parsed = parseInt(pointsMatch[1], 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) {
      points = parsed;
    }
    cleanName = cleanName.replace(POINTS_REGEX, '').trim();
  }

  // Inférence automatique si pas de label explicite mais mot-clé évident
  if (!labels.includes('VEG') && /\b(végétarien|végé|veggie|tofu|falafel|fromage|chèvre|mozzarella)\b/i.test(cleanName)) {
    labels.push('VEG');
  }
  if (!labels.includes('BIO') && /\b(bio|biologique)\b/i.test(cleanName)) {
    labels.push('BIO');
  }
  if (!labels.includes('FM') && /\b(poisson|saumon|colin|cabillaud|thon|mer|crevette)\b/i.test(cleanName)) {
    labels.push('FM');
  }
  if (!labels.includes('VF') && /\b(poulet|dinde|volaille|boeuf|porc|jambon|viande)\b/i.test(cleanName)) {
    labels.push('VF');
  }

  return { cleanName, labels, points };
}

/**
 * Détection des jours fériés légaux français (fixes et variables)
 */
export function isFrenchBankHoliday(date: Date): boolean {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  }).formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const mmdd = `${m.month}-${m.day}`;
  const year = parseInt(m.year, 10);

  // Jours fériés fixes en France
  const fixed = [
    '01-01', // Jour de l'An
    '05-01', // Fête du Travail
    '05-08', // Victoire 1945
    '07-14', // Fête Nationale
    '08-15', // Assomption
    '11-01', // Toussaint
    '11-11', // Armistice 1918
    '12-25', // Noël
  ];
  if (fixed.includes(mmdd)) return true;

  // Calcul du dimanche de Pâques (algorithme de Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const n = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * n + 114) / 31);
  const day = ((h + l - 7 * n + 114) % 31) + 1;

  const easterUtc = Date.UTC(year, month - 1, day);
  const easterMonday = new Date(easterUtc + 1 * 86400000);
  const ascension = new Date(easterUtc + 39 * 86400000);
  const pentecostMonday = new Date(easterUtc + 50 * 86400000);

  const fmt = (d: Date) => {
    const mo = String(d.getUTCMonth() + 1).padStart(2, '0');
    const da = String(d.getUTCDate()).padStart(2, '0');
    return `${mo}-${da}`;
  };

  const variableHolidays = [fmt(easterMonday), fmt(ascension), fmt(pentecostMonday)];
  return variableHolidays.includes(mmdd);
}

/**
 * Calcul heuristique du niveau d'affluence en fonction de l'heure courante (Europe/Paris)
 */
export function calculateAffluence(
  restaurantId: RestaurantId,
  referenceDate: Date = new Date()
): { level: AffluenceLevel; description: string } {
  // Détection des jours fériés
  if (isFrenchBankHoliday(referenceDate)) {
    return { level: 'closed', description: 'Fermé (Jour férié)' };
  }

  // Obtenir heure et minutes en Europe/Paris
  const parisTimeStr = referenceDate.toLocaleTimeString('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const [hourStr, minStr] = parisTimeStr.split(':');
  const currentMinutes = parseInt(hourStr, 10) * 60 + parseInt(minStr, 10);

  // Vérifier le jour de la semaine (dimanche = Sun, samedi = Sat)
  const parisDay = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  }).format(referenceDate);

  const isWeekend = parisDay === 'Sat' || parisDay === 'Sun';

  if (isWeekend) {
    if (restaurantId === 'ri' && parisDay === 'Sun' && currentMinutes >= 18 * 60 + 45 && currentMinutes <= 20 * 60 + 30) {
      return { level: 'low', description: 'Service du dimanche soir (< 5 min)' };
    }
    return { level: 'closed', description: 'Fermé le week-end' };
  }

  // Plages Midi (11h30 - 13h45) -> 690m à 825m
  if (currentMinutes >= 11 * 60 + 30 && currentMinutes < 13 * 60 + 45) {
    if (currentMinutes < 11 * 60 + 55) {
      return { level: 'low', description: '< 5 min d’attente (Service débutant)' };
    } else if (currentMinutes <= 12 * 60 + 45) {
      return { level: 'high', description: '15-20 min d’attente (Pic d’affluence)' };
    } else if (currentMinutes <= 13 * 60 + 15) {
      return { level: 'moderate', description: '5-10 min d’attente' };
    } else {
      return { level: 'low', description: '< 5 min d’attente' };
    }
  }

  // Plages Soir (RI uniquement 18h45 - 20h30) -> 1125m à 1230m
  if (restaurantId === 'ri' && currentMinutes >= 18 * 60 + 45 && currentMinutes <= 20 * 60 + 30) {
    if (currentMinutes <= 19 * 60 + 15) {
      return { level: 'low', description: '< 5 min d’attente' };
    } else if (currentMinutes <= 19 * 60 + 50) {
      return { level: 'moderate', description: '5-10 min d’attente' };
    } else {
      return { level: 'low', description: '< 5 min d’attente' };
    }
  }

  return { level: 'closed', description: 'Actuellement fermé' };
}

/**
 * Formate la date du jour en YYYY-MM-DD (Europe/Paris)
 */
export function getTodayDateStr(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day}`;
}

/**
 * Fournit les menus de secours réalistes INSA & CROUS avec détection du jour et des fermetures
 */
export function getSampleCampusRestaurants(todayStr: string = getTodayDateStr()): CampusRestaurant[] {
  const now = new Date();
  const refDate = new Date(`${todayStr}T12:00:00Z`);
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    weekday: 'short',
  }).format(refDate);

  const isSunday = weekday === 'Sun';
  const isSaturday = weekday === 'Sat';
  const isWeekend = isSunday || isSaturday;
  const isHoliday = isFrenchBankHoliday(refDate);

  const riLunchOpen = !isSunday && !isHoliday;
  const riLunchClosureReason = isSunday ? 'Fermé le dimanche midi' : (isHoliday ? 'Fermé (Jour férié)' : undefined);

  const riDinnerOpen = !isSaturday && !isHoliday;
  const riDinnerClosureReason = isSaturday ? 'Fermé le samedi soir' : (isHoliday ? 'Fermé (Jour férié)' : undefined);

  const weekendClosureReason = isWeekend ? 'Fermé le week-end' : (isHoliday ? 'Fermé (Jour férié)' : undefined);
  const crousOpen = !isWeekend && !isHoliday;

  return [
    {
      id: 'ri',
      name: 'Restaurant INSA (RI)',
      type: 'INSA',
      affluenceLevel: calculateAffluence('ri', now).level,
      affluenceDescription: calculateAffluence('ri', now).description,
      location: 'Face aux Humanités • Campus La Doua',
      openingHours: {
        lunch: '11:30 - 13:45',
        dinner: '18:45 - 20:30',
      },
      menus: [
        {
          date: todayStr,
          mealType: 'lunch',
          isOpen: riLunchOpen,
          closureReason: riLunchClosureReason,

          lines: [
            {
              name: 'Ligne Végétarienne',
              items: [
                { name: 'Wok de Légumes Croquants & Tofu Mariné', category: 'dish', labels: ['VEG', 'BIO'] },
                { name: 'Riz Basmati aux Épices Douces', category: 'side', labels: ['BIO'] },
                { name: 'Gratin de Courgettes au Chèvre Frais', category: 'dish', labels: ['VEG'] },
              ],
            },
            {
              name: 'Ligne Traditionnelle',
              items: [
                { name: 'Dos de Colin d’Alaska Rôti au Four', category: 'dish', labels: ['FM'] },
                { name: 'Rôti de Dinde Forestier', category: 'dish', labels: ['VF'] },
                { name: 'Frites Maison & Poêlée de Légumes Rustiques', category: 'side', labels: ['HVE'] },
              ],
            },
            {
              name: 'Ligne Monde',
              items: [
                { name: 'Sauté de Boeuf Épicé aux Saveurs d’Orient', category: 'dish', labels: ['BBC'] },
                { name: 'Semoule Fine aux Saveurs d’Orient', category: 'side', labels: [] },
              ],
            },
          ],
          items: [
            // Entrées communes
            { name: 'Salade Niçoise au Thon & Olives Noires', category: 'starter', labels: ['FLF'] },
            { name: 'Taboulé Libanais à la Menthe Fraîche', category: 'starter', labels: ['BIO', 'VEG'] },
            { name: 'Velouté de Potimarron aux Graines Grillées', category: 'starter', labels: ['VEG'] },
            // Plats
            { name: 'Wok de Légumes Croquants & Tofu Mariné', category: 'dish', labels: ['VEG', 'BIO'], line: 'Ligne Végétarienne' },
            { name: 'Dos de Colin d’Alaska Rôti au Four', category: 'dish', labels: ['FM'], line: 'Ligne Traditionnelle' },
            { name: 'Sauté de Boeuf Épicé aux Saveurs d’Orient', category: 'dish', labels: ['BBC'], line: 'Ligne Monde' },
            // Desserts
            { name: 'Tarte aux Pommes Caramélisées Maison', category: 'dessert', labels: ['FLF'] },
            { name: 'Mousse au Chocolat Noir 70%', category: 'dessert', labels: ['BIO', 'VEG'] },
            { name: 'Fromage Blanc & Coulis de Fruits Rouges', category: 'dessert', labels: ['VF'] },
          ],
        },
        {
          date: todayStr,
          mealType: 'dinner',
          isOpen: riDinnerOpen,
          closureReason: riDinnerClosureReason,
          lines: [
            {
              name: 'Service du Soir',
              items: [
                { name: 'Hachis Parmentier Maison au Boeuf Charolais', category: 'dish', labels: ['VF'] },
                { name: 'Dahl de Lentilles Corail & Épinards', category: 'dish', labels: ['VEG', 'BIO'] },
                { name: 'Purée Mousseline Maison & Salade Verte', category: 'side', labels: [] },
              ],
            },
          ],
          items: [
            { name: 'Carottes Râpées Vinaigrette Agrumes', category: 'starter', labels: ['BIO', 'VEG'] },
            { name: 'Hachis Parmentier Maison au Boeuf Charolais', category: 'dish', labels: ['VF'] },
            { name: 'Dahl de Lentilles Corail & Épinards', category: 'dish', labels: ['VEG', 'BIO'] },
            { name: 'Crème Caramel Vanille Bourbon', category: 'dessert', labels: ['VEG'] },
            { name: 'Fruit de Saison (Poire Bio)', category: 'dessert', labels: ['BIO', 'VEG'] },
          ],
        },
      ],
    },
    {
      id: 'olivier',
      name: "Pizzeria & Grill L'Olivier",
      type: 'INSA',
      affluenceLevel: calculateAffluence('olivier', now).level,
      affluenceDescription: calculateAffluence('olivier', now).description,
      location: 'Résidence J • Campus La Doua',
      openingHours: {
        lunch: '11:30 - 13:45',
      },
      menus: [
        {
          date: todayStr,
          mealType: 'lunch',
          isOpen: crousOpen,
          closureReason: weekendClosureReason,
          lines: [
            {
              name: 'Pizzas Artisanales au Feu de Bois',
              items: [
                { name: 'Pizza Regina (Jambon Supérieur, Champignons, Mozzarella)', category: 'pizza', labels: ['VF'] },
                { name: 'Pizza Quattro Formaggi (Gorgonzola, Mozzarella, Chèvre, Emmental)', category: 'pizza', labels: ['VEG'] },
                { name: 'Pizza Ortolana (Légumes Grillés, Roquette, Huile Pimentée)', category: 'pizza', labels: ['VEG', 'BIO'] },
              ],
            },
            {
              name: 'Bar à Pâtes & Grillades',
              items: [
                { name: 'Tagliatelles Fraîches Sauce Pesto Génois', category: 'dish', labels: ['VEG'] },
                { name: 'Bavette d’Aloyau Grillée Sauce Échalotes', category: 'dish', labels: ['VF'] },
              ],
            },
          ],
          items: [
            { name: 'Salade Caprese Tomates Cerises & Mozzarella di Bufala', category: 'starter', labels: ['VEG'] },
            { name: 'Pizza Regina (Jambon, Champignons, Mozza)', category: 'pizza', labels: ['VF'] },
            { name: 'Pizza Ortolana (Légumes Grillés & Roquette)', category: 'pizza', labels: ['VEG', 'BIO'] },
            { name: 'Tagliatelles Fraîches Sauce Pesto Génois', category: 'dish', labels: ['VEG'] },
            { name: 'Tiramisu Classique au Café & Cacao', category: 'dessert', labels: ['VEG'] },
            { name: 'Panna Cotta Coulis Mangue Passion', category: 'dessert', labels: [] },
          ],
        },
      ],
    },
    {
      id: 'puvis',
      name: 'RU CROUS Puvis de Chavannes',
      type: 'CROUS',
      crousId: 2265,
      affluenceLevel: calculateAffluence('puvis', now).level,
      affluenceDescription: calculateAffluence('puvis', now).description,
      location: 'Boulevard André Latarjet • Tram T1/T4 Université Lyon 1',
      openingHours: {
        lunch: '11:15 - 13:45',
      },
      menus: [
        {
          date: todayStr,
          mealType: 'lunch',
          isOpen: crousOpen,
          closureReason: weekendClosureReason,
          lines: [
            {
              name: 'Menu Étudiant 1€ / 3.30€ (Formule 6 points Izly)',
              items: [
                { name: 'Cuisse de Poulet Rôtie Label Rouge aux Herbes', category: 'dish', labels: ['VF'], points: 3 },
                { name: 'Filet de Colin d’Alaska Pané & Sauce Tartare', category: 'dish', labels: ['FM'], points: 3 },
                { name: 'Steak de Soja & Ratatouille Provençale', category: 'dish', labels: ['VEG', 'BIO'], points: 3 },
                { name: 'Penne Rigate & Sauce Napolitaine', category: 'side', labels: ['VEG'], points: 1 },
              ],
            },
          ],
          items: [
            { name: 'Céleri Rémoulade Maison', category: 'starter', labels: ['VEG'], points: 1 },
            { name: 'Cuisse de Poulet Rôtie Label Rouge', category: 'dish', labels: ['VF'], points: 3 },
            { name: 'Steak de Soja & Ratatouille', category: 'dish', labels: ['VEG', 'BIO'], points: 3 },
            { name: 'Penne Rigate & Sauce Napolitaine', category: 'side', labels: ['VEG'], points: 1 },
            { name: 'Compote Pomme Châtaigne Bio', category: 'dessert', labels: ['BIO', 'VEG'], points: 1 },
            { name: 'Éclair Chocolat', category: 'dessert', labels: ['VEG'], points: 2 },
          ],
        },
      ],
    },
    {
      id: 'archimede',
      name: 'Cafétéria CROUS Archimède',
      type: 'CROUS',
      crousId: 609,
      affluenceLevel: calculateAffluence('archimede', now).level,
      affluenceDescription: calculateAffluence('archimede', now).description,
      location: 'Bâtiment Archimède (face Dépt. GI)',
      openingHours: {
        lunch: '11:30 - 14:00',
      },
      menus: [
        {
          date: todayStr,
          mealType: 'lunch',
          isOpen: crousOpen,
          closureReason: weekendClosureReason,
          items: [
            { name: 'Bagel Poulet Curry Crudités', category: 'snack', labels: ['VF'] },
            { name: 'Wrap Falafels Sauce Tahini', category: 'snack', labels: ['VEG'] },
            { name: 'Salade Quinoa & Fèves Edamame', category: 'starter', labels: ['BIO', 'VEG'] },
            { name: 'Cookie Pépites Chocolat & Noix de Pécan', category: 'dessert', labels: ['VEG'] },
          ],
        },
      ],
    },
    {
      id: 'astree',
      name: 'Cafétéria CROUS Astrée',
      type: 'CROUS',
      crousId: 589,
      affluenceLevel: calculateAffluence('astree', now).level,
      affluenceDescription: calculateAffluence('astree', now).description,
      location: 'Théâtre Astrée • Campus Ouest',
      openingHours: {
        lunch: '11:30 - 14:00',
      },
      menus: [
        {
          date: todayStr,
          mealType: 'lunch',
          isOpen: crousOpen,
          closureReason: weekendClosureReason,
          items: [
            { name: 'Panini 3 Fromages & Origan', category: 'snack', labels: ['VEG'] },
            { name: 'Sandwich Jambon Sec & Beurre AOP', category: 'snack', labels: ['VF'] },
            { name: 'Muffin Myrtilles Sauvages', category: 'dessert', labels: ['VEG'] },
          ],
        },
      ],
    },

  ];
}

// Cache mémoire Restos avec TTL de 30 minutes
interface DiningCacheEntry {
  restaurants: CampusRestaurant[];
  fetchedAt: number;
}
let diningCache: DiningCacheEntry | null = null;
const DINING_CACHE_TTL_MS = 30 * 60 * 1000;

/**
 * Récupère les restaurants et leurs menus à jour (en interrogeant le BDE INSA et CROUStillant avec fallback)
 */
export function parseCrousMenuData(crousData: any): MealMenu[] {
  if (!crousData || !Array.isArray(crousData.data)) return [];
  const menus: MealMenu[] = [];

  for (const dayEntry of crousData.data) {
    if (!dayEntry.date || !Array.isArray(dayEntry.repas)) continue;
    // Format CROUS: "DD-MM-YYYY" -> ISO "YYYY-MM-DD"
    const [dd, mm, yyyy] = String(dayEntry.date).split('-');
    if (!dd || !mm || !yyyy) continue;
    const isoDate = `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;

    for (const meal of dayEntry.repas) {
      if (meal.type !== 'midi' && meal.type !== 'soir') {
        continue;
      }
      const mealType: 'lunch' | 'dinner' = meal.type === 'soir' ? 'dinner' : 'lunch';
      const lines: { name: string; items: MenuItem[] }[] = [];
      const allItems: MenuItem[] = [];

      if (Array.isArray(meal.categories)) {
        for (const cat of meal.categories) {
          const catName = cat.libelle || 'Plat';
          const catLower = catName.toLowerCase();
          const catItems: MenuItem[] = [];

          if (Array.isArray(cat.plats)) {
            for (const plat of cat.plats) {
              const rawName = plat.libelle || '';
              if (!rawName.trim()) continue;
              const { cleanName, labels, points } = extractDietaryLabels(rawName);

              let category: MenuItem['category'] = 'dish';
              if (catLower.includes('entrée')) category = 'starter';
              else if (catLower.includes('accompagnement')) category = 'side';
              else if (catLower.includes('dessert') || catLower.includes('douceur')) category = 'dessert';
              else if (catLower.includes('sandwich') || catLower.includes('snack') || catLower.includes('formule')) category = 'snack';
              else if (catLower.includes('pizza')) category = 'pizza';

              if (catLower.includes('végétarien') && !labels.includes('VEG')) {
                labels.push('VEG');
              }
              if (catLower.includes('poisson') && !labels.includes('FM')) {
                labels.push('FM');
              }

              const item: MenuItem = {
                name: cleanName,
                category,
                labels,
                points: points !== undefined ? points : (catLower.includes('formule') ? 6 : undefined),
                line: catName,
              };

              catItems.push(item);
              allItems.push(item);
            }
          }

          if (catItems.length > 0) {
            lines.push({
              name: catName,
              items: catItems,
            });
          }
        }
      }

      menus.push({
        date: isoDate,
        mealType,
        isOpen: true,
        lines: lines.length > 0 ? lines : undefined,
        items: allItems,
      });
    }
  }

  return menus;
}

export function parseBdeMenuData(bdeData: any, currentYear: number = new Date().getFullYear()): { riMenus: MealMenu[]; olivierMenus: MealMenu[] } {
  const riMenus: MealMenu[] = [];
  const olivierMenus: MealMenu[] = [];

  if (!bdeData || !Array.isArray(bdeData.days)) {
    return { riMenus, olivierMenus };
  }

  for (const day of bdeData.days) {
    if (!day.date || typeof day.date.day !== 'number' || typeof day.date.month !== 'number') continue;
    const dayStr = String(day.date.day).padStart(2, '0');
    const monthStr = String(day.date.month).padStart(2, '0');
    const yearStr = String(day.date.year || currentYear);
    const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

    // Déjeuner RI
    if (day.lunch?.ri && typeof day.lunch.ri === 'object') {
      const { lines, items } = parseBdeMealObject(day.lunch.ri);
      if (items.length > 0) {
        riMenus.push({
          date: dateStr,
          mealType: 'lunch',
          isOpen: true,
          lines: lines.length > 0 ? lines : undefined,
          items,
        });
      }
    }

    // Déjeuner Olivier
    if (day.lunch?.olivier && typeof day.lunch.olivier === 'object') {
      const { lines, items } = parseBdeMealObject(day.lunch.olivier);
      if (items.length > 0) {
        olivierMenus.push({
          date: dateStr,
          mealType: 'lunch',
          isOpen: true,
          lines: lines.length > 0 ? lines : undefined,
          items,
        });
      }
    }

    // Dîner RI
    if (day.dinner?.ri && typeof day.dinner.ri === 'object') {
      const { lines, items } = parseBdeMealObject(day.dinner.ri);
      if (items.length > 0) {
        riMenus.push({
          date: dateStr,
          mealType: 'dinner',
          isOpen: true,
          lines: lines.length > 0 ? lines : undefined,
          items,
        });
      }
    }
  }

  return { riMenus, olivierMenus };
}

function parseBdeMealObject(mealObj: Record<string, any>): { lines: { name: string; items: MenuItem[] }[]; items: MenuItem[] } {
  const lines: { name: string; items: MenuItem[] }[] = [];
  const allItems: MenuItem[] = [];

  const sectionMapping: Record<string, { label: string; category: MenuItem['category'] }> = {
    entree: { label: 'Entrées', category: 'starter' },
    plat: { label: 'Plats Chauds', category: 'dish' },
    garniture: { label: 'Accompagnements', category: 'side' },
    sauce: { label: 'Sauces', category: 'side' },
    fromage: { label: 'Fromages', category: 'dessert' },
    dessert: { label: 'Desserts', category: 'dessert' },
  };

  for (const [key, config] of Object.entries(sectionMapping)) {
    const list = mealObj[key];
    if (Array.isArray(list) && list.length > 0) {
      const sectionItems: MenuItem[] = [];
      for (const rawName of list) {
        if (typeof rawName !== 'string' || !rawName.trim()) continue;
        const { cleanName, labels, points } = extractDietaryLabels(rawName);
        const item: MenuItem = {
          name: cleanName,
          category: config.category,
          labels,
          points,
          line: config.label,
        };
        sectionItems.push(item);
        allItems.push(item);
      }
      if (sectionItems.length > 0) {
        lines.push({ name: config.label, items: sectionItems });
      }
    }
  }

  return { lines, items: allItems };
}

/**
 * Récupère les restaurants et leurs menus à jour en interrogeant directement
 * l'API CROUStillant (Puvis, Archimède, Astrée) et l'API BDE INSA (RI, Olivier)
 */
export async function fetchCampusRestaurants(forceRefresh = false): Promise<{
  restaurants: CampusRestaurant[];
  source: 'remote' | 'cache' | 'sample';
  fetchedAt: string;
}> {
  const now = Date.now();
  const todayStr = getTodayDateStr();

  // Si cache valide et pas de forceRefresh
  if (!forceRefresh && diningCache && now - diningCache.fetchedAt < DINING_CACHE_TTL_MS) {
    const updated = diningCache.restaurants.map((r) => {
      const aff = calculateAffluence(r.id);
      return {
        ...r,
        affluenceLevel: aff.level,
        affluenceDescription: aff.description,
      };
    });
    return {
      restaurants: updated,
      source: 'cache',
      fetchedAt: new Date(diningCache.fetchedAt).toISOString(),
    };
  }

  const sampleRestaurants = getSampleCampusRestaurants(todayStr);

  const CROUS_TARGETS: { id: RestaurantId; crousId: number }[] = [
    { id: 'puvis', crousId: 2265 },
    { id: 'archimede', crousId: 609 },
    { id: 'astree', crousId: 589 },
  ];

  try {
    const crousPromises = CROUS_TARGETS.map(async ({ id, crousId }) => {
      try {
        const res = await fetch(`https://api.croustillant.menu/v1/restaurants/${crousId}/menu`, {
          signal: AbortSignal.timeout(5000),
          headers: {
            'User-Agent': 'INSA-Hub-Webapp/1.0.0 (contact@insa-lyon.fr) (+https://insa-hub.vercel.app)',
            'Accept': 'application/json',
          },
        });
        if (res.ok) {
          const json = await res.json();
          return { id, menus: parseCrousMenuData(json) };
        }
      } catch {}
      return { id, menus: [] };
    });

    const bdePromise = (async () => {
      try {
        const res = await fetch('https://utils.bde-insa-lyon.fr/menu/data/menu.json', {
          signal: AbortSignal.timeout(5000),
          headers: { 'User-Agent': 'INSA-Hub-Webapp/1.0.0' },
        });
        if (res.ok) {
          const json = await res.json();
          return { ok: true, data: json };
        }
      } catch {}
      return { ok: false, data: null };
    })();

    const [crousResults, bdeResult] = await Promise.all([
      Promise.all(crousPromises),
      bdePromise,
    ]);

    let remoteCount = 0;

    // Mise à jour des restaurants CROUS avec les vrais menus
    for (const { id, menus } of crousResults) {
      if (menus.length > 0) {
        remoteCount++;
        const target = sampleRestaurants.find((r) => r.id === id);
        if (target) {
          target.menus = menus;
        }
      }
    }

    // Mise à jour des restaurants INSA avec les données du BDE si disponibles
    if (bdeResult.ok && bdeResult.data) {
      remoteCount++;
      const { riMenus, olivierMenus } = parseBdeMenuData(bdeResult.data);
      const riTarget = sampleRestaurants.find((r) => r.id === 'ri');
      const olivierTarget = sampleRestaurants.find((r) => r.id === 'olivier');

      const hasRiToday = riMenus.some((m) => m.date === todayStr && m.items.length > 0);
      const hasOlivierToday = olivierMenus.some((m) => m.date === todayStr && m.items.length > 0);

      const refDate = new Date(`${todayStr}T12:00:00Z`);
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' }).format(refDate);
      const isSunday = weekday === 'Sun';
      const isSaturday = weekday === 'Sat';
      const isWeekend = isSunday || isSaturday;
      const isHoliday = isFrenchBankHoliday(refDate);

      const riLunchOpen = !isSunday && !isHoliday;
      const riLunchClosureReason = isSunday ? 'Fermé le dimanche midi' : (isHoliday ? 'Fermé (Jour férié)' : undefined);
      const riDinnerOpen = !isSaturday && !isHoliday;
      const riDinnerClosureReason = isSaturday ? 'Fermé le samedi soir' : (isHoliday ? 'Fermé (Jour férié)' : undefined);
      const weekendClosureReason = isWeekend ? 'Fermé le week-end' : (isHoliday ? 'Fermé (Jour férié)' : undefined);
      const crousOpen = !isWeekend && !isHoliday;

      if (riTarget) {
        if (hasRiToday) {
          riTarget.menus = riMenus;
        } else {
          riTarget.menus = [
            {
              date: todayStr,
              mealType: 'lunch',
              isOpen: riLunchOpen,
              closureReason: riLunchClosureReason || 'Menu non publié par le BDE INSA',
              items: [],
              lines: [],
            },
            {
              date: todayStr,
              mealType: 'dinner',
              isOpen: riDinnerOpen,
              closureReason: riDinnerClosureReason || 'Menu non publié par le BDE INSA',
              items: [],
              lines: [],
            },
          ];
        }
      }

      if (olivierTarget) {
        if (hasOlivierToday) {
          olivierTarget.menus = olivierMenus;
        } else {
          olivierTarget.menus = [
            {
              date: todayStr,
              mealType: 'lunch',
              isOpen: crousOpen,
              closureReason: weekendClosureReason || 'Menu non publié par le BDE INSA',
              items: [],
              lines: [],
            },
          ];
        }
      }
    }

    // Actualiser affluence
    for (const r of sampleRestaurants) {
      const aff = calculateAffluence(r.id);
      r.affluenceLevel = aff.level;
      r.affluenceDescription = aff.description;
    }

    const source = remoteCount > 0 ? 'remote' : 'sample';
    diningCache = {
      restaurants: sampleRestaurants,
      fetchedAt: now,
    };

    return {
      restaurants: sampleRestaurants,
      source,
      fetchedAt: new Date(now).toISOString(),
    };
  } catch (error) {
    const sample = getSampleCampusRestaurants(todayStr);
    diningCache = { restaurants: sample, fetchedAt: now };
    return {
      restaurants: sample,
      source: 'sample',
      fetchedAt: new Date(now).toISOString(),
    };
  }
}

/**
 * Filtre les menus selon les options demandées
 */
export function filterDiningMenus(
  restaurants: CampusRestaurant[],
  options: {
    restaurantId?: RestaurantId;
    labels?: DietaryLabel[];
    mealType?: 'lunch' | 'dinner';
    maxAffluence?: AffluenceLevel;
  }
): CampusRestaurant[] {
  return restaurants
    .filter((r) => !options.restaurantId || r.id === options.restaurantId)
    .map((restaurant) => {
      const filteredMenus = restaurant.menus
        .filter((m) => !options.mealType || m.mealType === options.mealType)
        .map((menu) => {
          let items = menu.items;
          if (options.labels && options.labels.length > 0) {
            items = items.filter((item) =>
              options.labels!.every((reqLabel) => item.labels.includes(reqLabel))
            );
          }
          return { ...menu, items };
        });

      return {
        ...restaurant,
        menus: filteredMenus,
      };
    });
}
