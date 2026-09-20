'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import SectionCard from '@/components/SectionCard';
import { CHALLENGE_DAYS, STARTING_CAPITAL } from '@/lib/constants';
import { formatCurrency, sortEntries } from '@/lib/stats';
import type { ChallengeEntry } from '@/types/challenge';

type ReelMakerProps = {
  entries: ChallengeEntry[];
};

type VideoClip = {
  id: string;
  kind: 'video' | 'image' | 'slide';
  file?: File;
  url?: string;
  name: string;
  duration: number;
  trimStart: number;
  trimEnd: number;
  focusAnchor: 'center' | 'left' | 'right';
  focusPercent: number;
  title?: string;
  subtitle?: string;
  slideBackgroundFile?: File;
  slideBackgroundUrl?: string;
  textPosition?: 'top' | 'center' | 'bottom';
};

type TextOverlay = {
  id: string;
  text: string;
  start: number;
  end: number;
  position: 'top' | 'center' | 'bottom';
  animation: 'fade' | 'slide-up' | 'slide-left';
  color: string;
};

type AudioLayer = {
  id: string;
  source: string;
  start: number;
  end: number;
  volume: number;
  file?: File;
  fileName?: string;
  previewUrl?: string;
  kind?: 'music' | 'voiceover';
};

type ReelJob = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  logs: string[];
  output?: string;
  error?: string;
  finalDuration?: number;
  sourceDuration?: number;
  speed?: number;
  sourceFile?: string;
};

function defaultTextOverlay(duration: number): TextOverlay {
  return {
    id: `text-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: 'Discipline over hype',
    start: 0,
    end: Math.min(3, Math.max(1, duration || 3)),
    position: 'bottom',
    animation: 'fade',
    color: '#ffffff'
  };
}

function defaultAudioLayer(duration: number): AudioLayer {
  return {
    id: `audio-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    source: 'market-pulse',
    start: 0,
    end: Math.max(1, duration),
    volume: 0.3,
    kind: 'music'
  };
}

const audioLibrary: Array<{ value: string; label: string }> = [
  { value: 'market-pulse', label: 'Market Pulse' },
  { value: 'opening-bell', label: 'Opening Bell Focus' },
  { value: 'breakout-drive', label: 'Breakout Drive' },
  { value: 'closing-bell', label: 'Closing Bell Review' },
  { value: 'terminal-ambience', label: 'Terminal Ambience' },
  { value: 'custom', label: 'Upload custom audio' }
];

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0s';
  const rounded = Math.round(seconds);
  const mins = Math.floor(rounded / 60);
  const secs = rounded % 60;
  return mins ? `${mins}m ${secs}s` : `${secs}s`;
}

function slidePositionClass(position: VideoClip['textPosition']) {
  if (position === 'top') return 'top-4';
  if (position === 'bottom') return 'bottom-3';
  return 'top-1/2 -translate-y-1/2';
}

function reelDefaults(entry?: ChallengeEntry, currentCapital = STARTING_CAPITAL) {
  if (!entry) {
    return {
      startTitle: 'TradeWithNine Challenge Update',
      startSubtitle: 'NIFTY option buying only',
      endTitle: 'Discipline over hype',
      endSubtitle: 'Educational Content Only | Trading Involves Risk'
    };
  }

  return {
    startTitle: `Day ${entry.day}/${CHALLENGE_DAYS} | ${entry.result}`,
    startSubtitle: `P&L ${formatCurrency(entry.pnl)} | Discipline ${entry.disciplineScore}/10`,
    endTitle: `Current Capital ${formatCurrency(currentCapital)}`,
    endSubtitle: entry.notes || 'Process first. Review execution and risk.'
  };
}

const reelHashtags =
  '#TradeWithNine #60DayChallenge #LiveTrading #NiftyOptions #OptionBuying #TradingChallenge #StockMarketIndia #TradingDiscipline #RiskManagement #PublicTradingJournal #InstagramReels';

function buildReelCaption(entry: ChallengeEntry) {
  return `Day ${entry.day} of my 60 Day Trading Challenge.

Daily P&L: ${formatCurrency(entry.pnl)}
Result: ${entry.result.toUpperCase()}
Trades Taken: ${entry.tradesTaken} / 2
Discipline Score: ${entry.disciplineScore} / 10

Today's reel is from my live trading process.

${entry.notes ? `Lesson: ${entry.notes}\n\n` : ''}This challenge is about discipline, not hype.

Educational Content Only | Trading Involves Risk`;
}

function startScreenParts(title: string, subtitle: string) {
  const titleLines = title
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean);
  const pnl = subtitle.match(/P&L\s*([^|\n]+)/i)?.[1]?.trim();
  const discipline = subtitle.match(/Discipline\s*([^|\n]+)/i)?.[1]?.trim();
  const isProfit = pnl ? !pnl.includes('-') : !titleLines.some((line) => line.toLowerCase() === 'loss');
  const rawResult = titleLines[1] || (isProfit ? 'Win' : 'Loss');
  const normalizedResult = rawResult.toLowerCase();
  const result =
    normalizedResult === 'win' ? 'Profit Day' : normalizedResult === 'loss' ? 'Loss Day' : rawResult;
  return {
    day: titleLines[0] || title,
    pnl: pnl || titleLines[1] || '',
    discipline,
    result,
    isProfit
  };
}

