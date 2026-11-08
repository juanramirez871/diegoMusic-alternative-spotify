import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { IconSymbol } from '@/components/IconSymbol';
import { ModalShell } from '@/components/ModalShell';
import { usePlayback } from "@/context/PlayerContext";
import { useLanguage } from "@/context/LanguageContext";
import { SleepTimerModalProps } from "@/interfaces/player";
import { styles } from "./styles.web";

export default function SleepTimerModal({ visible, onClose }: SleepTimerModalProps) {
  const { sleepTimer, setSleepTimer } = usePlayback();
  const { t } = useLanguage();

  const handleSelectTimer = (minutes: number | null) => {
    setSleepTimer(minutes);
    onClose();
  };

  const formatDuration = (minutes: number) => {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return hours === 1
        ? t('sleepTimer.hourOption', { count: hours })
        : t('sleepTimer.hoursOption', { count: hours });
    }
    return t('sleepTimer.minutesOption', { count: minutes });
  };

  const timerOptions = [
    { label: t('sleepTimer.disable'), value: null },
    { label: formatDuration(5), value: 5 },
    { label: formatDuration(15), value: 15 },
    { label: formatDuration(30), value: 30 },
    { label: formatDuration(45), value: 45 },
    { label: formatDuration(60), value: 60 },
    { label: formatDuration(120), value: 120 },
    { label: formatDuration(180), value: 180 },
    { label: formatDuration(240), value: 240 },
  ];

  return (
    <ModalShell visible={visible} onClose={onClose} width={420}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('sleepTimer.title')}</Text>
        {sleepTimer && (
          <Text style={styles.subtitle}>{t('sleepTimer.active', { time: formatDuration(sleepTimer) })}</Text>
        )}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.optionsList}>
          {timerOptions.map((option) => (
            <TouchableOpacity key={option.label} style={styles.option} onPress={() => handleSelectTimer(option.value)}>
              <IconSymbol
                name={sleepTimer === option.value ? "radio-button-on" : "radio-button-off"}
                size={24}
                color={sleepTimer === option.value ? "#2c5af3" : "#fff"}
              />
              <Text style={[styles.optionText, sleepTimer === option.value && styles.activeOptionText]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ModalShell>
  );
}
