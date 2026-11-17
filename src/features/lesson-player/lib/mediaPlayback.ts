import {useOptionalVideoCall} from '../../video-call';

/**
 * Lesson audio/video must not take over the audio session while a call is
 * open. iOS switches to the playback category on play and drops the mic;
 * Android AUDIOFOCUS_GAIN pauses the call WebView.
 */
export function useLessonMediaProps() {
  const callOpen = useOptionalVideoCall()?.isOpen ?? false;
  return {
    ignoreSilentSwitch: 'ignore' as const,
    mixWithOthers: 'mix' as const,
    disableFocus: true,
    disableAudioSessionManagement: callOpen,
  };
}
