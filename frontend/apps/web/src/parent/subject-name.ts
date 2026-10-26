import type { SubjectId } from '@learnofun/contracts';
import type { useI18n } from '@learnofun/ui-kit';

type Translate = ReturnType<typeof useI18n>['t'];

/** A subject's name in the parent's language. Each key is written out, so the catalog checks it. */
export function subjectName(t: Translate, subject: SubjectId): string {
  switch (subject) {
    case 'mathematics':
      return t('parent.subjects.mathematics');
    case 'literacy':
      return t('parent.subjects.literacy');
    case 'logic':
      return t('parent.subjects.logic');
    case 'coding':
      return t('parent.subjects.coding');
    case 'science':
      return t('parent.subjects.science');
    case 'arts':
      return t('parent.subjects.arts');
  }
}
