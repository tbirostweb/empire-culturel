<script setup>
// Rendu 3D d'un monument à partir de son fichier GLB (cf. data/monuments.js#glb
// et app/public/models/monuments/).
//
// UN SEUL contexte WebGL pour toute l'application, partagé par toutes les
// tuiles (cf. renderer partagé plus bas) : chaque tuile n'expose qu'un canvas
// 2D dans lequel on recopie le rendu. La version précédente créait un contexte
// WebGL PAR tuile ; avec 12 tuiles dans la grille, ouvrir une modale de détail
// (qui démonte la grille et monte une 13e tuile) déclenchait une vague de
// libérations/créations de contextes que le navigateur ne suit pas de façon
// synchrone : la modale s'ouvrait sur un cadre vide, et un simple
// rechargement à chaud (HMR) suffisait à faire disparaître les 12 tuiles d'un
// coup. `forceContextLoss()` + un délai d'une frame ne fiabilisaient pas ça
// (il fallait ~250ms, inacceptable à l'affichage). Un contexte unique supprime
// la classe de bug entière, et lève au passage la limite qui empêchait de
// faire grossir le catalogue.
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RARITY_COLORS } from '../../data/rarity.js';

const props = defineProps({
  def: { type: Object, required: true },
});

const color = computed(() => RARITY_COLORS[props.def.rarete]);
// Fond de vignette "calque de plan" : bleu foncé + une TRAME QUADRILLÉE dont
// la couleur est la teinte de rareté à faible opacité — la rareté se lit à la
// couleur du quadrillage, cohérent avec la grille de plan du fond global, sans
// aucun effet "spotlight" (explicitement refusé par l'utilisateur). Le monument
// 3D se détache par-dessus comme une pièce tracée sur le calque.
const cardBackground = computed(
  () => `linear-gradient(color-mix(in srgb, ${color.value} 22%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, ${color.value} 22%, transparent) 1px, transparent 1px),
    color-mix(in srgb, ${color.value} 12%, var(--color-fond))`,
);
const cardBackgroundSize = '14px 14px, 14px 14px, auto';

// Part du cadre que le monument doit occuper À L'ÉCRAN, mesurée sur la
// projection réelle (pas sur une règle géométrique approchée) — cf.
// fitAndGround. Laisse une marge d'air autour, comme une pièce exposée dans
// une vitrine, sans pour autant réduire les monuments larges et bas (Colisée,
// Angkor Wat...) à une miniature perdue au centre.
const FILL_RATIO = 0.86;
const CAMERA_FOV = 38;
const CAMERA_DISTANCE = 3.2;
// Nombre d'orientations testées pendant le cadrage : le modèle tourne en
// continu, son emprise à l'écran varie donc avec l'angle. On cadre sur l'angle
// le plus défavorable pour qu'il ne déborde jamais en tournant.
const SPIN_SAMPLES = 12;
const FIT_ITERATIONS = 6;

// --- Renderer WebGL partagé (module, pas par instance) ---------------------
// `preserveDrawingBuffer` est nécessaire : on recopie le canvas WebGL vers le
// canvas 2D de chaque tuile après chaque rendu.
const instances = new Set();
let sharedRenderer = null;
let sharedLoopId = null;
let sharedWidth = 0;
let sharedHeight = 0;

function sharedRendererInstance() {
  if (!sharedRenderer) {
    sharedRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true });
    sharedRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  }
  return sharedRenderer;
}

function sharedLoop() {
  sharedLoopId = requestAnimationFrame(sharedLoop);
  instances.forEach((inst) => inst.renderFrame());
}

function registerInstance(inst) {
  instances.add(inst);
  if (sharedLoopId === null) sharedLoop();
}

function unregisterInstance(inst) {
  instances.delete(inst);
  if (instances.size === 0 && sharedLoopId !== null) {
    cancelAnimationFrame(sharedLoopId);
    sharedLoopId = null;
  }
}

// --- Instance ---------------------------------------------------------------
const canvasEl = ref(null);
const loadFailed = ref(false);
const loader = new GLTFLoader();
let ctx2d = null;
let scene = null;
let camera = null;
// `spinner` porte la rotation, `model` porte l'échelle et le recentrage.
// Les deux DOIVENT rester séparés : cf. fitAndGround / renderFrame.
let spinner = null;
let model = null;
let shadowMesh = null;
let resizeObserver = null;
let spinSpeed = 0.006;
let instanceHandle = null;

function createShadowTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,0.35)');
  gradient.addColorStop(0.7, 'rgba(0,0,0,0.12)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Un mesh est écarté du cadrage (et masqué) seulement s'il s'agit vraiment
// d'une dalle de sol/terrain incluse dans l'export — rencontré sur
// Neuschwanstein ("Low Poly Castle.glb") : un disque plat ~4x plus large que
// le château, qui écrasait le cadrage du vrai monument.
//
// Les deux tests doivent passer ENSEMBLE, et tous deux se comparent au RESTE
// du modèle, jamais à une médiane par mesh. Une médiane est le mauvais repère
// ici : sur un modèle très découpé, la majorité des mesh sont de petits
// détails, donc la médiane est minuscule et toute pièce structurelle majeure
// la dépasse largement. Bug réel corrigé : la règle précédente (empreinte >
// 4x la médiane) masquait la nef de Notre-Dame, les plateformes d'Angkor Wat
// et le socle du Parthénon — ces monuments n'apparaissaient plus que comme
// une poignée de flèches éparses — et désignait même la Tour Eiffel entière
// comme un "socle".
const GROUND_DOMINANCE = 3;   // dépasse à lui seul 3x l'empreinte de tout le reste
const GROUND_FLATNESS = 0.15; // et reste plat : hauteur < 15% de sa propre empreinte

// Teinte de repli pour les modèles SANS aucune source de couleur exploitable.
// Trois cas réels dans le catalogue, tous rendus en blanc pur :
//   - `angkor-wat.glb` et `tower-bridge.glb` n'ont ni texture, ni couleur de
//     matériau (baseColorFactor blanc), ni couleur de sommet ;
//   - `machu-picchu.glb` porte ses textures via l'extension
//     `KHR_materials_pbrSpecularGlossiness`, que three.js ne supporte PLUS
//     depuis plusieurs versions (0 occurrence dans GLTFLoader en 0.185) :
//     les 3 textures sont ignorées en silence, sans le moindre avertissement.
// Un blanc pur sous une lumière directe sature et donne une silhouette
// illisible. Une pierre chaude fait lire "maquette de musée" plutôt que
// "texture manquante", et ne dégrade rien pour les modèles corrects,
// puisqu'on ne touche QUE ceux qui n'ont aucune couleur.
const FALLBACK_STONE = 0xc9b79a;

function isColorless(material) {
  if (!material) return false;
  // Une texture, quelle qu'elle soit, suffit à considérer le matériau comme
  // porteur de couleur.
  if (material.map || material.emissiveMap) return false;
  if (material.vertexColors) return false;
  const c = material.color;
  // Blanc (ou quasi) = aucune information de couleur propre.
  return !c || (c.r > 0.94 && c.g > 0.94 && c.b > 0.94);
}

// Applique le repli uniquement si TOUT le modèle est incolore. Un modèle dont
// une seule pièce est blanche (un dôme, une statue) est parfaitement légitime
// et ne doit pas être repeint.
function applyFallbackTint(object) {
  const mats = [];
  object.traverse((child) => {
    if (!child.isMesh) return;
    const list = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of list) if (m) mats.push(m);
  });
  if (mats.length === 0 || !mats.every(isColorless)) return;
  for (const m of mats) {
    m.color?.setHex(FALLBACK_STONE);
    m.needsUpdate = true;
  }
}

function boxOf(meshes) {
  // Recalculée à la demande, jamais mise en cache : dépend de la matrice monde
  // courante de chaque mesh au moment de l'appel.
  const b = new THREE.Box3();
  for (const m of meshes) b.union(new THREE.Box3().setFromObject(m));
  return b;
}

function horizontalFootprint(box) {
  const s = box.getSize(new THREE.Vector3());
  return Math.hypot(s.x, s.z);
}

