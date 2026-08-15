import { BookOpen, Headphones, Layers, ListChecks, Pencil } from 'lucide-react';

/**
 * The glyph that stands for a module type, shared by the briefing screen and
 * the module hand-over card so a section is marked the same way in both.
 */
export function moduleIcon(type: string) {
  switch (type) {
    case 'listening':                   return Headphones;
    case 'writing': case 'analytical':  return Pencil;
    case 'reading': case 'rw':
    case 'verbal':                      return BookOpen;
    case 'grammar':                     return ListChecks;
    default:                            return Layers;
  }
}
