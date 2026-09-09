import { StyleSheet, Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: isWeb ? '#0d0d0d' : '#252424',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 8,
  },
  appName: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: '#888',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  actions: {
    width: '100%',
    maxWidth: isWeb ? 360 : undefined,
    alignItems: 'center',
    gap: 16,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 52,
    backgroundColor: '#fff',
    borderRadius: 999,
    gap: 12,
  },
  googleBtnDisabled: {
    opacity: 0.7,
  },
  googleIcon: {
    width: 20,
    height: 20,
  },
  googleText: {
    color: '#111',
    fontSize: 15,
    fontWeight: '600',
  },
  terms: {
    color: '#444',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: '#666',
    textDecorationLine: 'underline',
  },
});