// Cadre le modèle et le pose sur un "sol" virtuel (y=0), comme une pièce de
// musée sur un socle.
//
// Le cadrage est résolu sur la PROJECTION RÉELLE à l'écran, itérativement, et
// non par une règle géométrique approchée (ancienne version : diagonale
// horizontale rapportée à la taille du frustum). Cette approximation était très
// pessimiste pour les monuments larges et bas vus en plongée — le Colisée,
// Chichen Itza ou Angkor Wat n'occupaient plus que ~16% de la hauteur de leur
// carte, là où Big Ben en remplissait 62%. Mesurer la projection donne un
// remplissage homogène quel que soit le gabarit.
function fitAndGround(object) {
  // Repart d'une transform neutre avant de mesurer : certains exports GLTF
  // posent une transform non-identité sur le noeud racine, et mesurer/corriger
  // par-dessus une transform déjà en place fausserait le calcul.
  spinner.rotation.y = 0;
  object.position.set(0, 0, 0);
  object.scale.setScalar(1);
  object.rotation.set(0, 0, 0);
  spinner.updateMatrixWorld(true);

  const allMeshes = [];
  object.traverse((child) => {
    if (child.isMesh) {
      child.visible = true;
      allMeshes.push(child);
    }
  });
  if (allMeshes.length === 0) return;

  const boxes = allMeshes.map((m) => new THREE.Box3().setFromObject(m));
  allMeshes.forEach((mesh, i) => {
    if (allMeshes.length < 2) return;
    const rest = new THREE.Box3();
    boxes.forEach((b, j) => {
      if (j !== i) rest.union(b);
    });
    const restFootprint = horizontalFootprint(rest);
    const ownFootprint = horizontalFootprint(boxes[i]);
    const ownHeight = boxes[i].max.y - boxes[i].min.y;
    if (restFootprint > 0 && ownFootprint > restFootprint * GROUND_DOMINANCE && ownHeight < ownFootprint * GROUND_FLATNESS) {
      mesh.visible = false;
    }
  });
  const visible = allMeshes.filter((m) => m.visible);
  const framed = visible.length > 0 ? visible : allMeshes;

  // Recentre le modèle sur l'axe de rotation et le pose au sol.
  // IMPORTANT : mesurer APRÈS avoir appliqué l'échelle, jamais avant.
  // `object.position` est un décalage appliqué APRÈS la mise à l'échelle de la
  // géométrie locale (ordre Three.js : monde = position + rotation×échelle×local)
  // — un centrage mesuré sur la boîte non échelonnée ne correspond plus au vrai
  // centre une fois le modèle réduit. Le `updateMatrixWorld(true)` explicite est
  // tout aussi indispensable : `Box3.setFromObject` sur un mesh enfant ne
  // recalcule QUE la matrice de ce mesh et réutilise la matrice-monde DÉJÀ EN
  // CACHE de son parent, donc sans ça la mesure resterait basée sur l'échelle
  // précédente (le rendu, lui, reste correct — Three.js recalcule tout avant
  // chaque frame, mais PAS les mesures qu'on fait nous-mêmes entre deux frames).
  const applyScale = (scale) => {
    object.position.set(0, 0, 0);
    object.scale.setScalar(scale);
    spinner.updateMatrixWorld(true);
    const box = boxOf(framed);
    const center = box.getCenter(new THREE.Vector3());
    object.position.x -= center.x;
    object.position.z -= center.z;
    object.position.y -= box.min.y;
    spinner.updateMatrixWorld(true);
    return boxOf(framed);
  };

  // Emprise à l'écran la plus défavorable sur un tour complet : le modèle
  // tourne en continu, il doit rester cadré à TOUS les angles.
  const worstOnScreenExtent = () => {
    let extent = 0;
    for (let s = 0; s < SPIN_SAMPLES; s++) {
      spinner.rotation.y = (s / SPIN_SAMPLES) * Math.PI * 2;
      spinner.updateMatrixWorld(true);
      const box = boxOf(framed);
      for (let corner = 0; corner < 8; corner++) {
        const v = new THREE.Vector3(
          corner & 1 ? box.max.x : box.min.x,
          corner & 2 ? box.max.y : box.min.y,
          corner & 4 ? box.max.z : box.min.z,
        ).project(camera);
        extent = Math.max(extent, Math.abs(v.x), Math.abs(v.y));
      }
    }
    spinner.rotation.y = 0;
    spinner.updateMatrixWorld(true);
    return extent;
  };

  // Point de départ : ramène le modèle à une taille de l'ordre de l'unité,
  // quelle que soit l'unité d'origine de l'export (les GLB fournis vont de 0.5
  // à 33 000 unités de haut). Les itérations convergent ensuite vite, la
  // projection perspective n'étant pas linéaire en l'échelle.
  const baseSize = boxOf(framed).getSize(new THREE.Vector3());
  let scale = 1 / (Math.max(baseSize.x, baseSize.y, baseSize.z) || 1);
  for (let i = 0; i < FIT_ITERATIONS; i++) {
    const box = applyScale(scale);
    camera.lookAt(0, (box.max.y - box.min.y) * 0.5, 0);
    camera.updateMatrixWorld(true);
    const extent = worstOnScreenExtent();
    if (!Number.isFinite(extent) || extent <= 0) break;
    scale *= FILL_RATIO / extent;
  }

  const finalBox = applyScale(scale);
  camera.lookAt(0, (finalBox.max.y - finalBox.min.y) * 0.5, 0);
  camera.updateMatrixWorld(true);

  shadowMesh.scale.setScalar(horizontalFootprint(finalBox) * 1.05);
  shadowMesh.position.y = 0.002;
}

