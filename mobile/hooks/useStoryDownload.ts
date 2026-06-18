/**
 * useStoryDownload — Hook com toda a lógica de download, share e captura de imagem.
 * Encapsula: download do story, download do poster e compartilhamento no Instagram.
 */
import { useState, useRef } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

/** Remove o ano (YYYY) do título do filme */
function stripYear(title: string): string {
  return title.replace(/\s*\(\d{4}\)\s*$/, '').trim();
}

interface UseStoryDownloadOptions {
  movieTitle?: string;
  posterBase64?: string;
  isSticker: boolean;
  isSolid: boolean;
}

export function useStoryDownload({ movieTitle, posterBase64, isSticker, isSolid }: UseStoryDownloadOptions) {
  const [saving, setSaving] = useState(false);
  const [savingPoster, setSavingPoster] = useState(false);
  const [sharingStory, setSharingStory] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [posterDownloadSuccess, setPosterDownloadSuccess] = useState(false);
  const viewShotRef = useRef<ViewShot>(null);

  /** Pede permissão de galeria no mobile */
  const requestGalleryPermission = async (): Promise<boolean> => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão negada', 'Precisamos de acesso à galeria para salvar a imagem.');
      return false;
    }
    return true;
  };

  /** Captura o card como imagem (web ou native) */
  const captureCard = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      const htmlToImage = await import('html-to-image');
      const domNode = document.getElementById('story-card');
      if (!domNode) throw new Error('DOM node not found');
      await new Promise(resolve => setTimeout(resolve, 300));
      return htmlToImage.toPng(domNode, {
        cacheBust: true,
        pixelRatio: 4,
        style: isSticker && !isSolid ? { backgroundColor: 'transparent' } : {},
        filter: () => true,
      });
    } else {
      if (!viewShotRef.current) return null;
      return (viewShotRef.current as any).capture();
    }
  };

  /** Baixa a imagem do Story na galeria ou browser */
  const handleDownload = async () => {
    setSaving(true);
    setDownloadSuccess(false);
    try {
      const uri = await captureCard();
      if (!uri) return;

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.download = `lettergram-${movieTitle?.replace(/\s+/g, '-').toLowerCase() || 'story'}.png`;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        if (!(await requestGalleryPermission())) return;
        await MediaLibrary.saveToLibraryAsync(uri);
      }
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a imagem.');
    } finally {
      setSaving(false);
    }
  };

  /** Baixa apenas a capa/poster do filme */
  const handleDownloadPoster = async () => {
    if (!posterBase64) {
      Alert.alert('Sem capa', 'Nenhuma capa disponível para download.');
      return;
    }
    setSavingPoster(true);
    setPosterDownloadSuccess(false);
    try {
      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.download = `capa-${stripYear(movieTitle || 'filme').replace(/\s+/g, '-').toLowerCase()}.jpg`;
        link.href = posterBase64;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const base64Data = posterBase64.split(',')[1];
        const LegacyFS = await import('expo-file-system/build/legacy');
        const fileUri = (LegacyFS.cacheDirectory ?? '') + `capa-${Date.now()}.jpg`;
        await LegacyFS.writeAsStringAsync(fileUri, base64Data, { encoding: LegacyFS.EncodingType.Base64 });
        if (!(await requestGalleryPermission())) return;
        await MediaLibrary.saveToLibraryAsync(fileUri);
      }
      setPosterDownloadSuccess(true);
      setTimeout(() => setPosterDownloadSuccess(false), 3000);
    } catch {
      Alert.alert('Erro', 'Não foi possível baixar a capa.');
    } finally {
      setSavingPoster(false);
    }
  };

  /** Compartilha nos Stories do Instagram */
  const handleShareInstagram = async () => {
    setSharingStory(true);
    try {
      if (Platform.OS === 'web') {
        const htmlToImage = await import('html-to-image');
        const domNode = document.getElementById('story-card');
        if (!domNode) throw new Error('DOM node not found');
        await new Promise(resolve => setTimeout(resolve, 300));
        const dataUrl = await htmlToImage.toPng(domNode, { cacheBust: true, pixelRatio: 4 });
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'lettergram-story.png', { type: 'image/png' });

        if (navigator.share && navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'LetterGram Story', text: 'Minha review no Letterboxd ✨' });
        } else {
          const link = document.createElement('a');
          link.download = 'lettergram-story.png';
          link.href = dataUrl;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          Alert.alert('Imagem salva!', 'A imagem foi baixada. Abra o Instagram e compartilhe nos Stories manualmente.');
        }
      } else {
        if (!viewShotRef.current) return;
        const uri = await (viewShotRef.current as any).capture();
        const instagramUrl = 'instagram-stories://share';
        const canOpen = await Linking.canOpenURL(instagramUrl);
        if (canOpen) {
          await Linking.openURL(instagramUrl);
        } else {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar Story no Instagram' });
          } else {
            Alert.alert('Instagram', 'Não foi possível abrir o Instagram. Verifique se o app está instalado.');
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') Alert.alert('Erro', 'Não foi possível compartilhar.');
    } finally {
      setSharingStory(false);
    }
  };

  /** Reseta os estados de sucesso */
  const resetSuccess = () => {
    setDownloadSuccess(false);
    setPosterDownloadSuccess(false);
  };

  return {
    viewShotRef,
    saving,
    savingPoster,
    sharingStory,
    downloadSuccess,
    posterDownloadSuccess,
    handleDownload,
    handleDownloadPoster,
    handleShareInstagram,
    resetSuccess,
  };
}
