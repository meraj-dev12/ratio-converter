import React, { useState } from 'react';
import IconButton from './IconButton';
import { DownloadIcon, ClipboardIcon } from './Icons';

export type DownloadFormat = 'image/webp' | 'image/jpeg' | 'image/png';

interface DownloadOptionsProps {
  onDownload: (format: DownloadFormat, quality?: number) => void;
  onCopy: (format: DownloadFormat, quality?: number) => Promise<boolean>;
  disabled: boolean;
}

const DownloadOptions: React.FC<DownloadOptionsProps> = ({ onDownload, onCopy, disabled }) => {
    const [format, setFormat] = useState<DownloadFormat>('image/webp');
    const [quality, setQuality] = useState(0.9);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    const showQualitySlider = format === 'image/jpeg' || format === 'image/webp';

    const handleCopyClick = async () => {
        const success = await onCopy(format, quality);
        if (success) {
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        }
    };

    return (
        <div className="w-full max-w-md bg-slate-700/50 p-4 rounded-lg flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="format-select" className="block mb-1 text-sm font-medium text-slate-300">Format</label>
                    <select
                        id="format-select"
                        value={format}
                        onChange={(e) => setFormat(e.target.value as DownloadFormat)}
                        disabled={disabled}
                        className="bg-slate-600 border border-slate-500 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5"
                    >
                        <option value="image/webp">WEBP</option>
                        <option value="image/jpeg">JPEG</option>
                        <option value="image/png">PNG</option>
                    </select>
                </div>
                {showQualitySlider && (
                     <div className="w-full">
                        <label htmlFor="quality-slider" className="block mb-1 text-sm font-medium text-slate-300">Quality: {Math.round(quality * 100)}%</label>
                         <input
                            id="quality-slider"
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={quality}
                            onChange={(e) => setQuality(parseFloat(e.target.value))}
                            disabled={disabled}
                            className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <IconButton onClick={() => onDownload(format, quality)} text="Download Image" disabled={disabled}>
                    <DownloadIcon/>
                </IconButton>
                <IconButton onClick={handleCopyClick} text={copyStatus === 'copied' ? 'Copied!' : 'Copy Image'} disabled={disabled} variant="secondary">
                    <ClipboardIcon />
                </IconButton>
            </div>
        </div>
    );
};

export default DownloadOptions;
