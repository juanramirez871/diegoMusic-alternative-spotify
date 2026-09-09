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
});
