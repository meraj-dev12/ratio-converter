import React, { useState, useCallback, useRef, useEffect } from 'react';
import UploadArea from './components/UploadArea';
import ImagePreview from './components/ImagePreview';
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
  const [convertedImage, setConvertedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedRatio, setSelectedRatio] = useState<Ratio>(RATIOS[0]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const convertImage = useCallback((img: HTMLImageElement) => {
    setAppState('loading');
    // Use a timeout to allow the loading spinner to render before the blocking canvas operation
    setTimeout(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setError('Could not process image. Canvas context is not available.');
          setAppState('error');
          return;
        }

        const targetAspectRatio = selectedRatio.value;
        let srcX = 0, srcY = 0, srcWidth = img.width, srcHeight = img.height;
        const sourceAspectRatio = img.width / img.height;

        if (sourceAspectRatio > targetAspectRatio) {
          srcWidth = img.height * targetAspectRatio;
          srcX = (img.width - srcWidth) / 2;
        } else if (sourceAspectRatio < targetAspectRatio) {
          srcHeight = img.width / targetAspectRatio;
          srcY = (img.height - srcHeight) / 2;
        }

        const MAX_WIDTH = 1920;
        canvas.width = Math.min(MAX_WIDTH, srcWidth);
        canvas.height = canvas.width / targetAspectRatio;

        ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);

        const convertedUrl = canvas.toDataURL('image/webp');
        setConvertedImage(convertedUrl);
        setAppState('success');
    }, 50);
  }, [selectedRatio]);

  // FIX: Refactored useEffect to prevent an infinite loop and handle conversion
  // when the original image is loaded or the aspect ratio changes.
  useEffect(() => {
    if (imageRef.current && originalImage) {
      convertImage(imageRef.current);
    }
  }, [originalImage, convertImage]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Invalid file type. Please upload an image.');
      setAppState('error');
      return;
    }

    setError(null);
    setAppState('loading');
    setOriginalImage(null);
    setConvertedImage(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setOriginalImage(imageUrl);
        // FIX: Removed explicit call to convertImage. The useEffect now handles this
        // to prevent double-conversion and simplify logic.
      };
      img.onerror = () => {
        setError('Could not load image file.');
        setAppState('error');
      };
      img.src = imageUrl;
    };
    reader.onerror = () => {
      setError('Could not read file.');
      setAppState('error');
    };
    reader.readAsDataURL(file);
  };

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
    if (!convertedImage) return;
    const link = document.createElement('a');
    link.href = convertedImage;
    link.download = `converted-image-${selectedRatio.label.replace(':', 'x')}.webp`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
      setOriginalImage(null);
      setConvertedImage(null);
      setError(null);
      setAppState('idle');
      imageRef.current = null;
      if(fileInputRef.current) {
          fileInputRef.current.value = '';
      }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Aspect Ratio Converter
          </h1>
          <p className="text-slate-400 mt-2 text-lg">
            Instantly crop and convert any image to the perfect aspect ratio.
          </p>
        </header>

        {/* FIX: The disabled prop was removed from RatioSelector below.
            The component is not rendered during the 'loading' state, so the check `appState === 'loading'`
            was always false within this block, causing a TypeScript error. */}
        {(appState === 'idle' || appState === 'success') && (
            <RatioSelector
                ratios={RATIOS}
                selectedRatio={selectedRatio}
                onChange={setSelectedRatio}
                disabled={appState === 'loading'}
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
                    <p className="text-xl font-medium">Processing your image...</p>
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
            {appState === 'success' && originalImage && convertedImage && (
              <div className="animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <ImagePreview src={originalImage} label="Original" />
                      <ImagePreview src={convertedImage} label={`${selectedRatio.label} Converted`} />
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <IconButton onClick={handleDownload} text="Download Image" >
                          <DownloadIcon/>
                      </IconButton>
                       <IconButton onClick={handleReset} text="Convert Another" variant="secondary" >
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