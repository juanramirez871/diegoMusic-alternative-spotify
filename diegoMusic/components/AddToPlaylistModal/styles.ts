import { Dimensions, Platform, StyleSheet } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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
    maxHeight: SCREEN_HEIGHT * 0.75,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
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
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#444',
    paddingBottom: 14,
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  doneText: {
    color: '#2c5af3',
    fontSize: 16,
    fontWeight: '600',
  },
  doneDisabled: {
    color: '#666',
  },
  batchSubtitle: {
    color: '#8f8f8f',
    fontSize: 13,
    marginTop: -6,
    marginBottom: 6,
  },
  list: {
    flexGrow: 0,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  newInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    color: '#fff',
    fontSize: 15,
    // @ts-ignore web-only — drop the browser focus ring
    outlineStyle: 'solid',
    // @ts-ignore web-only
    outlineWidth: 0,
    // @ts-ignore web-only
    boxShadow: 'none',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  rowInfo: {
    flex: 1,
  },
  rowName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
  },
  rowMeta: {
    color: '#b3b3b3',
    fontSize: 12,
    marginTop: 2,
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
});
