"use client";

import { useEffect, useRef, useState } from "react";

type CardCameraScannerProps = {
  disabled?: boolean;
  onCapture: (file: File) => void;
};

export function CardCameraScanner({
  disabled = false,
  onCapture,
}: CardCameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const cameraStageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [open, setOpen] = useState(false);
  const [starting, setStarting] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState("");

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setOpen(false);
    setStarting(false);
    setCapturing(false);
  }

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera() {
    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setError(
        "Este navegador não permite acessar a câmera. Use a opção de escolher uma foto.",
      );
      return;
    }

    setOpen(true);
    setStarting(true);
    setError("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1920,
          },
          height: {
            ideal: 1080,
          },
        },
      });

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error("Não foi possível preparar a câmera.");
      }

      video.srcObject = stream;

      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => resolve();
      });

      await video.play();
    } catch (cameraError) {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      setError(
        cameraError instanceof DOMException &&
          cameraError.name === "NotAllowedError"
          ? "A câmera foi bloqueada. Autorize o acesso nas configurações do navegador."
          : "Não foi possível abrir a câmera. Você ainda pode escolher uma foto da galeria.",
      );

      setOpen(false);
    } finally {
      setStarting(false);
    }
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const cameraStage = cameraStageRef.current;

    if (
      !video ||
      !cameraStage ||
      video.videoWidth === 0 ||
      video.videoHeight === 0 ||
      capturing
    ) {
      return;
    }

    setCapturing(true);
    setError("");

    try {
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const stageRatio =
        cameraStage.clientWidth / Math.max(1, cameraStage.clientHeight);
      const videoRatio = videoWidth / videoHeight;

      let sourceX = 0;
      let sourceY = 0;
      let sourceWidth = videoWidth;
      let sourceHeight = videoHeight;

      // O vídeo usa object-cover. Este cálculo captura exatamente a região
      // que a pessoa viu na tela, sem aplicar ainda o recorte da carta.
      if (videoRatio > stageRatio) {
        sourceWidth = videoHeight * stageRatio;
        sourceX = (videoWidth - sourceWidth) / 2;
      } else {
        sourceHeight = videoWidth / stageRatio;
        sourceY = (videoHeight - sourceHeight) / 2;
      }

      const maximumSide = 1800;
      const scale = Math.min(
        1,
        maximumSide / Math.max(sourceWidth, sourceHeight),
      );
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(sourceWidth * scale));
      canvas.height = Math.max(1, Math.round(sourceHeight * scale));

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Não foi possível processar a fotografia.");
      }

      context.drawImage(
        video,
        sourceX,
        sourceY,
        sourceWidth,
        sourceHeight,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/jpeg", 0.92);
      });

      if (!blob) {
        throw new Error("Não foi possível gerar a fotografia.");
      }

      const file = new File([blob], `captura-carta-${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      onCapture(file);
      stopCamera();
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : "Não foi possível capturar a fotografia.",
      );

      setCapturing(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={startCamera}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-blue-600 bg-blue-50 px-4 py-3 font-black text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">📷</span>
        Escanear com a câmera
      </button>

      {error && !open && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Escanear carta"
          className="fixed inset-0 z-50 flex flex-col bg-black"
        >
          <div className="flex items-center justify-between gap-4 bg-black/90 px-5 py-4 text-white">
            <div>
              <p className="font-black">MastersTCG Scan</p>

              <p className="mt-1 text-xs text-white/70">
                Centralize toda a carta dentro da moldura.
              </p>
            </div>

            <button
              type="button"
              onClick={stopCamera}
              className="rounded-xl border border-white/30 px-4 py-2 text-sm font-bold"
            >
              Fechar
            </button>
          </div>

          <div
            ref={cameraStageRef}
            className="relative min-h-0 flex-1 overflow-hidden bg-black"
          >
            <video
              ref={videoRef}
              muted
              playsInline
              autoPlay
              className="h-full w-full object-cover"
            />

            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/20"
            >
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/30 bg-[#071a4c]/90 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg">
                <span className="text-yellow-400">✦</span>
                MastersTCG Scan
              </div>

              <div className="relative aspect-[5/7] w-[72vw] max-w-[360px] overflow-hidden rounded-[24px] border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.42)]">
                <span className="absolute left-0 top-0 h-16 w-16 rounded-tl-[22px] border-l-[6px] border-t-[6px] border-yellow-400" />
                <span className="absolute right-0 top-0 h-16 w-16 rounded-tr-[22px] border-r-[6px] border-t-[6px] border-yellow-400" />
                <span className="absolute bottom-0 left-0 h-16 w-16 rounded-bl-[22px] border-b-[6px] border-l-[6px] border-blue-500" />
                <span className="absolute bottom-0 right-0 h-16 w-16 rounded-br-[22px] border-b-[6px] border-r-[6px] border-blue-500" />

                <div className="absolute left-4 right-4 top-1/2 h-0.5 animate-pulse bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_12px_rgba(96,165,250,1)]" />

                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#071a4c]/85 px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-white">
                  Mantenha a carta dentro da área
                </div>
              </div>

              <p className="mt-4 rounded-full bg-black/60 px-4 py-2 text-center text-xs font-semibold text-white">
                Frente da carta • sem reflexos • boa iluminação
              </p>
            </div>

            {starting && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white">
                <p role="status" className="font-bold">
                  Abrindo a câmera...
                </p>
              </div>
            )}

            {error && (
              <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-red-300 bg-red-950/90 p-4 text-sm font-semibold text-white">
                {error}
              </div>
            )}
          </div>

          <div className="bg-black/90 px-5 py-5">
            <p className="mb-4 text-center text-sm text-white/70">
              Evite reflexos e mantenha a carta sobre uma superfície lisa.
            </p>

            <button
              type="button"
              disabled={starting || capturing}
              onClick={capturePhoto}
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-blue-600 shadow-lg transition active:scale-95 disabled:opacity-50"
              aria-label="Fotografar carta"
            >
              <span
                aria-hidden="true"
                className="h-14 w-14 rounded-full border-2 border-white/70 bg-white"
              />
            </button>

            <p className="mt-3 text-center text-xs font-semibold text-white">
              {capturing ? "Processando foto..." : "Toque para fotografar"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
