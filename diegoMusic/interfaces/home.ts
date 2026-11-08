export type HomeFilter = 'all' | 'music' | 'artists';

export interface HomeHeaderProps {
  filter: HomeFilter;
  onFilterChange: (filter: HomeFilter) => void;
  onOpenStats: () => void;
  /** Opens the user drawer. Native only; the web layout has no drawer. */
  onOpenDrawer?: () => void;
}
