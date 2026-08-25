export type QuoteVisualId =
  | 'baby-food'
  | 'book'
  | 'bread'
  | 'care'
  | 'clock'
  | 'cocktail'
  | 'crowd'
  | 'cucumber'
  | 'ear'
  | 'eye'
  | 'family'
  | 'globe'
  | 'heart'
  | 'horse'
  | 'house'
  | 'meatballs'
  | 'microphone'
  | 'money'
  | 'pancake'
  | 'pizza'
  | 'pasta'
  | 'rabbit'
  | 'scale'
  | 'sandbox'
  | 'skis'
  | 'snail'
  | 'stage'
  | 'stairs'
  | 'tools'
  | 'tree'
  | 'turn'
  | 'wall'
  | 'wallpaper'
  | 'weather'
  | 'worker';

export type QuotePresentation = {
  impact?: string;
  soft?: string;
  visual?: QuoteVisualId;
};

export const quoteVisualGlyphs: Record<QuoteVisualId, string> = {
  'baby-food': '🍼',
  book: '▤',
  bread: '🍞',
  care: '✚',
  clock: '⏱',
  cocktail: '🍸',
  crowd: '✦✦✦',
  cucumber: '🥒',
  ear: '👂',
  eye: '◉',
  family: '♥',
  globe: '◎',
  heart: '♥',
  horse: '♞',
  house: '⌂',
  meatballs: '● ● ●',
  microphone: '🎙',
  money: 'kr',
  pancake: '🥞',
  pizza: '🍕',
  pasta: '🍝',
  rabbit: '🐇',
  scale: '⚖',
  sandbox: '🏖',
  skis: '⛷',
  snail: '🐌',
  stage: '🎭',
  stairs: '▰',
  tools: '🧰',
  tree: '♣',
  turn: '↔',
  wall: '▦',
  wallpaper: '▧',
  weather: '☔',
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
    impact: 'men det är Tyko Jonsson',
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
    soft: 'Men det är alldeles signifikativt att',
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
  'm-kristersson-2026-halmdocka': {
    impact: 'målas det upp en halmdocka',
    soft: 'Vad ska jag göra åt det',
  },
  'sd-akesson-2026-daliga-minne': {
    impact: 'svenska folkets dåliga minne',
    soft: 'i det här sammanhanget',
    visual: 'eye',
  },
  'v-dadgostar-2026-tjottaballongen': {
    impact: 'resten av tjottaballongen',
    visual: 'crowd',
  },
  'c-thand-ringqvist-2026-mirakelkur': {
    impact: 'ekonomisk mirakelkur',
    visual: 'money',
  },
  'kd-busch-2026-tror-hemma': {
    impact: 'Jag tror i kyrkan. Jag tror hemma.',
    soft: 'Jag tror gärna.',
    visual: 'house',
  },
  'l-mohamsson-2026-stureplanscentern': {
    impact: 'död och begraven',
    soft: 'är ett minne blott',
  },
  'mp-hellden-2026-hjarta-byraladan': {
    impact: 'ett hjärta någonstans i byrålådan',
    soft: 'kanske tillfälligt',
    visual: 'heart',
  },
  'l-leijonborg-1997-sluta-arbeta': {
    impact: 'slutar arbeta',
    soft: 'Då föreslår jag',
    visual: 'worker',
  },
  'l-bjorklund-2017-nyliberal-sogs-med': {
    impact: 'jag sögs med',
    soft: 'Då blåste vindarna i nyliberal riktning',
    visual: 'crowd',
  },
  'l-sabuni-2019-snall-storasyster': {
    impact: 'den där storasystern lite på avstånd',
    soft: 'när friheten saknas',
    visual: 'family',
  },
  'l-pehrson-2022-mauro-plura': {
    impact: 'Inte som Mauro utan kanske mer som Plura',
    soft: 'med tanke på skägget',
    visual: 'microphone',
  },
  'l-pehrson-2022-sluthanat-medelklassen': {
    impact: 'sluthånat om medelklassen',
    visual: 'crowd',
  },
  'mp-fridolin-2015-trefikat': {
    impact: 'trefikat som helig',
    soft: 'en av de mest effektiva statsförvaltningarna',
    visual: 'clock',
  },
  'mp-lovin-2018-planeten-soptipp': {
    impact: 'vår planet som en soptipp',
    soft: 'vårt enda hem',
    visual: 'globe',
  },
  'mp-eriksson-2020-stigen': {
    impact: 'inte så långt före att stigen hinner växa igen',
    soft: 'Vi ska gå före',
    visual: 'tree',
  },
  'mp-stenevi-2022-en-kvart-implodera': {
    impact: 'en kvart innan klimat- och miljöpolitiken började implodera',
    soft: 'efter att vi lämnat regeringen',
    visual: 'clock',
  },
  'mp-bolund-2022-fingret-at-putin': {
    impact: 'ge fingret åt Putin och fossilindustrin',
    soft: 'möjligheten att',
    visual: 'globe',
  },
  'v-schyman-2002-piga-at-pigan': {
    impact: 'piga åt pigan',
    soft: 'Vem ska vara',
    visual: 'worker',
  },
  'v-ohly-2005-naken-kostym': {
    impact: 'plötsligt naken trots sin vackra kostym',
    soft: 'Men jag håller med',
    visual: 'stage',
  },
  'v-ohly-2009-vaxpropp': {
    impact: 'en vaxpropp ut ur örat',
    visual: 'ear',
  },
  'v-sjostedt-2018-horselkapor': {
    impact: 'satt med hörselkåpor i bänken',
    soft: 'Kristdemokraternas val är att låtsas',
    visual: 'ear',
  },
  'v-dadgostar-2025-mp3-celine-dion': {
    impact: 'Céline Dions My heart will go on',
    soft: 'I de toppmoderna mp3-spelarna',
    visual: 'stage',
  },
  'c-olofsson-2007-infrastrukturkulisser': {
    impact: 'infrastrukturplanering som visade sig vara kulisser',
    soft: 'Vi ärvde en',
    visual: 'stage',
  },
  'c-olofsson-2011-fine-with-me': {
    impact: 'fine with me',
    soft: 'Men är det att skrämmas',
  },
  'c-loof-2012-pang-bom': {
    impact: 'pang, bom!',
    soft: 'Det är förbud för en hel bransch',
  },
  'c-loof-2013-ikea-loning': {
    impact: 'Ikea en lördag strax efter löning',
    soft: 'Tänk er',
    visual: 'crowd',
  },
  'c-demirok-2024-snabbmakaroner': {
    impact: 'snabbmakaroner och pannkakor med mjölk',
    soft: 'Den är',
    visual: 'pasta',
  },
  'kd-hagglund-2004-snigel-racerbil': {
    impact: 'snigeln framstår som en racerbil',
    soft: 'Den omtalade',
    visual: 'snail',
  },
  'kd-hagglund-2009-overraskningskaniner': {
    impact: 'små överraskningskaniner hoppat upp ur hatten',
    soft: 'Hur många gånger har inte',
    visual: 'rabbit',
  },
  'kd-hagglund-2010-spackel-maskeringstejp': {
    impact: 'spackel och maskeringstejp',
    soft: 'försöker man kortsiktigt',
    visual: 'tools',
  },
  'kd-hagglund-2011-myspysig-idyll': {
    impact: 'mer än en myspysig idyll',
    soft: 'Familjen är',
    visual: 'family',
  },
  'kd-busch-2019-snigel-ulan-bator': {
    impact: 'jordenruntresande snigeln som fikar i Ulan Bator',
    soft: 'Det som möjligtvis saknades var den',
    visual: 'snail',
  },
  's-andersson-2022-pratkvarnar': {
    impact: 'värma upp sitt boende med pratkvarnar',
    soft: 'Men svenska hushåll kan inte',
    visual: 'microphone',
  },
  's-lofven-2016-blindbock': {
    impact: 'fyra som leker blindbock',
    soft: 'Ni är som',
    visual: 'eye',
  },
  's-lofven-2016-dorrmatta': {
    impact: 'lagt dig som en dörrmatta',
    soft: 'Ni tänker dessutom låta vinstjakten fortsätta',
    visual: 'house',
  },
  's-lofven-2020-pannkaka': {
    impact: 'pannkaka och ärtsoppa',
    soft: 'är jag lättflörtad',
    visual: 'pancake',
  },
  's-persson-2006-blinka': {
    impact: 'blinka åt vänster och sedan svänga åt höger',
    soft: 'Det farligaste som finns i trafiken är att',
    visual: 'turn',
  },
  's-persson-2000-knakade': {
    impact: 'knakade det utan att det växte',
    soft: 'När moderaterna styrde',
    visual: 'tree',
  },
  'm-reinfeldt-2014-barnmatsburkar': {
    impact: 'gift i barnmatsburkar',
    soft: 'Jag kan slå fast att jag tror',
    visual: 'baby-food',
  },
  'm-reinfeldt-2014-ofarliga': {
    impact: 'farligaste med oss är alltså att vi är ofarliga',
    soft: 'vi föreslår ingenting',
  },
  'm-kristersson-2025-raddat-er': {
    impact: 'räddat er från er själva',
    soft: 'Vi har',
    visual: 'care',
  },
  'm-kristersson-2019-el-brod': {
    impact: 'brist på el och brist på bröd',
    soft: 'Socialism brukar leda till två saker',
    visual: 'bread',
  },
  'm-kristersson-2019-altaner': {
    impact: 'fler altaner än för att bekämpa fler brott',
    soft: 'Januariöverenskommelsen har skarpare förslag för att bygga',
    visual: 'house',
  },
  'sd-akesson-2012-tokyo': {
    impact: 'tunnelbana i Tokyo',
    soft: 'Fru talman!',
    visual: 'globe',
  },
  'sd-akesson-2017-battre-parti': {
    impact: 'ni andra partier är dåliga',
    soft: 'Själva skälet till att vi finns är',
    visual: 'crowd',
  },
  'sd-akesson-2015-sandlada': {
    impact: 'sandlåda med hink och spade och pekar finger',
    soft: 'I stället sitter du där i din',
    visual: 'sandbox',
  },
  'sd-akesson-2015-battre-vader': {
    impact: 'Den här sommaren var inte fantastisk',
    soft: 'Jag vet inte om vi har sett särskilt mycket bättre väder ännu',
    visual: 'weather',
  },
  'sd-akesson-2021-pippi': {
    impact: 'trevligt och roligt att du kom, men det var roligare när du gick',
    soft: 'För att nästan citera Pippi Långstrump',
    visual: 'book',
  },
};
