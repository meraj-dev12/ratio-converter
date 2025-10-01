import React from 'react';

interface Ratio {
  label: string;
  value: number;
}

interface RatioSelectorProps {
  ratios: Ratio[];
  selectedRatio: Ratio;
  onChange: (ratio: Ratio) => void;
  disabled?: boolean;
}

const RatioSelector: React.FC<RatioSelectorProps> = ({ ratios, selectedRatio, onChange, disabled = false }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = ratios.find(r => r.label === event.target.value);
    if (selected) {
      onChange(selected);
    }
  };

  return (
    <select
      id="ratio-select"
      value={selectedRatio.label}
      onChange={handleChange}
      disabled={disabled}
      className="bg-slate-700 border border-slate-600 text-white text-lg rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full max-w-[200px] p-2.5 transition-colors"
    >
      {ratios.map(ratio => (
        <option key={ratio.label} value={ratio.label}>
          {ratio.label}
        </option>
      ))}
    </select>
  );
};

export default RatioSelector;