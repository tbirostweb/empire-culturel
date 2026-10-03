// Retour haptique (LOT 3, "juice transversal") : Vibration API standard du
// navigateur, no-op silencieux si absente (iOS Safari/desktop ne
// l'exposent pas) — pas de dépendance @capacitor/haptics ici. L'app tourne
// d'abord comme PWA web ; les coquilles Capacitor Android/iOS restent hors
// sujet du canal de distribution principal (cf. CLAUDE.md), donc pas de
// dépendance native ajoutée seulement pour elles. À réévaluer si ces
// coquilles redeviennent un canal prioritaire.
const PATTERNS = { light: 10, medium: 20, heavy: [30, 30, 30] };

export function haptic(style = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  navigator.vibrate(PATTERNS[style] ?? PATTERNS.light);
}
