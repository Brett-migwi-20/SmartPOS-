import React from "react";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const DEFAULT_CROP = {
  zoom: 100,
  offsetX: 0,
  offsetY: 0
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const estimateBase64Bytes = (dataUrl = "") => {
  const base64 = String(dataUrl).split(",")[1] || "";
  return Math.round(base64.length * 0.75);
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });

const loadImageElement = (dataUrl) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to process this image."));
    image.src = dataUrl;
  });

const renderImagePayload = async (dataUrl, crop) => {
  const image = await loadImageElement(dataUrl);
  const minSide = Math.min(image.width, image.height);
  const zoomFactor = clamp(Number(crop.zoom) || 100, 40, 100) / 100;
  const cropSide = Math.max(1, Math.round(minSide * zoomFactor));

  const maxOffsetX = Math.max(0, image.width - cropSide);
  const maxOffsetY = Math.max(0, image.height - cropSide);
  const centeredX = Math.floor(maxOffsetX / 2);
  const centeredY = Math.floor(maxOffsetY / 2);
  const shiftX = Math.round((clamp(Number(crop.offsetX) || 0, -100, 100) / 100) * (maxOffsetX / 2));
  const shiftY = Math.round((clamp(Number(crop.offsetY) || 0, -100, 100) / 100) * (maxOffsetY / 2));

  const sourceX = clamp(centeredX + shiftX, 0, maxOffsetX);
  const sourceY = clamp(centeredY + shiftY, 0, maxOffsetY);

  const outputSize = Math.min(1200, cropSide);
  const originalCanvas = document.createElement("canvas");
  originalCanvas.width = outputSize;
  originalCanvas.height = outputSize;

  const context = originalCanvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas context is unavailable.");
  }

  context.drawImage(image, sourceX, sourceY, cropSide, cropSide, 0, 0, outputSize, outputSize);

  const thumbnailCanvas = document.createElement("canvas");
  thumbnailCanvas.width = 320;
  thumbnailCanvas.height = 320;
  const thumbnailContext = thumbnailCanvas.getContext("2d");
  if (!thumbnailContext) {
    throw new Error("Canvas context is unavailable.");
  }
  thumbnailContext.drawImage(originalCanvas, 0, 0, 320, 320);

  const original = originalCanvas.toDataURL("image/jpeg", 0.82);
  const thumbnail = thumbnailCanvas.toDataURL("image/jpeg", 0.76);

  return {
    original,
    thumbnail,
    mimeType: "image/jpeg",
    width: outputSize,
    height: outputSize,
    size: estimateBase64Bytes(original)
  };
};

const EMPTY_IMAGE = {
  original: "",
  thumbnail: "",
  altText: "",
  mimeType: "",
  width: 0,
  height: 0,
  size: 0
};

function ImageUploader({ idPrefix, label, value, onChange, disabled = false }) {
  const inputRef = React.useRef(null);
  const [isDragActive, setIsDragActive] = React.useState(false);
  const [error, setError] = React.useState("");
  const [processing, setProcessing] = React.useState(false);
  const [sourceDataUrl, setSourceDataUrl] = React.useState("");
  const [crop, setCrop] = React.useState(DEFAULT_CROP);

  const previewImage = value?.thumbnail || value?.original || sourceDataUrl || "";

  const applyImage = React.useCallback(
    async (dataUrl, nextCrop) => {
      if (!dataUrl) {
        return;
      }

      setProcessing(true);
      try {
        const payload = await renderImagePayload(dataUrl, nextCrop);
        onChange({
          ...EMPTY_IMAGE,
          ...payload,
          altText: value?.altText || ""
        });
        setError("");
      } catch (processingError) {
        setError(processingError.message);
      } finally {
        setProcessing(false);
      }
    },
    [onChange, value?.altText]
  );

  const handleFile = React.useCallback(
    async (file) => {
      if (!file) {
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        setError("Invalid file type. Use JPG, PNG, or WebP.");
        return;
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError("Image is too large. Maximum size is 8MB.");
        return;
      }

      try {
        const dataUrl = await readFileAsDataUrl(file);
        setSourceDataUrl(dataUrl);
        setCrop(DEFAULT_CROP);
        await applyImage(dataUrl, DEFAULT_CROP);
      } catch (fileError) {
        setError(fileError.message);
      }
    },
    [applyImage]
  );

  React.useEffect(() => {
    if (!sourceDataUrl) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      applyImage(sourceDataUrl, crop);
    }, 280);

    return () => {
      window.clearTimeout(timer);
    };
  }, [applyImage, crop, sourceDataUrl]);

  const handleDrop = async (event) => {
    event.preventDefault();
    if (disabled) {
      return;
    }
    setIsDragActive(false);
    const file = event.dataTransfer.files?.[0];
    await handleFile(file);
  };

  const openFilePicker = () => {
    if (disabled) {
      return;
    }
    inputRef.current?.click();
  };

  const handleKeyDown = (event) => {
    if (disabled) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openFilePicker();
    }
  };

  const updateCrop = (name, value) => {
    setCrop((current) => ({
      ...current,
      [name]: Number(value)
    }));
  };

  const clearImage = () => {
    setSourceDataUrl("");
    setCrop(DEFAULT_CROP);
    setError("");
    onChange({ ...EMPTY_IMAGE, altText: value?.altText || "" });
  };

  return (
    <div className="image-uploader">
      <div
        aria-disabled={disabled}
        className={`dropzone ${isDragActive ? "active" : ""} ${disabled ? "disabled" : ""}`}
        onClick={openFilePicker}
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled) {
            setIsDragActive(true);
          }
        }}
        onDragLeave={() => setIsDragActive(false)}
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <p className="dropzone-title">{label}</p>
        <p className="dropzone-help">Drag and drop an image or press Enter to browse.</p>
        <p className="dropzone-help muted">JPG, PNG, WebP up to 8MB. Auto-resized, cropped, and compressed client-side.</p>
      </div>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only-input"
        disabled={disabled}
        id={`${idPrefix}-upload`}
        onChange={(event) => handleFile(event.target.files?.[0])}
        ref={inputRef}
        type="file"
      />

      {previewImage ? (
        <div className="image-preview-wrap">
          <img alt={value?.altText || "Selected preview"} className="image-preview" loading="lazy" src={previewImage} />
          <button className="btn btn-secondary btn-small" onClick={clearImage} type="button">
            Remove Image
          </button>
        </div>
      ) : null}

      {sourceDataUrl ? (
        <div className="crop-controls">
          <label htmlFor={`${idPrefix}-zoom`}>Crop Zoom</label>
          <input
            disabled={disabled}
            id={`${idPrefix}-zoom`}
            max={100}
            min={40}
            onChange={(event) => updateCrop("zoom", event.target.value)}
            type="range"
            value={crop.zoom}
          />

          <label htmlFor={`${idPrefix}-offset-x`}>Horizontal Crop</label>
          <input
            disabled={disabled}
            id={`${idPrefix}-offset-x`}
            max={100}
            min={-100}
            onChange={(event) => updateCrop("offsetX", event.target.value)}
            type="range"
            value={crop.offsetX}
          />

          <label htmlFor={`${idPrefix}-offset-y`}>Vertical Crop</label>
          <input
            disabled={disabled}
            id={`${idPrefix}-offset-y`}
            max={100}
            min={-100}
            onChange={(event) => updateCrop("offsetY", event.target.value)}
            type="range"
            value={crop.offsetY}
          />
        </div>
      ) : null}

      {processing ? <p className="form-help">Processing image and generating thumbnail...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

export default ImageUploader;
