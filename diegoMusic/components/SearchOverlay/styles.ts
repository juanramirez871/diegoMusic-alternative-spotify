import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#121212',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#282828',
  },
  activeSearchWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  activeSearchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    height: '100%',
    outlineStyle: 'none' as any,
  },
  cancelButtonWrapper: {
    paddingLeft: 4,
  },
  cancelButton: {
    color: '#fff',
    fontSize: 14,
  },
  searchContent: {
    flex: 1,
  },
  resultsContainer: {
    paddingTop: 10,
    paddingBottom: 150,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: 14,
  },
  emptyStateTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptyStateSub: {
    color: '#b3b3b3',
    fontSize: 14,
    textAlign: 'center',
  },
  recentSearchesContainer: {
    paddingTop: 20,
    paddingHorizontal: 16,
    flex: 1,
  },
  recentSearchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recentSearchesTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearRecentText: {
    color: '#b3b3b3',
    fontSize: 14,
  },
  recentSearchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentSearchIcon: {
    marginRight: 12,
  },
  recentSearchText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
  },
  skeletonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    width: '100%',
  },
  skeletonInfo: {
    flex: 1,
    marginLeft: 15,
    justifyContent: 'center',
  },
  searchLoadingBar: {
    width: 20,
    height: 4,
    backgroundColor: '#2c5af3ff',
    borderRadius: 2,
    marginLeft: 8,
  },
});
