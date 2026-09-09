import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? '#121212' : '#252424ff',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 28,
    fontWeight: 'bold',
  },
  editBtn: {
    color: '#b3b3b3',
    fontSize: 14,
    fontWeight: '600',
  },
  editBtnActive: {
    color: '#2c5af3',
  },
  list: {
    flex: 1,
    gap: 4,
  },
  bigList: {
    marginTop: 8,
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    marginTop: 100,
    gap: 16,
  },
  emptyText: {
    color: '#b3b3b3',
    fontSize: 16,
  },
  emptyBtn: {
    backgroundColor: '#2c5af3',
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  webScrollContent: {
    alignItems: 'center',
    paddingBottom: 140,
  },
  webInner: {
    width: '100%',
    paddingHorizontal: 32,
  },
  webHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 24,
    paddingBottom: 28,
    flexWrap: 'wrap',
  },
  webHeaderText: {
    flexShrink: 1,
  },
  webKicker: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  webTitle: {
    color: '#fff',
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  webSubtitle: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 10,
  },
  webHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  webReorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  webReorderBtnActive: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  webReorderText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  webReorderTextActive: {
    color: '#121212',
  },
  webCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#2c5af3',
  },
  webCreateText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  webReorderList: {
    maxWidth: 640,
    gap: 4,
  },
});
