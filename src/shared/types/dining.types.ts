/**
 * Types pour le service de Restauration Campus (BDE & CROUS)
 * Conforme au contrat PROJECT.md et aux exigences R1.
 */

export type RestaurantId = 'ri' | 'olivier' | 'puvis' | 'astree' | 'archimede';

export type RestaurantType = 'INSA' | 'CROUS';

export type AffluenceLevel = 'low' | 'moderate' | 'high' | 'closed';

export type DietaryLabel = 'VEG' | 'BIO' | 'VF' | 'FLF' | 'FM' | 'BBC' | 'HVE';

export type MenuItemCategory = 'starter' | 'dish' | 'side' | 'dessert' | 'pizza' | 'snack';

export interface MenuItem {
  name: string;
  category: MenuItemCategory;
  labels: DietaryLabel[];
  allergens?: string[];
  points?: number; // CROUS points Izly (1pt à 4pts)
  line?: string; // e.g. "Ligne Traditionnelle", "Ligne Monde", "Ligne Végétarienne"
  price?: number;
}

export interface MealMenu {
  date: string; // Format YYYY-MM-DD
  mealType: 'lunch' | 'dinner';
  isOpen: boolean;
  closureReason?: string; // e.g. "Dimanche", "Férié", "Fermeture estivale", "Service terminé"
  items: MenuItem[];
  lines?: {
    name: string;
    items: MenuItem[];
  }[];
}

export interface CampusRestaurant {
  id: RestaurantId;
  name: string; // e.g. "Restaurant INSA (RI)", "Pizzeria L'Olivier", "RU Puvis de Chavannes"
  type: RestaurantType;
  affluenceLevel: AffluenceLevel;
  affluenceDescription?: string; // e.g. "< 5 min d'attente", "15-20 min d'attente"
  openingHours?: {
    lunch?: string;
    dinner?: string;
  };
  location?: string;
  crousId?: number;
  menus: MealMenu[];
}

export interface DiningFilterOptions {
  date?: string;
  mealType?: 'lunch' | 'dinner';
  labels?: DietaryLabel[];
  restaurantId?: RestaurantId;
}
