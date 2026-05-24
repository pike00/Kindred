import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useRef, useState } from "react"
import type { ContactPublic } from "@/client"
import { ContactsService } from "@/client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import useCustomToast from "@/hooks/useCustomToast"
import { AlertCircle, Camera, Crop, RefreshCw, Upload } from "@/lib/icons"

// Face detection types
interface DetectedFace {
  boundingBox: {
    originX: number
    originY: number
    width: number
    height: number
  }
  confidence: number
}

interface CropArea {
  x: number
  y: number
  size: number
}

interface AvatarUploadDialogProps {
  contact: ContactPublic
  trigger?: React.ReactNode
}

// Default JPEG quality for avatar compression
const DEFAULT_JPEG_QUALITY = 0.85

export function AvatarUploadDialog({
  contact,
  trigger,
}: AvatarUploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, size: 200 })
  const [faces, setFaces] = useState<DetectedFace[]>([])
  const [selectedFaceIndex, setSelectedFaceIndex] = useState<number>(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const [manualCrop, setManualCrop] = useState(false)
  const [jpegQuality, setJpegQuality] = useState(DEFAULT_JPEG_QUALITY)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { showSuccessToast, showErrorToast } = useCustomToast()
  const queryClient = useQueryClient()

  // Cleanup preview URL on close
  useEffect(() => {
    if (!open) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      setSelectedFile(null)
      setPreviewUrl(null)
      setFaces([])
      setCropArea({ x: 0, y: 0, size: 200 })
      setManualCrop(false)
      setSelectedFaceIndex(0)
    }
  }, [open, previewUrl])

  // Run face detection when image loads
  const handleImageLoad = useCallback(async () => {
    if (!imageRef.current || !previewUrl) return

    setIsDetecting(true)
    setFaces([])
    setManualCrop(false)

    try {
      // Dynamic import of MediaPipe tasks-vision
      const { FilesetResolver, FaceDetector } = await import(
        "@mediapipe/tasks-vision"
      )

      const filesetResolver = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm",
      )

      const detector = await FaceDetector.createFromOptions(filesetResolver, {
        baseOptions: {
          delegate: "GPU",
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite",
        },
        runningMode: "IMAGE",
      })

      const img = imageRef.current
      const detections = detector.detect(img).detections

      if (detections && detections.length > 0) {
        const detectedFaces: DetectedFace[] = detections.map((det) => ({
          boundingBox: {
            originX: det.boundingBox?.originX ?? 0,
            originY: det.boundingBox?.originY ?? 0,
            width: det.boundingBox?.width ?? 0,
            height: det.boundingBox?.height ?? 0,
          },
          confidence: det.categories?.[0]?.score ?? 0,
        }))

        // Sort by area (largest first)
        detectedFaces.sort(
          (a, b) =>
            b.boundingBox.width * b.boundingBox.height -
            a.boundingBox.width * a.boundingBox.height,
        )

        setFaces(detectedFaces)
        setSelectedFaceIndex(0)

        // Auto-center crop on largest face
        const largestFace = detectedFaces[0]
        const imgEl = imageRef.current
        if (imgEl) {
          const scaleX = imgEl.naturalWidth / imgEl.width
          const scaleY = imgEl.naturalHeight / imgEl.height

          const faceCenterX =
            (largestFace.boundingBox.originX +
              largestFace.boundingBox.width / 2) /
            scaleX
          const faceCenterY =
            (largestFace.boundingBox.originY +
              largestFace.boundingBox.height / 2) /
            scaleY

          // Start crop at 60% of face width, minimum 50px
          const cropSize = Math.max(
            (largestFace.boundingBox.width / scaleX) * 0.6,
            50,
          )

          setCropArea({
            x: Math.max(0, faceCenterX - cropSize / 2),
            y: Math.max(0, faceCenterY - cropSize / 2),
            size: cropSize,
          })
        }
      } else {
        // No faces detected - fallback to center crop
        setManualCrop(true)
        const imgEl = imageRef.current
        if (imgEl) {
          const minDim = Math.min(imgEl.width, imgEl.height)
          setCropArea({
            x: (imgEl.width - minDim) / 2,
            y: (imgEl.height - minDim) / 2,
            size: minDim,
          })
        }
      }

      detector.close()
    } catch (error) {
      console.warn("Face detection failed, falling back to center crop:", error)
      // Fallback to center crop
      setManualCrop(true)
      const imgEl = imageRef.current
      if (imgEl) {
        const minDim = Math.min(imgEl.width, imgEl.height)
        setCropArea({
          x: (imgEl.width - minDim) / 2,
          y: (imgEl.height - minDim) / 2,
          size: minDim,
        })
      }
    } finally {
      setIsDetecting(false)
    }
  }, [previewUrl])

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showErrorToast("Please select an image file")
      return
    }

    setSelectedFile(file)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
  }

  // Handle crop area drag
  const handleCropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!manualCrop) return
    setIsDragging(true)
    const rect = e.currentTarget.getBoundingClientRect()
    setDragStart({
      x: e.clientX - rect.left - cropArea.x,
      y: e.clientY - rect.top - cropArea.y,
    })
  }

  const handleCropMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !manualCrop) return
    const rect = e.currentTarget.getBoundingClientRect()
    const newX = e.clientX - rect.left - dragStart.x
    const newY = e.clientY - rect.top - dragStart.y

    const imgEl = imageRef.current
    if (imgEl) {
      setCropArea((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(newX, imgEl.width - prev.size)),
        y: Math.max(0, Math.min(newY, imgEl.height - prev.size)),
      }))
    }
  }

  const handleCropMouseUp = () => {
    setIsDragging(false)
  }

  // Handle crop size change
  const handleCropSizeChange = (value: number[]) => {
    const newSize = value[0]
    setCropArea((prev) => ({
      ...prev,
      size: newSize,
      x: Math.min(prev.x, (imageRef.current?.width ?? 0) - newSize),
      y: Math.min(prev.y, (imageRef.current?.height ?? 0) - newSize),
    }))
  }

  // Select a detected face
  const handleFaceSelect = (index: number) => {
    setSelectedFaceIndex(index)
    const face = faces[index]
    const imgEl = imageRef.current
    if (!imgEl || !face) return

    const scaleX = imgEl.naturalWidth / imgEl.width
    const scaleY = imgEl.naturalHeight / imgEl.height

    const faceCenterX =
      (face.boundingBox.originX + face.boundingBox.width / 2) / scaleX
    const faceCenterY =
      (face.boundingBox.originY + face.boundingBox.height / 2) / scaleY
    const cropSize = Math.max((face.boundingBox.width / scaleX) * 0.6, 50)

    setCropArea({
      x: Math.max(0, faceCenterX - cropSize / 2),
      y: Math.max(0, faceCenterY - cropSize / 2),
      size: cropSize,
    })
  }

  // Crop and upload
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !imageRef.current || !canvasRef.current) {
        throw new Error("No image selected")
      }

      const canvas = canvasRef.current
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      const img = imageRef.current
      const scaleX = img.naturalWidth / img.width
      const scaleY = img.naturalHeight / img.height

      // Set canvas to crop area at full resolution
      canvas.width = cropArea.size * scaleX
      canvas.height = cropArea.size * scaleY

      // Draw cropped area
      ctx.drawImage(
        img,
        cropArea.x * scaleX,
        cropArea.y * scaleY,
        cropArea.size * scaleX,
        cropArea.size * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      )

      // Convert to blob with compression
      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error("Failed to create image blob"))
          },
          "image/jpeg",
          jpegQuality,
        )
      })
    },
    onSuccess: async (blob) => {
      // Upload to backend
      const file = new File([blob], `avatar_${Date.now()}.jpg`, {
        type: "image/jpeg",
      })

      try {
        await ContactsService.uploadAvatarFile({
          contactId: contact.id,
          formData: { file: file as unknown as string },
        })
        showSuccessToast("Avatar uploaded successfully")
        queryClient.invalidateQueries({ queryKey: ["contacts", contact.id] })
        queryClient.invalidateQueries({ queryKey: ["contacts"] })
        setOpen(false)
      } catch (_error) {
        showErrorToast("Failed to upload avatar")
      }
    },
    onError: (error: Error) => {
      showErrorToast(error.message || "Failed to process image")
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Camera className="h-4 w-4" />
            Upload Photo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Avatar for {contact.first_name}</DialogTitle>
          <DialogDescription>
            Upload a photo and crop it to create an avatar. Face detection will
            automatically center the crop on the largest face.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* File Input */}
          <div className="flex items-center gap-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Select Image
            </Button>
            {selectedFile && (
              <span className="text-sm text-muted-foreground">
                {selectedFile.name}
              </span>
            )}
          </div>

          {/* Image Preview with Crop Overlay */}
          {previewUrl && (
            <div className="space-y-4">
              {/* biome-ignore lint/a11y/noStaticElementInteractions: mouse tracking container for crop overlay */}
              <div
                ref={containerRef}
                className="relative inline-block max-w-full overflow-hidden rounded-lg border bg-muted"
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
                onMouseLeave={handleCropMouseUp}
              >
                <img
                  ref={imageRef}
                  src={previewUrl}
                  alt="Preview"
                  className="max-w-full h-auto"
                  onLoad={handleImageLoad}
                />

                {/* Crop Overlay */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: drag handle for crop positioning */}
                <div
                  className="absolute border-2 border-primary bg-primary/10 cursor-move"
                  style={{
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.size,
                    height: cropArea.size,
                  }}
                  onMouseDown={handleCropMouseDown}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Crop className="h-6 w-6 text-primary/50" />
                  </div>
                  {/* Resize handles */}
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-primary border-2 border-background rounded-full cursor-se-resize" />
                </div>

                {/* Face detection indicators */}
                {faces.map((face, index) => {
                  const imgEl = imageRef.current
                  if (!imgEl) return null
                  const scaleX = imgEl.width / imgEl.naturalWidth
                  const scaleY = imgEl.height / imgEl.naturalHeight

                  return (
                    <button
                      key={index}
                      type="button"
                      className={`absolute border-2 ${
                        index === selectedFaceIndex
                          ? "border-green-500"
                          : "border-yellow-500/50"
                      } rounded cursor-pointer bg-transparent p-0`}
                      style={{
                        left: face.boundingBox.originX * scaleX,
                        top: face.boundingBox.originY * scaleY,
                        width: face.boundingBox.width * scaleX,
                        height: face.boundingBox.height * scaleY,
                      }}
                      onClick={() => handleFaceSelect(index)}
                    >
                      <span className="absolute -top-5 left-0 text-xs bg-background px-1 rounded">
                        Face {index + 1}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Hidden canvas for cropping */}
              <canvas ref={canvasRef} className="hidden" />

              {/* Detection Status */}
              {isDetecting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Detecting faces...
                </div>
              )}

              {!isDetecting && faces.length === 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No faces detected. Using center crop.
                </div>
              )}

              {faces.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  Detected {faces.length} face(s). Largest face selected.
                </div>
              )}

              {/* Manual Crop Toggle */}
              <div className="flex items-center gap-2">
                <Switch
                  id="manual-crop"
                  checked={manualCrop}
                  onCheckedChange={setManualCrop}
                />
                <Label htmlFor="manual-crop">Manual Crop</Label>
              </div>

              {/* Crop Size Slider (when manual crop is enabled) */}
              {manualCrop && (
                <div className="space-y-2">
                  <Label>Crop Size: {Math.round(cropArea.size)}px</Label>
                  <Slider
                    value={[cropArea.size]}
                    onValueChange={handleCropSizeChange}
                    min={50}
                    max={Math.min(imageRef.current?.width ?? 400, 600)}
                    step={1}
                  />
                </div>
              )}

              {/* JPEG Quality Slider */}
              <div className="space-y-2">
                <Label>JPEG Quality: {Math.round(jpegQuality * 100)}%</Label>
                <Slider
                  value={[jpegQuality * 100]}
                  onValueChange={(val) => setJpegQuality(val[0] / 100)}
                  min={50}
                  max={100}
                  step={5}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => uploadMutation.mutate()}
            disabled={!selectedFile || uploadMutation.isPending}
            className="gap-2"
          >
            {uploadMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Avatar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
