import { Dimensions, StyleSheet } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const styles = StyleSheet.create({
  content: {
    maxHeight: SCREEN_HEIGHT * 0.75,
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
