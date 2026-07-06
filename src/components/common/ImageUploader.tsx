import { useRef, useState } from 'react';
import { Loader2, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  folder: 'campaigns' | 'prizes';
  label: string;
}

const sanitizeFileName = (fileName: string): string =>
  fileName.toLowerCase().replace(/[^a-z0-9.\-_]/g, '-');

export function ImageUploader({ value, onChange, folder, label }: ImageUploaderProps) {
  const { organization } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUpload = async (file: File) => {
    if (!organization?.id) {
      setError('Organization session is missing. Please sign in again.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const filePath = `${organization.id}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from('campaign-media').upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || undefined,
      });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('campaign-media').getPublicUrl(filePath);
      if (!data?.publicUrl) {
        throw new Error('Image upload succeeded but URL generation failed.');
      }
      onChange(data.publicUrl);
    } catch (err: unknown) {
      setError(toFriendlyErrorMessage(err, 'Image upload failed. Please try another file.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{label}</label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? 'Uploading...' : 'Upload image'}
          </span>
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="min-h-11 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
          >
            <span className="inline-flex items-center gap-2">
              <X className="h-4 w-4" />
              Remove
            </span>
          </button>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleUpload(file);
        }}
      />

      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

export default ImageUploader;
