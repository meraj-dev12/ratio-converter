
import React from 'react';

interface ImagePreviewProps {
  src: string;
  label: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({ src, label }) => {
  return (
    <div className="flex flex-col items-center">
      <h3 className="text-lg font-semibold text-slate-300 mb-3">{label}</h3>
      <div className="w-full bg-slate-700/50 rounded-lg overflow-hidden shadow-md">
        <img
          src={src}
          alt={label}
          className="w-full h-full object-contain"
        />
      </div>
    </div>
  );
};

export default ImagePreview;