import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#444',
    paddingBottom: 15,
  },
  title: { color: '#fff', fontSize: 18, fontWeight: 'bold', textAlign: 'center' },
  optionsList: {
    gap: 6,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  renameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  renameInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    color: '#fff',
    fontSize: 16,
    // @ts-ignore web-only — drop the browser focus ring
    outlineStyle: 'solid',
    // @ts-ignore web-only
    outlineWidth: 0,
    // @ts-ignore web-only
    boxShadow: 'none',
  },
});
