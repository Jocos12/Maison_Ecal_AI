import { useRef } from 'react';
import { ChevronDown, ChevronUp, FileText, Loader2, Sparkles, Upload, Wand2 } from 'lucide-react';
import { CV_ACCEPT } from '../../utils/extractCvText.js';
import { formatProfileSummary, isProfileComplete } from '../../utils/agentProfileUtils.js';

export default function AgentCvPanel({
  open,
  onToggle,
  profile,
  cvMeta,
  uploading,
  onFileSelect,
  onGenerateCv,
  onCorrectCv,
  onGenerateLetter,
  generating
}) {
  const inputRef = useRef(null);
  const complete = isProfileComplete(profile);

  return (
    <div className="flex-shrink-0 border-b border-purple-100 bg-white dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm font-semibold text-purple-800 dark:text-purple-200"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Mon CV &amp; profil
          {complete ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              Complet
            </span>
          ) : (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              À compléter
            </span>
          )}
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {open ? (
        <div className="space-y-3 px-4 pb-4">
          <div className="rounded-xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-3 dark:border-violet-800 dark:bg-violet-950/30">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-violet-600 text-white">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">Importer mon CV</p>
                <p className="text-[11px] text-slate-500">PDF, DOCX ou TXT, extraction automatique de vos infos</p>
                {cvMeta?.fileName ? (
                  <p className="mt-1 truncate text-[11px] font-semibold text-violet-700 dark:text-violet-300">
                    {cvMeta.fileName}
                  </p>
                ) : null}
              </div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={CV_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onFileSelect(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-500 disabled:opacity-60"
            >
              {uploading ? 'Analyse en cours…' : 'Choisir un fichier CV'}
            </button>
          </div>

          {profile ? (
            <pre className="max-h-32 overflow-y-auto agent-chat-scroll rounded-lg border border-slate-100 bg-slate-50 p-2.5 text-[11px] leading-relaxed text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {formatProfileSummary(profile)}
            </pre>
          ) : (
            <p className="text-xs text-slate-500">Importez votre CV pour remplir automatiquement votre profil.</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={!profile?.fullName || generating}
              onClick={onGenerateCv}
              className="flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-2 py-2 text-[11px] font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" />
              Générer CV
            </button>
            <button
              type="button"
              disabled={!profile?.fullName || generating}
              onClick={onCorrectCv}
              className="flex items-center justify-center gap-1 rounded-lg bg-purple-600 px-2 py-2 text-[11px] font-bold text-white hover:bg-purple-500 disabled:opacity-50"
            >
              <Wand2 className="h-3 w-3" />
              Corriger CV
            </button>
            <button
              type="button"
              disabled={!profile?.fullName || generating}
              onClick={onGenerateLetter}
              className="flex items-center justify-center gap-1 rounded-lg bg-blue-600 px-2 py-2 text-[11px] font-bold text-white hover:bg-blue-500 disabled:opacity-50"
            >
              <FileText className="h-3 w-3" />
              Lettre
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
