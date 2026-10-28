import type { ButtonHTMLAttributes } from 'react';
import { LoaderCircle } from 'lucide-react';

export default function Button({ variant = 'secondary', size = 'md', loading = false, className = '', children, disabled, type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'icon'; loading?: boolean;
}) {
  return <button {...props} type={type} disabled={disabled || loading} aria-busy={loading || undefined} className={`ui-button ui-button-${variant} ui-button-${size} ${className}`}>{loading && <LoaderCircle size={15} className="animate-spin" aria-hidden="true"/>}{children}</button>;
}
