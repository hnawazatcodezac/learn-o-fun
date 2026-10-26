import type { PinPicture as PinPictureId } from '@learnofun/contracts';
import { CloudIcon } from '@phosphor-icons/react/dist/csr/Cloud';
import { DropIcon } from '@phosphor-icons/react/dist/csr/Drop';
import { FishIcon } from '@phosphor-icons/react/dist/csr/Fish';
import { FlowerIcon } from '@phosphor-icons/react/dist/csr/Flower';
import { HeartIcon } from '@phosphor-icons/react/dist/csr/Heart';
import { LeafIcon } from '@phosphor-icons/react/dist/csr/Leaf';
import { MoonIcon } from '@phosphor-icons/react/dist/csr/Moon';
import { StarIcon } from '@phosphor-icons/react/dist/csr/Star';
import { SunIcon } from '@phosphor-icons/react/dist/csr/Sun';
import type { Icon } from '@phosphor-icons/react/dist/lib/types';

/** Phosphor icons in the text colour: each picture is its own shape, never told apart by colour. */
const PICTURES: Record<PinPictureId, Icon> = {
  sun: SunIcon,
  moon: MoonIcon,
  star: StarIcon,
  heart: HeartIcon,
  cloud: CloudIcon,
  flower: FlowerIcon,
  fish: FishIcon,
  leaf: LeafIcon,
  drop: DropIcon,
};

/** One picture of a picture PIN (ADR 0018). Decorative: whatever shows it gives it a name. */
export function PinPicture({ picture }: { picture: PinPictureId }) {
  const Picture = PICTURES[picture];
  return <Picture className="lf-icon" aria-hidden focusable="false" />;
}
