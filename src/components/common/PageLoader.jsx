import { Loader2 } from 'lucide-react';

/** Indicateur affiché pendant le chargement d'une page (chargement à la demande). */
export default function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-blue-500" role="status" aria-label="Chargement">
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
