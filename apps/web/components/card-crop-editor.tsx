"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

type Point = {
  x: number;
  y: number;
};

type CardCropEditorProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
};

const OUTPUT_WIDTH = 750;
const OUTPUT_HEIGHT = 1050;
const FRAME_INSET_X = 15;
const FRAME_INSET_Y = 21;
const CARD_WIDTH = 720;
const CARD_HEIGHT = 1008;

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
      reject(new Error("Não foi possível abrir a fotografia."));
    };

    image.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Não foi possível gerar o recorte da carta."));
        }
      },
      "image/jpeg",
      0.94,
    );
  });
}

function defaultPoints(width: number, height: number): Point[] {
  return [
    { x: width * 0.14, y: height * 0.08 },
    { x: width * 0.86, y: height * 0.08 },
    { x: width * 0.86, y: height * 0.92 },
    { x: width * 0.14, y: height * 0.92 },
  ];
}

function clampPoint(
  index: number,
  point: Point,
  width: number,
  height: number,
) {
  const padding = 4;
  const leftSide = index === 0 || index === 3;
  const topSide = index === 0 || index === 1;

  return {
    x: Math.min(
      leftSide ? width * 0.49 : width - padding,
      Math.max(leftSide ? padding : width * 0.51, point.x),
    ),
    y: Math.min(
      topSide ? height * 0.49 : height - padding,
      Math.max(topSide ? padding : height * 0.51, point.y),
    ),
  };
}

function sampleBilinear(
  source: ImageData,
  x: number,
  y: number,
  output: Uint8ClampedArray,
  outputIndex: number,
) {
  const maxX = source.width - 1;
  const maxY = source.height - 1;
  const safeX = Math.min(maxX, Math.max(0, x));
  const safeY = Math.min(maxY, Math.max(0, y));
  const x0 = Math.floor(safeX);
  const y0 = Math.floor(safeY);
  const x1 = Math.min(maxX, x0 + 1);
  const y1 = Math.min(maxY, y0 + 1);
  const xWeight = safeX - x0;
  const yWeight = safeY - y0;
  const topLeft = (y0 * source.width + x0) * 4;
  const topRight = (y0 * source.width + x1) * 4;
  const bottomLeft = (y1 * source.width + x0) * 4;
  const bottomRight = (y1 * source.width + x1) * 4;

  for (let channel = 0; channel < 4; channel += 1) {
    const top =
      source.data[topLeft + channel] * (1 - xWeight) +
      source.data[topRight + channel] * xWeight;
    const bottom =
      source.data[bottomLeft + channel] * (1 - xWeight) +
      source.data[bottomRight + channel] * xWeight;

    output[outputIndex + channel] = top * (1 - yWeight) + bottom * yWeight;
  }
}

