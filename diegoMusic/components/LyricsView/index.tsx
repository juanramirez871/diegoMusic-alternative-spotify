import { IconSymbol } from '@/components/IconSymbol';
import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/context/LanguageContext';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { LyricsPanelProps, LyricsViewProps } from '@/interfaces/Song';
import { COMPACT_LINE_HEIGHT, full, panel, searchStyles, translation } from './styles';
import { useLyricsTranslation } from '@/hooks/useLyricsTranslation';
import { useLyricsAutoScrollPreference, useLyricsLineScroller } from '@/hooks/useLyricsAutoScroll';

const ManualSearchInput = ({ defaultQuery, onSearch }: { defaultQuery?: string; onSearch: (q: string) => void }) => {

  const [query, setQuery] = useState(defaultQuery ?? '');
  const { t } = useLanguage();
  return (
    <View style={searchStyles.row}>
      <TextInput
        style={searchStyles.input}
        value={query}
        onChangeText={setQuery}
        placeholder={t('lyrics.searchPlaceholder')}
        placeholderTextColor="#555"
        onSubmitEditing={() => query.trim() && onSearch(query.trim())}
        returnKeyType="search"
        selectTextOnFocus
      />
      <TouchableOpacity
        onPress={() => query.trim() && onSearch(query.trim())}
        style={searchStyles.btn}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <IconSymbol name="search" size={16} color="#fff" />
      </TouchableOpacity>
    </View>
  );
};