function disposeModel() {
  if (!model) return;
  spinner.remove(model);
  model.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose();
      const mats = Array.isArray(child.material) ? child.material : [child.material];
      mats.forEach((m) => m?.dispose());
    }
  });
  model = null;
}

// Chargement DIFFÉRÉ jusqu'à ce que la tuile approche de l'écran.
// Indispensable depuis que le catalogue a grossi : la grille de Collection
// monte toutes les tuiles d'un coup, et charger l'intégralité des modèles
// représentait ~74 Mo de téléchargement au premier affichage. Avec une
// grille à 3 colonnes, seule une dizaine de modèles part réellement, puis le
// reste suit au défilement. `rootMargin` généreux pour que le modèle soit
// prêt avant d'entrer dans le champ, sans à-coup visible.
let io = null;
let pendingGlb = null;
function loadWhenVisible(glbFile) {
  pendingGlb = glbFile;
  const el = canvasEl.value;
  if (!el) return;
  io?.disconnect();
  // Pas d'IntersectionObserver (très vieux navigateur) : on charge tout de
  // suite plutôt que de ne jamais rien afficher.
  if (typeof IntersectionObserver === 'undefined') {
    loadModel(glbFile);
    return;
  }
  io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io?.disconnect();
      io = null;
      if (pendingGlb) loadModel(pendingGlb);
    },
    { rootMargin: '400px' },
  );
  io.observe(el);
}

function loadModel(glbFile) {
  loadFailed.value = false;
  const url = `/models/monuments/${glbFile}`;
  loader.load(
    url,
    (gltf) => {
      if (!spinner) return;
      disposeModel();
      model = gltf.scene;
      applyFallbackTint(model);
      spinner.add(model);
      fitAndGround(model);
    },
    undefined,
    // Sans ce callback d'erreur, un GLB qui échoue à charger (404, coupé en
    // cours de téléchargement, timeout d'un proxy...) laissait la carte
    // silencieusement vide, sans le moindre message en console — piège
    // rencontré en prod alors que tout se chargeait sans souci en dev.
    (err) => {
      loadFailed.value = true;
      console.error(`[MonumentModel] échec du chargement de ${url}`, err);
    },
  );
}

