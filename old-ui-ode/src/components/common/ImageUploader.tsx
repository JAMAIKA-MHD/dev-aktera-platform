import { useRef, useState } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
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
    if (!organization) {
      setError('Your organization session is missing. Please sign in again.');
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const filePath = `${organization.id}/${folder}/${Date.now()}-${sanitizeFileName(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from('campaign-media')
        .upload(filePath, file, {
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
      setError(
        toFriendlyErrorMessage(err, {
          fallback: 'Image upload failed. Please try another file.',
        }),
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              Upload image
            </>
          )}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-4 py-2.5 border border-red-200 text-red-700 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Remove
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
        }}
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      {value && (
        <img
          src={value}
          alt="Uploaded asset preview"
          className="w-28 h-28 rounded-lg object-cover border border-gray-200"
        />
      )}
    </div>
  );
}

export default ImageUploader;
