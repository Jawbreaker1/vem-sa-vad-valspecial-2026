import type { PartyId } from './quotes';

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;
const BRAND_FONT = "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif";
const BODY_FONT = "'Avenir Next', Avenir, 'Trebuchet MS', system-ui, sans-serif";

export type ResultShareParty = {
  id: PartyId;
  shortName: string;
  logo: string;
  color: string;
  correct: number;
  total: number;
};

export type ResultShareCardData = {
  points: number;
  correct: number;
  totalQuestions: number;
  bestStreak: number;
  fastAnswers: number;
  title: string;
  recordLabel?: string;
  parties: ResultShareParty[];
};

type LoadedLogo = {
  party: ResultShareParty;
  image: HTMLImageElement | null;
};

function roundedRectPath(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string | CanvasGradient,
) {
  roundedRectPath(context, x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

function strokeRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke: string | CanvasGradient,
  lineWidth: number,
) {
  roundedRectPath(context, x, y, width, height, radius);
  context.strokeStyle = stroke;
  context.lineWidth = lineWidth;
  context.stroke();
}

function fitFontSize(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number,
  family = BRAND_FONT,
) {
  let size = preferredSize;
  while (size > minimumSize) {
    context.font = `900 ${size}px ${family}`;
    if (context.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawFittedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number,
  fill: string | CanvasGradient,
  options: {
    family?: string;
    stroke?: string;
    strokeWidth?: number;
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetY?: number;
  } = {},
) {
  const family = options.family ?? BRAND_FONT;
  const size = fitFontSize(context, text, maxWidth, preferredSize, minimumSize, family);
  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `900 ${size}px ${family}`;
  context.shadowColor = options.shadowColor ?? 'transparent';
  context.shadowBlur = options.shadowBlur ?? 0;
  context.shadowOffsetY = options.shadowOffsetY ?? 0;
  if (options.stroke && options.strokeWidth) {
    context.strokeStyle = options.stroke;
    context.lineWidth = options.strokeWidth;
    context.lineJoin = 'round';
    context.strokeText(text, centerX, baselineY);
  }
  context.fillStyle = fill;
  context.fillText(text, centerX, baselineY);
  context.restore();
  return size;
}

function drawStar(
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  points: number,
  fill: string,
  stroke = '#9f5200',
) {
  context.save();
  context.beginPath();
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    const x = centerX + Math.cos(angle) * radius;
    const y = centerY + Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  context.strokeStyle = stroke;
  context.lineWidth = 5;
  context.lineJoin = 'round';
  context.stroke();
  context.restore();
}

function drawBackground(context: CanvasRenderingContext2D) {
  const background = context.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  background.addColorStop(0, '#010719');
  background.addColorStop(.43, '#063e91');
  background.addColorStop(1, '#020b26');
  context.fillStyle = background;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  context.save();
  context.translate(CARD_WIDTH / 2, 700);
  for (let index = 0; index < 30; index += 1) {
    const angle = (index / 30) * Math.PI * 2;
    context.save();
    context.rotate(angle);
    context.beginPath();
    context.moveTo(0, 0);
    context.lineTo(-24, -980);
    context.lineTo(24, -980);
    context.closePath();
    context.fillStyle = index % 2 === 0 ? 'rgb(53 150 255 / .17)' : 'rgb(255 216 67 / .065)';
    context.fill();
    context.restore();
  }
  context.restore();

  const centerGlow = context.createRadialGradient(540, 610, 10, 540, 610, 570);
  centerGlow.addColorStop(0, 'rgb(34 154 255 / .48)');
  centerGlow.addColorStop(.55, 'rgb(12 77 175 / .14)');
  centerGlow.addColorStop(1, 'rgb(1 6 24 / 0)');
  context.fillStyle = centerGlow;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  for (let index = 0; index < 54; index += 1) {
    const x = (index * 197 + 29) % CARD_WIDTH;
    const y = (index * 131 + 37) % 1180;
    const width = 7 + (index % 4) * 3;
    const height = 14 + (index % 3) * 8;
    const colors = ['#ffd33e', '#ff2853', '#18a8ff', '#72e16e', '#ffffff'];
    context.save();
    context.translate(x, y);
    context.rotate(((index * 47) % 180) * Math.PI / 180);
    context.globalAlpha = .52 + (index % 4) * .12;
    context.fillStyle = colors[index % colors.length];
    context.fillRect(-width / 2, -height / 2, width, height);
    context.restore();
  }

  const vignette = context.createRadialGradient(540, 620, 360, 540, 620, 850);
  vignette.addColorStop(0, 'rgb(0 0 0 / 0)');
  vignette.addColorStop(1, 'rgb(0 2 16 / .72)');
  context.fillStyle = vignette;
  context.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
}

function drawMarquee(context: CanvasRenderingContext2D) {
  context.save();
  context.shadowColor = 'rgb(0 0 0 / .72)';
  context.shadowBlur = 28;
  context.shadowOffsetY = 18;
  const marquee = context.createLinearGradient(0, 45, 0, 280);
  marquee.addColorStop(0, '#0879e7');
  marquee.addColorStop(.52, '#063b99');
  marquee.addColorStop(1, '#021d60');
  fillRoundedRect(context, 48, 42, 984, 238, 66, marquee);
  context.restore();

  const gold = context.createLinearGradient(0, 42, 0, 280);
  gold.addColorStop(0, '#fff7b1');
  gold.addColorStop(.34, '#ffd239');
  gold.addColorStop(.72, '#f39b00');
  gold.addColorStop(1, '#8d3b00');
  strokeRoundedRect(context, 48, 42, 984, 238, 66, gold, 20);
  strokeRoundedRect(context, 68, 62, 944, 198, 48, '#fff0a3', 4);

  for (let index = 0; index < 21; index += 1) {
    const x = 95 + index * 44.5;
    for (const y of [74, 248]) {
      const bulb = context.createRadialGradient(x, y, 0, x, y, 9);
      bulb.addColorStop(0, '#ffffff');
      bulb.addColorStop(.32, '#9ff2ff');
      bulb.addColorStop(1, 'rgb(24 176 255 / 0)');
      context.fillStyle = bulb;
      context.beginPath();
      context.arc(x, y, 10, 0, Math.PI * 2);
      context.fill();
    }
  }

  drawStar(context, 452, 44, 38, 18, 5, '#ffd430');
  drawStar(context, 540, 38, 54, 25, 5, '#fff9df');
  drawStar(context, 628, 44, 38, 18, 5, '#ffd430');

  const titleGold = context.createLinearGradient(0, 95, 0, 218);
  titleGold.addColorStop(0, '#fffbd5');
  titleGold.addColorStop(.26, '#ffe65e');
  titleGold.addColorStop(.63, '#ffb600');
  titleGold.addColorStop(1, '#f27b00');
  drawFittedText(context, 'VEM SA VAD?', 540, 219, 830, 130, 88, titleGold, {
    stroke: '#6e2600',
    strokeWidth: 12,
    shadowColor: 'rgb(0 0 0 / .78)',
    shadowBlur: 5,
    shadowOffsetY: 12,
  });

  const subtitle = context.createLinearGradient(0, 250, 0, 327);
  subtitle.addColorStop(0, '#132f83');
  subtitle.addColorStop(1, '#050d3c');
  fillRoundedRect(context, 248, 246, 584, 84, 42, subtitle);
  strokeRoundedRect(context, 248, 246, 584, 84, 42, '#ffffff', 9);
  strokeRoundedRect(context, 240, 238, 600, 100, 48, '#e51c35', 8);
  drawFittedText(context, 'VALSPECIAL 2026', 540, 308, 500, 51, 40, '#ffffff', {
    shadowColor: '#000000',
    shadowBlur: 3,
    shadowOffsetY: 5,
  });
}

function drawMetric(
  context: CanvasRenderingContext2D,
  x: number,
  label: string,
  value: string,
) {
  const fill = context.createLinearGradient(0, 635, 0, 746);
  fill.addColorStop(0, 'rgb(15 85 184 / .97)');
  fill.addColorStop(1, 'rgb(3 28 80 / .98)');
  fillRoundedRect(context, x, 634, 292, 112, 30, fill);
  strokeRoundedRect(context, x, 634, 292, 112, 30, '#55d8ff', 4);

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `800 22px ${BODY_FONT}`;
  context.fillStyle = '#bdeeff';
  context.fillText(label.toUpperCase(), x + 146, 671);
  context.font = `900 49px ${BRAND_FONT}`;
  context.fillStyle = '#ffffff';
  context.shadowColor = 'rgb(0 0 0 / .55)';
  context.shadowOffsetY = 4;
  context.fillText(value, x + 146, 727);
  context.restore();
}

async function loadLogo(source: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (result: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      resolve(result);
    };
    const timeout = window.setTimeout(() => finish(null), 5000);
    image.decoding = 'async';
    image.onload = () => finish(image);
    image.onerror = () => finish(null);
    image.src = new URL(source, window.location.href).href;
  });
}

function drawPartyToken(
  context: CanvasRenderingContext2D,
  loadedLogo: LoadedLogo,
  index: number,
) {
  const { party, image } = loadedLogo;
  const centerX = 77 + index * 132.25;
  const centerY = 1032;
  const radius = 50;
  const hasCorrectAnswer = party.correct > 0;
  const tokenAlpha = party.total > 0 && !hasCorrectAnswer ? .55 : party.total === 0 ? .42 : 1;

  context.save();
  context.globalAlpha = tokenAlpha;
  context.shadowColor = hasCorrectAnswer ? party.color : 'rgb(0 0 0 / .55)';
  context.shadowBlur = hasCorrectAnswer ? 23 : 8;
  context.shadowOffsetY = 7;
  const rim = context.createLinearGradient(0, centerY - radius, 0, centerY + radius);
  rim.addColorStop(0, '#fff8bd');
  rim.addColorStop(.42, '#ffd33e');
  rim.addColorStop(1, '#a84b00');
  context.fillStyle = rim;
  context.beginPath();
  context.arc(centerX, centerY, radius + 7, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';

  const token = context.createRadialGradient(centerX - 13, centerY - 18, 2, centerX, centerY, radius);
  token.addColorStop(0, '#ffffff');
  token.addColorStop(1, '#dcecff');
  context.fillStyle = token;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();

  if (image) {
    const maxSize = 64;
    const ratio = Math.min(maxSize / image.naturalWidth, maxSize / image.naturalHeight);
    const width = image.naturalWidth * ratio;
    const height = image.naturalHeight * ratio;
    context.drawImage(image, centerX - width / 2, centerY - height / 2, width, height);
  } else {
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = `900 37px ${BRAND_FONT}`;
    context.fillStyle = party.color;
    context.fillText(party.shortName, centerX, centerY + 2);
  }
  context.restore();

  const badgeText = party.total === 0
    ? '—'
    : party.total === 1
      ? (party.correct ? '✓' : '×')
      : `${party.correct}/${party.total}`;
  const perfect = party.total > 0 && party.correct === party.total;
  const partial = party.correct > 0 && !perfect;
  context.save();
  context.shadowColor = 'rgb(0 0 0 / .55)';
  context.shadowOffsetY = 4;
  context.fillStyle = perfect ? '#0ba45c' : partial ? '#d8830a' : '#d0183b';
  context.beginPath();
  context.arc(centerX + 42, centerY + 40, 25, 0, Math.PI * 2);
  context.fill();
  context.shadowColor = 'transparent';
  context.strokeStyle = '#ffffff';
  context.lineWidth = 4;
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${badgeText.length > 2 ? 19 : 25}px ${BRAND_FONT}`;
  context.fillStyle = '#ffffff';
  context.fillText(badgeText, centerX + 42, centerY + 42);
  context.restore();
}

function drawFooter(context: CanvasRenderingContext2D) {
  const callout = context.createLinearGradient(0, 1134, 0, 1232);
  callout.addColorStop(0, '#ffdb4c');
  callout.addColorStop(1, '#f39b00');
  context.save();
  context.shadowColor = 'rgb(255 184 0 / .42)';
  context.shadowBlur = 30;
  fillRoundedRect(context, 160, 1138, 760, 94, 47, callout);
  context.restore();
  strokeRoundedRect(context, 160, 1138, 760, 94, 47, '#ffffff', 6);
  drawFittedText(context, 'KAN DU SLÅ MIG?', 540, 1204, 650, 57, 43, '#071b48', {
    shadowColor: 'rgb(255 255 255 / .5)',
    shadowOffsetY: 2,
  });

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `900 39px ${BODY_FONT}`;
  context.fillStyle = '#ffffff';
  context.shadowColor = '#068cff';
  context.shadowBlur = 18;
  context.fillText('vemsavad.com', 540, 1294);
  context.font = `700 19px ${BODY_FONT}`;
  context.fillStyle = '#9ddcff';
  context.shadowColor = 'transparent';
  context.fillText('KOPPLA CITATEN TILL RÄTT PARTI', 540, 1325);
  context.restore();
}

function drawResultCard(
  context: CanvasRenderingContext2D,
  data: ResultShareCardData,
  logos: LoadedLogo[],
) {
  drawBackground(context);
  drawMarquee(context);

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `900 27px ${BODY_FONT}`;
  context.fillStyle = '#ffdf68';
  context.fillText('MIN POÄNG', 540, 394);
  context.restore();

  const pointsGold = context.createLinearGradient(0, 410, 0, 560);
  pointsGold.addColorStop(0, '#ffffff');
  pointsGold.addColorStop(.33, '#fff4a8');
  pointsGold.addColorStop(.72, '#ffd037');
  pointsGold.addColorStop(1, '#ef8e00');
  drawFittedText(
    context,
    new Intl.NumberFormat('sv-SE').format(data.points),
    540,
    558,
    850,
    180,
    122,
    pointsGold,
    {
      stroke: '#4b2300',
      strokeWidth: 9,
      shadowColor: 'rgb(255 181 0 / .55)',
      shadowBlur: 26,
      shadowOffsetY: 8,
    },
  );
  drawFittedText(context, 'POÄNG', 540, 608, 300, 40, 34, '#ffffff', {
    shadowColor: '#087eff',
    shadowBlur: 12,
  });

  drawMetric(context, 62, 'Rätt svar', `${data.correct} / ${data.totalQuestions}`);
  drawMetric(context, 394, 'Bästa svit', `× ${data.bestStreak}`);
  drawMetric(context, 726, 'Blixtsnabba', `${data.fastAnswers}`);

  if (data.recordLabel) {
    fillRoundedRect(context, 312, 765, 456, 54, 27, '#e51b3c');
    strokeRoundedRect(context, 312, 765, 456, 54, 27, '#ffffff', 4);
    drawFittedText(context, `🏆  ${data.recordLabel}`, 540, 802, 408, 29, 22, '#ffffff', {
      family: BODY_FONT,
    });
  }

  const titleY = data.recordLabel ? 892 : 856;
  drawFittedText(context, data.title.toUpperCase(), 540, titleY, 920, 67, 43, '#ffffff', {
    stroke: '#071536',
    strokeWidth: 7,
    shadowColor: 'rgb(0 0 0 / .65)',
    shadowBlur: 6,
    shadowOffsetY: 7,
  });

  context.save();
  context.textAlign = 'center';
  context.textBaseline = 'alphabetic';
  context.font = `800 23px ${BODY_FONT}`;
  context.fillStyle = '#bdeaff';
  context.fillText('MIN PARTIKOLL', 540, 949);
  context.restore();

  logos.forEach((logo, index) => drawPartyToken(context, logo, index));
  drawFooter(context);
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Kunde inte skapa resultatbilden.'));
      }, 'image/png');
    } catch (error) {
      reject(error);
    }
  });
}

export async function createResultShareCardFile(data: ResultShareCardData) {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas stöds inte av webbläsaren.');

  const images = await Promise.all(data.parties.map((party) => loadLogo(party.logo)));
  const logos = data.parties.map((party, index) => ({ party, image: images[index] ?? null }));
  drawResultCard(context, data, logos);
  const blob = await canvasToPngBlob(canvas);
  const safePoints = Math.max(0, Math.round(data.points));
  return new File([blob], `vem-sa-vad-${safePoints}-poang.png`, { type: 'image/png' });
}

export function downloadResultShareCard(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name;
  link.hidden = true;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  }
}
