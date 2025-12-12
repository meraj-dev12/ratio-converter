import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import UploadArea from './components/UploadArea';
import IconButton from './components/IconButton';
import RatioSelector from './components/RatioSelector';
import { RefreshIcon, RotateIcon, SparklesIcon } from './components/Icons';
import { getSmartCrop } from './lib/gemini';
import DownloadOptions, { DownloadFormat } from './components/DownloadOptions';

type AppState = 'idle' | 'loading' | 'success' | 'error';
interface Ratio {
  label: string;
  value: number;
}

const RATIOS: Ratio[] = [
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 / 1 },
  { label: '3:2', value: 3 / 2 },
  { label: '5:4', value: 5 / 4 },
  { label: '9:16', value: 9 / 16 },
  { label: '1.85:1', value: 1.85 / 1 },
  { label: '2.35:1', value: 2.35 / 1 },
];

const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedRatio, setSelectedRatio] = useState<Ratio>(RATIOS[0]);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const [rotation, setRotation] = useState(0);
  const [isSmartCropping, setIsSmartCropping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!completedCrop || !previewCanvasRef.current || !imgRef.current) {
      return;
    }

    const image = imgRef.current;
    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;
    const cropWidth = completedCrop.width * scaleX;
    const cropHeight = completedCrop.height * scaleY;
    
    // Prevent errors with zero dimensions
    if (cropWidth <= 0 || cropHeight <= 0) {
        return;
    }

    const isRotated = rotation === 90 || rotation === 270;
    const canvasWidth = isRotated ? cropHeight : cropWidth;
    const canvasHeight = isRotated ? cropWidth : cropHeight;

    canvas.width = Math.floor(canvasWidth * pixelRatio);
    canvas.height = Math.floor(canvasHeight * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';
    ctx.save();
    
    ctx.translate(canvasWidth / 2, canvasHeight / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-cropWidth / 2, -cropHeight / 2);
    
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    ctx.restore();
  }, [completedCrop, rotation]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image.');
      setAppState('error');
      return;
    }

    setError(null);
    setAppState('loading');
    setOriginalImage(null);
    setImageFile(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setRotation(0);

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setOriginalImage(imageUrl);
      setAppState('success');
    };
    reader.onerror = () => {
      setError('Could not read file.');
      setAppState('error');
    };
    reader.readAsDataURL(file);
  };
  
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    imgRef.current = e.currentTarget;
    const { width, height } = e.currentTarget;
    const percentCrop = centerCrop(
      makeAspectCrop(
        { unit: '%', width: 90 },
        selectedRatio.value / (isRotated(rotation) ? height/width : 1),
        width,
        height
      ),
      width,
      height
    );
    setCrop(percentCrop);
    setCompletedCrop(pixelToPercent(percentCrop, width, height));
  }
  
  const isRotated = (currentRotation: number) => currentRotation === 90 || currentRotation === 270;

  const pixelToPercent = (pixelCrop: Crop, width: number, height: number): Crop => ({
      unit: 'px',
      x: (pixelCrop.x / 100) * width,
      y: (pixelCrop.y / 100) * height,
      width: (pixelCrop.width / 100) * width,
      height: (pixelCrop.height / 100) * height,
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };
  
  const handleFileDrop = (file: File) => handleFile(file);

  const handleDownload = (format: DownloadFormat, quality?: number) => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !completedCrop || completedCrop.width === 0) return;
    
    const dataUrl = canvas.toDataURL(format, quality);
    const link = document.createElement('a');
    link.href = dataUrl;
    const extension = format.split('/')[1];
    link.download = `converted-image-${selectedRatio.label.replace(':', 'x')}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopy = (format: DownloadFormat, quality?: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const canvas = previewCanvasRef.current;
      if (!canvas || !completedCrop || completedCrop.width === 0) return resolve(false);

      canvas.toBlob(async (blob) => {
        if (!blob) return resolve(false);
        try {
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          resolve(true);
        } catch (err) {
          console.error('Failed to copy image:', err);
          resolve(false);
        }
      }, format, quality);
    });
  };

  const handleReset = () => {
      setOriginalImage(null);
      setImageFile(null);
      setError(null);
      setAppState('idle');
      imgRef.current = null;
      if(fileInputRef.current) fileInputRef.current.value = '';
      setCrop(undefined);
      setCompletedCrop(null);
      setRotation(0);
      const canvas = previewCanvasRef.current;
      if (canvas) canvas.getContext('2d')?.clearRect(0,0, canvas.width, canvas.height);
  };

  const updateCropForRatio = (ratio: Ratio, currentRotation: number) => {
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const aspect = isRotated(currentRotation) ? 1 / ratio.value : ratio.value;
      const percentCrop = centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
        width,
        height,
      );
      setCrop(percentCrop);
      setCompletedCrop(pixelToPercent(percentCrop, width, height));
    }
  };

  const handleRatioChange = (ratio: Ratio) => {
    setSelectedRatio(ratio);
    updateCropForRatio(ratio, rotation);
  };

  const handleRotate = () => {
    const newRotation = (rotation + 90) % 360;
    setRotation(newRotation);
    updateCropForRatio(selectedRatio, newRotation);
  };

  const handleSmartCrop = async () => {
    if (!imageFile) return;
    setIsSmartCropping(true);
    setError(null);
    try {
      const smartCropData = await getSmartCrop(imageFile);
      if (smartCropData && imgRef.current) {
        const { width, height } = imgRef.current;
        const aspect = isRotated(rotation) ? 1/selectedRatio.value : selectedRatio.value;

        // Create a crop from the smart data, maintaining the selected aspect ratio
        // We use the smart crop center, but enforce the aspect ratio
        const smartCrop = makeAspectCrop(smartCropData, aspect, width, height);
        const centeredCrop = centerCrop(smartCrop, width, height);

        setCrop(centeredCrop);
        setCompletedCrop(pixelToPercent(centeredCrop, width, height));
      } else {
        setError("Could not determine a smart crop region.");
      }
    } catch (e: any) {
      console.error(e);
      if (e.message === "API_KEY_NOT_CONFIGURED") {
        setError("AI Smart Crop is unavailable: API Key not configured.");
      } else {
        setError("AI Smart Crop failed. Please try again.");
      }
    } finally {
      setIsSmartCropping(false);
    }
  };
  
  const getAspectRatio = () => {
      if(!imgRef.current) return selectedRatio.value;
      const { width, height } = imgRef.current;
      return isRotated(rotation) ? selectedRatio.value * (width/height) : selectedRatio.value;
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 font-sans">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Intelligent Image Cropper
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Upload, rotate, and use AI to find the perfect crop.
          </p>
        </header>

        {(appState === 'success') && (
            <div className="flex flex-col items-center gap-2 mb-6">
                <label htmlFor="ratio-select" className="text-slate-300 font-medium">
                    Select Aspect Ratio
                </label>
                <div className="flex items-center gap-4">
                    <RatioSelector
                        ratios={RATIOS}
                        selectedRatio={selectedRatio}
                        onChange={handleRatioChange}
                    />
                    <IconButton onClick={handleRotate} text="Rotate">
                        <RotateIcon />
                    </IconButton>
                </div>
            </div>
        )}

        <main className="bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 transition-all duration-500 min-h-400 flex flex-col justify-center">
            {appState === 'idle' && (
                <UploadArea onFileDrop={handleFileDrop} onFileChange={handleFileChange} fileInputRef={fileInputRef} />
            )}
            {appState === 'loading' && (
                <div className="flex flex-col items-center justify-center text-slate-300">
                    <svg className="animate-spin h-10 w-10 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="text-xl font-medium">Loading your image...</p>
                </div>
            )}
            {appState === 'error' && (
                 <div className="text-center">
                    <p className="text-red-400 text-xl mb-6">{error}</p>
                    <IconButton onClick={handleReset} text="Try Again">
                        <RefreshIcon />
                    </IconButton>
                 </div>
            )}
            {appState === 'success' && originalImage && (
              <div className="animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div>
                      <h3 className="text-lg text-center font-semibold text-slate-300 mb-3">Original</h3>
                       <div className="w-full bg-slate-700/50 rounded-lg overflow-hidden shadow-md flex justify-center items-center">
                         <ReactCrop
                            crop={crop}
                            onChange={(_, percentCrop) => setCrop(percentCrop)}
                            onComplete={(c) => setCompletedCrop(c)}
                            aspect={getAspectRatio()}
                            minWidth={50}
                            minHeight={50}
                            className="max-h-60vh"
                          >
                            <img
                                alt="Crop me"
                                src={originalImage}
                                onLoad={onImageLoad}
                                style={{ maxHeight: '60vh' }}
                            />
                         </ReactCrop>
                       </div>
                    </div>
                    <div>
                      <h3 className="text-lg text-center font-semibold text-slate-300 mb-3">
                        {selectedRatio.label} Preview ({rotation}&deg;)
                      </h3>
                      <div className="w-full bg-slate-700/50 rounded-lg overflow-hidden shadow-md flex justify-center items-center p-2 aspect-auto">
                         <canvas
                            ref={previewCanvasRef}
                            style={{
                              objectFit: 'contain',
                              width: '100%',
                              height: '100%',
                              maxHeight: 'calc(60vh - 4px)',
                            }}
                          />
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center justify-center gap-6">
                      <DownloadOptions 
                        onDownload={handleDownload} 
                        onCopy={handleCopy}
                        disabled={!completedCrop || completedCrop.width === 0}
                      />
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                          <IconButton onClick={handleSmartCrop} text={isSmartCropping ? "Analyzing..." : "Smart Crop"} disabled={isSmartCropping}>
                              <SparklesIcon />
                          </IconButton>
                           <IconButton onClick={handleReset} text="Start Over" variant="secondary" >
                              <RefreshIcon />
                          </IconButton>
                      </div>
                  </div>
              </div>
            )}
        </main>
      </div>
      <footer className="text-center text-slate-500 mt-8">
        <p>Made by <a href="https://www.instagram.com/meraj_the_developer/" target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:text-sky-500 transition-colors">Meraj the developer</a></p>
      </footer>
    </div>
  );
};

export default App;