// =====================================================================
//  Fações, casa e construções — regras e números (proposta para afinar)
//  Ideia de equilíbrio: ouro e comida sobram; pedra, ferro e madeira são raros.
//  Por isso as construções custam sobretudo ouro e poucos materiais, e a lentidão
//  vem dos TEMPOS de construção (uma obra de cada vez).
// =====================================================================

// ---- Fações ---------------------------------------------------------
// Escolhe-se ao criar o personagem; pode mudar-se livremente até ao nível 10.
// As diferenças só contam A PARTIR do nível 10: multiplicam o custo das construções.
const NIVEL_FACAO_FIXA = 10;
const FACOES = {
  humanos: {
    nome: 'Humanos', icone: '🌾', lema: 'Agricultura e produção',
    custo: { ouro: 1, pedra: 1.25, ferro: 1.25, madeira: 1 },
  },
  elfos: {
    nome: 'Elfos', icone: '🌿', lema: 'Natureza',
    custo: { ouro: 1, pedra: 1.25, ferro: 1, madeira: 1.25 },
  },
  gnomos: {
    nome: 'Gnomos', icone: '💰', lema: 'Comércio',
    custo: { ouro: 1.5, pedra: 0.75, ferro: 0.75, madeira: 0.75 },
  },
};

// ---- Alegria ----------------------------------------------------------
// Não se acumula: é a soma dos bónus ativos NESTE momento, com máximo 10.
// Cada fonte conta uma vez só (dois monumentos grandes dão +1, não +2).
const ALEGRIA_MAXIMA = 10;

// ---- Armazenamento ---------------------------------------------------------
// O que passar do limite perde-se. Os espaços SOMAM-SE:
//   mochila (sempre) + casa (quando a tem) = espaço PROTEGIDO, não pode ser roubado.
//   Baús e frigorífico são acréscimos: só vai para lá o que já não cabe na mochila + casa,
//   e o que lá está PODE SER ROUBADO.
//   💰 Ouro: sem limite de armazenamento; um roubo leva sempre uma PERCENTAGEM do ouro.
//   🪨🔩🪵 Materiais (pedra, ferro, madeira): um espaço PARTILHADO pelos três
//       (ex.: 80 = 30 pedra + 20 ferro + 30 madeira). Mochila + casa + baús.
//   🍞 Comida: espaço próprio, separado dos materiais. Mochila + casa + frigorífico.
const ARMAZENAMENTO = {
  semLimite: ['ouro'],
  materiais: ['pedra', 'ferro', 'madeira'],
  mochila: { materiais: 30, comida: 50 },
  casa: { materiais: 50, comida: 50 },
};

// ---- Roubo ---------------------------------------------------------------
// 1. O ladrão vai à casa do outro jogador (a menos de 50 m) e fica lá 1 minuto.
// 2. Escolhe ÀS CEGAS UMA SÓ coisa: o OURO, OU um dos baús, OU o frigorífico (não vê o que têm dentro).
// 3. Leva só aquilo que escolheu:
//    · se escolheu o OURO: leva uma percentagem do ouro, à sorte entre 5% e 15%.
//    · se escolheu um BAÚ: leva o baú inteiro, com o que tem dentro. A vítima fica sem esse baú
//      (se quiser, compra outro). O ladrão fica com o baú se ainda puder ter mais um
//      (máximo de baús da sua casa); senão o baú perde-se.
//    · se escolheu o FRIGORÍFICO: leva a comida que lá está (o frigorífico fica).
//    Os recursos roubados ficam com o ladrão se tiver espaço; o que não couber perde-se.
//    💪 Vigor (ciência): ao roubar um BAÚ, 2–10% de chance de levar também 5% do ouro
//       ou 10% da comida do frigorífico (ver extraVigor em ciencia.js).
// 4. Só descobre o que roubou quando chega à SUA casa (é aí que se decide o que fica e o que se perde).
// 5. Não há proteção depois de ser roubado: pode ser roubado outra vez logo a seguir.
// O que está na mochila e na casa nunca é roubado (só o ouro, em percentagem, se for essa a escolha).
const ROUBO = {
  raioCasaM: 50,
  minutosNaCasa: 1,
  ouroMin: 0.05, ouroMax: 0.15,   // percentagem do ouro, à sorte
  protecaoDepoisHoras: 0,
};

// Ouro roubado: entre 5% e 15%, à sorte (`sorte` entre 0 e 1)
const ouroRoubado = (ouro, sorte = Math.random()) =>
  Math.floor(ouro * (ROUBO.ouroMin + sorte * (ROUBO.ouroMax - ROUBO.ouroMin)));

