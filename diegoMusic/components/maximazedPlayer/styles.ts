import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  gradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 0,
  },
  closeButton: {
    padding: 8,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  menuButton: {
    padding: 8,
  },
  scroll: {
    flex: 1,
    marginHorizontal: -20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  infoContainer: {
    marginTop: 40,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textWrapper: {
    flex: 1,
    marginRight: 16,
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  artist: {
    color: '#b3b3b3',
    fontSize: 18,
    marginTop: 4,
  },
  progressSection: {
    marginTop: 30,
  },
  progressContainer: {
    height: 36,
    width: '100%',
    backgroundColor: 'transparent',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  bgBar: {
    height: 4,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
  },
  progressBar: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  progressDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
    marginLeft: -0,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  timeText: {
    color: '#b3b3b3',
    fontSize: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  playButton: {
    paddingHorizontal: 10,
  },
  repeatButton: {
    position: 'relative',
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 75,
  },
  carouselWrapper: {
    marginHorizontal: -20,
  },
  videoFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 999,
  },
  videoFullscreenHint: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 16,
    alignSelf: 'center',
    zIndex: 1000,
  },
});
