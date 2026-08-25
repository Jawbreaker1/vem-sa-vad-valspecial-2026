export type QuoteVisualId =
  | 'book'
  | 'care'
  | 'clock'
  | 'cocktail'
  | 'crowd'
  | 'cucumber'
  | 'eye'
  | 'family'
  | 'globe'
  | 'heart'
  | 'horse'
  | 'house'
  | 'meatballs'
  | 'microphone'
  | 'money'
  | 'pizza'
  | 'scale'
  | 'skis'
  | 'stairs'
  | 'tools'
  | 'tree'
  | 'wall'
  | 'wallpaper'
  | 'worker';

export type QuotePresentation = {
  impact?: string;
  soft?: string;
  visual?: QuoteVisualId;
};

export const quoteVisualGlyphs: Record<QuoteVisualId, string> = {
  book: '▤',
  care: '✚',
  clock: '⏱',
  cocktail: '🍸',
  crowd: '✦✦✦',
  cucumber: '🥒',
  eye: '◉',
  family: '♥',
  globe: '◎',
  heart: '♥',
  horse: '♞',
  house: '⌂',
  meatballs: '● ● ●',
  microphone: '🎙',
  money: 'kr',
  pizza: '🍕',
  scale: '⚖',
  skis: '⛷',
  stairs: '▰',
  tools: '🧰',
  tree: '♣',
  wall: '▦',
  wallpaper: '▧',
  worker: '⚒',
};

export const quotePresentations: Record<string, QuotePresentation> = {
  's-andersson-2025-florten': {
    impact: 'flörten från Ebba',
    soft: 'om jag uppfattade den rätt',
    visual: 'heart',
  },
  'm-kristersson-2022-intoleransen': {
    impact: 'inte toleranta mot intoleransen',
    soft: 'I Sverige är vi toleranta',
  },
  'sd-akesson-2012-verktygslada': {
    impact: 'inte tagit sönder någonting',
    soft: 'Mycket kort',
    visual: 'tools',
  },
  'v-dadgostar-2022-marknadsekonomin': {
    impact: 'missuppfattat marknadsekonomin',
    soft: 'Jag beklagar detta',
    visual: 'scale',
  },
  'c-loof-2022-kissa-snabbare': {
    impact: 'springa fortare, kissa snabbare',
    soft: 'i bästa fall',
    visual: 'clock',
  },
  'kd-busch-2024-gurkor': {
    impact: 'böjda gurkor',
    visual: 'cucumber',
  },
  'l-mohamsson-2026-familjen': {
    impact: 'nästan oftare än min familj',
    soft: 'Och det är därför',
    visual: 'family',
  },
  'mp-bolund-2019-tystnaden': {
    impact: 'tystnaden i naturen',
    soft: 'börjat bli rädd för den',
    visual: 'tree',
  },
  's-persson-1995-skuld': {
    impact: 'satt i skuld är icke fri',
    visual: 'money',
  },
  's-lofven-2014-kabbel': {
    impact: 'bara käbbel',
    visual: 'microphone',
  },
  's-lofven-2015-mitt-europa': {
    impact: 'Mitt Europa bygger inte murar',
    visual: 'wall',
  },
  'm-reinfeldt-2011-arbetarparti': {
    impact: 'ett arbetarparti',
    visual: 'worker',
  },
  'm-reinfeldt-2014-oppna-hjartan': {
    impact: 'öppna era hjärtan',
    soft: 'om tålamod',
    visual: 'heart',
  },
  'm-kinberg-batra-2017-valjarna': {
    impact: 'inte att väljarna är så imponerade',
    soft: 'Jag tror',
    visual: 'crowd',
  },
  'm-kinberg-batra-1998-lantisar': {
    impact: 'smartare än lantisar',
    visual: 'globe',
  },
  'v-sjostedt-2013-tyko-jonsson': {
    impact: 'Det var Tyko Jonsson',
    soft: 'en liten stund',
  },
  'v-sjostedt-2019-kommunismen-bakom-oss': {
    impact: 'lämnat kommunismen bakom oss',
    soft: 'Jag är glad över',
  },
  'v-dadgostar-2025-tapetsera-skane': {
    impact: 'tapetsera hela Skåne med kärnkraft',
    soft: 'vad är poängen med det',
    visual: 'wallpaper',
  },
  'mp-romson-2014-ozz-nujen': {
    impact: 'Özz Nûjen',
    soft: 'vem trodde ni jag menade',
    visual: 'microphone',
  },
  'mp-bolund-2019-aga-tillsammans': {
    impact: 'Jag älskar att äga – tillsammans',
    soft: 'Vi borde starta en kampanj',
    visual: 'heart',
  },
  'mp-fridolin-2019-pizza-akesson': {
    impact: 'en pizza med dig, Jimmie Åkesson',
    soft: 'Jag tar gärna',
    visual: 'pizza',
  },
  'sd-akesson-2013-kottbullar-sten': {
    impact: 'kasta köttbullar i stället för sten',
    soft: 'samhället hade blivit lite trevligare',
    visual: 'meatballs',
  },
  'sd-akesson-2018-svenska-folkhemmet': {
    impact: 'det svenska folkhemmet',
    soft: 'Det enkla svaret är',
    visual: 'house',
  },
  'sd-akesson-2021-blundatavling': {
    impact: 'ha en blundatävling',
    soft: 'se vem som orkar blunda längst',
    visual: 'eye',
  },
  'c-loof-2017-klassamhalle': {
    impact: 'Socialdemokraterna agerar arbetsledare',
    visual: 'stairs',
  },
  'c-demirok-2024-arbetslos': {
    impact: 'borde göra regeringen arbetslös',
    visual: 'globe',
  },
  'c-thand-ringqvist-2026-trad-tonaringar': {
    impact: 'träd som tonåringar',
    soft: 'När det kommer till koldioxid',
    visual: 'tree',
  },
  'c-loof-2018-nazister-skriker': {
    impact: 'nazister som skriker nu',
  },
  'l-bjorklund-2017-socialt-ansvar': {
    impact: 'Socialt ansvar men utan socialism',
    soft: 'Eller',
    visual: 'scale',
  },
  'l-pehrson-2025-giftig-cocktail': {
    impact: 'har blivit en giftig cocktail',
    visual: 'cocktail',
  },
  'l-mohamsson-2025-vasaloppet-brollop': {
    impact: 'fira jul som att fira eid',
    visual: 'skis',
  },
  'kd-svensson-1997-svarsstund': {
    impact: 'frågestund och ingen svarsstund',
    soft: 'Det är alldeles signifikativt att',
    visual: 'microphone',
  },
  'kd-busch-2025-dikt-logn': {
    impact: 'dikt och förbannad lögn',
    soft: 'att läsa vår politik',
    visual: 'book',
  },
  'kd-busch-2025-vard-efter-behov': {
    impact: 'var och en efter behov',
    soft: 'Sverige behöver en vård som',
    visual: 'care',
  },
  'kd-hagglund-2014-hastlasagne-politiker': {
    impact: 'hästlasagne-politiker',
    soft: 'herr talman',
    visual: 'horse',
  },
};
