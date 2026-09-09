import { Platform, StyleSheet } from 'react-native';

const isWeb = Platform.OS === 'web';

export const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: isWeb ? 'center' : 'flex-end',
    alignItems: isWeb ? 'center' : 'stretch',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    backgroundColor: '#282828',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    gap: 16,
    ...(isWeb
      ? { width: 420, maxWidth: '92%' as any, borderRadius: 16, alignSelf: 'center' }
      : null),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 48,
    color: '#fff',
    fontSize: 16,
    // @ts-ignore web-only — drop the browser focus ring
    outlineStyle: 'solid',
    // @ts-ignore web-only
    outlineWidth: 0,
    // @ts-ignore web-only
    boxShadow: 'none',
  },
  button: {
    backgroundColor: '#2c5af3',
    borderRadius: 24,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
