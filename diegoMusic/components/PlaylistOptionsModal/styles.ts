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
    paddingBottom: 30,
    zIndex: 1,
    ...(isWeb
      ? { width: 460, maxWidth: '92%' as any, borderRadius: 16, alignSelf: 'center' }
      : null),
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#555',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
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
