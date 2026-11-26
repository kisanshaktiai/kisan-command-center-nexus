/**
 * themeMapping.ts
 *
 * Single source of truth for converting a mobile theme preset (HSL "H S% L%" tokens)
 * into the FULL set of JSONB groups that the shared `white_label_configs` table
 * stores and the mobile app reads.
 *
 * The mobile app lives in a separate codebase. It reads colors from:
 *   - brand_identity.primary_color / secondary_color / accent_color  (hex)
 *   - mobile_theme.core.*  (nested HSL — newer builds)
 *   - mobile_theme.<flat_keys>  (flat HSL+hex — older builds, backwards-compat)
 *   - theme_colors.core.* / dark_mode.colors.* / maps.* / gradients.* /
 *     charts.* / navigation.* / weather.*  (HSL token tree the web+mobile share)
 *
 * Previously the partner portal only wrote a couple of `mobile_theme.core.*`
 * entries when a preset was clicked, so the mobile app saw 1-2 colors change
 * and the rest stayed on whatever brand_identity had months ago.
 *
 * `expandPresetToFullConfig` returns every group the mobile app expects so a
 * single DB write fully cascades.
 */

export interface ThemeCore {
  primary: string;            // "H S% L%"
  primary_variant: string;
  secondary: string;
  secondary_variant: string;
  tertiary: string;
  accent: string;
}

export interface ThemeNeutral {
  background: string;
  surface: string;
  on_background: string;
  on_surface: string;
  border: string;
}

export interface ThemeStatus {
  success: string;
  warning: string;
  error: string;
  info: string;
}

export interface ThemeSupport {
  disabled: string;
  overlay: string;
}

export interface PresetTheme {
  core: ThemeCore;
  neutral: ThemeNeutral;
  status: ThemeStatus;
  support: ThemeSupport;
  typography?: any;
  spacing?: any;
  border_radius?: any;
  shadows?: any;
}

// ---------- HSL <-> hex helpers ----------

/** Parse "H S% L%" → [h, s, l] */
function parseHsl(value: string): [number, number, number] | null {
  if (!value || typeof value !== 'string') return null;
  const m = value.trim().match(/^(\d{1,3})\s+(\d{1,3})%\s+(\d{1,3})%$/);
  if (!m) return null;
  return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
}

