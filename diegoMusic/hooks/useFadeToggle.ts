import { useCallback, useRef, useState } from 'react';
import { Animated } from 'react-native';

/** Visibility flag plus an opacity value that fades in on `show` and out on `hide`. */
export function useFadeToggle(showDuration = 250, hideDuration = 200) {
  const anim = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => {
    setVisible(true);
    Animated.timing(anim, { toValue: 1, duration: showDuration, useNativeDriver: true }).start();
  }, [anim, showDuration]);

  const hide = useCallback(
    (onHidden?: () => void) => {
      Animated.timing(anim, { toValue: 0, duration: hideDuration, useNativeDriver: true }).start(() => {
        setVisible(false);
        onHidden?.();
      });
    },
    [anim, hideDuration],
  );

  return { visible, anim, show, hide };
}
