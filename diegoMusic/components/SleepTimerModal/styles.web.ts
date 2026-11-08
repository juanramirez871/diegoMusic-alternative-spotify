import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center',
  },
  subtitle: {
    color: '#2c5af3', fontSize: 14, marginTop: 4,
  },
  optionsList: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 15,
  },
  activeOptionText: {
    color: '#2c5af3',
    fontWeight: 'bold',
  },
});
