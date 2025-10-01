import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import UploadArea from './components/UploadArea';
import IconButton from './components/IconButton';
import RatioSelector from './components/RatioSelector';
import { DownloadIcon, RefreshIcon } from './components/Icons';

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
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedRatio, setSelectedRatio] = useState<Ratio>(RATIOS[0]);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);

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

    if (!ctx) {
      console.error('Failed to get 2d context');
      return;
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    const pixelRatio = window.devicePixelRatio || 1;
    
    canvas.width = Math.floor(completedCrop.width * scaleX * pixelRatio);
    canvas.height = Math.floor(completedCrop.height * scaleY * pixelRatio);

    ctx.scale(pixelRatio, pixelRatio);
    ctx.imageSmoothingQuality = 'high';

    const cropX = completedCrop.x * scaleX;
    const cropY = completedCrop.y * scaleY;

    ctx.drawImage(
      image,
      cropX,
      cropY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );
  }, [completedCrop]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image.');
      setAppState('error');
      return;
    }

    setError(null);
    setAppState('loading');
    setOriginalImage(null);
    setCrop(undefined);
    setCompletedCrop(null);

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
    const newCrop = centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            selectedRatio.value,
            width,
            height
        ),
        width,
        height
    );
    setCrop(newCrop);
    setCompletedCrop(newCrop); // Set initial completed crop for preview
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };
  
  const handleFileDrop = (file: File) => {
    handleFile(file);
  };

  const handleDownload = () => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !completedCrop || completedCrop.width === 0) return;
    
    const dataUrl = canvas.toDataURL('image/webp', 0.9);
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `converted-image-${selectedRatio.label.replace(':', 'x')}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
      setOriginalImage(null);
      setError(null);
      setAppState('idle');
      imgRef.current = null;
      if(fileInputRef.current) {
          fileInputRef.current.value = '';
      }
      setCrop(undefined);
      setCompletedCrop(null);
      const canvas = previewCanvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0,0, canvas.width, canvas.height);
      }
  };

  const handleRatioChange = (ratio: Ratio) => {
    setSelectedRatio(ratio);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      const newCrop = centerCrop(
        makeAspectCrop(
          {
            unit: '%',
            width: 90,
          },
          ratio.value,
          width,
          height,
        ),
        width,
        height,
      );
      setCrop(newCrop);
      setCompletedCrop(newCrop);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 font-sans">
      <div className="w-full max-w-5xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Interactive Aspect Ratio Cropper
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Upload an image, select an aspect ratio, and choose your perfect crop.
          </p>
        </header>

        {(appState !== 'loading') && (
            <RatioSelector
                ratios={RATIOS}
                selectedRatio={selectedRatio}
                onChange={handleRatioChange}
                disabled={appState !== 'success'}
            />
        )}

        <main className="bg-slate-800 rounded-2xl shadow-2xl p-6 md:p-8 transition-all duration-500 min-h-[400px] flex flex-col justify-center">
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
                            aspect={selectedRatio.value}
                            minWidth={50}
                            minHeight={50}
                            className="max-h-[60vh]"
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
                        {selectedRatio.label} Preview
                      </h3>
                      <div className="w-full bg-slate-700/50 rounded-lg overflow-hidden shadow-md flex justify-center items-center p-2">
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
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <IconButton onClick={handleDownload} text="Download Cropped Image" disabled={!completedCrop || completedCrop.width === 0}>
                          <DownloadIcon/>
                      </IconButton>
                       <IconButton onClick={handleReset} text="Start Over" variant="secondary" >
                          <RefreshIcon />
                      </IconButton>
                  </div>
              </div>
            )}
        </main>
      </div>
      <footer className="text-center text-slate-500 mt-8">
        <p>Built with React, TypeScript, and Tailwind CSS. All processing is done in your browser.</p>
      </footer>
    </div>
  );
};

export default App;