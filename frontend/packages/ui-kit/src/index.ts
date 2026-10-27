export {
  AppearanceProvider,
  FONTS,
  TEXT_SCALES,
  THEMES,
  appearanceAttributes,
  type Appearance,
  type Font,
  type TextScale,
  type Theme,
} from './appearance/AppearanceProvider';
export {
  EXPERIENCE_BANDS,
  gateModeForBand,
  isExperienceBand,
  type ExperienceBand,
  type GateMode,
} from './appearance/bands';
export {
  ACTIVITY_CARD_KINDS,
  ActivityCard,
  type ActivityCardKind,
  type ActivityCardProps,
} from './components/ActivityCard/ActivityCard';
export {
  ANSWER_TILE_STATES,
  AnswerTile,
  type AnswerTileContent,
  type AnswerTileProps,
  type AnswerTileState,
} from './components/AnswerTile/AnswerTile';
export { AVATARS, Avatar, isAvatarId, type AvatarId } from './components/AvatarPicker/Avatar';
export { AvatarPicker, type AvatarPickerProps } from './components/AvatarPicker/AvatarPicker';
export { Button, type ButtonProps, type ButtonVariant } from './components/Button/Button';
export { Card, type CardProps } from './components/Card/Card';
export { Dialog, type DialogProps } from './components/Dialog/Dialog';
export { Celebration, type CelebrationProps } from './components/Celebration/Celebration';
export {
  FEEDBACK_KINDS,
  Feedback,
  type FeedbackKind,
  type FeedbackProps,
} from './components/Feedback/Feedback';
export { ParentalGate, type ParentalGateProps } from './components/ParentalGate/ParentalGate';
export { PinPicture } from './components/PicturePin/PinPicture';
export { PicturePinPad, type PicturePinPadProps } from './components/PicturePin/PicturePinPad';
export { ProgressTrail, type ProgressTrailProps } from './components/ProgressTrail/ProgressTrail';
export { SettingsPanel, type SettingsPanelProps } from './components/SettingsPanel/SettingsPanel';
export { SkillStatus, type SkillStatusProps } from './components/SkillStatus/SkillStatus';
export { appearanceFromSettings } from './components/SettingsPanel/settings';
export { DEFAULT_PLAY_SETTINGS, type PlaySettings } from '@learnofun/contracts';
// Learnofun's own icons, as the screen designs draw them (ADR 0045).
export {
  BackIcon,
  BanIcon,
  BlendIcon,
  BookIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  CloseIcon,
  DeleteIcon,
  DownloadIcon,
  GamesIcon,
  HintIcon,
  HomeIcon,
  KeyIcon,
  LockIcon,
  NextIcon,
  NoChatIcon,
  NoPurchaseIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  PrinterIcon,
  RetryIcon,
  ShieldCheckIcon,
  ShieldIcon,
  SignInIcon,
  SignOutIcon,
  SoundIcon,
  SoundOffIcon,
  SpeakerIcon,
  SproutIcon,
  StarIcon,
  StarOutlineIcon,
  StickerIcon,
  TapIcon,
  UserIcon,
  WarningIcon,
  type IconProps,
} from './components/icons';
export { Switch, type SwitchProps } from './components/Switch/Switch';
export {
  TOAST_DURATION_MS,
  ToastProvider,
  useToast,
  type ToastProviderProps,
} from './components/Toast/Toast';
export { DevLocaleSwitcher } from './i18n/DevLocaleSwitcher';
export { createBrowserI18n, keepLocaleInUrl } from './i18n/browser';
export { I18nProvider } from './i18n/I18nProvider';
export { useI18n } from './i18n/useI18n';
