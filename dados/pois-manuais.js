// POIs acrescentados à mão (não estão no OpenStreetMap, ou são escolhas de design).
// Cada um usa as regras da categoria indicada em `cat` (ver categorias.js).
const POIS_MANUAIS = [
  { id: 'cupastone',         nome: 'Cupastone',                  cat: 'pedra',     lat: 38.866247, lng: -9.323293 },
  { id: 'asb',               nome: 'Serralharia ASB (Sobreiro)', cat: 'metal',     lat: 38.960359, lng: -9.347669 },
  { id: 'miradouro-lizandro', nome: 'Miradouro do Lizandro',     cat: 'monumento', lat: 38.944813, lng: -9.414583 },
  { id: 'pena',              nome: 'Palácio da Pena',            cat: 'monumento', lat: 38.787568, lng: -9.390565 },
  { id: 'castelo-torres-vedras', nome: 'Castelo de Torres Vedras', cat: 'monumento', lat: 39.094684, lng: -9.261112 },
  { id: 'cruzamento-negro',  nome: 'Cruzamento Negro',           cat: 'comida',    lat: 39.121733, lng: -9.368869 },
];

// POIs do OpenStreetMap a excluir à mão (id OSM: n = ponto, w = área/linha, r = relação) e o porquê
const POIS_EXCLUIDOS = {
  'n12753993349': 'Ponto repetido da Paisagem Cultural de Sintra (a área completa já entra como monumento grande)',
};
