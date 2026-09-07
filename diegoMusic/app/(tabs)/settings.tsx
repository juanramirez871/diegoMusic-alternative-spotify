import { IconSymbol } from '@/components/IconSymbol';
import { Text, TouchableOpacity, View, ScrollView, Image, ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useLibrary } from '@/context/PlayerContext';
import type { Locale } from '@/interfaces/language';
import type { VideoQuality } from '@/context/player/types';
import { styles } from '@/styles/SettingsScreen.styles';
import { settingsService } from '@/services/settingsService';

const LANGUAGES: { locale: Locale; label: string; nativeLabel: string; flag: ImageSourcePropType }[] = [
  { locale: 'en', label: 'English', nativeLabel: 'English', flag: require('../../assets/images/english.png') },
  { locale: 'es', label: 'Español', nativeLabel: 'Español', flag: require('../../assets/images/spanish.png') },
  { locale: 'ja', label: '日本語', nativeLabel: '日本語', flag: require('../../assets/images/japanese.png') },
];

const QUALITY_ICONS: Record<VideoQuality, string> = {
  low: 'cellular-outline',
  medium: 'cellular-outline',
  high: 'cellular',
};

export default function SettingsScreen() {

  const { t, locale, setLocale } = useLanguage();
  const { videoQuality, setVideoQuality } = useLibrary();
  const handleSetLocale = (l: Locale) => {
    setLocale(l);
    settingsService.update({ language: l });
  };

  const handleSetVideoQuality = (q: VideoQuality) => {
    setVideoQuality(q);
    settingsService.update({ videoQuality: q });
  };

  const QUALITIES: { value: VideoQuality; label: string }[] = [
    { value: 'low', label: t('settings.videoQualityLow') },
    { value: 'medium', label: t('settings.videoQualityMedium') },
    { value: 'high', label: t('settings.videoQualityHigh') },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          <Text style={styles.screenTitle}>{t('settings.title')}</Text>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
            <View style={styles.optionsContainer}>
              {LANGUAGES.map((lang) => {
                const isActive = locale === lang.locale;
                return (
                  <TouchableOpacity
                    key={lang.locale}
                    style={[styles.option, isActive && styles.optionActive]}
                    onPress={() => handleSetLocale(lang.locale)}
                    activeOpacity={0.7}
                  >
                    <Image style={styles.optionFlag} source={lang.flag} />
                    <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                      {lang.nativeLabel}
                    </Text>
                    {isActive && (
                      <IconSymbol name="checkmark-circle" size={20} color="#2c5af3" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t('settings.videoQuality')}</Text>
            <View style={styles.optionsContainer}>
              {QUALITIES.map((q) => {
                const isActive = videoQuality === q.value;
                return (
                  <TouchableOpacity
                    key={q.value}
                    style={[styles.option, isActive && styles.optionActive]}
                    onPress={() => handleSetVideoQuality(q.value)}
                    activeOpacity={0.7}
                  >
                    <IconSymbol
                      name={QUALITY_ICONS[q.value] as any}
                      size={22}
                      color={isActive ? '#2c5af3' : '#b3b3b3'}
                      style={styles.qualityIcon}
                    />
                    <Text style={[styles.optionLabel, isActive && styles.optionLabelActive]}>
                      {q.label}
                    </Text>
                    {isActive && (
                      <IconSymbol name="checkmark-circle" size={20} color="#2c5af3" style={styles.checkIcon} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
