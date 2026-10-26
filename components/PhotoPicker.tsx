import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { X } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { textStyle } from '../theme/typeStyle';
import { uploadErrorMessage, uploadPhoto } from '../api/uploads';
import type { UploadPurpose } from '../api/types';
import { Button } from './Button';
import { FieldLabel } from './FieldLabel';

export type UploadedPhoto = { uploadId: string; uri: string };

type PhotoPickerProps = {
  label: string;
  purpose: UploadPurpose;
  token: string;
  photos: UploadedPhoto[];
  onChange: (photos: UploadedPhoto[]) => void;
  /** Shown under the buttons — e.g. why the photo is needed. */
  sub?: string;
  /** Marks the field as having a problem (e.g. a required photo is missing). */
  error?: string;
};

// Takes or picks a photo, shrinks it and uploads it straight to storage
// (BE-23) as soon as it's chosen, so the record only carries upload ids.
// Each photo shows as a thumbnail with a remove button; removing only drops
// it from this record (the server sweeps unattached uploads after 24 h).
export function PhotoPicker({ label, purpose, token, photos, onChange, sub, error }: PhotoPickerProps) {
  const { color, type: typeScale, radius } = useTheme();
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const add = async (source: 'camera' | 'library') => {
    setFailure(null);
    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setFailure(source === 'camera' ? 'Camera access is off. Allow it in the phone settings to take a photo.' : 'Photo access is off. Allow it in the phone settings to choose a photo.');
      return;
    }
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled) return;
    const asset = result.assets[0];
    setBusy(true);
    try {
      const uploadId = await uploadPhoto(asset.uri, asset.width, asset.height, purpose, token);
      onChange([...photos, { uploadId, uri: asset.uri }]);
    } catch (err) {
      setFailure(uploadErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const problem = error ?? failure;

  return (
    <View style={{ gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      {photos.length > 0 ? (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {photos.map((p) => (
            <View key={p.uploadId} style={{ width: 72, height: 72 }}>
              <Image source={{ uri: p.uri }} style={{ width: 72, height: 72, borderRadius: radius.sm }} accessibilityLabel="Goods photo" />
              <Pressable
                onPress={() => onChange(photos.filter((x) => x.uploadId !== p.uploadId))}
                accessibilityRole="button"
                accessibilityLabel="Remove photo"
                hitSlop={10}
                style={{
                  position: 'absolute',
                  top: -6,
                  right: -6,
                  width: 22,
                  height: 22,
                  borderRadius: radius.sm,
                  backgroundColor: color.ink,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={14} color={color.panel} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View className="flex-row" style={{ gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button label={busy ? 'Uploading…' : 'Take photo'} variant="secondary" disabled={busy} onPress={() => add('camera')} />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Choose photo" variant="secondary" disabled={busy} onPress={() => add('library')} />
        </View>
      </View>
      {problem ? (
        <Text style={{ ...textStyle(typeScale.helper), color: color.danger }}>{problem}</Text>
      ) : sub ? (
        <Text style={{ ...textStyle(typeScale.helper), color: color.mute }}>{sub}</Text>
      ) : null}
    </View>
  );
}
