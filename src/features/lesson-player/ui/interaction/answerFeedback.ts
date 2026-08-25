import {StyleSheet} from 'react-native';

import {colors, radii} from '../../../../shared/config/theme';

/** Site-parity feedback for drag/select/input answer slots. */
export const answerFeedback = StyleSheet.create({
  slot: {
    borderWidth: 1,
    borderColor: 'rgba(63,40,198,0.35)',
    backgroundColor: colors.primarySoft,
  },
  ok: {
    backgroundColor: '#A7F3D0',
    borderWidth: 1,
    borderColor: 'rgba(22,163,74,0.95)',
  },
  bad: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: 'rgba(220,38,38,0.75)',
  },
  okText: {
    color: '#166534',
    fontWeight: '700',
  },
  badText: {
    color: '#991B1B',
    fontWeight: '700',
  },
  chipOk: {
    backgroundColor: '#E9FEE8',
    borderWidth: 2,
    borderColor: '#219F59',
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  chipBad: {
    backgroundColor: '#FDD0DF',
    borderWidth: 2,
    borderColor: colors.danger,
    borderRadius: radii.md,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
});
