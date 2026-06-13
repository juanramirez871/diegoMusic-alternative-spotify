import { StyleSheet } from 'react-native';

export const TOP_BAR_HEIGHT = 64;

export const styles = StyleSheet.create({
  bar: {
    height: TOP_BAR_HEIGHT,
    backgroundColor: '#121212',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
    zIndex: 100,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    marginBottom: 4,
  },
  left: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  right: {
    flex: 1,
    alignItems: 'flex-end',
  },
  logo: {
    width: 56,
    height: 56,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#3a3a3a',
  },
  searchBox: {
    width: '30%' as any,
    maxWidth: 400,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 999,
    paddingHorizontal: 16,
    gap: 10,
  },
  searchBoxDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    // @ts-ignore web-only
    outlineStyle: 'solid',
    // @ts-ignore web-only
    outlineWidth: 0,
  },
});

export const menuStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 56,
    paddingRight: 16,
  },
  menu: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    width: 260,
    overflow: 'hidden',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  menuAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  userEmail: {
    color: '#888',
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#2a2a2a',
  },
  logoutBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  logoutBtnPressed: {
    backgroundColor: '#2a2a2a',
  },
  logoutText: {
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '500',
  },
});