export default function ReelMaker({ entries }: ReelMakerProps) {
  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const [selectedId, setSelectedId] = useState('');
  const [targetSeconds, setTargetSeconds] = useState('60');
  const [cropMode, setCropMode] = useState<'crop' | 'blur' | 'color'>('crop');
  const [transition, setTransition] = useState<'cut' | 'fade' | 'slideleft' | 'wipeleft'>('fade');
  const [transitionDuration, setTransitionDuration] = useState(0.4);
  const [backgroundColor, setBackgroundColor] = useState('#070a0f');
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState('');
  const [previewScreen, setPreviewScreen] = useState<'start' | 'end' | null>('start');
  const [audioLayers, setAudioLayers] = useState<AudioLayer[]>([]);
  const [savedAudioFiles, setSavedAudioFiles] = useState<string[]>([]);
  const [folderAudioFiles, setFolderAudioFiles] = useState<string[]>([]);
  const [audioLibraryStatus, setAudioLibraryStatus] = useState('');
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [startTitle, setStartTitle] = useState('');
  const [startSubtitle, setStartSubtitle] = useState('');
  const [endTitle, setEndTitle] = useState('');
  const [endSubtitle, setEndSubtitle] = useState('');
  const [includeStartScreen, setIncludeStartScreen] = useState(true);
  const [includeEndScreen, setIncludeEndScreen] = useState(true);
  const [startScreenDuration, setStartScreenDuration] = useState(1);
  const [endScreenDuration, setEndScreenDuration] = useState(5);
  const [health, setHealth] = useState('Checking ffmpeg');
  const [job, setJob] = useState<ReelJob | null>(null);
  const [status, setStatus] = useState('');
  const [postStatus, setPostStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const [sourceCurrentTime, setSourceCurrentTime] = useState(0);
  const objectUrls = useRef<string[]>([]);
  const previewAudio = useRef<HTMLAudioElement | null>(null);
  const [previewingAudioId, setPreviewingAudioId] = useState('');
  const recorder = useRef<MediaRecorder | null>(null);
  const recorderStream = useRef<MediaStream | null>(null);
  const recorderChunks = useRef<Blob[]>([]);
  const recordingStart = useRef(0);
  const recordingEnd = useRef(0);
  const timelineTimeRef = useRef(0);
  const advancingClip = useRef(false);
  const [isRecordingVoiceover, setIsRecordingVoiceover] = useState(false);
  const [voiceoverStatus, setVoiceoverStatus] = useState('');
  const [editorPanel, setEditorPanel] = useState<'visuals' | 'screens' | 'text' | 'audio' | 'settings'>('visuals');
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(true);
  const [outputPosition, setOutputPosition] = useState<{ x: number; y: number } | null>(null);
  const outputPanelRef = useRef<HTMLElement>(null);
  const outputDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [isVoiceoverCollapsed, setIsVoiceoverCollapsed] = useState(true);
  const [voiceoverPosition, setVoiceoverPosition] = useState<{ x: number; y: number } | null>(null);
  const voiceoverPanelRef = useRef<HTMLElement>(null);
  const voiceoverDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ x: number; y: number } | null>(null);
  const previewPanelRef = useRef<HTMLDivElement>(null);
  const previewDragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const selectedEntry = sortedEntries.find((entry) => entry.id === selectedId) || sortedEntries.at(-1);
  const currentCapital =
    selectedEntry?.amountEnd ||
    (selectedEntry
      ? STARTING_CAPITAL + sortedEntries.filter((entry) => entry.day <= selectedEntry.day).reduce((sum, entry) => sum + entry.pnl, 0)
      : STARTING_CAPITAL);

  useEffect(() => {
    if (!selectedId && sortedEntries.length) setSelectedId(sortedEntries.at(-1)?.id || '');
  }, [selectedId, sortedEntries]);

  useEffect(() => {
    const defaults = reelDefaults(selectedEntry, currentCapital);
    setStartTitle(defaults.startTitle);
    setStartSubtitle(defaults.startSubtitle);
    setEndTitle(defaults.endTitle);
    setEndSubtitle(defaults.endSubtitle);
  }, [selectedEntry?.id, currentCapital]);

  useEffect(() => {
    void fetch('/api/reels/health')
      .then((response) => response.json())
      .then((data: { ok?: boolean }) => setHealth(data.ok ? 'ffmpeg ready' : 'ffmpeg or ffprobe missing'))
      .catch(() => setHealth('Could not check ffmpeg'));
  }, []);

  useEffect(() => {
    function moveVoiceoverPanel(event: PointerEvent) {
      const drag = voiceoverDragRef.current;
      const panel = voiceoverPanelRef.current;
      if (!drag || !panel) return;
      const x = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, event.clientX - drag.offsetX));
      const y = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, event.clientY - drag.offsetY));
      setVoiceoverPosition({ x, y });
    }

    function stopMovingVoiceoverPanel() {
      voiceoverDragRef.current = null;
    }

    window.addEventListener('pointermove', moveVoiceoverPanel);
    window.addEventListener('pointerup', stopMovingVoiceoverPanel);
    return () => {
      window.removeEventListener('pointermove', moveVoiceoverPanel);
      window.removeEventListener('pointerup', stopMovingVoiceoverPanel);
    };
  }, []);

  useEffect(() => {
    function movePreviewPanel(event: PointerEvent) {
      const drag = previewDragRef.current;
      const panel = previewPanelRef.current;
      if (!drag || !panel) return;
      const x = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, event.clientX - drag.offsetX));
      const y = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, event.clientY - drag.offsetY));
      setPreviewPosition({ x, y });
    }

    function stopMovingPreviewPanel() {
      previewDragRef.current = null;
    }

    window.addEventListener('pointermove', movePreviewPanel);
    window.addEventListener('pointerup', stopMovingPreviewPanel);
    return () => {
      window.removeEventListener('pointermove', movePreviewPanel);
      window.removeEventListener('pointerup', stopMovingPreviewPanel);
    };
  }, []);

  async function refreshAudioLibrary() {
    try {
      const response = await fetch('/api/reels/audio-library');
      const data = (await response.json()) as { files?: string[]; folderFiles?: string[] };
      setSavedAudioFiles(data.files || []);
      setFolderAudioFiles(data.folderFiles || []);
    } catch {
      setAudioLibraryStatus('Could not load saved audio library.');
    }
  }

  useEffect(() => {
    void refreshAudioLibrary();
  }, []);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      recorderStream.current?.getTracks().forEach((track) => track.stop());
    },
    []
  );

  const timeline = useMemo(() => {
    const rawDuration = clips.reduce((sum, clip) => sum + Math.max(0, clip.trimEnd - clip.trimStart), 0);
    const shortestClip = clips.length ? Math.min(...clips.map((clip) => Math.max(0, clip.trimEnd - clip.trimStart))) : 0;
    const appliedTransitionDuration = transition === 'cut' || clips.length < 2 ? 0 : Math.min(transitionDuration, shortestClip / 2);
    const selectedDuration = rawDuration - appliedTransitionDuration * Math.max(0, clips.length - 1);
    const targetDuration = Math.max(1, Number(targetSeconds) || 60);
    const speed = selectedDuration > targetDuration ? selectedDuration / targetDuration : 1;
    const duration = selectedDuration / speed;
    const effectiveStartDuration = includeStartScreen ? startScreenDuration : 0;
    const effectiveEndDuration = includeEndScreen ? endScreenDuration : 0;
    return {
      selectedDuration,
      speed,
      duration,
      transitionDuration: appliedTransitionDuration,
      startDuration: effectiveStartDuration,
      endDuration: effectiveEndDuration,
      totalDuration: effectiveStartDuration + duration + effectiveEndDuration
    };
  }, [clips, targetSeconds, transition, transitionDuration, includeStartScreen, startScreenDuration, includeEndScreen, endScreenDuration]);

  const selectedClip = clips.find((clip) => clip.id === selectedClipId) || clips[0];
  const startBackgroundClip = clips[0];
  const previewScreenContent = previewScreen === 'start'
    ? { title: startTitle, subtitle: startSubtitle, footer: 'TradeWithNine', duration: timeline.startDuration }
    : previewScreen === 'end'
      ? { title: endTitle, subtitle: endSubtitle, footer: 'Verify levels live', duration: timeline.endDuration }
      : null;

  const timelineCurrentTime = useMemo(() => {
    let elapsed = 0;
    for (const clip of clips) {
      if (clip.id === selectedClip?.id) {
        return (elapsed + Math.max(0, sourceCurrentTime - clip.trimStart)) / timeline.speed;
      }
      elapsed += Math.max(0, clip.trimEnd - clip.trimStart) - timeline.transitionDuration;
    }
    return 0;
  }, [clips, selectedClip?.id, sourceCurrentTime, timeline.speed]);

  useEffect(() => {
    timelineTimeRef.current = timelineCurrentTime;
  }, [timelineCurrentTime]);

  useEffect(() => {
    if (previewScreen === 'start' && !includeStartScreen) setPreviewScreen(includeEndScreen ? 'end' : null);
    if (previewScreen === 'end' && !includeEndScreen) setPreviewScreen(includeStartScreen ? 'start' : null);
  }, [previewScreen, includeStartScreen, includeEndScreen]);

  useEffect(() => {
    function moveOutputPanel(event: PointerEvent) {
      const drag = outputDragRef.current;
      const panel = outputPanelRef.current;
      if (!drag || !panel) return;
      const x = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, event.clientX - drag.offsetX));
      const y = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, event.clientY - drag.offsetY));
      setOutputPosition({ x, y });
    }

    function stopMovingOutputPanel() {
      outputDragRef.current = null;
    }

    window.addEventListener('pointermove', moveOutputPanel);
    window.addEventListener('pointerup', stopMovingOutputPanel);
    return () => {
      window.removeEventListener('pointermove', moveOutputPanel);
      window.removeEventListener('pointerup', stopMovingOutputPanel);
    };
  }, []);

  const summary = useMemo(() => {
    if (!timeline.selectedDuration) return 'Add one or more videos to build the reel.';
    return timeline.speed > 1
      ? `${clips.length} clips | selected ${formatDuration(timeline.selectedDuration)} | speed-up ${timeline.speed.toFixed(2)}x`
      : `${clips.length} clips | selected ${formatDuration(timeline.selectedDuration)}`;
  }, [clips.length, timeline]);

  function updateTextOverlay(id: string, updates: Partial<TextOverlay>) {
    setTextOverlays((current) => current.map((overlay) => (overlay.id === id ? { ...overlay, ...updates } : overlay)));
  }

  function updateClip(id: string, updates: Partial<VideoClip>) {
    setClips((current) => current.map((clip) => (clip.id === id ? { ...clip, ...updates } : clip)));
  }

  function updateAudioLayer(id: string, updates: Partial<AudioLayer>) {
    setAudioLayers((current) => current.map((layer) => (layer.id === id ? { ...layer, ...updates } : layer)));
  }

  function mediaDuration(url: string, kind: 'video' | 'audio') {
    return new Promise<number>((resolve) => {
      const media = document.createElement(kind);
      media.preload = 'metadata';
      media.src = url;
      media.onloadedmetadata = () => resolve(Number.isFinite(media.duration) ? media.duration : 0);
      media.onerror = () => resolve(0);
    });
  }

  async function handleVideoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const additions = await Promise.all(
      files.map(async (file) => {
        const url = URL.createObjectURL(file);
        objectUrls.current.push(url);
        const duration = await mediaDuration(url, 'video');
        return {
          id: `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'video' as const,
          file,
          url,
          name: file.name,
          duration,
          trimStart: 0,
          trimEnd: duration,
          focusAnchor: 'center' as const,
          focusPercent: 0
        };
      })
    );
    setClips((current) => [...current, ...additions]);
    setSelectedClipId((current) => current || additions[0]?.id || '');
    setSourceCurrentTime(0);
    setJob(null);
    setStatus('');
    event.target.value = '';
  }

  async function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    const additions = files.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.push(url);
      return {
        id: `image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'image' as const,
        file,
        url,
        name: file.name,
        duration: 4,
        trimStart: 0,
        trimEnd: 4,
        focusAnchor: 'center' as const,
        focusPercent: 0
      };
    });
    setClips((current) => [...current, ...additions]);
    setSelectedClipId((current) => current || additions[0]?.id || '');
    setJob(null);
    event.target.value = '';
  }

  function addSlide() {
    const id = `slide-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const slide: VideoClip = {
      id,
      kind: 'slide',
      name: 'Timeline slide',
      duration: 4,
      trimStart: 0,
      trimEnd: 4,
      focusAnchor: 'center',
      focusPercent: 0,
      title: 'Trading lesson',
      subtitle: 'Add the key point for this moment.',
      textPosition: 'center'
    };
    setClips((current) => [...current, slide]);
    setSelectedClipId(id);
    setJob(null);
  }

  function handleSlideBackground(clipId: string, file?: File) {
    if (!file) {
      updateClip(clipId, { slideBackgroundFile: undefined, slideBackgroundUrl: undefined });
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    updateClip(clipId, { slideBackgroundFile: file, slideBackgroundUrl: url });
  }

  function moveClip(id: string, direction: -1 | 1) {
    setClips((current) => {
      const index = current.findIndex((clip) => clip.id === id);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function removeClip(id: string) {
    setClips((current) => {
      const next = current.filter((clip) => clip.id !== id);
      if (selectedClipId === id) setSelectedClipId(next[0]?.id || '');
      return next;
    });
  }

  async function handleCustomAudio(id: string, file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    const duration = await mediaDuration(url, 'audio');
    updateAudioLayer(id, { file, fileName: file.name, previewUrl: url, end: Math.min(timeline.totalDuration, duration || timeline.totalDuration) });
  }

  async function toggleAudioPreview(layer: AudioLayer) {
    if (previewingAudioId === layer.id) {
      previewAudio.current?.pause();
      previewAudio.current = null;
      setPreviewingAudioId('');
      return;
    }
    previewAudio.current?.pause();
    const source = layer.source === 'custom'
      ? layer.previewUrl
      : layer.source.startsWith('library:')
        ? `/api/reels/audio-library?file=${encodeURIComponent(layer.source.slice('library:'.length))}`
        : layer.source.startsWith('folder:')
          ? `/api/reels/audio-library?source=folder&file=${encodeURIComponent(layer.source.slice('folder:'.length))}`
        : `/api/reels/audio-preview/${encodeURIComponent(layer.source)}`;
    if (!source) {
      setAudioLibraryStatus('Choose a custom audio file before previewing it.');
      return;
    }
    const audio = new Audio(source);
    audio.volume = Math.min(1, layer.volume);
    audio.onended = () => setPreviewingAudioId('');
    audio.onerror = () => {
      setPreviewingAudioId('');
      setAudioLibraryStatus('Could not preview this audio track.');
    };
    previewAudio.current = audio;
    setPreviewingAudioId(layer.id);
    try {
      await audio.play();
    } catch {
      setPreviewingAudioId('');
      setAudioLibraryStatus('Browser audio playback was blocked. Try Preview again.');
    }
  }

  async function saveAudioToLibrary(file?: File) {
    if (!file) return;
    const form = new FormData();
    form.append('audio', file);
    setAudioLibraryStatus('Saving audio...');
    try {
      const response = await fetch('/api/reels/audio-library', { method: 'POST', body: form });
      const data = (await response.json()) as { file?: string; error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not save audio');
      await refreshAudioLibrary();
      setAudioLibraryStatus(`${data.file} added to the local library.`);
    } catch (error) {
      setAudioLibraryStatus(error instanceof Error ? error.message : 'Could not save audio');
    }
  }

  async function removeAudioFromLibrary(fileName: string) {
    try {
      const response = await fetch(`/api/reels/audio-library?file=${encodeURIComponent(fileName)}`, { method: 'DELETE' });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || 'Could not remove audio');
      setAudioLayers((current) => current.filter((layer) => layer.source !== `library:${fileName}`));
      await refreshAudioLibrary();
      setAudioLibraryStatus(`${fileName} removed.`);
    } catch (error) {
      setAudioLibraryStatus(error instanceof Error ? error.message : 'Could not remove audio');
    }
  }

  function seekTimeline(event: React.MouseEvent<HTMLDivElement>) {
    if (!timeline.totalDuration) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const absoluteTime = Math.max(0, Math.min(timeline.totalDuration, ((event.clientX - bounds.left) / bounds.width) * timeline.totalDuration));
    if (timeline.startDuration && absoluteTime < timeline.startDuration) {
      setPreviewScreen('start');
      return;
    }
    if (timeline.endDuration && absoluteTime >= timeline.startDuration + timeline.duration) {
      setPreviewScreen('end');
      return;
    }
    setPreviewScreen(null);
    const reelTime = Math.max(0, Math.min(timeline.duration, absoluteTime - timeline.startDuration));
    let selectedTime = reelTime * timeline.speed;
    for (const clip of clips) {
      const clipDuration = clip.trimEnd - clip.trimStart;
      if (selectedTime <= clipDuration) {
        setSelectedClipId(clip.id);
        window.requestAnimationFrame(() => {
          if (sourceVideoRef.current) sourceVideoRef.current.currentTime = clip.trimStart + selectedTime;
        });
        return;
      }
      selectedTime -= Math.max(0, clipDuration - timeline.transitionDuration);
    }
  }

  function handlePreviewTimeUpdate(event: React.SyntheticEvent<HTMLVideoElement>) {
    const currentTime = event.currentTarget.currentTime;
    setSourceCurrentTime(currentTime);
    if (!isRecordingVoiceover || !selectedClip || advancingClip.current || currentTime < selectedClip.trimEnd - 0.05) return;
    const index = clips.findIndex((clip) => clip.id === selectedClip.id);
    const nextClip = clips[index + 1];
    if (!nextClip) {
      stopVoiceoverRecording();
      return;
    }
    advancingClip.current = true;
    setSelectedClipId(nextClip.id);
    setSourceCurrentTime(nextClip.trimStart);
    window.requestAnimationFrame(() => {
      if (sourceVideoRef.current) {
        sourceVideoRef.current.currentTime = nextClip.trimStart;
        void sourceVideoRef.current.play();
      }
      advancingClip.current = false;
    });
  }

  function handlePreviewPause() {
    if (recorder.current?.state === 'recording') {
      recorder.current.pause();
      setVoiceoverStatus(`Recording paused at ${formatDuration(timelineTimeRef.current)}.`);
    }
  }

  function handlePreviewPlay() {
    if (recorder.current?.state === 'paused') {
      recorder.current.resume();
      setVoiceoverStatus(`Recording resumed at ${formatDuration(timelineTimeRef.current)}.`);
    }
  }

  async function startVoiceoverRecording() {
    if (!timeline.duration || !selectedClip || isRecordingVoiceover) return;
    const video = sourceVideoRef.current;
    if (!video) {
      setVoiceoverStatus('Load the selected video preview before recording.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceoverStatus('Live microphone recording is not supported in this browser.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorder.current = mediaRecorder;
      recorderStream.current = stream;
      recorderChunks.current = [];
      recordingStart.current = timeline.startDuration + timelineTimeRef.current;
      setVoiceoverStatus(`Recording from ${formatDuration(recordingStart.current)}...`);
      setIsRecordingVoiceover(true);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) recorderChunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(recorderChunks.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        const duration = Math.max(0, recordingEnd.current - recordingStart.current);
        if (blob.size && duration >= 0.2) {
          const extension = blob.type.includes('mp4') ? 'm4a' : 'webm';
          const file = new File([blob], `voiceover-${Date.now()}.${extension}`, { type: blob.type });
          const previewUrl = URL.createObjectURL(blob);
          objectUrls.current.push(previewUrl);
          setAudioLayers((current) => [
            ...current,
            {
              id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              source: 'custom',
              start: recordingStart.current,
              end: Math.min(timeline.totalDuration, recordingEnd.current),
              volume: 1,
              file,
              fileName: `Voiceover ${current.filter((layer) => layer.kind === 'voiceover').length + 1}`,
              previewUrl,
              kind: 'voiceover'
            }
          ]);
          setVoiceoverStatus(`Voiceover saved at ${formatDuration(recordingStart.current)}-${formatDuration(recordingEnd.current)}.`);
        } else {
          setVoiceoverStatus('Recording was too short and was not added.');
        }
        stream.getTracks().forEach((track) => track.stop());
        recorder.current = null;
        recorderStream.current = null;
        recorderChunks.current = [];
        if (sourceVideoRef.current) sourceVideoRef.current.playbackRate = 1;
        setIsRecordingVoiceover(false);
      };
      mediaRecorder.start(250);
      video.playbackRate = timeline.speed;
      video.currentTime = Math.max(selectedClip.trimStart, video.currentTime);
      await video.play();
    } catch (error) {
      recorderStream.current?.getTracks().forEach((track) => track.stop());
      recorderStream.current = null;
      recorder.current = null;
      setIsRecordingVoiceover(false);
      setVoiceoverStatus(error instanceof Error ? error.message : 'Could not access the microphone.');
    }
  }

  function stopVoiceoverRecording() {
    if (!recorder.current || recorder.current.state === 'inactive') return;
    recordingEnd.current = timeline.startDuration + timelineTimeRef.current;
    recorder.current.stop();
    sourceVideoRef.current?.pause();
  }

  async function pollJob(jobId: string) {
    const response = await fetch(`/api/reels/jobs/${jobId}`);
    const payload = (await response.json()) as ReelJob;
    setJob(payload);
    if (payload.status === 'done' || payload.status === 'error') {
      setIsSubmitting(false);
      return true;
    }
    return false;
  }

  async function submitReel(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedEntry) {
      setStatus('Sync sheet data first, then select a trading day.');
      return;
    }
    if (!clips.length) {
      setStatus('Add at least one video, image, or slide.');
      return;
    }
    if (audioLayers.some((layer) => layer.source === 'custom' && !layer.file)) {
      setStatus('Choose a file for each custom audio layer.');
      return;
    }

    const form = new FormData();
    clips.forEach((clip) => {
      if (clip.file) form.append(`media-${clip.id}`, clip.file);
      if (clip.kind === 'slide' && clip.slideBackgroundFile) form.append(`slide-background-${clip.id}`, clip.slideBackgroundFile);
    });
    form.append('day', String(selectedEntry.day));
    form.append('date', selectedEntry.date);
    form.append('result', selectedEntry.result);
    form.append('pnl', formatCurrency(selectedEntry.pnl));
    form.append('currentCapital', formatCurrency(currentCapital));
    form.append('disciplineScore', String(selectedEntry.disciplineScore));
    form.append('tradesTaken', String(selectedEntry.tradesTaken));
    form.append('notes', selectedEntry.notes);
    form.append(
      'clips',
      JSON.stringify(
        clips.map((clip) => ({
          id: clip.id,
          kind: clip.kind,
          start: clip.trimStart,
          end: clip.trimEnd,
          duration: clip.duration,
          focusAnchor: clip.focusAnchor,
          focusPercent: clip.focusPercent,
          title: clip.title,
          subtitle: clip.subtitle,
          textPosition: clip.textPosition
        }))
      )
    );
    form.append('textOverlays', JSON.stringify(textOverlays));
    form.append(
      'audioLayers',
      JSON.stringify(audioLayers.map(({ id, source, start, end, volume, kind }) => ({ id, source, start, end, volume, kind })))
    );
    audioLayers.forEach((layer) => {
      if (layer.source === 'custom' && layer.file) form.append(`audio-${layer.id}`, layer.file);
    });
    form.append('targetSeconds', targetSeconds);
    form.append('cropMode', cropMode);
    form.append('transition', transition);
    form.append('transitionDuration', String(transitionDuration));
    form.append('backgroundColor', backgroundColor);
    form.append('startTitle', startTitle);
    form.append('startSubtitle', startSubtitle);
    form.append('endTitle', endTitle);
    form.append('endSubtitle', endSubtitle);
    form.append('startScreenDuration', String(timeline.startDuration));
    form.append('endScreenDuration', String(timeline.endDuration));

    setIsSubmitting(true);
    setIsOutputCollapsed(false);
    setIsVoiceoverCollapsed(true);
    setStatus('Submitting uploaded reel...');
    setJob(null);
    try {
      const response = await fetch('/api/reels/upload', { method: 'POST', body: form });
      const payload = (await response.json()) as { jobId?: string; error?: string };
      if (!response.ok || !payload.jobId) throw new Error(payload.error || 'Could not start reel job');
      setStatus('Rendering Instagram reel...');
      await pollJob(payload.jobId);
      const timer = window.setInterval(async () => {
        const finished = await pollJob(payload.jobId as string);
        if (finished) window.clearInterval(timer);
      }, 1800);
    } catch (error) {
      setIsSubmitting(false);
      setStatus(error instanceof Error ? error.message : 'Could not start reel job');
    }
  }

  async function prepareReelPost() {
    if (!selectedEntry || !job?.output) return;
    await navigator.clipboard.writeText(`${buildReelCaption(selectedEntry)}\n\nHashtags:\n${reelHashtags}`);
    window.open('https://www.instagram.com/trade_withnine/', '_blank', 'noopener,noreferrer');
    setPostStatus('Caption and hashtags copied. Instagram opened. Use Download MP4 to attach the reel.');
  }

  function startMovingOutputPanel(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !outputPanelRef.current) return;
    const bounds = outputPanelRef.current.getBoundingClientRect();
    outputDragRef.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top
    };
    setOutputPosition({ x: bounds.left, y: bounds.top });
  }

  function startMovingVoiceoverPanel(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !voiceoverPanelRef.current) return;
    const bounds = voiceoverPanelRef.current.getBoundingClientRect();
    voiceoverDragRef.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top
    };
    setVoiceoverPosition({ x: bounds.left, y: bounds.top });
  }

  function startMovingPreviewPanel(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 0 || !previewPanelRef.current) return;
    const bounds = previewPanelRef.current.getBoundingClientRect();
    previewDragRef.current = {
      offsetX: event.clientX - bounds.left,
      offsetY: event.clientY - bounds.top
    };
    setPreviewPosition({ x: bounds.left, y: bounds.top });
  }

  return (
    <div className="relative">
      <SectionCard
        title="Instagram Reel Maker"
        subtitle="Upload a trading video, choose the sheet day, and render a branded 9:16 MP4 locally."
        actions={
          <>
            <span className={`status-message ${health.includes('ready') ? 'border-profit/30 bg-profit/10 text-profit' : 'border-warning/30 bg-warning/10 text-warning'}`}>
              {health}
            </span>
            {selectedEntry ? (
              <span className="status-message border-grid bg-panelSoft text-slate-300">
                Day {selectedEntry.day} | {selectedEntry.result} | {formatCurrency(selectedEntry.pnl)}
              </span>
            ) : null}
          </>
        }
      >
        <form className="grid gap-3" onSubmit={submitReel}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Trading day from sheet</span>
              <select className="field" value={selectedEntry?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>
                {sortedEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    Day {entry.day} | {entry.date} | {entry.result} | {formatCurrency(entry.pnl)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Trading videos</span>
              <input
                className="field"
                type="file"
                multiple
                accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                onChange={handleVideoChange}
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Images</span>
              <input className="field" type="file" multiple accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} />
            </label>
            <div className="grid content-end gap-2 text-sm font-medium text-slate-300">
              <span>Timeline slide</span>
              <button className="btn-muted" type="button" onClick={addSlide}>Create slide</button>
            </div>
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-md border border-grid bg-[#080c12] p-1" role="tablist" aria-label="Reel editor tools">
            {([
              ['visuals', 'Visuals'],
              ['screens', 'Screens'],
              ['text', `Text${textOverlays.length ? ` (${textOverlays.length})` : ''}`],
              ['audio', `Audio${audioLayers.filter((layer) => layer.kind !== 'voiceover').length ? ` (${audioLayers.filter((layer) => layer.kind !== 'voiceover').length})` : ''}`],
              ['settings', 'Render']
            ] as const).map(([panel, label]) => (
              <button
                key={panel}
                className={`min-w-24 flex-1 rounded px-3 py-2 text-sm font-bold transition-colors ${
                  editorPanel === panel ? 'bg-profit text-black' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                type="button"
                role="tab"
                aria-selected={editorPanel === panel}
                onClick={() => setEditorPanel(panel)}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="grid gap-2 rounded-lg border border-grid bg-panelSoft p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Video timeline</h3>
                <p className="text-sm text-muted">Preview the selected clip and place text on the rendered reel timeline.</p>
              </div>
              <span className="text-sm font-bold tabular-nums text-slate-300">
                {formatDuration(timeline.startDuration + timelineCurrentTime)} / {formatDuration(timeline.totalDuration)}
              </span>
            </div>

            <div className="grid gap-3">
              <div
                ref={previewPanelRef}
                className={`fixed z-40 overflow-auto rounded-lg border border-grid bg-panel/95 p-2 shadow-soft backdrop-blur ${previewPosition ? '' : 'left-4 top-24'}`}
                style={{
                  ...(previewPosition ? { left: previewPosition.x, top: previewPosition.y } : {}),
                  width: 234,
                  height: 453,
                  minWidth: 128,
                  minHeight: 248,
                  maxWidth: 520,
                  maxHeight: 860,
                  resize: 'both'
                }}
              >
                <div
                  className="mb-2 flex cursor-move items-center justify-between gap-2 rounded-md border border-grid bg-[#080c12] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-muted"
                  onPointerDown={startMovingPreviewPanel}
                  title="Drag preview"
                >
                  <span>Preview</span>
                  <span className="text-[9px] normal-case tracking-normal text-slate-500">resize corner</span>
                </div>
                <div className="relative mx-auto aspect-[9/16] h-[calc(100%-34px)] max-h-full min-h-[210px] rounded-[18px] border-2 border-slate-600 bg-black p-1 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                  <span className="absolute left-1/2 top-1 z-20 h-1.5 w-9 -translate-x-1/2 rounded-full bg-black" />
                  <div className="h-full overflow-hidden rounded-[13px] bg-black">
            {previewScreenContent ? (
              previewScreen === 'start' ? (
                (() => {
                  const parts = startScreenParts(previewScreenContent.title, previewScreenContent.subtitle);
                  return (
                    <div className="relative flex h-full w-full flex-col overflow-hidden bg-white">
                      {startBackgroundClip?.kind === 'video' && startBackgroundClip.url ? (
                        <video
                          className="absolute inset-0 h-full w-full scale-[1.18] object-cover"
                          src={startBackgroundClip.url}
                          muted
                          playsInline
                          preload="metadata"
                          onLoadedMetadata={(event) => {
                            event.currentTarget.currentTime = startBackgroundClip.trimStart;
                          }}
                        />
                      ) : startBackgroundClip?.kind === 'image' && startBackgroundClip.url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img className="absolute inset-0 h-full w-full scale-[1.18] object-cover" src={startBackgroundClip.url} alt="" />
                      ) : null}
                      <span className="absolute inset-0 bg-white/[0.34]" />
                      <span className="absolute -left-8 -top-6 h-20 w-20 rounded-full bg-[#6d28ff]/10 blur-sm" />
                      <span className="absolute -bottom-8 -right-8 h-24 w-24 rounded-full bg-[#6d28ff]/10 blur-sm" />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center px-3 py-5 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          className="absolute top-5 h-16 w-16 rounded-full object-cover opacity-95"
                          src="/reel-assets/tradewithnine-logo.png"
                          alt="TradeWithNine"
                        />
                        <div
                          className={`relative grid min-h-[154px] w-full content-center justify-items-center gap-1.5 px-4 py-5 text-white shadow-[0_12px_36px_rgba(0,0,0,0.22)] ${parts.isProfit ? 'bg-profit/[0.92]' : 'bg-loss/[0.92]'}`}
                          style={{
                            clipPath:
                              'polygon(7% 11%, 25% 2%, 47% 6%, 72% 1%, 94% 12%, 98% 38%, 91% 67%, 96% 88%, 70% 96%, 45% 91%, 18% 98%, 4% 82%, 9% 56%, 2% 31%)'
                          }}
                        >
                          <p className="rounded-full bg-white/20 px-3 py-1 text-[6px] font-black uppercase leading-none tracking-[0.12em]">
                            {parts.result}
                          </p>
                          <p className="max-w-full truncate text-[13px] font-black uppercase leading-none">{parts.day}</p>
                          {parts.pnl ? (
                            <p className="max-w-full truncate text-[18px] font-black uppercase leading-none">
                              P&L {parts.pnl}
                            </p>
                          ) : null}
                          <p className="rounded-md bg-white/[0.88] px-2.5 py-1 text-[6px] font-black uppercase leading-tight text-[#1f1636]">
                            {parts.discipline ? `DISCIPLINE ${parts.discipline} | RULES FOLLOWED` : 'PROCESS OVER HYPE | RULES FOLLOWED'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#070a0f] p-2 pt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-full object-cover opacity-95"
                    src="/reel-assets/tradewithnine-logo.png"
                    alt="TradeWithNine"
                  />
                  <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-1 text-center">
                    <span className="h-0.5 w-8 rounded-full bg-info" />
                    <p className="max-w-full break-words text-[11px] font-black leading-tight text-white">{previewScreenContent.title}</p>
                    <p className="max-w-full break-words text-[6px] font-semibold leading-[1.4] text-muted">{previewScreenContent.subtitle}</p>
                    <div className="mt-1 rounded border border-grid bg-panelSoft px-2 py-1 text-[6px] font-bold text-info">
                      {previewScreenContent.footer}
                    </div>
                  </div>
                  <p className="text-center text-[5px] leading-tight text-muted">Educational Content Only | Trading Involves Risk</p>
                </div>
              )
            ) : selectedClip?.kind === 'video' ? (
              <video
                ref={sourceVideoRef}
                className="h-full w-full bg-black object-contain"
                src={selectedClip.url}
                controls
                playsInline
                onLoadedMetadata={(event) => {
                  event.currentTarget.currentTime = selectedClip.trimStart;
                  if (isRecordingVoiceover) void event.currentTarget.play();
                }}
                onTimeUpdate={handlePreviewTimeUpdate}
                onPause={handlePreviewPause}
                onPlay={handlePreviewPlay}
              />
            ) : selectedClip?.kind === 'image' && selectedClip.url ? (
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-xl brightness-75" src={selectedClip.url} alt="" />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="relative z-10 h-full w-full object-contain" src={selectedClip.url} alt={selectedClip.name} />
              </div>
            ) : selectedClip?.kind === 'slide' ? (
              <div className="relative h-full w-full overflow-hidden bg-black">
                {selectedClip.slideBackgroundUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="absolute inset-0 h-full w-full object-cover" src={selectedClip.slideBackgroundUrl} alt="" />
                ) : null}
                <div className={`absolute inset-x-2 grid gap-1 rounded-md border border-white/10 bg-slate-950/70 p-2 text-center backdrop-blur-sm ${slidePositionClass(selectedClip.textPosition)}`}>
                  <p className="max-w-full break-words text-[11px] font-black leading-tight text-white">{selectedClip.title}</p>
                  <p className="max-w-full break-words text-[6px] font-medium leading-[1.4] text-slate-200">{selectedClip.subtitle}</p>
                </div>
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black/30 px-3 text-center text-[8px] leading-relaxed text-muted">
                Add a video, image, or slide to preview the timeline.
              </div>
            )}
                  </div>
                </div>
              </div>

              <div className="grid gap-3">

            <div className="grid gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Visual sequence</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {timeline.startDuration > 0 ? (
                  <button
                    className={`flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border bg-[#070a0f] px-1 text-center ${previewScreen === 'start' ? 'border-profit ring-2 ring-profit/30' : 'border-profit/40'}`}
                    type="button"
                    onClick={() => setPreviewScreen('start')}
                  >
                    <span className="h-1 w-8 rounded-full bg-profit" />
                    <span className="text-[10px] font-black uppercase text-white">Start</span>
                    <span className="line-clamp-2 text-[8px] text-slate-400">{startTitle}</span>
                    <span className="text-[9px] text-profit">{timeline.startDuration}s</span>
                  </button>
                ) : null}
                {clips.map((clip, index) => (
                  <button
                    key={clip.id}
                    className={`relative flex h-16 w-12 shrink-0 flex-col items-center justify-center overflow-hidden rounded-md border text-center ${
                      clip.id === selectedClip?.id ? 'border-info ring-2 ring-info/30' : 'border-grid'
                    }`}
                    type="button"
                    onClick={() => {
                      setPreviewScreen(null);
                      setSelectedClipId(clip.id);
                    }}
                    title={`${index + 1}. ${clip.name}`}
                  >
                    {clip.kind === 'image' && clip.url ? (
                      <img className="absolute inset-0 h-full w-full object-cover" src={clip.url} alt="" />
                    ) : clip.kind === 'slide' ? (
                      <div className="absolute inset-0 bg-black">
                        {clip.slideBackgroundUrl ? <img className="absolute inset-0 h-full w-full object-cover" src={clip.slideBackgroundUrl} alt="" /> : null}
                        <span className={`absolute inset-x-1 line-clamp-3 rounded-sm bg-black/65 px-1 py-0.5 text-[8px] font-black text-white ${clip.textPosition === 'top' ? 'top-1' : clip.textPosition === 'bottom' ? 'bottom-1' : 'top-1/2 -translate-y-1/2'}`}>{clip.title}</span>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black px-2">
                        <span className="text-[10px] font-black uppercase text-info">Video</span>
                        <span className="mt-1 line-clamp-2 text-[8px] text-slate-400">{clip.name}</span>
                      </div>
                    )}
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[8px] font-bold text-white">
                      {formatDuration(clip.trimEnd - clip.trimStart)}
                    </span>
                  </button>
                ))}
                {timeline.endDuration > 0 ? (
                  <button
                    className={`flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border bg-[#070a0f] px-1 text-center ${previewScreen === 'end' ? 'border-info ring-2 ring-info/30' : 'border-info/40'}`}
                    type="button"
                    onClick={() => setPreviewScreen('end')}
                  >
                    <span className="h-1 w-8 rounded-full bg-info" />
                    <span className="text-[10px] font-black uppercase text-white">End</span>
                    <span className="line-clamp-2 text-[8px] text-slate-400">{endTitle}</span>
                    <span className="text-[9px] text-info">{timeline.endDuration}s</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                <span>0s</span>
                <span>Complete reel</span>
                <span>{formatDuration(timeline.totalDuration)}</span>
              </div>
              <div
                className="relative min-h-20 cursor-pointer overflow-hidden rounded-md border border-grid bg-[#080c12] p-2"
                onClick={seekTimeline}
                role="presentation"
              >
                <div className="flex h-8 overflow-hidden rounded bg-slate-900">
                  {timeline.startDuration > 0 ? (
                    <div
                      className="flex min-w-0 items-center justify-center border-r border-black/40 bg-profit/20 px-2 text-[10px] font-bold text-profit"
                      style={{ width: `${(timeline.startDuration / timeline.totalDuration) * 100}%` }}
                    >
                      Start {timeline.startDuration}s
                    </div>
                  ) : null}
                  {clips.length ? (
                    clips.map((clip, index) => (
                      <div
                        key={clip.id}
                        className={`flex min-w-0 items-center justify-center border-r border-black/40 px-2 text-[10px] font-bold last:border-r-0 ${
                          clip.id === selectedClip?.id ? 'bg-info/30 text-info' : 'bg-slate-800 text-slate-400'
                        }`}
                        style={{
                          width: `${(((clip.trimEnd - clip.trimStart - (index < clips.length - 1 ? timeline.transitionDuration : 0)) / timeline.speed) / timeline.totalDuration) * 100}%`
                        }}
                      >
                        {index + 1}. {clip.kind === 'video' ? 'Video' : clip.kind === 'image' ? 'Image' : 'Slide'}
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-1 items-center px-3 text-xs text-slate-600">Video track</div>
                  )}
                  {timeline.endDuration > 0 ? (
                    <div
                      className="flex min-w-0 items-center justify-center border-l border-black/40 bg-info/20 px-2 text-[10px] font-bold text-info"
                      style={{ width: `${(timeline.endDuration / timeline.totalDuration) * 100}%` }}
                    >
                      End {timeline.endDuration}s
                    </div>
                  ) : null}
                </div>
                <div className="relative mt-2 h-12 rounded bg-slate-950/80">
                  {textOverlays.map((overlay, index) => {
                    const left = Math.max(0, Math.min(100, ((timeline.startDuration + overlay.start) / timeline.totalDuration) * 100));
                    const width = Math.max(2, Math.min(100 - left, ((overlay.end - overlay.start) / timeline.totalDuration) * 100));
                    return (
                      <div
                        key={overlay.id}
                        className="absolute flex h-5 items-center overflow-hidden rounded-sm border border-profit/40 bg-profit/15 px-2 text-[10px] font-bold text-profit"
                        style={{ left: `${left}%`, top: `${3 + (index % 2) * 22}px`, width: `${width}%` }}
                        title={`${overlay.text} | ${overlay.start}s-${overlay.end}s`}
                      >
                        {overlay.text || 'Text'}
                      </div>
                    );
                  })}
                  {audioLayers.map((layer, index) => {
                    const left = Math.max(0, Math.min(100, (layer.start / timeline.totalDuration) * 100));
                    const width = Math.max(2, Math.min(100 - left, ((layer.end - layer.start) / timeline.totalDuration) * 100));
                    return (
                      <div
                        key={layer.id}
                        className={`absolute flex h-4 items-center overflow-hidden rounded-sm border px-2 text-[9px] font-bold ${
                          layer.kind === 'voiceover' ? 'border-info/50 bg-info/20 text-info' : 'border-warning/40 bg-warning/15 text-warning'
                        }`}
                        style={{ left: `${left}%`, bottom: `${3 + (index % 2) * 18}px`, width: `${width}%` }}
                        title={`${layer.fileName || audioLibrary.find((item) => item.value === layer.source)?.label} | ${layer.start}s-${layer.end}s`}
                      >
                        {layer.kind === 'voiceover' ? 'Voice' : 'Audio'}
                      </div>
                    );
                  })}
                </div>
                {timeline.duration ? (
                  <div
                    className="pointer-events-none absolute inset-y-1 w-px bg-profit shadow-[0_0_8px_rgba(47,234,123,0.8)]"
                    style={{ left: `${Math.min(100, ((timeline.startDuration + timelineCurrentTime) / timeline.totalDuration) * 100)}%` }}
                  />
                ) : null}
              </div>
            </div>
              </div>
            </div>
          </section>

          {editorPanel === 'screens' ? (
          <>
          <section className="grid gap-3 rounded-lg border border-grid bg-panelSoft p-3">
            <div>
              <h3 className="text-base font-bold text-white">Start and end screens</h3>
              <p className="text-sm text-muted">Control whether each branded screen appears and how long it stays visible.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-3 rounded-md border border-grid bg-[#0a1018] p-3">
                <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-200">
                  <span>Include start screen</span>
                  <input className="h-5 w-5 accent-profit" type="checkbox" checked={includeStartScreen} onChange={(event) => setIncludeStartScreen(event.target.checked)} />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                  <span>Duration in seconds</span>
                  <input className="field" type="number" min="0.5" max="15" step="0.5" disabled={!includeStartScreen} value={startScreenDuration} onChange={(event) => setStartScreenDuration(Number(event.target.value))} />
                </label>
              </div>
              <div className="grid gap-3 rounded-md border border-grid bg-[#0a1018] p-3">
                <label className="flex items-center justify-between gap-3 text-sm font-bold text-slate-200">
                  <span>Include end screen</span>
                  <input className="h-5 w-5 accent-profit" type="checkbox" checked={includeEndScreen} onChange={(event) => setIncludeEndScreen(event.target.checked)} />
                </label>
                <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                  <span>Duration in seconds</span>
                  <input className="field" type="number" min="0.5" max="15" step="0.5" disabled={!includeEndScreen} value={endScreenDuration} onChange={(event) => setEndScreenDuration(Number(event.target.value))} />
                </label>
              </div>
            </div>
          </section>

          <div className="grid gap-3 rounded-lg border border-grid bg-panelSoft p-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Start title</span>
              <input className="field" value={startTitle} maxLength={80} disabled={!includeStartScreen} onChange={(event) => setStartTitle(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Start subtitle</span>
              <input className="field" value={startSubtitle} maxLength={100} disabled={!includeStartScreen} onChange={(event) => setStartSubtitle(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>End title</span>
              <input className="field" value={endTitle} maxLength={80} disabled={!includeEndScreen} onChange={(event) => setEndTitle(event.target.value)} />
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>End subtitle</span>
              <input className="field" value={endSubtitle} maxLength={100} disabled={!includeEndScreen} onChange={(event) => setEndSubtitle(event.target.value)} />
            </label>
          </div>
          </>
          ) : null}

          {editorPanel === 'visuals' ? (
          <section className="grid gap-3 rounded-lg border border-grid bg-panelSoft p-3">
            <div>
              <h3 className="text-base font-bold text-white">Timeline visuals</h3>
              <p className="text-sm text-muted">Reorder videos, images, and slides; then set trimming, duration, and crop focus.</p>
            </div>
            <p className="text-sm text-muted">{summary}</p>
            {clips.length ? (
              <div className="grid gap-3">
                {clips.map((clip, index) => (
                  <div
                    key={clip.id}
                    className={`grid gap-3 rounded-md border p-3 ${clip.id === selectedClip?.id ? 'border-info/50 bg-info/5' : 'border-grid bg-[#0a1018]'}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <button className="min-w-0 text-left" type="button" onClick={() => {
                        setPreviewScreen(null);
                        setSelectedClipId(clip.id);
                      }}>
                        <span className="block text-sm font-bold text-white">{index + 1}. {clip.name}</span>
                        <span className="block text-xs text-muted">{clip.kind.toUpperCase()} | {formatDuration(clip.trimEnd - clip.trimStart)}</span>
                      </button>
                      <div className="flex gap-2">
                        <button className="btn-small" type="button" disabled={index === 0} onClick={() => moveClip(clip.id, -1)} aria-label={`Move ${clip.name} earlier`}>
                          Earlier
                        </button>
                        <button className="btn-small" type="button" disabled={index === clips.length - 1} onClick={() => moveClip(clip.id, 1)} aria-label={`Move ${clip.name} later`}>
                          Later
                        </button>
                        <button className="btn-small-danger" type="button" onClick={() => removeClip(clip.id)}>Remove</button>
                      </div>
                    </div>
                    {clip.kind === 'video' ? (
                      <div className="grid gap-3 md:grid-cols-4">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Trim start</span>
                          <input className="field" type="number" min="0" max={clip.trimEnd} step="0.1" value={clip.trimStart} onChange={(event) => updateClip(clip.id, { trimStart: Number(event.target.value) })} />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Trim end</span>
                          <input className="field" type="number" min={clip.trimStart} max={clip.duration} step="0.1" value={clip.trimEnd} onChange={(event) => updateClip(clip.id, { trimEnd: Number(event.target.value) })} />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Crop focus</span>
                          <select className="field" value={clip.focusAnchor} onChange={(event) => updateClip(clip.id, { focusAnchor: event.target.value as VideoClip['focusAnchor'] })}>
                            <option value="center">Center</option>
                            <option value="left">From left</option>
                            <option value="right">From right</option>
                          </select>
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Focus %</span>
                          <input className="field" type="number" min="0" max="100" disabled={clip.focusAnchor === 'center'} value={clip.focusPercent} onChange={(event) => updateClip(clip.id, { focusPercent: Number(event.target.value) })} />
                        </label>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Duration in seconds</span>
                          <input className="field" type="number" min="0.5" max="30" step="0.5" value={clip.duration} onChange={(event) => {
                            const duration = Number(event.target.value);
                            updateClip(clip.id, { duration, trimStart: 0, trimEnd: duration });
                          }} />
                        </label>
                      </div>
                    )}
                    {clip.kind === 'slide' ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Slide title</span>
                          <input className="field" value={clip.title || ''} maxLength={80} onChange={(event) => updateClip(clip.id, { title: event.target.value })} />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Slide subtitle</span>
                          <input className="field" value={clip.subtitle || ''} maxLength={120} onChange={(event) => updateClip(clip.id, { subtitle: event.target.value })} />
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Background image</span>
                          <input
                            className="field"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => {
                              handleSlideBackground(clip.id, event.target.files?.[0]);
                              event.target.value = '';
                            }}
                          />
                          {clip.slideBackgroundFile ? (
                            <span className="flex items-center justify-between gap-2 text-[11px] normal-case tracking-normal text-slate-400">
                              <span className="truncate">{clip.slideBackgroundFile.name}</span>
                              <button className="font-bold text-loss" type="button" onClick={() => handleSlideBackground(clip.id)}>Remove</button>
                            </span>
                          ) : null}
                        </label>
                        <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                          <span>Text position</span>
                          <select className="field" value={clip.textPosition || 'center'} onChange={(event) => updateClip(clip.id, { textPosition: event.target.value as VideoClip['textPosition'] })}>
                            <option value="top">Top</option>
                            <option value="center">Center</option>
                            <option value="bottom">Bottom</option>
                          </select>
                        </label>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-grid px-4 py-5 text-center text-sm text-muted">Add videos, images, or slides above to build the timeline.</p>
            )}
          </section>
          ) : null}

          {editorPanel === 'text' ? (
          <section className="grid gap-3 rounded-lg border border-grid bg-panelSoft p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Timeline text</h3>
                <p className="text-sm text-muted">Times are relative to the rendered clip, before the branded start and end screens.</p>
              </div>
              <button
                className="btn-small"
                type="button"
                disabled={!timeline.duration}
                onClick={() => setTextOverlays((current) => [...current, defaultTextOverlay(timeline.duration)])}
              >
                Add text
              </button>
            </div>
            {textOverlays.length ? (
              <div className="grid gap-3">
                {textOverlays.map((overlay) => (
                  <div key={overlay.id} className="grid gap-3 rounded-md border border-grid bg-[#0a1018] p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_90px_90px]">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Text</span>
                        <input
                          className="field"
                          value={overlay.text}
                          maxLength={100}
                          onChange={(event) => updateTextOverlay(overlay.id, { text: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Start</span>
                        <input
                          className="field tabular-nums"
                          type="number"
                          min="0"
                          max={timeline.duration}
                          step="0.1"
                          value={overlay.start}
                          onChange={(event) => updateTextOverlay(overlay.id, { start: Number(event.target.value) })}
                        />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>End</span>
                        <input
                          className="field tabular-nums"
                          type="number"
                          min="0.1"
                          max={timeline.duration}
                          step="0.1"
                          value={overlay.end}
                          onChange={(event) => updateTextOverlay(overlay.id, { end: Number(event.target.value) })}
                        />
                      </label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-[1fr_1fr_90px_auto]">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Position</span>
                        <select
                          className="field"
                          value={overlay.position}
                          onChange={(event) => updateTextOverlay(overlay.id, { position: event.target.value as TextOverlay['position'] })}
                        >
                          <option value="top">Top</option>
                          <option value="center">Center</option>
                          <option value="bottom">Bottom</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Animation</span>
                        <select
                          className="field"
                          value={overlay.animation}
                          onChange={(event) => updateTextOverlay(overlay.id, { animation: event.target.value as TextOverlay['animation'] })}
                        >
                          <option value="fade">Fade</option>
                          <option value="slide-up">Slide up</option>
                          <option value="slide-left">Slide from left</option>
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Color</span>
                        <input
                          className="field h-11 p-1"
                          type="color"
                          value={overlay.color}
                          onChange={(event) => updateTextOverlay(overlay.id, { color: event.target.value })}
                        />
                      </label>
                      <button
                        className="btn-small-danger self-end"
                        type="button"
                        onClick={() => setTextOverlays((current) => current.filter((item) => item.id !== overlay.id))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-grid px-4 py-5 text-center text-sm text-muted">
                Load a video, then add text to place it on the timeline.
              </p>
            )}
          </section>
          ) : null}

          {editorPanel === 'audio' ? (
          <section className="grid gap-3 rounded-lg border border-grid bg-panelSoft p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white">Audio timeline</h3>
                <p className="text-sm text-muted">Layer generated royalty-free trading sounds or upload your own audio.</p>
              </div>
              <div className="flex gap-2">
                <button className="btn-small" type="button" onClick={() => void refreshAudioLibrary()}>
                  Refresh library
                </button>
                <button
                  className="btn-small"
                  type="button"
                  disabled={!timeline.duration}
                  onClick={() => setAudioLayers((current) => [...current, defaultAudioLayer(timeline.totalDuration)])}
                >
                  Add audio
                </button>
              </div>
            </div>
            <div className="grid gap-2 rounded-md border border-grid bg-[#0a1018] p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                <span>Add file to local audio library</span>
                <input
                  className="field"
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-aiff,audio/flac,audio/ogg"
                  onChange={(event) => {
                    void saveAudioToLibrary(event.target.files?.[0]);
                    event.target.value = '';
                  }}
                />
              </label>
              <span className="text-sm text-muted">
                {audioLibraryStatus || `${folderAudioFiles.length} folder tracks | ${savedAudioFiles.length} saved uploads`}
              </span>
            </div>
            {savedAudioFiles.length ? (
              <div className="flex flex-wrap gap-2">
                {savedAudioFiles.map((file) => (
                  <div key={file} className="inline-flex items-center gap-2 rounded-md border border-grid bg-slate-900 px-3 py-2 text-sm text-slate-300">
                    <span>{file}</span>
                    <button className="font-bold text-loss hover:text-red-300" type="button" onClick={() => void removeAudioFromLibrary(file)} aria-label={`Remove ${file} from audio library`}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {audioLayers.some((layer) => layer.kind !== 'voiceover') ? (
              <div className="grid gap-3">
                {audioLayers.filter((layer) => layer.kind !== 'voiceover').map((layer) => (
                  <div key={layer.id} className="grid gap-3 rounded-md border border-grid bg-[#0a1018] p-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_90px_90px_110px_auto_auto]">
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Audio source</span>
                        <select className="field" value={layer.source} onChange={(event) => updateAudioLayer(layer.id, { source: event.target.value as AudioLayer['source'], file: undefined, fileName: undefined })}>
                          {audioLibrary.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                          {folderAudioFiles.map((file) => <option key={`folder-${file}`} value={`folder:${file}`}>{file}</option>)}
                          {savedAudioFiles.map((file) => <option key={file} value={`library:${file}`}>{file}</option>)}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Start</span>
                        <input className="field" type="number" min="0" max={timeline.totalDuration} step="0.1" value={layer.start} onChange={(event) => updateAudioLayer(layer.id, { start: Number(event.target.value) })} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>End</span>
                        <input className="field" type="number" min={layer.start} max={timeline.totalDuration} step="0.1" value={layer.end} onChange={(event) => updateAudioLayer(layer.id, { end: Number(event.target.value) })} />
                      </label>
                      <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                        <span>Volume {Math.round(layer.volume * 100)}%</span>
                        <input className="h-11 w-full accent-profit" type="range" min="0" max="1" step="0.05" value={layer.volume} onChange={(event) => updateAudioLayer(layer.id, { volume: Number(event.target.value) })} />
                      </label>
                      <button className="btn-small self-end" type="button" onClick={() => void toggleAudioPreview(layer)}>
                        {previewingAudioId === layer.id ? 'Stop' : 'Preview'}
                      </button>
                      <button className="btn-small-danger self-end" type="button" onClick={() => setAudioLayers((current) => current.filter((item) => item.id !== layer.id))}>Remove</button>
                    </div>
                    {layer.source === 'custom' ? (
                      <label className="grid gap-2 text-sm font-medium text-slate-300">
                        <span>Custom audio file {layer.fileName ? `| ${layer.fileName}` : ''}</span>
                        <input className="field" type="file" accept="audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-aiff,audio/flac,audio/ogg" onChange={(event) => void handleCustomAudio(layer.id, event.target.files?.[0])} />
                      </label>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-md border border-dashed border-grid px-4 py-5 text-center text-sm text-muted">No audio layers. The reel will render without audio.</p>
            )}
          </section>
          ) : null}

          {editorPanel === 'settings' ? (
          <div className="grid gap-3 rounded-lg border border-grid bg-panelSoft p-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Reel length</span>
              <select
                className="field"
                value={['60', '120', '180'].includes(targetSeconds) ? targetSeconds : 'custom'}
                onChange={(event) => setTargetSeconds(event.target.value === 'custom' ? '90' : event.target.value)}
              >
                <option value="60">60s</option>
                <option value="120">120s</option>
                <option value="180">180s</option>
                <option value="custom">Custom</option>
              </select>
            </label>
            {!['60', '120', '180'].includes(targetSeconds) ? (
              <label className="grid gap-2 text-sm font-medium text-slate-300">
                <span>Custom length (seconds)</span>
                <input
                  className="field"
                  type="number"
                  min="1"
                  max="900"
                  step="1"
                  required
                  value={targetSeconds}
                  onChange={(event) => setTargetSeconds(event.target.value)}
                />
              </label>
            ) : null}
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Frame mode</span>
              <select className="field" value={cropMode} onChange={(event) => setCropMode(event.target.value as typeof cropMode)}>
                <option value="crop">Fill 9:16</option>
                <option value="blur">Video background</option>
                <option value="color">Color background</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Clip transition</span>
              <select className="field" value={transition} onChange={(event) => setTransition(event.target.value as typeof transition)}>
                <option value="fade">Crossfade</option>
                <option value="slideleft">Slide left</option>
                <option value="wipeleft">Wipe left</option>
                <option value="cut">Clean cut</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-medium text-slate-300">
              <span>Transition {transitionDuration.toFixed(1)}s</span>
              <input className="h-11 w-full accent-profit" type="range" min="0.2" max="1.2" step="0.1" disabled={transition === 'cut'} value={transitionDuration} onChange={(event) => setTransitionDuration(Number(event.target.value))} />
            </label>
            {cropMode === 'color' ? (
              <label className="grid gap-2 text-sm font-medium text-slate-300">
                <span>Background color</span>
                <input className="field h-12 p-1" type="color" value={backgroundColor} onChange={(event) => setBackgroundColor(event.target.value)} />
              </label>
            ) : null}
          </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <button className="btn-primary" type="submit" disabled={isSubmitting || !selectedEntry}>
              {isSubmitting ? 'Rendering...' : 'Create Instagram Reel'}
            </button>
            {status ? <span className="text-sm font-medium text-muted">{status}</span> : null}
          </div>
        </form>
      </SectionCard>

      <aside
        ref={voiceoverPanelRef}
        className={`fixed z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-grid bg-panel/95 shadow-2xl backdrop-blur ${
          voiceoverPosition
            ? ''
            : isOutputCollapsed
              ? 'bottom-[5.25rem] right-4'
              : 'bottom-4 right-4 lg:right-[23rem]'
        }`}
        style={voiceoverPosition ? { left: voiceoverPosition.x, top: voiceoverPosition.y } : undefined}
        aria-label="Live voiceover panel"
      >
        <header
          className="flex cursor-move select-none items-center gap-3 border-b border-grid px-3 py-2.5"
          onPointerDown={startMovingVoiceoverPanel}
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${isRecordingVoiceover ? 'animate-pulse bg-loss' : audioLayers.some((layer) => layer.kind === 'voiceover') ? 'bg-info' : 'bg-slate-600'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Live Voiceover</p>
            <p className="truncate text-xs text-muted">
              {isRecordingVoiceover
                ? 'Recording microphone audio'
                : `${audioLayers.filter((layer) => layer.kind === 'voiceover').length} recorded chunks`}
            </p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded border border-grid bg-slate-900 text-lg font-bold text-slate-200 hover:border-profit/50 hover:text-profit"
            type="button"
            title={isVoiceoverCollapsed ? 'Expand Live Voiceover' : 'Collapse Live Voiceover'}
            aria-label={isVoiceoverCollapsed ? 'Expand Live Voiceover' : 'Collapse Live Voiceover'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setIsVoiceoverCollapsed((current) => {
              if (current) setIsOutputCollapsed(true);
              return !current;
            })}
          >
            {isVoiceoverCollapsed ? '+' : '-'}
          </button>
        </header>

        {!isVoiceoverCollapsed ? (
          <div className="grid max-h-[calc(100vh-10rem)] gap-3 overflow-y-auto p-3">
            <p className="text-xs leading-5 text-muted">Play the current video and record microphone narration in separate timeline chunks.</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-primary" type="button" disabled={!timeline.duration || Boolean(previewScreen) || isRecordingVoiceover} onClick={() => void startVoiceoverRecording()}>
                Record voiceover
              </button>
              <button className="btn-small-danger" type="button" disabled={!isRecordingVoiceover} onClick={stopVoiceoverRecording}>
                Stop
              </button>
            </div>
            <div className={`status-message ${isRecordingVoiceover ? 'border-loss/40 bg-loss/10 text-loss' : 'border-grid bg-[#0a1018] text-muted'}`}>
              {isRecordingVoiceover ? 'Recording live. Background music will be lowered automatically in the final reel.' : voiceoverStatus || 'Select a video position, then record. Repeat for multiple chunks.'}
            </div>
            {audioLayers.some((layer) => layer.kind === 'voiceover') ? (
              <div className="grid gap-2">
                {audioLayers.filter((layer) => layer.kind === 'voiceover').map((layer, index) => (
                  <div key={layer.id} className="grid gap-2 rounded-md border border-info/30 bg-info/5 p-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <p className="text-sm font-bold text-white">Voiceover {index + 1}</p>
                      <p className="text-xs text-muted">{formatDuration(layer.start)} - {formatDuration(layer.end)} | {formatDuration(layer.end - layer.start)}</p>
                    </div>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                      <span>Start</span>
                      <input className="field" type="number" min="0" max={timeline.totalDuration} step="0.1" value={layer.start} onChange={(event) => updateAudioLayer(layer.id, { start: Number(event.target.value) })} />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted">
                      <span>End</span>
                      <input className="field" type="number" min={layer.start} max={timeline.totalDuration} step="0.1" value={layer.end} onChange={(event) => updateAudioLayer(layer.id, { end: Number(event.target.value) })} />
                    </label>
                    <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.1em] text-muted sm:col-span-2">
                      <span>Volume {Math.round(layer.volume * 100)}%</span>
                      <input className="accent-profit" type="range" min="0" max="1.5" step="0.05" value={layer.volume} onChange={(event) => updateAudioLayer(layer.id, { volume: Number(event.target.value) })} />
                    </label>
                    <button className="btn-small" type="button" onClick={() => void toggleAudioPreview(layer)}>
                      {previewingAudioId === layer.id ? 'Stop preview' : 'Preview'}
                    </button>
                    <button className="btn-small-danger" type="button" onClick={() => setAudioLayers((current) => current.filter((item) => item.id !== layer.id))}>Remove</button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </aside>

      <aside
        ref={outputPanelRef}
        className={`fixed z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-grid bg-panel/95 shadow-2xl backdrop-blur ${
          outputPosition ? '' : 'bottom-4 right-4'
        }`}
        style={outputPosition ? { left: outputPosition.x, top: outputPosition.y } : undefined}
        aria-label="Reel output panel"
      >
        <header
          className="flex cursor-move select-none items-center gap-3 border-b border-grid px-3 py-2.5"
          onPointerDown={startMovingOutputPanel}
        >
          <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${job?.status === 'done' ? 'bg-profit' : job?.status === 'error' ? 'bg-loss' : job?.status === 'running' ? 'bg-warning' : 'bg-slate-600'}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Reel Output</p>
            <p className="truncate text-xs text-muted">
              {job?.status ? `${job.status.toUpperCase()} | ${job.progress}%` : 'Collapsed preview | IDLE'}
            </p>
          </div>
          <button
            className="flex h-8 w-8 items-center justify-center rounded border border-grid bg-slate-900 text-lg font-bold text-slate-200 hover:border-profit/50 hover:text-profit"
            type="button"
            title={isOutputCollapsed ? 'Expand Reel Output' : 'Collapse Reel Output'}
            aria-label={isOutputCollapsed ? 'Expand Reel Output' : 'Collapse Reel Output'}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setIsOutputCollapsed((current) => {
              if (current) setIsVoiceoverCollapsed(true);
              return !current;
            })}
          >
            {isOutputCollapsed ? '+' : '-'}
          </button>
        </header>

        {!isOutputCollapsed ? (
          <div className="grid max-h-[calc(100vh-7rem)] gap-3 overflow-y-auto p-3">
            <div className="mx-auto aspect-[9/16] h-64 overflow-hidden rounded-md border border-grid bg-black">
              {job?.status === 'done' && job.output ? (
                <video className="h-full w-full" src={job.output} controls playsInline />
              ) : (
                <div className="flex h-full items-center justify-center px-5 text-center text-xs text-muted">
                  Render a reel to preview it here.
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>{job?.status ? job.status.toUpperCase() : 'IDLE'}</span>
                <span>{job?.progress || 0}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-900">
                <div className="h-full bg-profit transition-all" style={{ width: `${job?.progress || 0}%` }} />
              </div>
              <p className="text-xs text-muted">
                {job?.finalDuration ? `Final ${job.finalDuration}s` : 'No job running'}
                {job?.speed ? ` | ${job.speed}x` : ''}
                {job?.sourceFile ? ` | ${job.sourceFile}` : ''}
              </p>
            </div>
            {job?.status === 'done' && job.output ? (
              <div className="grid grid-cols-2 gap-2">
                <a className="btn-primary text-center" href={job.output} download={`TradeWithNine-day-${selectedEntry?.day || 'reel'}.mp4`}>
                  Download MP4
                </a>
                <button className="btn-muted" type="button" onClick={prepareReelPost}>
                  Post Reel
                </button>
                {postStatus ? <p className="col-span-2 text-xs font-medium text-muted">{postStatus}</p> : null}
              </div>
            ) : null}
            {job?.error ? <p className="status-message border-loss/30 bg-loss/10 text-loss">{job.error}</p> : null}
            <details className="rounded-md border border-grid bg-black/30">
              <summary className="cursor-pointer px-3 py-2 text-xs font-bold text-slate-300">Render logs</summary>
              <pre className="max-h-36 overflow-auto border-t border-grid p-3 text-[11px] leading-5 text-slate-400">
                {(job?.logs || []).join('\n') || 'Logs will appear here.'}
              </pre>
            </details>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