export function hslTokenToHex(token: string): string {
  const parsed = parseHsl(token);
  if (!parsed) return '#000000';
  const [h, s, l] = parsed;
  const sN = s / 100;
  const lN = l / 100;
  const c = (1 - Math.abs(2 * lN - 1)) * sN;
  const hp = h / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) { r = c; g = x; b = 0; }
  else if (hp < 2) { r = x; g = c; b = 0; }
  else if (hp < 3) { r = 0; g = c; b = x; }
  else if (hp < 4) { r = 0; g = x; b = c; }
  else if (hp < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const m = lN - c / 2;
  const to255 = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to255(r)}${to255(g)}${to255(b)}`;
}

/** Shift lightness while clamping to [4, 96]. Negative darkens. */
export function shiftLightness(token: string, deltaL: number): string {
  const parsed = parseHsl(token);
  if (!parsed) return token;
  const [h, s, l] = parsed;
  const newL = Math.max(4, Math.min(96, l + deltaL));
  return `${h} ${s}% ${newL}%`;
}

/** Foreground color that has contrast against the given HSL token. */
export function contrastForeground(token: string): string {
  const parsed = parseHsl(token);
  if (!parsed) return '0 0% 100%';
  const [, , l] = parsed;
  return l > 55 ? '0 0% 10%' : '0 0% 100%';
}

// ---------- Full expansion ----------

export interface ExpandedThemeBundle {
  brand_identity: Record<string, any>;
  mobile_theme: Record<string, any>;
  theme_colors: Record<string, any>;
  app_customization: Record<string, any>;
}

/**
 * Expand a preset into every JSONB group the mobile app reads. The caller
 * should merge each group over its existing DB value (so unrelated keys such
 * as logo_url, app_name, etc. are preserved).
 */
export function expandPresetToFullConfig(
  preset: PresetTheme,
  options: { fontFamily?: string; existingBrandIdentity?: Record<string, any> } = {}
): ExpandedThemeBundle {
  const core = preset.core;
  const neutral = preset.neutral;
  const status = preset.status;
  const support = preset.support;

  const primaryHex = hslTokenToHex(core.primary);
  const secondaryHex = hslTokenToHex(core.secondary);
  const accentHex = hslTokenToHex(core.accent);
  const tertiaryHex = hslTokenToHex(core.tertiary);

  // ---- brand_identity (hex, mobile branding chrome reads these) ----
  const brand_identity = {
    ...(options.existingBrandIdentity ?? {}),
    primary_color: primaryHex,
    secondary_color: secondaryHex,
    accent_color: accentHex,
    font_family: options.fontFamily ?? preset.typography?.font_family ?? 'Inter',
  };

  // ---- mobile_theme (both nested AND flat keys for back-compat) ----
  const mobile_theme = {
    // nested (new mobile builds)
    core,
    neutral,
    status,
    support,
    typography: preset.typography,
    spacing: preset.spacing,
    border_radius: preset.border_radius,
    shadows: preset.shadows,

    // flat HSL (legacy mobile builds)
    primary_color: core.primary,
    primary_variant: core.primary_variant,
    secondary_color: core.secondary,
    secondary_variant: core.secondary_variant,
    tertiary_color: core.tertiary,
    accent_color: core.accent,
    background_color: neutral.background,
    surface_color: neutral.surface,
    text_color: neutral.on_background,
    on_surface_color: neutral.on_surface,
    border_color: neutral.border,
    success_color: status.success,
    warning_color: status.warning,
    error_color: status.error,
    info_color: status.info,
    disabled_color: support.disabled,
    overlay_color: support.overlay,

    // flat hex (some mobile screens read hex directly)
    primary_color_hex: primaryHex,
    secondary_color_hex: secondaryHex,
    accent_color_hex: accentHex,
    tertiary_color_hex: tertiaryHex,
  };

  // ---- theme_colors (web + mobile shared token tree) ----
  const theme_colors = {
    core: {
      primary: core.primary,
      primary_foreground: contrastForeground(core.primary),
      secondary: core.secondary,
      secondary_foreground: contrastForeground(core.secondary),
      accent: core.accent,
      accent_foreground: contrastForeground(core.accent),
      background: neutral.background,
      foreground: neutral.on_background,
      card: neutral.surface,
      card_foreground: neutral.on_surface,
      popover: neutral.surface,
      popover_foreground: neutral.on_surface,
      muted: shiftLightness(neutral.surface, -4),
      muted_foreground: shiftLightness(neutral.on_surface, 30),
      border: neutral.border,
      input: neutral.border,
      ring: core.primary,
      destructive: status.error,
      destructive_foreground: contrastForeground(status.error),
      success: status.success,
      success_foreground: contrastForeground(status.success),
    },
    dark_mode: {
      enabled: false,
      colors: {
        background: shiftLightness(neutral.background, -85),
        foreground: '0 0% 95%',
        card: shiftLightness(neutral.background, -80),
        card_foreground: '0 0% 95%',
        muted: shiftLightness(neutral.background, -75),
        muted_foreground: shiftLightness(neutral.on_background, 50),
        border: shiftLightness(neutral.border, -65),
        primary: shiftLightness(core.primary, 6),
        primary_foreground: '0 0% 100%',
        secondary: shiftLightness(core.secondary, 10),
        nav_background: shiftLightness(neutral.background, -83),
        nav_border: shiftLightness(neutral.border, -65),
        nav_active: shiftLightness(core.primary, 6),
        nav_inactive: shiftLightness(neutral.on_background, -45),
      },
    },
    maps: {
      polygon_fill: core.primary,
      polygon_stroke: shiftLightness(core.primary, -8),
      marker_color: status.error,
      tracking_fill: status.info,
      tracking_stroke: shiftLightness(status.info, -10),
    },
    gradients: {
      primary: `linear-gradient(135deg, hsl(${core.primary}), hsl(${shiftLightness(core.primary, 8)}))`,
      earth: `linear-gradient(180deg, hsl(${status.info}), hsl(${neutral.background}))`,
      sunrise: `linear-gradient(135deg, hsl(${status.warning}), hsl(${core.secondary}))`,
    },
    charts: {
      chart_1: core.primary,
      chart_2: core.secondary,
      chart_3: core.tertiary,
      chart_4: core.accent,
      chart_5: status.info,
    },
    navigation: {
      nav_background: neutral.surface,
      nav_border: neutral.border,
      nav_active: core.primary,
      nav_inactive: shiftLightness(neutral.on_background, 40),
    },
    weather: {
      sunny: status.warning,
      cloudy: '214 14% 72%',
      rainy: status.info,
      stormy: '240 5% 34%',
      night: shiftLightness(neutral.background, -80),
    },
  };

  // ---- app_customization ----
  const app_customization = {
    font_family: options.fontFamily ?? preset.typography?.font_family ?? 'Inter',
    border_radius: preset.border_radius,
    animations_enabled: true,
  };

  return { brand_identity, mobile_theme, theme_colors, app_customization };
}

/**
 * Real columns on `white_label_configs`. Anything else MUST be filtered out
 * before sending to PostgREST — non-existent column writes get silently
 * dropped which is exactly how we ended up with "only 2 colors syncing".
 */
export const WHITE_LABEL_REAL_COLUMNS = new Set<string>([
  'id',
  'tenant_id',
  'brand_identity',
  'domain_config',
  'email_templates',
  'app_store_config',
  'pwa_config',
  'splash_screens',
  'created_at',
  'updated_at',
  'css_injection',
  'app_customization',
  'content_management',
  'distribution',
  'domain_health',
  'theme_colors',
  'mobile_theme',
  'api_version',
  'last_synced_at',
  'validation_errors',
  'is_validated',
  'branding_version',
  'schema_version',
  'is_active',
  'last_deployed_at',
  'created_by',
  'updated_by',
  'theme_history',
]);

/** Drop any key that isn't a real column on white_label_configs. */
export function pickRealColumns<T extends Record<string, any>>(payload: T): Partial<T> {
  const out: Record<string, any> = {};
  for (const key of Object.keys(payload)) {
    if (WHITE_LABEL_REAL_COLUMNS.has(key)) out[key] = payload[key];
  }
  return out as Partial<T>;
}