// Onde está cada coisa: protegido (mochila + casa) e o resto nos baús (por ordem) e no frigorífico.
// `nBaus` = baús construídos · devolve { baus: [{pedra,ferro,madeira}, ...], frigorifico: comida }
function conteudoArmazens(r, temCasa, nBaus) {
  const prot = k => ARMAZENAMENTO.mochila[k] + (temCasa ? ARMAZENAMENTO.casa[k] : 0);
  const cap = CONSTRUCOES.bau.niveis[0].capacidade;
  // o espaço protegido enche-se primeiro; o excedente de cada material vai para os baús
  const MAT = ARMAZENAMENTO.materiais, total = MAT.reduce((t, k) => t + (r[k] || 0), 0);
  let fora = Math.max(0, total - prot('materiais'));
  // reparte o excedente pelos materiais na proporção de cada um
  const exced = Object.fromEntries(MAT.map(k => [k, total ? Math.floor(fora * (r[k] || 0) / total) : 0]));
  const baus = [];
  for (let i = 0; i < nBaus; i++) {
    const b = {}; let livre = cap;
    for (const k of MAT) { const q = Math.min(livre, exced[k]); b[k] = q; exced[k] -= q; livre -= q; }
    baus.push(b);
  }
  return { baus, frigorifico: Math.max(0, (r.comida || 0) - prot('comida')) };
}

// O ladrão chega a casa com o que roubou: decide o que fica e o que se perde.
// `ladrao` = { r: recursos, nivelCasa, baus } (é alterado)
// `saque` = só UMA destas: { ouro } · { bau: {pedra,ferro,madeira} } · { comida }
// Devolve { ficou: {...}, perdido: {...}, ficouComBau: bool }
function chegarComSaque(ladrao, saque) {
  const ficou = {}, perdido = {};
  const add = (o, k, v) => { if (v > 0) o[k] = (o[k] || 0) + v; };
  // ouro: sem limite
  if (saque.ouro) { ladrao.r.ouro = (ladrao.r.ouro || 0) + saque.ouro; add(ficou, 'ouro', saque.ouro); }
  // o baú: fica se ainda pode ter mais um
  let ficouComBau = false;
  if (saque.bau) {
    const max = ladrao.nivelCasa ? CONSTRUCOES.bau.maxPorNivelCasa[ladrao.nivelCasa - 1] : 0;
    if (ladrao.baus < max) { ladrao.baus++; ficouComBau = true; }
  }
  // materiais: cabem até ao espaço partilhado (mochila + casa + baús, já com o baú novo se ficou)
  const MAT = ARMAZENAMENTO.materiais;
  const capMat = ARMAZENAMENTO.mochila.materiais + (ladrao.nivelCasa ? ARMAZENAMENTO.casa.materiais : 0)
    + ladrao.baus * CONSTRUCOES.bau.niveis[0].capacidade;
  let livre = capMat - MAT.reduce((t, k) => t + (ladrao.r[k] || 0), 0);
  for (const k of MAT) {
    const q = saque.bau ? saque.bau[k] || 0 : 0, cabe = Math.max(0, Math.min(q, livre));
    ladrao.r[k] = (ladrao.r[k] || 0) + cabe; livre -= cabe;
    add(ficou, k, cabe); add(perdido, k, q - cabe);
  }
  // comida: até ao espaço da comida (mochila + casa + frigorífico)
  if (saque.comida) {
    const nf = ladrao.frigorifico || 0;
    const capC = ARMAZENAMENTO.mochila.comida + (ladrao.nivelCasa ? ARMAZENAMENTO.casa.comida : 0)
      + (nf ? CONSTRUCOES.frigorifico.niveis[nf - 1].capacidade : 0);
    const cabe = Math.max(0, Math.min(saque.comida, capC - (ladrao.r.comida || 0)));
    ladrao.r.comida = (ladrao.r.comida || 0) + cabe;
    add(ficou, 'comida', cabe); add(perdido, 'comida', saque.comida - cabe);
  }
  return { ficou, perdido, ficouComBau };
}

// Quanto está em risco (para o simulador) — o ladrão escolhe só UMA destas coisas:
// ouro (em média 10%), um dos baús, ou a comida do frigorífico
function emRisco(r, temCasa, nBaus = 99) {
  const c = conteudoArmazens(r, temCasa, nBaus);
  return {
    ouro: Math.floor((r.ouro || 0) * (ROUBO.ouroMin + ROUBO.ouroMax) / 2),
    materiais: c.baus.reduce((t, b) => t + Object.values(b).reduce((a, v) => a + v, 0), 0),
    comida: c.frigorifico,
    baus: c.baus,
  };
}

// ---- Casa e construções -------------------------------------------------
// Uma construção de cada vez. Começa-se em casa (a menos de 50 m); o tempo corre mesmo fora.
// A produção das construções exteriores acumula e recolhe-se em casa.
// `nivelJogador` = nível mínimo do jogador · `nivelCasa` = nível mínimo da casa.
const XP_POR_CONSTRUCAO = 20;   // proposta: cada construção ou melhoria terminada dá XP