function warpCard(sourceCanvas: HTMLCanvasElement, points: Point[]) {
  const sourceContext = sourceCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!sourceContext) {
    throw new Error("Não foi possível processar a fotografia.");
  }

  const source = sourceContext.getImageData(
    0,
    0,
    sourceCanvas.width,
    sourceCanvas.height,
  );
  const warpedCanvas = document.createElement("canvas");
  warpedCanvas.width = CARD_WIDTH;
  warpedCanvas.height = CARD_HEIGHT;
  const warpedContext = warpedCanvas.getContext("2d");

  if (!warpedContext) {
    throw new Error("Não foi possível endireitar a carta.");
  }

  const output = warpedContext.createImageData(CARD_WIDTH, CARD_HEIGHT);
  const [topLeft, topRight, bottomRight, bottomLeft] = points;
  const dx1 = topRight.x - bottomRight.x;
  const dx2 = bottomLeft.x - bottomRight.x;
  const dx3 = topLeft.x - topRight.x + bottomRight.x - bottomLeft.x;
  const dy1 = topRight.y - bottomRight.y;
  const dy2 = bottomLeft.y - bottomRight.y;
  const dy3 = topLeft.y - topRight.y + bottomRight.y - bottomLeft.y;
  const denominator = dx1 * dy2 - dx2 * dy1;

  if (Math.abs(denominator) < 0.0001) {
    throw new Error(
      "A área marcada não é válida. Reposicione os quatro pontos.",
    );
  }

  const perspectiveX = (dx3 * dy2 - dx2 * dy3) / denominator;
  const perspectiveY = (dx1 * dy3 - dx3 * dy1) / denominator;
  const a = topRight.x - topLeft.x + perspectiveX * topRight.x;
  const b = bottomLeft.x - topLeft.x + perspectiveY * bottomLeft.x;
  const c = topLeft.x;
  const d = topRight.y - topLeft.y + perspectiveX * topRight.y;
  const e = bottomLeft.y - topLeft.y + perspectiveY * bottomLeft.y;
  const f = topLeft.y;

  for (let outputY = 0; outputY < CARD_HEIGHT; outputY += 1) {
    const v = outputY / Math.max(1, CARD_HEIGHT - 1);

    for (let outputX = 0; outputX < CARD_WIDTH; outputX += 1) {
      const u = outputX / Math.max(1, CARD_WIDTH - 1);
      const divisor = perspectiveX * u + perspectiveY * v + 1;
      const sourceX = (a * u + b * v + c) / divisor;
      const sourceY = (d * u + e * v + f) / divisor;
      const outputIndex = (outputY * CARD_WIDTH + outputX) * 4;

      sampleBilinear(source, sourceX, sourceY, output.data, outputIndex);
    }
  }

  warpedContext.putImageData(output, 0, 0);
  return warpedCanvas;
}

function addMastersFrame(warpedCanvas: HTMLCanvasElement) {
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = OUTPUT_WIDTH;
  outputCanvas.height = OUTPUT_HEIGHT;
  const context = outputCanvas.getContext("2d");

  if (!context) {
    throw new Error("Não foi possível finalizar a moldura.");
  }

  context.fillStyle = "#071a4c";
  context.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  context.fillStyle = "#facc15";
  context.fillRect(FRAME_INSET_X, 8, CARD_WIDTH, 7);
  context.fillStyle = "#2563eb";
  context.fillRect(FRAME_INSET_X, OUTPUT_HEIGHT - 15, CARD_WIDTH, 7);
  context.fillStyle = "#ffffff";
  context.fillRect(
    FRAME_INSET_X - 2,
    FRAME_INSET_Y - 2,
    CARD_WIDTH + 4,
    CARD_HEIGHT + 4,
  );
  context.drawImage(
    warpedCanvas,
    FRAME_INSET_X,
    FRAME_INSET_Y,
    CARD_WIDTH,
    CARD_HEIGHT,
  );

  return outputCanvas;
}