function syncSize() {
  const el = canvasEl.value;
  const parent = el?.parentElement;
  if (!el || !parent || !camera) return;
  const width = parent.clientWidth;
  const height = parent.clientHeight;
  // Le conteneur peut ne pas encore avoir de taille au tout premier appel
  // (modale encore en transition d'ouverture, etc.) — un repli sur 1px donnait
  // un ratio caméra absurde qui restait figé dans le cadrage. Mieux vaut ne
  // rien faire tant que la taille réelle n'est pas disponible.
  if (!width || !height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  el.width = Math.round(width * ratio);
  el.height = Math.round(height * ratio);
  const aspectChanged = camera.aspect !== width / height;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  // Le cadrage dépend du ratio caméra : le recalculer à chaque changement de
  // ratio, pas seulement au chargement, pour rester correct quelle que soit la
  // taille du conteneur (grille en 3:4, en-tête de détail en format large...).
  if (aspectChanged && model) fitAndGround(model);
}

// Appelée par la boucle partagée, une fois par frame et par instance montée.
function renderFrame() {
  const el = canvasEl.value;
  if (!el || !ctx2d || !model || !el.width || !el.height) return;
  // Rien à dessiner si le canvas n'a plus de boîte de layout (parent en
  // `display:none`) : la grille de collection reste MONTÉE derrière la
  // modale de détail pour ne pas perdre la position de défilement, il ne
  // faut simplement pas continuer à rendre ses 12 modèles pour rien.
  if (!el.clientWidth || !el.clientHeight) return;
  // Tourner `spinner` et non `model` : la rotation s'applique autour de
  // l'origine locale de l'objet tourné. Le recentrage vit sur `model.position`,
  // donc faire tourner `model` lui-même le faisait orbiter autour d'un point
  // excentré au lieu de pivoter sur place. Bug réel corrigé : la Tour Eiffel
  // (dont l'origine d'export est très loin de son centre) sortait complètement
  // du cadre à chaque tour.
  if (spinSpeed) spinner.rotation.y += spinSpeed;

  const renderer = sharedRendererInstance();
  if (sharedWidth !== el.width || sharedHeight !== el.height) {
    // `setSize` attend des pixels CSS et applique lui-même le pixelRatio.
    const ratio = renderer.getPixelRatio();
    renderer.setSize(el.width / ratio, el.height / ratio, false);
    sharedWidth = el.width;
    sharedHeight = el.height;
  }
  renderer.render(scene, camera);
  ctx2d.clearRect(0, 0, el.width, el.height);
  ctx2d.drawImage(renderer.domElement, 0, 0, el.width, el.height);
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) spinSpeed = 0;

  ctx2d = canvasEl.value.getContext('2d');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.01, 100);
  camera.position.set(CAMERA_DISTANCE * 0.32, CAMERA_DISTANCE * 0.5, CAMERA_DISTANCE * 0.88);
  spinner = new THREE.Group();
  scene.add(spinner);

  scene.add(new THREE.HemisphereLight(0xfff4e0, 0x201406, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 1.3);
  key.position.set(3, 5, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xcfe0ff, 0.45);
  fill.position.set(-3, 2, -2);
  scene.add(fill);

  const shadowMat = new THREE.MeshBasicMaterial({ map: createShadowTexture(), transparent: true, depthWrite: false });
  shadowMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  scene.add(shadowMesh);

  syncSize();
  loadWhenVisible(props.def.glb);
  resizeObserver = new ResizeObserver(syncSize);
  resizeObserver.observe(canvasEl.value.parentElement);
  instanceHandle = { renderFrame };
  registerInstance(instanceHandle);
});

watch(
  () => props.def.glb,
  (glb) => loadWhenVisible(glb),
);

onBeforeUnmount(() => {
  if (instanceHandle) unregisterInstance(instanceHandle);
  resizeObserver?.disconnect();
  io?.disconnect();
  io = null;
  disposeModel();
  shadowMesh?.material?.map?.dispose();
  shadowMesh?.material?.dispose();
  shadowMesh?.geometry?.dispose();
  spinner = null;
  scene = null;
  camera = null;
  ctx2d = null;
});
</script>

<template>
  <div class="monument-model" :style="{ '--rarity-color': color, background: cardBackground, backgroundSize: cardBackgroundSize }">
    <canvas v-show="!loadFailed" ref="canvasEl" class="monument-model-canvas" />
    <div v-if="loadFailed" class="monument-model-fallback">
      <span class="monument-model-fallback-dot" />
      <span class="monument-model-fallback-label">{{ def.nom }}</span>
    </div>
  </div>
</template>

<style scoped>
.monument-model {
  position: absolute;
  inset: 0;
}
.monument-model-canvas {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
}
.monument-model-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  text-align: center;
}
.monument-model-fallback-dot {
  height: 0.75rem;
  width: 0.75rem;
  border-radius: 9999px;
  background: var(--rarity-color);
  opacity: 0.7;
}
.monument-model-fallback-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-ink-soft);
}
</style>
