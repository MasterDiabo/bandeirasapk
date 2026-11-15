// =====================================================================
//  Regras gerais do jogador (níveis, XP, edifícios, consumo, energia)
//  — iguais às da versão de teste, num sítio só.
// =====================================================================

const NIVEL_MAXIMO = 10;            // bloqueado no 10 nesta fase
// XP para passar de cada nível ao seguinte. Do 5 ao 10 é mais lento (fase de conhecer as fações):
// a 10 km/dia chega-se ao nível 5 por volta do dia 6 e ao nível 10 por volta do dia 20.
const XP_NIVEIS = [100, 103, 106, 109, 112, 200, 215, 230, 245, 260];
const xpParaSubir = n => n < XP_NIVEIS.length ? XP_NIVEIS[n] : XP_NIVEIS[XP_NIVEIS.length - 1] + 4 * (n - XP_NIVEIS.length + 1);
function progressoNivel(xp) {
  let n = 0;
  while (n < NIVEL_MAXIMO && xp >= xpParaSubir(n)) { xp -= xpParaSubir(n); n++; }
  return { n, dentro: xp, precisa: xpParaSubir(n) };
}

const XP_POR_KM = 5;
const XP_POR_ANEXAR = 50;
// Recursos com que um jogador novo começa. A casa não produz comida: 50 dá para ~12 dias de consumo
// depois do nível 3, o tempo de anexar o primeiro POI de comida (missão do nível 1).
const RECURSOS_INICIAIS = { comida: 50 };

// Missões de tutorial. `nivel` = a partir de que nível aparece · `recursos` = recompensa extra
// Missões dos níveis 7–9: o que conta para cada fação (uma construção OU um POI)  ⚠️ proposta
const PROVAS_FACAO = {
  humanos: { construcoes: ['quinta'],                       pois: ['mercado', 'comida', 'ferragens'],
             texto: 'Construir uma Quinta, ou anexar/reconhecer um supermercado, restaurante ou loja de ferragens.' },
  elfos:   { construcoes: ['serracao'],                     pois: ['monumento-grande', 'biblioteca'],
             texto: 'Construir uma Serração, ou anexar/reconhecer um monumento grande (Tapada, Paisagem de Sintra…) ou uma biblioteca.' },
  gnomos:  { construcoes: ['bau'],                          pois: ['banco'], feira: true,
             texto: 'Comprar um baú, ou anexar/reconhecer um banco, ou vender na feira.' },
};