const CONSTRUCOES = {
  casa: {
    nome: 'Casa', icone: '🏠', tipo: 'principal',
    niveis: [
      { nivelJogador: 3, custo: { ouro: 25 }, horas: 2,
        emCasaPorHora: { ouro: 1 }, alegriaEmCasa: 2, espacosDentro: 2, espacosFora: 1 },   // a casa não produz comida
      { nivelJogador: 5, custo: { ouro: 375, madeira: 25, pedra: 25, ferro: 15 }, horas: 72,
        emCasaPorHora: { ouro: 2 }, alegriaEmCasa: 2, espacosDentro: 3, espacosFora: 2 },
      { nivelJogador: 8, custo: { ouro: 1000, madeira: 75, pedra: 75, ferro: 50 }, horas: 168,
        emCasaPorHora: { ouro: 2 }, alegriaEmCasa: 2, espacosDentro: 4, espacosFora: 4 },
    ],
  },

  // -- Dentro da casa --
  cama: {
    nome: 'Cama', icone: '🛏️', tipo: 'dentro',
    descricao: 'Permite descansar: 4 h seguidas em casa recuperam energia.',
    niveis: [
      { nivelCasa: 1, custo: { ouro: 50, madeira: 5 }, horas: 6, energiaDescanso: 20 },
      { nivelCasa: 2, custo: { ouro: 200, madeira: 20, ferro: 5 }, horas: 48, energiaDescanso: 30 },
    ],
  },
  sofa: {
    nome: 'Sofá', icone: '🛋️', tipo: 'dentro',
    descricao: 'Energia extra por hora em casa e +1 de alegria em casa.',
    niveis: [
      { nivelCasa: 1, custo: { ouro: 100, madeira: 15, ferro: 5 }, horas: 12, energiaHoraEmCasa: 1, alegriaEmCasa: 1 },
      { nivelCasa: 2, custo: { ouro: 300, madeira: 30, ferro: 15 }, horas: 48, energiaHoraEmCasa: 2, alegriaEmCasa: 1 },
    ],
  },

  escritorio: {
    nome: 'Escritório', icone: '🗄️', tipo: 'dentro',
    descricao: 'Recolher a produção dos POIs anexados a partir de casa, sem lá ir (algumas vezes por dia).',
    niveis: [
      // custo reduzido para metade: o escritório é para se ter cedo
      { nivelCasa: 1, custo: { ouro: 190, madeira: 20, ferro: 10, pedra: 8 }, horas: 24, recolhasRemotasDia: 2 },
      { nivelCasa: 3, custo: { ouro: 500, madeira: 40, ferro: 20, pedra: 20 }, horas: 60, recolhasRemotasDia: 4 },
    ],
  },

  // -- Armazenamento (não ocupam espaços da casa; o nº máximo depende do nível da casa) --
  // Baús: pedra, ferro e madeira, num espaço partilhado pelos três. PODEM SER ROUBADOS.
  // O baú NÃO se constrói: COMPRA-SE, só com ouro, e chega 1 hora depois.
  // Só começa a ser cheio quando chega. Não ocupa a obra em curso (pode comprar-se enquanto se constrói).
  // Não sobe de nível: para guardar mais, compram-se mais baús.
  // Enchem-se por ordem (1.º baú, depois o 2.º, ...): um baú pode estar vazio — o ladrão não sabe.
  bau: {
    nome: 'Baú', icone: '🧰', tipo: 'armazem', guarda: 'materiais', comprado: true,
    descricao: 'Compra-se (só ouro) e chega 1 h depois. Guarda pedra, ferro e madeira (espaço partilhado pelos três). O que está nos baús pode ser roubado.',
    maxPorNivelCasa: [2, 4, 8],   // nº máximo de baús com casa 1/2/3
    niveis: [
      { nivelCasa: 1, custo: { ouro: 300 }, horas: 1, capacidade: 300 },   // horas = entrega
    ],
  },
  // Frigorífico: só comida. Um por casa. O que está no frigorífico PODE SER ROUBADO.
  frigorifico: {
    nome: 'Frigorífico', icone: '🧊', tipo: 'armazem', guarda: 'comida',
    descricao: 'Guarda a comida que já não cabe na mochila e na casa. O que está no frigorífico pode ser roubado.',
    maxPorNivelCasa: [1, 1, 1],
    niveis: [
      { nivelCasa: 1, custo: { ouro: 75, ferro: 10, pedra: 5 }, horas: 12, capacidade: 100 },
      { nivelCasa: 2, custo: { ouro: 250, ferro: 25, pedra: 15 }, horas: 48, capacidade: 250 },
      { nivelCasa: 3, custo: { ouro: 625, ferro: 50, pedra: 30 }, horas: 120, capacidade: 500 },
    ],
  },

  // -- À volta da casa (até ao nível 10 só estas quatro) --
  // produz: por ciclo · cicloHoras · maxHoras = acumula no máximo (recolhe-se em casa)
  fabricaPedra: {
    nome: 'Fábrica de pedra', icone: '🪨', tipo: 'fora',
    niveis: [
      { nivelCasa: 1, custo: { ouro: 150, madeira: 15, ferro: 5 }, horas: 24, produz: { pedra: 1 }, cicloHoras: 3, maxHoras: 12 },
      { nivelCasa: 2, custo: { ouro: 500, madeira: 40, ferro: 20 }, horas: 96, produz: { pedra: 1 }, cicloHoras: 2, maxHoras: 12 },
      { nivelCasa: 3, custo: { ouro: 1250, madeira: 100, ferro: 50 }, horas: 240, produz: { pedra: 1 }, cicloHoras: 1, maxHoras: 12 },
    ],
  },
  serracao: {
    nome: 'Serração', icone: '🪵', tipo: 'fora',
    niveis: [
      { nivelCasa: 1, custo: { ouro: 150, pedra: 15, ferro: 5 }, horas: 24, produz: { madeira: 1 }, cicloHoras: 3, maxHoras: 12 },
      { nivelCasa: 2, custo: { ouro: 500, pedra: 40, ferro: 20 }, horas: 96, produz: { madeira: 1 }, cicloHoras: 2, maxHoras: 12 },
      { nivelCasa: 3, custo: { ouro: 1250, pedra: 100, ferro: 50 }, horas: 240, produz: { madeira: 1 }, cicloHoras: 1, maxHoras: 12 },
    ],
  },
  serralharia: {
    nome: 'Serralharia', icone: '🔩', tipo: 'fora',
    niveis: [
      { nivelCasa: 1, custo: { ouro: 150, pedra: 15, madeira: 15 }, horas: 24, produz: { ferro: 1 }, cicloHoras: 3, maxHoras: 12 },
      { nivelCasa: 2, custo: { ouro: 500, pedra: 40, madeira: 40 }, horas: 96, produz: { ferro: 1 }, cicloHoras: 2, maxHoras: 12 },
      { nivelCasa: 3, custo: { ouro: 1250, pedra: 100, madeira: 100 }, horas: 240, produz: { ferro: 1 }, cicloHoras: 1, maxHoras: 12 },
    ],
  },
  quinta: {
    nome: 'Quinta', icone: '🌾', tipo: 'fora',
    niveis: [
      { nivelCasa: 1, custo: { ouro: 100, madeira: 15, pedra: 5 }, horas: 24, produz: { comida: 1 }, cicloHoras: 2, maxHoras: 12 },
      { nivelCasa: 2, custo: { ouro: 375, madeira: 30, pedra: 25 }, horas: 96, produz: { comida: 1 }, cicloHoras: 1, maxHoras: 12 },
      { nivelCasa: 3, custo: { ouro: 1000, madeira: 75, pedra: 65 }, horas: 240, produz: { comida: 2 }, cicloHoras: 1, maxHoras: 12 },
    ],
  },
};

