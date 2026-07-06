/**
 * Placeholder — Generic placeholder page for routes not yet built.
 *
 * Each dashboard and play route maps to this component with a title
 * and description so the routing shell is fully navigable while the
 * real screens are built in subsequent phases.
 */

import { Construction } from 'lucide-react';

/** Props for the placeholder. */
interface PlaceholderProps {
  /** Page title shown in the header. */
  title: string;
  /** Short description of what this page will do. */
  description?: string;
}

/**
 * Renders a centered "coming soon" card with the page title and
 * description. Used by every route that doesn't have a real
 * implementation yet.
 */
export default function Placeholder({ title, description }: PlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 mb-4">
        <Construction className="h-8 w-8 text-blue-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      {description && (
        <p className="text-gray-500 max-w-md">{description}</p>
      )}
      <p className="mt-4 text-sm text-gray-400">Coming soon</p>
    </div>
  );
}
