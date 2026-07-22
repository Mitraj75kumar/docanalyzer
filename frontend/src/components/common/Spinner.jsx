import { Loader2 } from 'lucide-react';

export default function Spinner({ size = 24, className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Loader2 style={{ width: size, height: size }} className="animate-spin text-primary-600" />
    </div>
  );
}
