<script setup>
import { computed } from 'vue';
import {
  PhAirplaneTilt,
  PhArrowsClockwise,
  PhArrowUp,
  PhBackpack,
  PhBank,
  PhBinoculars,
  PhCalendarBlank,
  PhBookOpen,
  PhBuildings,
  PhCaretLeft,
  PhCaretRight,
  PhCastleTurret,
  PhChartLineUp,
  PhCheck,
  PhCircle,
  PhClock,
  PhCoin,
  PhColumns,
  PhCompass,
  PhCrown,
  PhDiamond,
  PhFarm,
  PhFeather,
  PhFlagBanner,
  PhFlame,
  PhGift,
  PhGlobeHemisphereWest,
  PhHandCoins,
  PhHeart,
  PhHexagon,
  PhHourglass,
  PhKeyhole,
  PhLightning,
  PhLock,
  PhMapPin,
  PhMedal,
  PhMountains,
  PhPackage,
  PhPencilSimple,
  PhPlus,
  PhRanking,
  PhScroll,
  PhSealCheck,
  PhShield,
  PhSparkle,
  PhSpiral,
  PhSquaresFour,
  PhStack,
  PhStar,
  PhStarFour,
  PhStorefront,
  PhSun,
  PhSword,
  PhTarget,
  PhTicket,
  PhTreasureChest,
  PhTreeStructure,
  PhTrendUp,
  PhTrophy,
  PhUser,
  PhVault,
  PhWaves,
  PhX,
} from '@phosphor-icons/vue';

// Phosphor (phosphoricons.com), en poids `regular` par défaut : un trait
// d'épaisseur uniforme, comme un dessin à l'encre dans un carnet. Le poids
// `duotone` précédent (deux tons, avec un aplat translucide sous le trait)
// jurait avec la direction "carnet de voyage" — c'est un rendu d'interface
// logicielle, pas de trait tracé. Le poids reste surchargeable au cas par
// cas via la prop `weight` (la tab bar passe `fill` sur l'onglet actif).
// Un seul composant dynamique, un seul mapping nom -> composant, aucune
// branche `v-else-if` (évite le piège d'attrs-fallthrough Vue déjà
// rencontré sur une ancienne version SVG maison de ce fichier).
const ICONS = {
  collection: PhSquaresFour,
  tree: PhTreeStructure,
  shop: PhStorefront,
  profile: PhUser,
  coin: PhCoin,
  gem: PhDiamond,
  sparkles: PhSparkle,
  flame: PhFlame,
  trophy: PhTrophy,
  shield: PhShield,
  sword: PhSword,
  heart: PhHeart,
  bolt: PhLightning,
  lock: PhLock,
  check: PhCheck,
  close: PhX,
  'chevron-right': PhCaretRight,
  'chevron-left': PhCaretLeft,
  star: PhStar,
  plus: PhPlus,
  pencil: PhPencilSimple,
  pack: PhPackage,
  package: PhPackage,
  book: PhBookOpen,
  crown: PhCrown,
  farm: PhFarm,
  landmark: PhBank,
  ranking: PhRanking,
  treasure: PhTreasureChest,
  vault: PhVault,
  medal: PhMedal,

  // Échelle de RARETÉ : la charge visuelle du pictogramme monte avec le
  // palier (rond nu -> hexagone -> gemme -> éclat -> étoile -> couronne).
  // Redonde volontairement la couleur : sur une grille, la forme se lit
  // avant la teinte, et ça reste lisible pour un daltonien.
  'rarity-commun': PhCircle,
  'rarity-peu_commun': PhHexagon,
  'rarity-rare': PhDiamond,
  'rarity-epique': PhStarFour,
  'rarity-legendaire': PhStar,
  'rarity-mythique': PhCrown,
  // Un trou de serrure et non une 7e forme "plus chargée" : `secret` est une
  // catégorie à part, pas un cran de plus sur l'échelle (cf. data/rarity.js).
  'rarity-secret': PhKeyhole,
  keyhole: PhKeyhole,

  // RÉGIONS (data/monuments.js#REGIONS).
  'region-europe': PhCastleTurret,
  'region-asie': PhMountains,
  'region-amerique': PhCompass,
  'region-afrique': PhSun,
  'region-oceanie': PhWaves,

  // ÉPOQUES (data/monuments.js#EPOQUES).
  'epoque-antiquite': PhColumns,
  'epoque-moyen_age': PhScroll,
  'epoque-renaissance': PhFeather,
  'epoque-moderne': PhBuildings,
  'epoque-contemporain': PhAirplaneTilt,

  // Mécaniques : expéditions, événements/sets, rivalités
  expedition: PhBinoculars,
  backpack: PhBackpack,
  compass: PhCompass,
  flag: PhFlagBanner,
  calendar: PhCalendarBlank,
  event: PhCalendarBlank,
  set: PhStack,
  sets: PhStack,
  globe: PhGlobeHemisphereWest,
  rivalry: PhSword,
  refresh: PhArrowsClockwise,
  prestige: PhSpiral,
  'arrow-up': PhArrowUp,
  sealcheck: PhSealCheck,

  // Divers
  pin: PhMapPin,
  clock: PhClock,
  hourglass: PhHourglass,
  gift: PhGift,
  ticket: PhTicket,
  target: PhTarget,
  trend: PhTrendUp,
  chart: PhChartLineUp,
  income: PhHandCoins,
};

const props = defineProps({
  name: { type: String, required: true },
  weight: { type: String, default: 'regular' },
});

const icon = computed(() => ICONS[props.name] ?? PhStar);
</script>

<template>
  <component :is="icon" :weight="weight" />
</template>
