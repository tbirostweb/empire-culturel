<script setup>
// Rend un arbre technologique comme un VRAI arbre : les noeuds sont
// disposés par palier et reliés à leur parent par un tracé dessiné
// (`data/trees.js#parent`). La version précédente empilait juste des rangées
// « Palier 1 / Palier 2 » sans le moindre lien — visuellement une liste,
// pas un arbre (retour utilisateur).
//
// Les positions ne sont pas calculables à l'avance (largeur variable, retour
// à la ligne, tailles de police système) : on mesure les noeuds réellement
// rendus et on trace les liaisons dans un SVG superposé, remesuré à chaque
// changement de taille du conteneur.
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { describeEffect } from '../../data/trees.js';
import { useTreesStore } from '../../stores/trees.js';
import { usePlayerStore } from '../../stores/player.js';
import SkillNode from './SkillNode.vue';
import Modal from '../ui/Modal.vue';
import AppIcon from '../icons/AppIcon.vue';

const props = defineProps({
  tree: { type: Object, required: true }, // data/trees.js#TREES[id]
});

const trees = useTreesStore();
const player = usePlayerStore();
const selectedNodeId = ref(null);

const tiers = computed(() => {
  const byTier = new Map();
  for (const node of props.tree.noeuds) {
    if (!byTier.has(node.tier)) byTier.set(node.tier, []);
    byTier.get(node.tier).push(node);
  }
  return [...byTier.entries()].sort((a, b) => a[0] - b[0]);
});

// --- Tracé des liaisons parent -> enfant -----------------------------------
const canvasEl = ref(null);
const nodeEls = new Map();
const links = ref([]);
const size = ref({ w: 0, h: 0 });

function setNodeEl(id, el) {
  if (el) nodeEls.set(id, el);
  else nodeEls.delete(id);
}

function measure() {
  const root = canvasEl.value;
  if (!root) return;
  const base = root.getBoundingClientRect();
  size.value = { w: base.width, h: base.height };
  const next = [];
  for (const node of props.tree.noeuds) {
    if (!node.parent) continue;
    const childEl = nodeEls.get(node.id);
    const parentEl = nodeEls.get(node.parent);
    if (!childEl || !parentEl) continue;
    const c = childEl.getBoundingClientRect();
    const p = parentEl.getBoundingClientRect();
    // Du bas du parent au haut de l'enfant, en coordonnées locales.
    const x1 = p.left - base.left + p.width / 2;
    const y1 = p.top - base.top + p.height;
    const x2 = c.left - base.left + c.width / 2;
    const y2 = c.top - base.top;
    const mid = (y1 + y2) / 2;
    next.push({
      id: node.id,
      // Coude vertical/horizontal/vertical : lit "circuit", plus net qu'une
      // courbe sur des paliers alignés.
      d: `M ${x1} ${y1} L ${x1} ${mid} L ${x2} ${mid} L ${x2} ${y2}`,
      // La liaison ne devient pleine que quand l'enfant est réellement
      // débloqué, donc quand le parent est AU MAX (cf. stores/trees.js) —
      // pas dès son premier rang, sinon le trait promettait un accès que
      // la règle refusait encore.
      unlocked: trees.isNodeUnlocked(node.id),
    });
  }
  links.value = next;
}

let observer = null;
onMounted(() => {
  observer = new ResizeObserver(() => measure());
  if (canvasEl.value) observer.observe(canvasEl.value);
  nextTick(measure);
});
onBeforeUnmount(() => observer?.disconnect());
// Remesurer quand l'arbre affiché change, et retracer quand un achat modifie
// l'état débloqué/verrouillé d'une liaison.
watch(() => props.tree.id, () => nextTick(measure));
watch(() => trees.ranks, () => nextTick(measure), { deep: true });

