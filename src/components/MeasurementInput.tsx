import React from 'react';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function MeasurementInput({ label, value, onChange, placeholder }: Props) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1"
      />
    </label>
  );
}
