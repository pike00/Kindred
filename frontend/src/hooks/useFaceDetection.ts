import { useState, useCallback, useRef, useEffect } from "react";

interface FaceDetectionResult {
  faces: DetectedFace[];
  loading: boolean;
  error: string | null;
}

export interface DetectedFace {
  boundingBox: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  };
  confidence: number;
}

/**
 * Hook for detecting faces in an image using MediaPipe Tasks Vision API.
 * Defers WASM loading until the first detection request.
 */
export function useFaceDetection() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visionRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);
  const initPromiseRef = useRef<Promise<void> | null>(null);

  const initializeDetector = useCallback(async () => {
    // Return existing init promise to avoid race conditions
    if (initPromiseRef.current) {
      return initPromiseRef.current;
    }

    if (detectorRef.current) {
      return;
    }

    initPromiseRef.current = (async () => {
      try {
        setLoading(true);
        setError(null);

        // Dynamic import to defer WASM loading until needed
        const { FaceDetector, FilesetResolver } = await import(
          "@mediapipe/tasks-vision"
        );

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm"
        );
        visionRef.current = vision;

        detectorRef.current = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
            delegate: "GPU",
          },
          runningMode: "IMAGE",
        });
      } catch (err) {
        console.error("Failed to initialize face detector:", err);
        setError(
          err instanceof Error
            ? err.message
            : "Failed to initialize face detector"
        );
        // Reset refs on failure so we can retry
        visionRef.current = null;
        detectorRef.current = null;
        initPromiseRef.current = null;
        throw err;
      } finally {
        setLoading(false);
      }
    })();

    return initPromiseRef.current;
  }, []);

  const detectFaces = useCallback(
    async (imageElement: HTMLImageElement | HTMLCanvasElement): Promise<DetectedFace[]> => {
      try {
        setLoading(true);
        setError(null);

        await initializeDetector();

        if (!detectorRef.current) {
          throw new Error("Face detector not initialized");
        }

        // Create a canvas from the image if needed
        let canvas: HTMLCanvasElement;
        if (imageElement instanceof HTMLCanvasElement) {
          canvas = imageElement;
        } else {
          canvas = document.createElement("canvas");
          canvas.width = imageElement.naturalWidth || imageElement.width;
          canvas.height = imageElement.naturalHeight || imageElement.height;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(imageElement, 0, 0);
        }

        // Detect faces
        const result = detectorRef.current.detect(canvas);

        if (!result || !result.detections || result.detections.length === 0) {
          return [];
        }

        const faces: DetectedFace[] = result.detections.map((detection: any) => {
          const bbox = detection.boundingBox;
          return {
            boundingBox: {
              originX: bbox.originX,
              originY: bbox.originY,
              width: bbox.width,
              height: bbox.height,
            },
            confidence: detection.categories?.[0]?.score || 0,
          };
        });

        return faces;
      } catch (err) {
        console.error("Face detection failed:", err);
        const message =
          err instanceof Error ? err.message : "Face detection failed";
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [initializeDetector]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectorRef.current) {
        detectorRef.current.close?.();
        detectorRef.current = null;
      }
    };
  }, []);

  return {
    detectFaces,
    loading,
    error,
  };
}