// Recomenda a fação para uma zona.
// `disponivel` = quanto de cada recurso se consegue por dia perto de casa (ex.: dos POIs num raio de 5 km).
// Cada fação paga mais (ou menos) por certos recursos; a melhor é a que fica mais barata
// tendo em conta o que é raro na zona (recurso raro = pesa muito).
function recomendarFacao(disponivel) {
  // "Cesto" típico de construção: a soma dos custos de todas as construções
  const cesto = {};
  for (const c of Object.values(CONSTRUCOES)) for (const nv of c.niveis)
    for (const [r, v] of Object.entries(nv.custo)) cesto[r] = (cesto[r] || 0) + v;
  // Dias de trabalho para juntar o cesto com cada fação (recurso raro = muitos dias)
  const dias = f => Object.entries(cesto).reduce((t, [r, v]) =>
    t + v * (f.custo[r] ?? 1) / (Math.max(0, disponivel[r] || 0) + 0.5), 0);
  const ordem = Object.entries(FACOES).map(([id, f]) => ({ id, dias: Math.round(dias(f)) })).sort((a, b) => a.dias - b.dias);
  return { melhor: ordem[0].id, ordem };
}

// Custo final de uma construção para um jogador (as fações só contam a partir do nível 10)
function custoPara(custoBase, facao, nivelJogador) {
  if (!facao || nivelJogador < NIVEL_FACAO_FIXA) return { ...custoBase };
  const m = FACOES[facao].custo;
  return Object.fromEntries(Object.entries(custoBase).map(([k, v]) => [k, Math.ceil(v * (m[k] ?? 1))]));
}