// --- Achat -----------------------------------------------------------------
const selectedNode = computed(() => props.tree.noeuds.find((n) => n.id === selectedNodeId.value) ?? null);
const selectedCost = computed(() => (selectedNode.value ? trees.nextCost(selectedNode.value.id) : null));
const selectedRank = computed(() => (selectedNode.value ? trees.rankOf(selectedNode.value.id) : 0));
const selectedUnlocked = computed(() => (selectedNode.value ? trees.isNodeUnlocked(selectedNode.value.id) : true));
// Le parent d'un noeud verrouillé, avec sa progression : le message d'aide
// doit dire combien de rangs il reste à finir, pas seulement lequel acheter
// (la règle exige le rang MAX du parent, cf. stores/trees.js).
const selectedParent = computed(() => {
  const parentId = selectedNode.value?.parent;
  if (!parentId) return null;
  const parent = props.tree.noeuds.find((n) => n.id === parentId);
  if (!parent) return null;
  return { nom: parent.nom, rank: trees.rankOf(parentId), maxRank: parent.maxRank };
});
const canAffordSelected = computed(() => selectedCost.value !== null && player.resources.pointsTech >= selectedCost.value);
const justConfirmed = ref(false);

function openNode(nodeId) {
  justConfirmed.value = false;
  selectedNodeId.value = nodeId;
}
function closeModal() {
  selectedNodeId.value = null;
}
function confirmPurchase() {
  if (!selectedNode.value) return;
  if (trees.acheterNoeud(selectedNode.value.id)) justConfirmed.value = true;
}
</script>

<template>
  <div class="space-y-4">
    <p class="text-sm text-ink-soft">{{ tree.description }}</p>

    <div ref="canvasEl" class="tree-canvas">
      <svg class="tree-links" :viewBox="`0 0 ${size.w} ${size.h}`" :width="size.w" :height="size.h" aria-hidden="true">
        <path
          v-for="link in links"
          :key="link.id"
          :d="link.d"
          fill="none"
          :stroke="link.unlocked ? 'var(--color-encre)' : 'var(--color-liseret)'"
          :stroke-dasharray="link.unlocked ? '0' : '4 4'"
          stroke-width="2"
        />
      </svg>

      <div v-for="[tier, nodes] in tiers" :key="tier" class="tree-tier">
        <SkillNode
          v-for="node in nodes"
          :key="node.id"
          :ref="(el) => setNodeEl(node.id, el?.$el ?? el)"
          :node="node"
          :rank="trees.rankOf(node.id)"
          :cost="trees.nextCost(node.id)"
          :locked="!trees.isNodeUnlocked(node.id)"
          @select="openNode(node.id)"
        />
      </div>
    </div>

    <Modal v-if="selectedNode" :title="selectedNode.nom" @close="closeModal">
      <div class="space-y-3">
        <p class="tabular text-xs text-ink-faint">Rang {{ selectedRank }}/{{ selectedNode.maxRank }}</p>
        <p class="text-sm">
          {{ justConfirmed ? 'Déjà amélioré ! Prochain rang :' : 'Ce noeud améliore :' }}
          <span class="font-semibold">{{ describeEffect(selectedNode.effect) }}</span>
        </p>

        <p v-if="!selectedUnlocked && selectedParent" class="flex items-start gap-1.5 text-sm text-danger">
          <AppIcon name="lock" class="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Verrouillé — monte « {{ selectedParent.nom }} » au rang maximum
            ({{ selectedParent.rank }}/{{ selectedParent.maxRank }}).
          </span>
        </p>
        <template v-else>
          <p v-if="selectedCost !== null" class="tabular text-sm text-ink-soft">
            Coût du prochain rang : {{ selectedCost }} Points technologie
          </p>
          <p v-else class="text-sm text-succes">Rang maximum atteint.</p>

          <button v-if="selectedCost !== null" type="button" class="btn-primary w-full" :disabled="!canAffordSelected" @click="confirmPurchase">
            {{ canAffordSelected ? `Confirmer (-${selectedCost} Points techno)` : 'Pas assez de Points technologie' }}
          </button>
          <p v-if="justConfirmed" class="text-center text-xs text-succes">Amélioration confirmée !</p>
        </template>
      </div>
    </Modal>
  </div>
</template>

<style scoped>
.tree-canvas {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2.25rem; /* laisse la place au coude de liaison entre deux paliers */
  padding: 0.5rem 0;
}
.tree-links {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.tree-tier {
  position: relative;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1.5rem;
}
</style>
