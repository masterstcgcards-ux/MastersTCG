export type CardOcrResult = {
  name: string;
  setName: string;
  cardNumber: string;
  localId: string;
  rawText: string;
  confidence: number;
  catalogMatched: boolean;
};

type ProgressCallback = (progress: number, status: string) => void;

type CardBrief = {
  id: string;
  localId: string;
  name: string;
  language?: "pt-br" | "en";
};

type CardDetail = CardBrief & {
  set?: {
    name?: string;
    cardCount?: {
      official?: number;
      total?: number;
    };
  };
};

function normalizeLine(value: string) {
  return value
    .replace(/[|[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForComparison(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase();
}

function normalizeLocalId(value: string) {
  return value
    .replace(/\s+/g, "")
    .replace(/^0+(?=\d)/, "")
    .toUpperCase();
}

function extractCardNumber(text: string) {
  const normalizedText = text
    .replace(/[|Il]/g, "1")
    .replace(/[Oo](?=\d)/g, "0")
    .replace(/\s*[/\\]\s*/g, "/");
  const matches = normalizedText.matchAll(
    /\b([A-Z]{0,4}\s?\d{1,4})\/([A-Z]{0,4}\s?\d{1,4})\b/gi,
  );

  for (const match of matches) {
    const numerator = match[1].replace(/\s+/g, "").toUpperCase();
    const denominator = match[2].replace(/\s+/g, "").toUpperCase();

    return {
      cardNumber: `${numerator}/${denominator}`,
      localId: normalizeLocalId(numerator),
    };
  }

  return {
    cardNumber: "",
    localId: "",
  };
}

function cleanNameLine(line: string) {
  return normalizeLine(line)
    .replace(/^(?:b[aá]sico|basic|est[aá]gio\s*\d+|stage\s*\d+)\s*/i, "")
    .replace(/\b(?:pv|hp)\s*\d{1,3}\b.*$/i, "")
    .replace(/\s+\d{2,3}\s*$/i, "")
    .replace(/^[^a-záàâãéêíóôõúç]+/i, "")
    .replace(/[^a-z0-9áàâãéêíóôõúç.'’\-\s]+$/i, "")
    .trim();
}

function looksLikeCardName(line: string) {
  const normalized = line.toLocaleLowerCase("pt-BR");
  const ignoredTerms = [
    "pokémon",
    "pokemon",
    "básico",
    "basico",
    "basic",
    "estágio",
    "estagio",
    "stage",
    "treinador",
    "trainer",
    "energia",
    "energy",
    "fraqueza",
    "weakness",
    "resistência",
    "resistencia",
    "resistance",
    "recuo",
    "retreat",
    "ilustração",
    "illustration",
    "regra",
    "rule",
  ];

  if (
    ignoredTerms.some(
      (term) => normalized === term || normalized.startsWith(`${term} `),
    )
  ) {
    return false;
  }

  if (!/[a-záàâãéêíóôõúç]/i.test(line)) return false;
  if (line.length < 2 || line.length > 55) return false;
  if (line.split(/\s+/).length > 8) return false;
  if (/^(?:\d+|[x×+\-]\d+)$/i.test(line)) return false;

  return true;
}

function extractName(text: string) {
  const candidates = text
    .split(/\r?\n/)
    .map(cleanNameLine)
    .filter(Boolean)
    .filter(looksLikeCardName)
    .filter((line) => !/[.!?]{2,}/.test(line));

  return candidates[0] || "";
}

function levenshteinDistance(first: string, second: string) {
  const rows = first.length + 1;
  const columns = second.length + 1;
  const matrix = Array.from({ length: rows }, () =>
    Array<number>(columns).fill(0),
  );

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row;
  for (let column = 0; column < columns; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = first[row - 1] === second[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[first.length][second.length];
}

function similarity(first: string, second: string) {
  const normalizedFirst = normalizeForComparison(first);
  const normalizedSecond = normalizeForComparison(second);

  if (!normalizedFirst || !normalizedSecond) return 0;
  if (
    normalizedFirst.includes(normalizedSecond) ||
    normalizedSecond.includes(normalizedFirst)
  ) {
    return 0.95;
  }

  const longest = Math.max(normalizedFirst.length, normalizedSecond.length);
  return 1 - levenshteinDistance(normalizedFirst, normalizedSecond) / longest;
}

async function searchCatalog(name: string, localId: string) {
  if (!name) return null;

  const usefulWords = name
    .split(/\s+/)
    .map((word) => word.replace(/[^a-záàâãéêíóôõúç0-9-]/gi, ""))
    .filter((word) => word.length >= 4)
    .filter((word) => !/^(?:basic|básico|estágio|stage)$/i.test(word));
  const queries = Array.from(
    new Set([name, usefulWords[0] || ""].map((value) => value.trim())),
  ).filter(Boolean);
  const cards = new Map<string, CardBrief>();

  for (const language of ["pt-br", "en"] as const) {
    for (const query of queries) {
      try {
        const url = new URL(`https://api.tcgdex.net/v2/${language}/cards`);
        url.searchParams.set("name", query);
        url.searchParams.set("pagination:page", "1");
        url.searchParams.set("pagination:itemsPerPage", "100");
        const response = await fetch(url, {
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) continue;

        const result = (await response.json()) as CardBrief[];
        result.forEach((card) =>
          cards.set(`${language}-${card.id}`, { ...card, language }),
        );

        if (cards.size > 0) break;
      } catch {
        // A consulta é apenas uma confirmação extra. O OCR local continua.
      }
    }

    if (cards.size > 0) break;
  }

  if (cards.size === 0) return null;

  const normalizedLocalId = normalizeLocalId(localId);
  const ranked = [...cards.values()]
    .map((card) => {
      const nameScore = similarity(name, card.name);
      const numberMatches = Boolean(
        normalizedLocalId &&
        normalizeLocalId(card.localId) === normalizedLocalId,
      );

      return {
        card,
        score: nameScore + (numberMatches ? 1.5 : 0),
        numberMatches,
      };
    })
    .sort((first, second) => second.score - first.score);
  const best = ranked[0];

  if (!best || (!best.numberMatches && best.score < 0.58)) return null;

  try {
    const response = await fetch(
      `https://api.tcgdex.net/v2/${best.card.language || "pt-br"}/cards/${encodeURIComponent(best.card.id)}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!response.ok) return null;

    return (await response.json()) as CardDetail;
  } catch {
    return null;
  }
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Não foi possível preparar a imagem para leitura."));
    };

    image.src = url;
  });
}

function prepareRegion(
  image: HTMLImageElement,
  startY: number,
  heightRatio: number,
  threshold: boolean,
) {
  const sourceX = image.naturalWidth * 0.02;
  const sourceY = image.naturalHeight * startY;
  const sourceWidth = image.naturalWidth * 0.96;
  const sourceHeight = image.naturalHeight * heightRatio;
  const scale = Math.min(3, 1800 / Math.max(1, sourceWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Não foi possível preparar a leitura da carta.");
  }

  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);

  for (let index = 0; index < pixels.data.length; index += 4) {
    const gray =
      pixels.data[index] * 0.299 +
      pixels.data[index + 1] * 0.587 +
      pixels.data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (gray - 128) * 1.75 + 128));
    const value = threshold ? (contrasted > 150 ? 255 : 0) : contrasted;

    pixels.data[index] = value;
    pixels.data[index + 1] = value;
    pixels.data[index + 2] = value;
  }

  context.putImageData(pixels, 0, 0);
  return canvas;
}

export async function recognizePokemonCard(
  file: File,
  onProgress?: ProgressCallback,
): Promise<CardOcrResult> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");
  let phase = 0;
  const worker = await createWorker(["por", "eng"], OEM.LSTM_ONLY, {
    logger(message) {
      if (
        message.status === "recognizing text" &&
        typeof message.progress === "number"
      ) {
        const progress = Math.round((phase / 3 + message.progress / 3) * 85);
        onProgress?.(
          Math.min(85, Math.max(1, progress)),
          phase === 0 ? "Lendo o nome da carta" : "Lendo o número da carta",
        );
      }
    },
  });

  try {
    const image = await loadImage(file);
    const topRegion = prepareRegion(image, 0.015, 0.22, false);
    const bottomGrayRegion = prepareRegion(image, 0.72, 0.265, false);
    const bottomBinaryRegion = prepareRegion(image, 0.72, 0.265, true);

    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });

    phase = 0;
    const topResult = await worker.recognize(topRegion);
    phase = 1;
    const bottomGrayResult = await worker.recognize(bottomGrayRegion);
    phase = 2;
    const bottomBinaryResult = await worker.recognize(bottomBinaryRegion);
    const bottomText = `${bottomGrayResult.data.text}\n${bottomBinaryResult.data.text}`;
    const combinedText = `${topResult.data.text}\n${bottomText}`.trim();
    const name = extractName(topResult.data.text);
    const { cardNumber, localId } = extractCardNumber(bottomText);

    onProgress?.(88, "Conferindo no catálogo Pokémon");
    const catalogCard = await searchCatalog(name, localId);
    const officialCount = catalogCard?.set?.cardCount?.official;
    const confirmedLocalId = catalogCard?.localId || localId;
    const confirmedNumber =
      catalogCard && confirmedLocalId && officialCount
        ? `${confirmedLocalId}/${officialCount}`
        : cardNumber;

    return {
      name: catalogCard?.name || name,
      setName: catalogCard?.set?.name || "",
      cardNumber: confirmedNumber,
      localId: confirmedLocalId,
      rawText: combinedText,
      confidence: Math.round(
        (topResult.data.confidence +
          bottomGrayResult.data.confidence +
          bottomBinaryResult.data.confidence) /
          3,
      ),
      catalogMatched: Boolean(catalogCard),
    };
  } finally {
    await worker.terminate();
  }
}