export function CardCropEditor({
  file,
  onCancel,
  onConfirm,
}: CardCropEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggingRef = useRef<number | null>(null);

  const [points, setPoints] = useState<Point[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function prepareImage() {
      try {
        const image = await loadImage(file);

        if (!active) return;

        const maximumSide = 1600;
        const scale = Math.min(
          1,
          maximumSide / Math.max(image.naturalWidth, image.naturalHeight),
        );
        const canvas = canvasRef.current;

        if (!canvas) return;

        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");

        if (!context) {
          throw new Error("Não foi possível preparar a fotografia.");
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setPoints(defaultPoints(canvas.width, canvas.height));
      } catch (imageError) {
        if (active) {
          setError(
            imageError instanceof Error
              ? imageError.message
              : "Não foi possível preparar a fotografia.",
          );
        }
      }
    }

    void prepareImage();

    return () => {
      active = false;
    };
  }, [file]);

  function movePoint(
    index: number,
    event: ReactPointerEvent<HTMLButtonElement>,
  ) {
    if (draggingRef.current !== index) return;

    const canvas = canvasRef.current;
    const wrapper = event.currentTarget.parentElement;

    if (!canvas || !wrapper) return;

    const rectangle = wrapper.getBoundingClientRect();
    const point = clampPoint(
      index,
      {
        x: ((event.clientX - rectangle.left) / rectangle.width) * canvas.width,
        y: ((event.clientY - rectangle.top) / rectangle.height) * canvas.height,
      },
      canvas.width,
      canvas.height,
    );

    setPoints((current) =>
      current.map((currentPoint, pointIndex) =>
        pointIndex === index ? point : currentPoint,
      ),
    );
  }

  async function confirmCrop() {
    const canvas = canvasRef.current;

    if (!canvas || points.length !== 4 || processing) return;

    setProcessing(true);
    setError("");

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      const warpedCanvas = warpCard(canvas, points);
      const outputCanvas = addMastersFrame(warpedCanvas);
      const blob = await canvasToBlob(outputCanvas);
      const outputFile = new File(
        [blob],
        `carta-masterstcg-${Date.now()}.jpg`,
        {
          type: "image/jpeg",
          lastModified: Date.now(),
        },
      );

      onConfirm(outputFile);
    } catch (cropError) {
      setError(
        cropError instanceof Error
          ? cropError.message
          : "Não foi possível recortar a carta.",
      );
      setProcessing(false);
    }
  }

  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar enquadramento da carta"
      className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[#020617] text-white"
    >
      <header className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-4">
        <div>
          <p className="font-black">Ajustar carta</p>
          <p className="mt-1 text-xs text-white/65">
            Arraste os quatro pontos até os cantos reais da carta.
          </p>
        </div>

        <button
          type="button"
          disabled={processing}
          onClick={onCancel}
          className="rounded-xl border border-white/25 px-4 py-2 text-sm font-bold disabled:opacity-50"
        >
          Cancelar
        </button>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-3 py-5 sm:px-6">
        <div className="mb-4 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-center text-sm text-yellow-100">
          Inclua somente a carta. A mesa, o teclado e outros objetos devem ficar
          fora das linhas.
        </div>

        <div className="relative w-full max-w-2xl touch-none select-none overflow-hidden rounded-2xl border border-white/20 bg-black shadow-2xl">
          <canvas ref={canvasRef} className="block h-auto w-full" />

          {points.length === 4 && (
            <>
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
                viewBox={`0 0 ${canvasRef.current?.width || 1} ${
                  canvasRef.current?.height || 1
                }`}
                preserveAspectRatio="none"
              >
                <polygon
                  points={polygon}
                  fill="rgba(37, 99, 235, 0.10)"
                  stroke="#facc15"
                  strokeWidth="6"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>

              {points.map((point, index) => (
                <button
                  key={index}
                  type="button"
                  aria-label={`Canto ${index + 1}`}
                  onPointerDown={(event) => {
                    draggingRef.current = index;
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }}
                  onPointerMove={(event) => movePoint(index, event)}
                  onPointerUp={(event) => {
                    draggingRef.current = null;
                    if (
                      event.currentTarget.hasPointerCapture(event.pointerId)
                    ) {
                      event.currentTarget.releasePointerCapture(
                        event.pointerId,
                      );
                    }
                  }}
                  onPointerCancel={() => {
                    draggingRef.current = null;
                  }}
                  className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 touch-none rounded-full border-[5px] border-white bg-blue-600 shadow-[0_0_0_3px_rgba(250,204,21,0.9)]"
                  style={{
                    left: `${(point.x / (canvasRef.current?.width || 1)) * 100}%`,
                    top: `${(point.y / (canvasRef.current?.height || 1)) * 100}%`,
                  }}
                />
              ))}
            </>
          )}
        </div>

        {error && (
          <p
            role="alert"
            className="mt-4 w-full max-w-2xl rounded-xl border border-red-400/40 bg-red-950/70 p-4 text-sm font-semibold text-red-100"
          >
            {error}
          </p>
        )}
      </main>

      <footer className="border-t border-white/10 bg-[#020617]/95 px-5 py-5">
        <button
          type="button"
          disabled={processing || points.length !== 4}
          onClick={confirmCrop}
          className="mx-auto flex min-h-12 w-full max-w-2xl items-center justify-center rounded-xl bg-blue-600 px-6 py-3 font-black text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {processing
            ? "Recortando e endireitando..."
            : "Confirmar enquadramento"}
        </button>
      </footer>
    </div>
  );
}
