'use client';

import { useEffect, useState } from 'react';

interface BlobFile {
  url: string;
  pathname: string;
  downloadUrl: string;
  size: number;
  uploadedAt: string;
}

// Props interface for FileUploadForm
interface FileUploadFormProps {
  onUpload: (e: React.FormEvent) => Promise<void>;
  file: File | null;
  setFile: (file: File | null) => void;
  pathname: string;
  setPathname: (path: string) => void;
  uploading: boolean;
  error: string;
  success: string;
}

/**
 * Form component for uploading files to blob storage.
 * @param props - The component props.
 */
function FileUploadForm(props: FileUploadFormProps) {
  const { onUpload, file, setFile, pathname, setPathname, uploading, error, success } = props;
  return (
    <div className="mb-8 p-4 bg-[#2c2c3a] rounded-md">
      <h2 className="text-xl font-display mb-2">Upload File</h2>
      <form onSubmit={onUpload} className="space-y-4">
        <div>
          <label htmlFor="file-upload" className="block mb-1">
            File
          </label>
          <input
            id="file-upload"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="w-full p-2 rounded bg-[#1f1f29] text-gray-100"
          />
        </div>

        <div>
          <label htmlFor="path-input" className="block mb-1">
            Path (optional)
          </label>
          <input
            id="path-input"
            type="text"
            value={pathname}
            onChange={(e) => setPathname(e.target.value)}
            placeholder="e.g., books/hamlet/images"
            className="w-full p-2 rounded bg-[#1f1f29] text-gray-100"
          />
        </div>

        <button type="submit" disabled={!file || uploading} className="btn btn-primary">
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {error && <div className="mt-4 p-2 bg-red-900/50 text-red-200 rounded">{error}</div>}
      {success && <div className="mt-4 p-2 bg-green-900/50 text-green-200 rounded">{success}</div>}
    </div>
  );
}

// Props interface for BlobList
interface BlobListProps {
  blobs: BlobFile[];
  loading: boolean;
  onDelete: (url: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

/**
 * Component for displaying uploaded files in blob storage.
 * @param props - The component props.
 */
function BlobList(props: BlobListProps) {
  const { blobs, loading, onDelete, onRefresh } = props;
  return (
    <div className="p-4 bg-[#2c2c3a] rounded-md">
      <h2 className="text-xl font-display mb-2">Stored Files</h2>

      {loading ? (
        <div className="text-center text-lavender animate-pulse">Loading files...</div>
      ) : blobs.length === 0 ? (
        <div className="text-center text-gray-400">No files uploaded yet</div>
      ) : (
        <ul className="space-y-2">
          {blobs.map((blob) => (
            <li
              key={blob.url}
              className="p-3 bg-[#1f1f29] rounded flex items-center justify-between"
            >
              <div>
                <div className="font-medium">{blob.pathname}</div>
                <div className="text-xs text-gray-400">
                  Size: {Math.round(blob.size / 1024)} KB • Uploaded:{' '}
                  {new Date(blob.uploadedAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={blob.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-secondary text-sm"
                >
                  View
                </a>
                <button onClick={() => onDelete(blob.url)} className="btn btn-secondary text-sm">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button onClick={onRefresh} className="mt-4 btn btn-secondary">
        Refresh List
      </button>
    </div>
  );
}

export default function BlobTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [pathname, setPathname] = useState('');
  const [uploading, setUploading] = useState(false);
  const [blobs, setBlobs] = useState<BlobFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch blobs on page load
  useEffect(() => {
    fetchBlobs();
  }, []);

  async function fetchBlobs() {
    try {
      setLoading(true);
      const res = await fetch('/api/blob-test');

      if (!res.ok) {
        throw new Error('Failed to fetch blobs');
      }

      const data = await res.json();
      setBlobs(data.blobs || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      setError('Please select a file');
      return;
    }

    try {
      setUploading(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', file.name);
      if (pathname.trim()) {
        formData.append('pathname', pathname.trim());
      }

      const res = await fetch('/api/blob-test', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const blob = await res.json();
      setSuccess(`File uploaded successfully to ${blob.url}`);

      // Refresh blob list
      fetchBlobs();

      // Reset form
      setFile(null);
      setPathname('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  async function deleteBlob(url: string) {
    try {
      setError('');
      setSuccess('');

      const res = await fetch(`/api/blob-test?url=${encodeURIComponent(url)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Deletion failed');
      }

      setSuccess('File deleted successfully');

      // Refresh blob list
      fetchBlobs();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-display mb-4">Vercel Blob Test</h1>

      <FileUploadForm
        onUpload={uploadFile}
        file={file}
        setFile={setFile}
        pathname={pathname}
        setPathname={setPathname}
        uploading={uploading}
        error={error}
        success={success}
      />

      <BlobList blobs={blobs} loading={loading} onDelete={deleteBlob} onRefresh={fetchBlobs} />
    </div>
  );
}
