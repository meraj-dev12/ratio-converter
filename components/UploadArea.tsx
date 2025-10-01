
import React, { useState, useCallback, RefObject } from 'react';
import { UploadIcon } from './Icons';

interface UploadAreaProps {
  onFileDrop: (file: File) => void;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: RefObject<HTMLInputElement>;
}

const UploadArea: React.FC<UploadAreaProps> = ({ onFileDrop, onFileChange, fileInputRef }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileDrop(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [onFileDrop]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center w-full h-80 rounded-xl border-2 border-dashed transition-colors duration-300 ${
        isDragging ? 'border-sky-400 bg-slate-700/50' : 'border-slate-600 hover:border-slate-500'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
      />
      <div className="flex flex-col items-center text-slate-400 pointer-events-none">
        <UploadIcon className="w-16 h-16 mb-4"/>
        <p className="text-2xl font-semibold mb-2">
          {isDragging ? 'Drop Image Here' : 'Drag & Drop or Click to Upload'}
        </p>
        <p className="text-sm">Supports any image format (PNG, JPG, WEBP, etc.)</p>
      </div>
      <button
        onClick={handleUploadClick}
        className="absolute top-0 left-0 w-full h-full cursor-pointer opacity-0"
        aria-label="Upload image"
      />
    </div>
  );
};

export default UploadArea;
