// src/lib/problems-data/problemsStore.js
const modules = import.meta.glob('$lib/data/*.json', { eager: true });
export const problemsByUnit = {};
for (const path in modules) {
    const unitId = path.split('/').pop().replace('.json', '');
    problemsByUnit[unitId] = modules[path].default;
}
console.log('[problemsStore.js] problemsByUnit after load:', problemsByUnit); // ★追加★