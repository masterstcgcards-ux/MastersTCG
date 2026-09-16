export type CardOcrResult = {
  name: string;
  cardNumber: string;
  localId: string;
  rawText: string;
  confidence: number;
};

type ProgressCallback = (progress: number, status: string) => void;

function normalizeLine(value: string) {
  return value
    .replace(/[|[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCardNumber(text: string) {
  const normalizedText = text.replace(/[|]/g, "/").replace(/\s*\/\s*/g, "/");

  const match = normalizedText.match(
    /\b([A-Z]{0,4}\s?\d{1,4})\/([A-Z]{0,4}\s?\d{1,4})\b/i,
  );

  if (!match) {
    return {
      cardNumber: "",
      localId: "",
    };
  }

  const numerator = match[1].replace(/\s+/g, "").toUpperCase();
  const denominator = match[2].replace(/\s+/g, "").toUpperCase();

  return {
    cardNumber: `${numerator}/${denominator}`,
    localId: numerator.replace(/^0+(?=\d)/, ""),
  };
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

  if (/\b(?:hp|pv)\s*\d+/i.test(line)) {
    return false;
  }

  if (!/[a-záàâãéêíóôõúç]/i.test(line)) {
    return false;
  }

  if (line.length < 2 || line.length > 45) {
    return false;
  }

  const words = line.split(/\s+/);

  if (words.length > 6) {
    return false;
  }

  return true;
}

function extractName(text: string) {
  const lines = text.split(/\r?\n/).map(normalizeLine).filter(Boolean);

  const candidates = lines
    .slice(0, 12)
    .filter(looksLikeCardName)
    .filter((line) => !/[.!?]{2,}/.test(line));

  return candidates[0] || "";
}

export async function recognizePokemonCard(
  file: File,
  onProgress?: ProgressCallback,
): Promise<CardOcrResult> {
  const { createWorker, OEM, PSM } = await import("tesseract.js");

  const worker = await createWorker(["por", "eng"], OEM.LSTM_ONLY, {
    logger(message) {
      if (
        message.status === "recognizing text" &&
        typeof message.progress === "number"
      ) {
        onProgress?.(
          Math.round(message.progress * 100),
          "Lendo as informações da carta",
        );
      }
    },
  });

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
    });

    const {
      data: { text, confidence },
    } = await worker.recognize(file);

    const { cardNumber, localId } = extractCardNumber(text);

    return {
      name: extractName(text),
      cardNumber,
      localId,
      rawText: text.trim(),
      confidence: Math.round(confidence),
    };
  } finally {
    await worker.terminate();
  }
}
