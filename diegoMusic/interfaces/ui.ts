import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { Animated, DimensionValue, StyleProp, ViewStyle } from 'react-native';

export interface OfflineViewProps {
  onRetry?: () => Promise<boolean>;
  title?: string;
  message?: string;
}

export interface StatsOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  fadeAnim: Animated.Value;
}

export interface HistoryItem {
  id: string;
  text: string;
}

export interface SearchOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  fadeAnim: Animated.Value;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  recentSearches: HistoryItem[];
  setRecentSearches: (searches: HistoryItem[]) => void;
}

export interface LoadingSpinnerProps {
  size?: number;
  color?: string;
}

export interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
}

export interface FilterChipOption<T extends string> {
  value: T;
  label: string;
}

export interface FilterChipsProps<T extends string> {
  options: FilterChipOption<T>[];
  selected: T;
  onSelect: (value: T) => void;
}

export interface SectionHeaderProps {
  title: string;
  /** Small caption shown above the title (e.g. "Made for"). */
  eyebrow?: string;
  /** Element rendered before the titles, such as an artist avatar. */
  leading?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export interface ShelfProps extends Omit<SectionHeaderProps, 'actionLabel' | 'onAction'> {
  children?: ReactNode;
  /** Message shown instead of the row when there are no children. */
  emptyText?: string;
  /** Allows toggling between the scrolling row and a wrapped grid. Defaults to true. */
  expandable?: boolean;
}

export interface MediaCardProps {
  title: string;
  subtitle?: string;
  imageUri?: string | null;
  shape?: 'square' | 'circle';
  onPress: () => void;
}

export interface PlayFabProps {
  visible: boolean;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export interface ModalShellProps {
  visible: boolean;
  /** Asked to close (backdrop, Escape, Android back). The parent hides it by setting `visible` to false. */
  onClose: () => void;
  children?: ReactNode;
  /** Layout of the panel's content (gap, height, padding overrides). The shell provides the surface. */
  contentStyle?: StyleProp<ViewStyle>;
  /** Width of the centred dialog on web. Ignored on native, where the panel is a bottom sheet. */
  width?: number;
}
