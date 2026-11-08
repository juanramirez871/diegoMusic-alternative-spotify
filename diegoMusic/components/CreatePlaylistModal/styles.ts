import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  content: {
    gap: 16,
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
