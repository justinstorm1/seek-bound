import { useMutation } from 'convex/react';
import { File, UploadType } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';

type UploadResult = { storageId: Id<'_storage'>; localUri: string };

/**
 * Picks a square photo from the library and uploads it to Convex storage.
 * Returns the new `storageId` (pass it to `upsertProfile`) plus the local uri
 * for an instant preview.
 *
 * Uses expo-file-system's native binary upload rather than `fetch(blob)` —
 * React Native's fetch does not stream Blob bodies reliably.
 */
export function useAvatarUpload() {
  const generateUploadUrl = useMutation(api.profiles.generateAvatarUploadUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickAndUpload = async (): Promise<UploadResult | null> => {
    setError(null);
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (picked.canceled || !picked.assets[0]) return null;
    const asset = picked.assets[0];

    try {
      setBusy(true);
      const uploadUrl = await generateUploadUrl();
      const file = new File(asset.uri);
      const contentType = asset.mimeType ?? file.type ?? 'image/jpeg';

      const res = await file.upload(uploadUrl, {
        httpMethod: 'POST',
        uploadType: UploadType.BINARY_CONTENT,
        headers: { 'Content-Type': contentType },
      });
      if (res.status >= 300) throw new Error(`Upload failed (${res.status})`);

      const { storageId } = JSON.parse(res.body) as { storageId: Id<'_storage'> };
      return { storageId, localUri: asset.uri };
    } catch {
      setError('Could not upload that photo. Try another.');
      return null;
    } finally {
      setBusy(false);
    }
  };

  return { pickAndUpload, busy, error };
}
