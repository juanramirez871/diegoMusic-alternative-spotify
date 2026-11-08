import { Platform, StyleSheet } from 'react-native';
import { colors, layout } from '@/constants/theme';

const isWeb = Platform.OS === 'web';

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // Clips the content while the native user drawer slides it aside.
    overflow: isWeb ? 'visible' : 'hidden',
    backgroundColor: isWeb ? colors.background : colors.backgroundNative,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.pagePadding,
    paddingTop: isWeb ? 20 : 8,
    paddingBottom: 100,
  },
  sections: {
    marginTop: isWeb ? 24 : 16,
    gap: isWeb ? 36 : 28,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
  },
  footerImage: {
    width: 200,
    height: 100,
    transform: [{ translateY: 35 }],
  },
});
