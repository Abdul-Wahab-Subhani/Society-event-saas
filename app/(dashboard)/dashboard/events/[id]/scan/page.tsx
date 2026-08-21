"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import { apiFetch } from "@/lib/client/apiFetch";

type ScanResult = { kind: "success"; name: string } | { kind: "error"; message: string } | null;

export default function ScanPage({ params }: { params: { id: string } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [result, setResult] = useState<ScanResult>(null);
  const [scanning, setScanning] = useState(true);
  const [cameraError, setCameraError] = useState(false);
  const lastTokenRef = useRef<string | null>(null);
  const cooldownRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch {
        setCameraError(true);
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA && scanning && !cooldownRef.current) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data && code.data !== lastTokenRef.current) {
            lastTokenRef.current = code.data;
            handleScan(code.data);
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScan(qrToken: string) {
    cooldownRef.current = true;
    const res = await apiFetch(`/api/events/${params.id}/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrToken }),
    });
    const data = await res.json();

    setResult(res.ok ? { kind: "success", name: data.name } : { kind: "error", message: data.error ?? "Scan failed" });

    setTimeout(() => {
      cooldownRef.current = false;
      lastTokenRef.current = null;
    }, 2000);
  }

  return (
    <div>
      <Link href={`/dashboard/events/${params.id}`} className="text-sm text-ink-muted hover:text-ink">
        ← Back to event
      </Link>
      <h1 className="mt-2 font-display text-xl font-medium tracking-tight">Scan attendee QR codes</h1>
      <p className="mt-1 text-sm text-ink-muted">Point the camera at a QR code from a confirmation email.</p>

      <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-card bg-chalkboard sm:aspect-video">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder brackets */}
        {!cameraError && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-48 w-48 sm:h-56 sm:w-56">
              {(["top-0 left-0 border-t-2 border-l-2", "top-0 right-0 border-t-2 border-r-2", "bottom-0 left-0 border-b-2 border-l-2", "bottom-0 right-0 border-b-2 border-r-2"] as const).map(
                (pos) => (
                  <span key={pos} className={`absolute h-8 w-8 rounded-sm border-marigold ${pos}`} />
                )
              )}
            </div>
          </div>
        )}

        {cameraError && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-paper/70">
            Camera access denied or unavailable — check your browser permissions.
          </div>
        )}
      </div>

      {result && (
        <div
          className={`mt-4 flex items-center gap-2 rounded-lg border px-4 py-3 text-sm ${
            result.kind === "success" ? "border-success/20 bg-success-bg text-success" : "border-danger/20 bg-danger-bg text-danger"
          }`}
        >
          <span className={`stamp ${result.kind === "success" ? "text-success" : "text-danger"}`}>
            {result.kind === "success" ? "Checked in" : "Not checked in"}
          </span>
          {result.kind === "success" ? result.name : result.message}
        </div>
      )}

      <button
        onClick={() => setScanning((v) => !v)}
        className="mt-4 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:border-chalkboard/30"
      >
        {scanning ? "Pause scanning" : "Resume scanning"}
      </button>
    </div>
  );
}