export function LyricsPanel({
  syncedLyrics,
  plainLyrics,
  loading,
  notFound,
  isOnline,
  currentLineIndex,
  onSeek,
  onExpand,
}: LyricsPanelProps) {

  const scrollRef = useRef<ScrollView>(null);
  const { t } = useLanguage();
  const { autoScrollEnabled, toggleAutoScroll } = useLyricsAutoScrollPreference();
  const scroller = useLyricsLineScroller(scrollRef, autoScrollEnabled);
  const {
    translationEnabled,
    setTranslationEnabled,
    translationFrom,
    setTranslationFrom,
    translationTo,
    setTranslationTo,
    translatedSynced,
    translatedPlain,
    translating,
    supportedLanguages,
  } = useLyricsTranslation(syncedLyrics, plainLyrics);

  const displaySynced = translationEnabled && translatedSynced ? translatedSynced : syncedLyrics;
  const displayPlain = translationEnabled && translatedPlain ? translatedPlain : plainLyrics;
  const originalSyncedLines =
    syncedLyrics?.map((line) => line.text) ??
    plainLyrics?.split('\n').map((line) => line.trim()).filter(Boolean) ?? [];

  const originalPlainText = plainLyrics ?? syncedLyrics?.map((line) => line.text).join('\n') ?? '';
  const showOriginalSyncedAboveTranslation = Boolean(translationEnabled && translatedSynced);
  const showOriginalPlainAboveTranslation = Boolean(
    translationEnabled && translatedPlain && originalPlainText
  );

  useEffect(() => {
    scroller.resetMeasurements();
  }, [syncedLyrics, plainLyrics]);

  useEffect(() => {
    scroller.scrollToLine(currentLineIndex);
  }, [currentLineIndex, autoScrollEnabled]);

  return (
    <View style={panel.container}>
      <View style={panel.header}>
        <Text style={panel.label}>{t('lyrics.title')}</Text>
        <View style={panel.headerActions}>
          <TouchableOpacity
            onPress={() => setTranslationEnabled(!translationEnabled)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol
              name="translate"
              size={16}
              color={translationEnabled ? '#2c5af3ff' : '#b3b3b3'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleAutoScroll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol
              name={autoScrollEnabled ? 'auto-scroll' : 'auto-scroll-off'}
              size={16}
              color={autoScrollEnabled ? '#2c5af3ff' : '#b3b3b3'}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onExpand} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <IconSymbol name="expand-outline" size={16} color="#b3b3b3" />
          </TouchableOpacity>
        </View>
      </View>

      {translationEnabled && (
        <View style={translation.row}>
          <Text style={translation.pickerLabel}>{t('lyrics.translateFrom')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {supportedLanguages.map((lang) => (
                <TouchableOpacity
                  key={`from-${lang.code}`}
                  onPress={() => setTranslationFrom(lang.code)}
                  style={[
                    translation.toggleBtn,
                    translationFrom === lang.code && { backgroundColor: 'rgba(44,90,243,0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      translation.toggleText,
                      translationFrom === lang.code && translation.toggleTextActive,
                    ]}
                  >
                    {lang.code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {translationEnabled && (
        <View style={[translation.row, translation.rowBottom]}>
          <Text style={translation.pickerLabel}>{t('lyrics.translateTo')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {supportedLanguages.map((lang) => (
                <TouchableOpacity
                  key={`to-${lang.code}`}
                  onPress={() => setTranslationTo(lang.code)}
                  style={[
                    translation.toggleBtn,
                    translationTo === lang.code && { backgroundColor: 'rgba(44,90,243,0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      translation.toggleText,
                      translationTo === lang.code && translation.toggleTextActive,
                    ]}
                  >
                    {lang.code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {(loading || translating) && (
        <View style={panel.center}>
          <LoadingSpinner />
        </View>
      )}

      {!loading && !translating && !isOnline && (
        <View style={panel.center}>
          <Text style={panel.emptyText}>{t('lyrics.offline')}</Text>
        </View>
      )}

      {!loading && !translating && isOnline && notFound && (
        <View style={panel.center}>
          <Text style={panel.emptyText}>{t('lyrics.notFound')}</Text>
        </View>
      )}

      {!loading && !translating && displaySynced && displaySynced.length > 0 && (
        <ScrollView
          ref={scrollRef}
          style={{ maxHeight: COMPACT_LINE_HEIGHT * 5 }}
          showsVerticalScrollIndicator={false}
          scrollEnabled
          nestedScrollEnabled
          onLayout={(e) => scroller.onViewportLayout(e.nativeEvent.layout.height)}
        >
          {displaySynced.map((item, index) => {
            const isActive = index === currentLineIndex;
            const originalText = originalSyncedLines[index] ?? item.text;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => onSeek(item.time)}
                activeOpacity={0.7}
                onLayout={(e) => scroller.onLineLayout(index, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
              >
                {showOriginalSyncedAboveTranslation && (
                  <Text style={panel.originalLine} numberOfLines={2}>
                    {originalText}
                  </Text>
                )}
                <Text style={[panel.line, isActive && panel.lineActive]} numberOfLines={2}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!loading && !translating && displayPlain && !displaySynced && (
        <ScrollView
          style={{ maxHeight: COMPACT_LINE_HEIGHT * 5 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {showOriginalPlainAboveTranslation && (
            <Text style={panel.originalPlain}>{originalPlainText}</Text>
          )}
          <Text style={panel.plain}>{displayPlain}</Text>
        </ScrollView>
      )}
    </View>
  );
}



export function LyricsView({
  syncedLyrics,
  plainLyrics,
  loading,
  notFound,
  isOnline,
  currentLineIndex,
  onSeek,
  onClose,
  onManualSearch,
  manualSearchDefaultQuery,
}: LyricsViewProps) {

  const scrollRef = useRef<ScrollView>(null);
  const [showEdit, setShowEdit] = useState(false);
  const { t } = useLanguage();
  const { autoScrollEnabled, toggleAutoScroll } = useLyricsAutoScrollPreference();
  const scroller = useLyricsLineScroller(scrollRef, autoScrollEnabled);
  const {
    translationEnabled,
    setTranslationEnabled,
    translationFrom,
    setTranslationFrom,
    translationTo,
    setTranslationTo,
    translatedSynced,
    translatedPlain,
    translating,
    supportedLanguages,
  } = useLyricsTranslation(syncedLyrics, plainLyrics);

  const displaySynced = translationEnabled && translatedSynced ? translatedSynced : syncedLyrics;
  const displayPlain = translationEnabled && translatedPlain ? translatedPlain : plainLyrics;
  const originalSyncedLines =
    syncedLyrics?.map((line) => line.text) ??
    plainLyrics?.split('\n').map((line) => line.trim()).filter(Boolean) ?? [];

  const originalPlainText = plainLyrics ?? syncedLyrics?.map((line) => line.text).join('\n') ?? '';
  const showOriginalSyncedAboveTranslation = Boolean(translationEnabled && translatedSynced);
  const showOriginalPlainAboveTranslation = Boolean(
    translationEnabled && translatedPlain && originalPlainText
  );

  useEffect(() => {
    if (loading) setShowEdit(false);
  }, [loading]);

  useEffect(() => {
    if (syncedLyrics || plainLyrics) setShowEdit(false);
  }, [syncedLyrics, plainLyrics]);

  useEffect(() => {
    scroller.resetMeasurements();
  }, [syncedLyrics, plainLyrics]);

  useEffect(() => {
    scroller.scrollToLine(currentLineIndex);
  }, [currentLineIndex, autoScrollEnabled]);

  const showSearchInput = onManualSearch && (showEdit || (!loading && isOnline && notFound));

  return (
    <View style={full.overlay}>
      <TouchableOpacity style={full.closeBtn} onPress={onClose}>
        <IconSymbol name="chevron-down" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={full.headingRow}>
        <Text style={full.heading}>{t('lyrics.title')}</Text>
        <View style={full.headerActions}>
          <TouchableOpacity
            onPress={() => setTranslationEnabled(!translationEnabled)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol
              name="translate"
              size={18}
              color={translationEnabled ? '#2c5af3ff' : '#b3b3b3'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={toggleAutoScroll}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <IconSymbol
              name={autoScrollEnabled ? 'auto-scroll' : 'auto-scroll-off'}
              size={18}
              color={autoScrollEnabled ? '#2c5af3ff' : '#b3b3b3'}
            />
          </TouchableOpacity>
          {onManualSearch && (
            <TouchableOpacity
              onPress={() => setShowEdit(s => !s)}
              style={full.editBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <IconSymbol name="pencil-outline" size={16} color={showEdit ? '#fff' : '#b3b3b3'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {translationEnabled && (
        <View style={translation.row}>
          <Text style={translation.pickerLabel}>{t('lyrics.translateFrom')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {supportedLanguages.map((lang) => (
                <TouchableOpacity
                  key={`from-${lang.code}`}
                  onPress={() => setTranslationFrom(lang.code)}
                  style={[
                    translation.toggleBtn,
                    translationFrom === lang.code && { backgroundColor: 'rgba(44,90,243,0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      translation.toggleText,
                      translationFrom === lang.code && translation.toggleTextActive,
                    ]}
                  >
                    {lang.code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {translationEnabled && (
        <View style={[translation.row, translation.rowBottom]}>
          <Text style={translation.pickerLabel}>{t('lyrics.translateTo')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {supportedLanguages.map((lang) => (
                <TouchableOpacity
                  key={`to-${lang.code}`}
                  onPress={() => setTranslationTo(lang.code)}
                  style={[
                    translation.toggleBtn,
                    translationTo === lang.code && { backgroundColor: 'rgba(44,90,243,0.2)' },
                  ]}
                >
                  <Text
                    style={[
                      translation.toggleText,
                      translationTo === lang.code && translation.toggleTextActive,
                    ]}
                  >
                    {lang.code.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {showSearchInput && (
        <ManualSearchInput
          key={manualSearchDefaultQuery}
          defaultQuery={manualSearchDefaultQuery}
          onSearch={onManualSearch}
        />
      )}

      {(loading || translating) && (
        <View style={full.center}>
          <ActivityIndicator color="#fff" />
        </View>
      )}

      {!loading && !translating && !isOnline && (
        <View style={full.center}>
          <IconSymbol name="cloud-offline-outline" size={36} color="#b3b3b3" />
          <Text style={full.emptyText}>{t('lyrics.noConnection')}</Text>
        </View>
      )}

      {!loading && !translating && isOnline && notFound && (
        <View style={full.center}>
          <IconSymbol name="musical-notes-outline" size={36} color="#b3b3b3" />
          <Text style={full.emptyText}>{t('lyrics.notAvailable')}</Text>
        </View>
      )}

      {!loading && !translating && displaySynced && displaySynced.length > 0 && (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={full.listContent}
          showsVerticalScrollIndicator={false}
          onLayout={(e) => scroller.onViewportLayout(e.nativeEvent.layout.height)}
        >
          {displaySynced.map((item, index) => {
            const isActive = index === currentLineIndex;
            const originalText = originalSyncedLines[index] ?? item.text;
            return (
              <TouchableOpacity
                key={index}
                onPress={() => onSeek(item.time)}
                activeOpacity={0.7}
                onLayout={(e) => scroller.onLineLayout(index, e.nativeEvent.layout.y, e.nativeEvent.layout.height)}
              >
                {showOriginalSyncedAboveTranslation && (
                  <Text style={full.originalLine}>{originalText}</Text>
                )}
                <Text style={[full.line, isActive && full.lineActive]}>
                  {item.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {!loading && !translating && displayPlain && !displaySynced && (
        <ScrollView
          contentContainerStyle={full.listContent}
          showsVerticalScrollIndicator={false}
        >
          {showOriginalPlainAboveTranslation && (
            <Text style={full.originalPlain}>{originalPlainText}</Text>
          )}
          <Text style={full.plain}>{displayPlain}</Text>
        </ScrollView>
      )}
    </View>
  );
}
