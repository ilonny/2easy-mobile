export const breakpoints = {
  phone: 0,
  tablet: 768,
  desktop: 1024,
} as const;

export const layout = {
  authFormMaxWidthPhone: 460,
  authFormMaxWidthTablet: 560,
  pageContentMaxWidthTablet: 840,
  /** Wider readable column when the tablet is landscape / Split View is wide. */
  pageContentMaxWidthTabletLandscape: 1024,
  pageGutterPhone: 16,
  pageGutterTablet: 32,
} as const;
