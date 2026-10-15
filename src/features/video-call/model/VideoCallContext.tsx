import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import {useAuth} from '../../../entities/session';

type VideoCallContextValue = {
  isOpen: boolean;
  lessonOwnerId?: number;
  open: (opts?: {lessonOwnerId?: number}) => void;
  close: () => void;
};

const VideoCallContext = createContext<VideoCallContextValue | null>(null);

export function useVideoCall() {
  const ctx = useContext(VideoCallContext);
  if (!ctx) {
    throw new Error('useVideoCall must be used within VideoCallProvider');
  }
  return ctx;
}

export function VideoCallProvider({children}: PropsWithChildren) {
  const {isAuthorized, profile} = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [lessonOwnerId, setLessonOwnerId] = useState<number | undefined>();

  const open = useCallback((opts?: {lessonOwnerId?: number}) => {
    if (opts?.lessonOwnerId != null) {
      setLessonOwnerId(opts.lessonOwnerId);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isAuthorized || !profile) {
      setIsOpen(false);
      setLessonOwnerId(undefined);
    }
  }, [isAuthorized, profile]);

  const value = useMemo(
    () => ({
      isOpen,
      lessonOwnerId,
      open,
      close,
    }),
    [isOpen, lessonOwnerId, open, close],
  );

  return (
    <VideoCallContext.Provider value={value}>
      {children}
    </VideoCallContext.Provider>
  );
}
