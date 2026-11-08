import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#000',
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    padding: 8,
    gap: 8,
  },
  content: {
    flex: 1,
    backgroundColor: '#121212',
    borderRadius: 12,
    overflow: 'hidden',
  },
  minimizedPlayer: {
    zIndex: 200,
  },
});
