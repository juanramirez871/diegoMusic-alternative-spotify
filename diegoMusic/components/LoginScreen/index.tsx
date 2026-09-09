import { View, Text, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import styles from './styles';

export function LoginScreen() {
  const { login, loading } = useAuth();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      <Image
        source={require('@/assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.appName}>Diego Music</Text>
      <Text style={styles.subtitle}>{t('login.subtitle')}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.googleBtn, loading && styles.googleBtnDisabled]}
          onPress={login}
          activeOpacity={0.85}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#111" />
          ) : (
            <>
              <GoogleIcon />
              <Text style={styles.googleText}>{t('login.continueWithGoogle')}</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.terms}>
          {t('login.agreementPrefix')}{' '}
          <Text style={styles.link}>{t('login.termsOfService')}</Text>
          {' '}{t('login.agreementMiddle')}{' '}
          <Text style={styles.link}>{t('login.privacyPolicy')}</Text>.
        </Text>
      </View>
    </View>
  );
}

function GoogleIcon() {
  return (
    <Image
      source={require('@/assets/images/google-logo.png')}
      style={styles.googleIcon}
      resizeMode="contain"
    />
  );
}
