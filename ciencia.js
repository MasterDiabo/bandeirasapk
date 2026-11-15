// =====================================================================
//  Árvore de ciência (proposta para afinar)
//  Até ao nível 10 do jogador é básica e IGUAL PARA TODOS (as fações ainda não contam).
//  Três ramos, cada um até ao nível 5, com ganhos pequenos (quase não se notam um a um).
//  Paga-se com 🔬 ciência (escolas e bibliotecas). Uma investigação de cada vez,
//  à parte das construções (pode investigar-se e construir ao mesmo tempo).
// =====================================================================

const NIVEL_MAX_RAMO = 5;

// Custo e tempo de cada nível (iguais nos três ramos) · nivelJogador = nível mínimo do jogador
const NIVEIS_CIENCIA = [
  { nivelJogador: 1, ciencia: 25,  horas: 4 },
  { nivelJogador: 2, ciencia: 50,  horas: 12 },
  { nivelJogador: 4, ciencia: 100, horas: 24 },
  { nivelJogador: 6, ciencia: 175, horas: 48 },
  { nivelJogador: 8, ciencia: 250, horas: 96 },
];

// Efeito de cada ramo: `niveis[n-1]` = efeito total quando o ramo está no nível n
const RAMOS_CIENCIA = {
  vigor: {
    nome: 'Vigor', icone: '💪',
    descricao: 'Ao roubar um BAÚ, chance de levar também 5% do ouro ou 10% da comida do frigorífico.',
    // chance (só quando o roubo escolhido é um baú)
    niveis: [0.02, 0.04, 0.06, 0.08, 0.10],
    extra: { ouro: 0.05, comidaFrigorifico: 0.10 },   // leva UMA destas, à sorte
  },
  folego: {
    nome: 'Fôlego', icone: '⚡',
    descricao: 'Recupera mais energia por hora quando está em casa.',
    // energia recuperada por hora em casa (sem ciência: REGEN_BASE = 1)
    niveis: [1.2, 1.4, 1.6, 1.8, 2],
  },
  economia: {
    nome: 'Economia', icone: '📈',
    descricao: 'As construções custam menos ouro; no nível 5 também −5% de pedra, madeira e ferro.',
    // desconto nas construções (não conta na compra de baús)
    niveis: [
      { descontoOuro: 0.02, descontoMateriais: 0 },
      { descontoOuro: 0.04, descontoMateriais: 0 },
      { descontoOuro: 0.06, descontoMateriais: 0 },
      { descontoOuro: 0.08, descontoMateriais: 0 },
      { descontoOuro: 0.10, descontoMateriais: 0.05 },
    ],
  },
};

// Bónus total de um jogador. `niveis` = { vigor: 0..5, folego: 0..5, economia: 0..5 }
function bonusCiencia(niveis = {}) {
  const nv = id => niveis[id] || 0;
  const eco = nv('economia') ? RAMOS_CIENCIA.economia.niveis[nv('economia') - 1] : { descontoOuro: 0, descontoMateriais: 0 };
  return {
    chanceExtraRoubo: nv('vigor') ? RAMOS_CIENCIA.vigor.niveis[nv('vigor') - 1] : 0,
    regenEmCasa: nv('folego') ? RAMOS_CIENCIA.folego.niveis[nv('folego') - 1] : REGEN_BASE,
    descontoOuro: eco.descontoOuro,
    descontoMateriais: eco.descontoMateriais,
  };
}

// Custo de uma construção com o desconto da 📈 Economia
function custoComCiencia(custo, niveis) {
  const b = bonusCiencia(niveis);
  return Object.fromEntries(Object.entries(custo).map(([k, v]) =>
    [k, Math.ceil(v * (1 - (k === 'ouro' ? b.descontoOuro : b.descontoMateriais)))]));
}

// 💪 Vigor: depois de roubar um BAÚ, tenta levar um extra. `sorte1` decide se há extra, `sorte2` qual.
// `vitima` = { ouro, comidaFrigorifico } · devolve { ouro } ou { comida } ou null
function extraVigor(niveis, vitima, sorte1 = Math.random(), sorte2 = Math.random()) {
  const b = bonusCiencia(niveis), x = RAMOS_CIENCIA.vigor.extra;
  if (sorte1 >= b.chanceExtraRoubo) return null;
  return sorte2 < 0.5
    ? { ouro: Math.floor((vitima.ouro || 0) * x.ouro) }
    : { comida: Math.floor((vitima.comidaFrigorifico || 0) * x.comidaFrigorifico) };
}

// Próxima investigação possível num ramo (null se já está no máximo ou o jogador não tem nível)
function proximaCiencia(ramo, niveis, nivelJogador) {
  const atual = niveis[ramo] || 0;
  if (atual >= NIVEL_MAX_RAMO) return null;
  const nv = NIVEIS_CIENCIA[atual];
  return nivelJogador >= nv.nivelJogador ? { ramo, nivel: atual + 1, ...nv } : null;
}
