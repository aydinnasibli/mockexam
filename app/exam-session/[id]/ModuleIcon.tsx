import { BookOpen, Headphones, Layers, ListChecks, Pencil } from 'lucide-react';

/**
 * The glyph standing for a module type, as a component.
 *
 * `moduleIcon()` returns the icon's constructor, which callers then render as
 * `<Icon />` — a pattern `react-hooks/static-components` flags, because it
 * cannot tell a switch returning one of five stable references from a component
 * genuinely rebuilt each render. Selecting inside the JSX sidesteps that
 * without suppressing the rule.
 */
export default function ModuleIcon({
  type, size = 18, className = '',
}: { type: string; size?: number; className?: string }) {
  switch (type) {
    case 'listening':
      return <Headphones size={size} className={className} />;
    case 'writing':
    case 'analytical':
      return <Pencil size={size} className={className} />;
    case 'reading':
    case 'rw':
    case 'verbal':
      return <BookOpen size={size} className={className} />;
    case 'grammar':
      return <ListChecks size={size} className={className} />;
    default:
      return <Layers size={size} className={className} />;
  }
}
