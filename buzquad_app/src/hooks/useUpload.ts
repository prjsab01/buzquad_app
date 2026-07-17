import { useState } from 'react';
import { uploadFile, type UploadFolder, type UploadResult } from '../lib/uploadService';

interface UseUploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  result: UploadResult | null;
}

export function useUpload() {
  const [state, setState] = useState<UseUploadState>({
    uploading: false,
    progress: 0,
    error: null,
    result: null,
  });

  const upload = async (
    file: File,
    folder: UploadFolder = 'uploads',
  ): Promise<UploadResult | null> => {
    setState({ uploading: true, progress: 0, error: null, result: null });
    try {
      const result = await uploadFile(file, folder, (pct) =>
        setState((s) => ({ ...s, progress: pct })),
      );
      setState({ uploading: false, progress: 100, error: null, result });
      return result;
    } catch (err) {
      setState({ uploading: false, progress: 0, error: (err as Error).message, result: null });
      return null;
    }
  };

  const reset = () =>
    setState({ uploading: false, progress: 0, error: null, result: null });

  return { ...state, upload, reset };
}