const MISSOES = [
  { id: 'nome',      nivel: 0, titulo: 'Alterar o nome',                          xp: 20 },
  { id: 'avatar',    nivel: 0, titulo: 'Alterar o avatar',                        xp: 20 },
  { id: 'andar1km',  nivel: 0, titulo: 'Andar 1 km',                              xp: 10,
    recursos: { comida: 1, pedra: 1, ouro: 1, madeira: 1, ferro: 1 } },
  { id: 'anexar',    nivel: 1, titulo: 'Iniciar a anexação de 1 POI',             xp: 20 },
  // Tutorial do nível 1: o primeiro POI a anexar deve ser de comida (a casa não produz comida)
  { id: 'comida',    nivel: 1, titulo: 'Tutorial: anexar um POI de comida',       xp: 20,
    texto: 'Anexa um supermercado ou um restaurante. A partir do nível 3 gastas 4 de comida por dia e a casa não produz comida: a comida que trazes dá para pouco tempo.' },
  { id: 'zona',      nivel: 3, titulo: 'Conhecer a tua zona',                     xp: 20,   // ⚠️ proposta
    texto: 'Ao escolher a casa, o jogo mostra que recursos há perto (num raio de 5 km) e qual a fação que mais te convém.' },

  // ---- Conhecer as fações (nível 5 a 9) → escolha no nível 10 ----
  // Nível 5: três missões de fotografia, uma por fação. Vai-se a um sítio que represente a fação,
  // tira-se uma fotografia (tem de estar lá pelo GPS) e recebe-se XP, ouro e a explicação da fação.
  // Sítios públicos: a fotografia tira-se de fora (estrada, caminho), nunca entrando em propriedade privada.
  { id: 'fotoElfos',   nivel: 5, facao: 'elfos',   tipo: 'foto', xp: 30, recursos: { ouro: 20 },   // ⚠️ recompensa proposta
    titulo: 'Fotografar um pinhal, bosque ou parque',
    local: t => t.natural === 'wood' || t.landuse === 'forest' || (t.leisure === 'park' && !!t.name),
    texto: 'Os Elfos vivem da natureza. (explicação de como é jogar como Elfo)' },
  { id: 'fotoGnomos',  nivel: 5, facao: 'gnomos',  tipo: 'foto', xp: 30, recursos: { ouro: 20 },
    titulo: 'Fotografar um centro comercial',
    local: t => t.shop === 'mall',
    texto: 'Os Gnomos vivem do comércio. (explicação de como é jogar como Gnomo)' },
  { id: 'fotoHumanos', nivel: 5, facao: 'humanos', tipo: 'foto', xp: 30, recursos: { ouro: 20 },
    titulo: 'Fotografar um moinho ou uma quinta',
    // moinhos (há mais de 200 na zona, muitos visitáveis) · quintas com nome · campos, pomares, vinhas
    local: t => t.man_made === 'windmill' || (t.place === 'farm' && !!t.name) || ['farmland', 'orchard', 'vineyard'].includes(t.landuse),
    texto: 'Os Humanos vivem da agricultura e da produção. (explicação de como é jogar como Humano)' },

  // Nível 6: pagar OURO para estudar cada fação (uma pesquisa por fação, 150 de ouro cada).
  // Mostra uma parte da árvore de ciência dessa fação (as árvores são diferentes a partir do nível 10).
  { id: 'estudarElfos',   nivel: 6, facao: 'elfos',   tipo: 'pesquisa', custo: { ouro: 150 }, xp: 30,   // ⚠️ XP proposto
    titulo: 'Estudar os Elfos',   texto: 'Mostra uma parte da árvore de ciência dos Elfos.' },
  { id: 'estudarGnomos',  nivel: 6, facao: 'gnomos',  tipo: 'pesquisa', custo: { ouro: 150 }, xp: 30,
    titulo: 'Estudar os Gnomos',  texto: 'Mostra uma parte da árvore de ciência dos Gnomos.' },
  { id: 'estudarHumanos', nivel: 6, facao: 'humanos', tipo: 'pesquisa', custo: { ouro: 150 }, xp: 30,
    titulo: 'Estudar os Humanos', texto: 'Mostra uma parte da árvore de ciência dos Humanos.' },

  // Níveis 7, 8 e 9: em cada nível escolhe UMA fação ainda não feita e cumpre uma de duas coisas:
  // fazer uma construção ligada a ela OU anexar/reconhecer um POI ligado a ela. Ao nível 9 já fez as três.
  { id: 'provaFacao1', nivel: 7, tipo: 'facao', xp: 40, recursos: { ouro: 30 },   // ⚠️ recompensa proposta
    titulo: 'Viver como uma fação (1.ª)' },
  { id: 'provaFacao2', nivel: 8, tipo: 'facao', xp: 40, recursos: { ouro: 30 },
    titulo: 'Viver como uma fação (2.ª)' },
  { id: 'provaFacao3', nivel: 9, tipo: 'facao', xp: 40, recursos: { ouro: 30 },
    titulo: 'Viver como uma fação (3.ª)' },

  // Nível 10: o menu das fações
  { id: 'escolherFacao', nivel: 10, tipo: 'escolha', xp: 0,
    titulo: 'Escolher a fação',
    texto: 'Aparece o menu das fações. A escolha é definitiva e as diferenças passam a contar.' },
];

// Reconhecimento: em qualquer POI (dentro do alcance) há um botão "Reconhecimento".
// Uma vez por POI: dá 5 de ouro + 2 de ciência + 1 recurso aleatório e, abaixo do nível 3, também XP.
const RECONHECIMENTO = {
  xp: 20,
  xpAteNivel: 3,                                              // a partir do nível 3 já não dá XP
  ouro: 5,                                                    // sempre
  ciencia: 2,                                                 // sempre (qualquer POI): ciência desde o início
  recursos: ['comida', 'ouro', 'pedra', 'ferro', 'madeira'],  // + 1 destes, ao calhas
  quantidade: 1,
};

// ---- Comércio nas feiras ------------------------------------------------
// As feiras são POIs especiais que NÃO são fixos: cada concelho tem uma feira ativa de cada vez,
// que fica uns dias num sítio e depois muda para outro. Quem a anexa pode vender recursos lá
// enquanto ela durar (tem de estar na feira para vender).
const COMERCIO = {
  nivelMinimo: 3,
  // Quanto ouro se RECEBE por 1 unidade vendida: 4 comida = 1 ouro · 1 pedra/ferro/madeira = 4 ouro
  precoVenda: { comida: 0.25, pedra: 4, ferro: 4, madeira: 4 },
  // Quanto ouro se PAGA por 1 unidade comprada: 1 comida = 4 ouro · 1 pedra/ferro/madeira = 20 ouro
  precoCompra: { comida: 4, pedra: 20, ferro: 20, madeira: 20 },
  limiteOuroDia: Infinity,    // sem limite de vendas por dia (nem de compras)
  bonusGnomos: 1.25,          // a partir do nível 10, os gnomos (comércio) vendem 25% mais caro
};

// POIs anexados ao mesmo tempo: nível 0 = 0, nível 1 = 2, depois +1 a cada 2 níveis
const maxEdificiosNivel = n => n < 1 ? 0 : 2 + Math.floor((n - 1) / 2);

// Consumo diário a partir do nível 3
const NIVEL_CONSUMO = 3;
const CONSUMO_DIARIO = { comida: 4, ouro: 5 };

// Energia
const energiaMaxBase = n => 50 + 2 * n;
const REGEN_BASE = 1;
const regenAlegria = a => a >= 10 ? 5 : a >= 5 ? 2 : 0;
