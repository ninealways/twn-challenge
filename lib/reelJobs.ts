import { spawn } from 'node:child_process';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export type ReelJob = {
  id: string;
  status: 'queued' | 'running' | 'done' | 'error';
  progress: number;
  createdAt: string;
  updatedAt: string;
  logs: string[];
  output?: string;
  error?: string;
  finalDuration?: number;
  sourceDuration?: number;
  speed?: number;
  sourceFile?: string;
};

type ClipConfig = {
  id: string;
  kind?: 'video' | 'image' | 'slide';
  start?: number;
  end?: number;
  duration?: number;
  focusAnchor?: 'center' | 'left' | 'right';
  focusPercent?: number;
  title?: string;
  subtitle?: string;
  textPosition?: 'top' | 'center' | 'bottom';
  backgroundFile?: File;
  file?: File;
};

type TextOverlay = {
  text?: string;
  start?: number;
  end?: number;
  position?: 'top' | 'center' | 'bottom';
  animation?: 'fade' | 'slide-up' | 'slide-left';
  color?: string;
};

type AudioLayerInput = {
  id: string;
  source: string;
  start?: number;
  end?: number;
  volume?: number;
  kind?: 'music' | 'voiceover';
  file?: File;
};

type UploadReelInput = {
  day: string;
  result: string;
  pnl: string;
  currentCapital: string;
  disciplineScore: string;
  tradesTaken: string;
  date: string;
  notes: string;
  startTitle: string;
  startSubtitle: string;
  endTitle: string;
  endSubtitle: string;
  startScreenDuration: number;
  endScreenDuration: number;
  targetSeconds: number;
  cropMode: 'crop' | 'blur' | 'color';
  transition: 'cut' | 'fade' | 'slideleft' | 'wipeleft';
  transitionDuration: number;
  backgroundColor: string;
  clips: ClipConfig[];
  textOverlays: TextOverlay[];
  audioLayers: AudioLayerInput[];
};

const ROOT = process.cwd();
const WORK = path.join(ROOT, 'work', 'reels');
const UPLOADS = path.join(WORK, 'uploads');
const TMP = path.join(WORK, 'tmp');
const OUTPUTS = path.join(WORK, 'outputs');
const AUDIO_LIBRARY_DIR = path.join(WORK, 'audio-library');
const AUDIO_FOLDER_DIR = path.join(ROOT, 'audio');

export const AUDIO_TRACKS: Record<string, { label: string; source: string }> = {
  'market-pulse': {
    label: 'Market Pulse',
    source: 'aevalsrc=0.07*sin(2*PI*110*t)*(0.75+0.25*sin(2*PI*2*t))+0.025*sin(2*PI*220*t):s=44100'
  },
  'opening-bell': {
    label: 'Opening Bell Focus',
    source: 'aevalsrc=0.075*sin(2*PI*196*t)+0.035*sin(2*PI*392*t)*(0.65+0.35*sin(2*PI*0.5*t)):s=44100'
  },
  'breakout-drive': {
    label: 'Breakout Drive',
    source: 'aevalsrc=0.055*sin(2*PI*146.83*t)+0.04*sin(2*PI*220*t)+0.02*sin(2*PI*293.66*t):s=44100'
  },
  'closing-bell': {
    label: 'Closing Bell Review',
    source: 'aevalsrc=0.065*sin(2*PI*130.81*t)+0.028*sin(2*PI*196*t)*(0.8+0.2*sin(2*PI*0.25*t)):s=44100'
  },
  'terminal-ambience': {
    label: 'Terminal Ambience',
    source: 'anoisesrc=color=pink:amplitude=0.028:sample_rate=44100'
  }
};

const globalStore = globalThis as typeof globalThis & {
  __tradewithnineReelJobs?: Map<string, ReelJob>;
};

const jobs = globalStore.__tradewithnineReelJobs || new Map<string, ReelJob>();
globalStore.__tradewithnineReelJobs = jobs;

function now() {
  return new Date().toISOString();
}

function updateJob(jobId: string, updates: Partial<ReelJob>) {
  const job = jobs.get(jobId);
  if (!job) return;
  jobs.set(jobId, { ...job, ...updates, updatedAt: now() });
}

function addLog(jobId: string, message: string) {
  const job = jobs.get(jobId);
  if (!job) return;
  jobs.set(jobId, {
    ...job,
    logs: [...job.logs, `[${new Date().toLocaleTimeString()}] ${message}`],
    updatedAt: now()
  });
}

function safeFilename(value: string) {
  return path.basename(value || 'upload.mp4').replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^[.-]+|[.-]+$/g, '') || 'upload.mp4';
}

function normalizeColor(value: string) {
  const text = String(value || '#070a0f').trim();
  if (!/^#[0-9a-fA-F]{6}$/.test(text)) throw new Error('Background color must be a hex value like #070a0f');
  return `0x${text.slice(1)}`;
}

function normalizedTextOverlays(rawOverlays: TextOverlay[], bodyDuration: number) {
  return rawOverlays
    .map((overlay, index) => {
      const value = String(overlay.text || '').trim().slice(0, 100);
      const start = Number(overlay.start);
      const end = Number(overlay.end);
      if (!value) return null;
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) {
        throw new Error(`Text overlay ${index + 1} needs a valid start and end time`);
      }
      if (start >= bodyDuration) throw new Error(`Text overlay ${index + 1} starts after the selected clip ends`);
      const color = String(overlay.color || '#ffffff');
      if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error(`Text overlay ${index + 1} has an invalid color`);
      return {
        text: value,
        start,
        end: Math.min(end, bodyDuration),
        position: overlay.position === 'top' || overlay.position === 'center' ? overlay.position : 'bottom',
        animation: overlay.animation === 'slide-up' || overlay.animation === 'slide-left' ? overlay.animation : 'fade',
        color
      };
    })
    .filter((overlay): overlay is NonNullable<typeof overlay> => Boolean(overlay));
}

function formatSeconds(seconds: number) {
  return Math.max(0, seconds).toFixed(3);
}

function runCommand(jobId: string, args: string[], label: string) {
  return new Promise<void>((resolve, reject) => {
    addLog(jobId, label);
    const process = spawn(args[0], args.slice(1), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const lines: string[] = [];
    const onData = (chunk: Buffer) => {
      for (const line of chunk.toString().split(/\r?\n/)) {
        const clean = line.trim();
        if (!clean) continue;
        lines.push(clean);
        if (lines.length <= 8 || clean.toLowerCase().includes('error')) addLog(jobId, clean.slice(-500));
      }
    };
    process.stdout.on('data', onData);
    process.stderr.on('data', onData);
    process.on('error', reject);
    process.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${label} failed with exit code ${code}\n${lines.slice(-15).join('\n')}`));
    });
  });
}

async function runQuiet(args: string[], label: string) {
  const lines: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const process = spawn(args[0], args.slice(1), { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    const onData = (chunk: Buffer) => {
      lines.push(...chunk.toString().split(/\r?\n/).filter(Boolean));
    };
    process.stdout.on('data', onData);
    process.stderr.on('data', onData);
    process.on('error', reject);
    process.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label} failed with exit code ${code}\n${lines.slice(-15).join('\n')}`))));
  });
}

async function getDuration(filePath: string) {
  const output: string[] = [];
  await new Promise<void>((resolve, reject) => {
    const process = spawn('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format=duration',
      '-of',
      'default=noprint_wrappers=1:nokey=1',
      filePath
    ]);
    process.stdout.on('data', (chunk) => output.push(chunk.toString()));
    process.on('error', reject);
    process.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffprobe failed'))));
  });
  return Number(output.join('').trim());
}

function normalizedClips(rawClips: ClipConfig[], durations: number[]) {
  return durations.map((sourceDuration, index) => {
    const clip = rawClips[index] || {};
    const start = Math.max(0, Number(clip.start || 0));
    const requestedEnd = Number(clip.end);
    const end = Number.isFinite(requestedEnd) && requestedEnd > 0 ? Math.min(requestedEnd, sourceDuration) : sourceDuration;
    if (end <= start) throw new Error(`Video clip ${index + 1} must end after it starts`);
    const focusAnchor = clip.focusAnchor || 'center';
    const focusPercent = Math.max(0, Math.min(100, Number(clip.focusPercent || 0)));
    return { start, end, duration: end - start, focusAnchor, focusPercent };
  });
}

type VisualInput = {
  path: string;
  kind: 'video' | 'image' | 'slide';
  duration: number;
};

function focusCropX(clip: ReturnType<typeof normalizedClips>[number]) {
  if (clip.focusAnchor === 'left') return `(iw-1080)*${(clip.focusPercent / 100).toFixed(6)}`;
  if (clip.focusAnchor === 'right') return `(iw-1080)*${(1 - clip.focusPercent / 100).toFixed(6)}`;
  return '(iw-1080)/2';
}

function buildBodyArgs(
  inputs: VisualInput[],
  outputPath: string,
  clips: ReturnType<typeof normalizedClips>,
  targetSeconds: number,
  cropMode: UploadReelInput['cropMode'],
  backgroundColor: string,
  transition: UploadReelInput['transition'],
  requestedTransitionDuration: number
) {
  const shortestClip = Math.min(...clips.map((clip) => clip.duration));
  const transitionDuration = transition === 'cut' || clips.length < 2 ? 0 : Math.min(requestedTransitionDuration, shortestClip / 2);
  const totalDuration = clips.reduce((sum, clip) => sum + clip.duration, 0) - transitionDuration * Math.max(0, clips.length - 1);
  const speed = totalDuration > targetSeconds ? totalDuration / targetSeconds : 1;
  const filters: string[] = [];
  clips.forEach((clip, index) => {
    if (inputs[index].kind !== 'video') {
      filters.push(
        `[${index}:v]trim=start=${clip.start.toFixed(3)}:end=${clip.end.toFixed(3)},setpts=PTS-STARTPTS,split=2[base${index}][fg${index}];[base${index}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=32,eq=brightness=-0.06:saturation=0.9[bg${index}];[fg${index}]scale=1080:1920:force_original_aspect_ratio=decrease:force_divisible_by=2[fgs${index}];[bg${index}][fgs${index}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p[v${index}]`
      );
    } else if (cropMode === 'crop') {
      filters.push(
        `[${index}:v]trim=start=${clip.start.toFixed(3)}:end=${clip.end.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:${focusCropX(clip)}:(ih-1920)/2,setsar=1,fps=30,format=yuv420p[v${index}]`
      );
    } else if (cropMode === 'blur') {
      filters.push(
        `[${index}:v]trim=start=${clip.start.toFixed(3)}:end=${clip.end.toFixed(3)},setpts=PTS-STARTPTS,split=2[base${index}][fg${index}];[base${index}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=28,eq=brightness=-0.08:saturation=1.15[bg${index}];[fg${index}]scale=1080:1920:force_original_aspect_ratio=decrease[fgs${index}];[bg${index}][fgs${index}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p[v${index}]`
      );
    } else {
      filters.push(
        `[${index}:v]trim=start=${clip.start.toFixed(3)}:end=${clip.end.toFixed(3)},setpts=PTS-STARTPTS,scale=1080:1920:force_original_aspect_ratio=decrease[fgs${index}];color=c=${normalizeColor(backgroundColor)}:s=1080x1920:d=${clip.duration.toFixed(3)}[bg${index}];[bg${index}][fgs${index}]overlay=(W-w)/2:(H-h)/2,setsar=1,fps=30,format=yuv420p[v${index}]`
      );
    }
  });

  let combinedLabel = 'v0';
  if (clips.length > 1 && transitionDuration === 0) {
    filters.push(`${clips.map((_, index) => `[v${index}]`).join('')}concat=n=${clips.length}:v=1:a=0[vc]`);
    combinedLabel = 'vc';
  } else if (clips.length > 1) {
    let accumulatedDuration = clips[0].duration;
    for (let index = 1; index < clips.length; index += 1) {
      const nextLabel = `vx${index}`;
      const offset = accumulatedDuration - transitionDuration;
      filters.push(
        `[${combinedLabel}][v${index}]xfade=transition=${transition}:duration=${transitionDuration.toFixed(3)}:offset=${offset.toFixed(3)}[${nextLabel}]`
      );
      combinedLabel = nextLabel;
      accumulatedDuration += clips[index].duration - transitionDuration;
    }
  }
  filters.push(`[${combinedLabel}]setpts=PTS/${speed.toFixed(6)},fps=30,format=yuv420p[vout]`);

  return {
    args: [
      'ffmpeg',
      '-y',
      '-nostdin',
      ...inputs.flatMap((input) => input.kind === 'video'
        ? ['-i', input.path]
        : ['-loop', '1', '-t', formatSeconds(input.duration), '-i', input.path]),
      '-filter_complex',
      filters.join(';'),
      '-map',
      '[vout]',
      '-c:v',
      'libx264',
      '-preset',
      'medium',
      '-crf',
      '20',
      '-movflags',
      '+faststart',
      outputPath
    ],
    speed,
    totalDuration,
    transitionDuration
  };
}

async function makeScreenPng(outputPath: string, title: string, subtitle: string, footer: string, backgroundPath?: string) {
  const cache = path.join(WORK, 'swift-cache');
  await mkdir(cache, { recursive: true });
  await runQuiet(
    [
      'swift',
      '-module-cache-path',
      cache,
      path.join(ROOT, 'scripts', 'reel_screen_renderer.swift'),
      outputPath,
      title,
      subtitle,
      footer,
      ...(backgroundPath ? [backgroundPath] : [])
    ],
    'Rendering reel title screen'
  );
}

async function makeStartBackgroundFrame(inputPath: string, outputPath: string, start: number) {
  await runQuiet(
    [
      'ffmpeg',
      '-y',
      '-nostdin',
      '-ss',
      formatSeconds(start),
      '-i',
      inputPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
      '-update',
      '1',
      outputPath
    ],
    'Extracting reel start background'
  );
}

async function makeSlidePng(
  outputPath: string,
  title: string,
  subtitle: string,
  position: ClipConfig['textPosition'],
  backgroundPath?: string
) {
  const cache = path.join(WORK, 'swift-cache');
  await mkdir(cache, { recursive: true });
  await runQuiet(
    [
      'swift',
      '-module-cache-path',
      cache,
      path.join(ROOT, 'scripts', 'reel_slide_renderer.swift'),
      outputPath,
      title,
      subtitle,
      position || 'center',
      ...(backgroundPath ? [backgroundPath] : [])
    ],
    'Rendering timeline slide'
  );
}

async function makeTextPng(outputPath: string, value: string, color: string) {
  const cache = path.join(WORK, 'swift-cache');
  await mkdir(cache, { recursive: true });
  await runQuiet(
    ['swift', '-module-cache-path', cache, path.join(ROOT, 'scripts', 'reel_text_renderer.swift'), outputPath, value, color],
    'Rendering reel text overlay'
  );
}

function normalizedAudioLayers(rawLayers: AudioLayerInput[], timelineDuration: number, customAudioPaths: Record<string, string>) {
  return rawLayers.map((layer, index) => {
    const start = Math.max(0, Number(layer.start || 0));
    const requestedEnd = Number(layer.end);
    const end = Number.isFinite(requestedEnd) && requestedEnd > start ? Math.min(requestedEnd, timelineDuration) : timelineDuration;
    if (start >= timelineDuration || end <= start) throw new Error(`Audio layer ${index + 1} is outside the reel timeline`);
    const volume = Math.max(0, Math.min(1.5, Number(layer.volume ?? 0.35)));
    if (layer.source === 'custom') {
      const filePath = customAudioPaths[layer.id];
      if (!filePath) throw new Error(`Audio layer ${index + 1} is missing its uploaded file`);
      return { ...layer, start, end, duration: end - start, volume, filePath, label: path.basename(filePath) };
    }
    if (layer.source.startsWith('library:')) {
      const fileName = path.basename(layer.source.slice('library:'.length));
      const filePath = path.join(AUDIO_LIBRARY_DIR, fileName);
      if (!existsSync(filePath)) throw new Error(`Audio layer ${index + 1} library file is missing`);
      return { ...layer, start, end, duration: end - start, volume, filePath, label: fileName };
    }
    if (layer.source.startsWith('folder:')) {
      const fileName = path.basename(layer.source.slice('folder:'.length));
      const filePath = path.join(AUDIO_FOLDER_DIR, fileName);
      if (!existsSync(filePath)) throw new Error(`Audio layer ${index + 1} folder file is missing`);
      return { ...layer, start, end, duration: end - start, volume, filePath, label: fileName };
    }
    const builtIn = AUDIO_TRACKS[layer.source];
    if (!builtIn) throw new Error(`Audio layer ${index + 1} has an invalid library track`);
    return { ...layer, start, end, duration: end - start, volume, sourceFilter: builtIn.source, label: builtIn.label };
  });
}

function buildFinalArgs(
  bodyPath: string,
  outputPath: string,
  startScreen: string,
  endScreen: string,
  input: UploadReelInput,
  bodyDuration: number,
  overlays: ReturnType<typeof normalizedTextOverlays>,
  overlayPaths: string[],
  audioLayers: ReturnType<typeof normalizedAudioLayers>
) {
  const startDuration = input.startScreenDuration;
  const endDuration = input.endScreenDuration;
  const totalDuration = bodyDuration + startDuration + endDuration;
  const filters: string[] = [`[0:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p[vbody]`];
  const args = [
    'ffmpeg',
    '-y',
    '-nostdin',
    '-i',
    bodyPath
  ];
  let nextInputIndex = 1;
  let startLabel = '';
  let endLabel = '';
  if (startDuration > 0) {
    args.push('-loop', '1', '-t', formatSeconds(startDuration), '-i', startScreen);
    startLabel = 'vstart';
    filters.push(`[${nextInputIndex}:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p[${startLabel}]`);
    nextInputIndex += 1;
  }
  if (endDuration > 0) {
    args.push('-loop', '1', '-t', formatSeconds(endDuration), '-i', endScreen);
    endLabel = 'vend';
    filters.push(`[${nextInputIndex}:v]fps=30,scale=1080:1920,setsar=1,format=yuv420p[${endLabel}]`);
    nextInputIndex += 1;
  }
  const firstOverlayIndex = nextInputIndex;
  overlayPaths.forEach((overlayPath) => args.push('-loop', '1', '-t', formatSeconds(bodyDuration), '-i', overlayPath));

  let bodyLabel = 'vbody';
  overlays.forEach((overlay, index) => {
    const duration = overlay.end - overlay.start;
    const fadeDuration = Math.min(0.35, duration / 3);
    const fadeOutStart = Math.max(overlay.start, overlay.end - fadeDuration);
    const textLabel = `text${index}`;
    const nextBodyLabel = `vtext${index}`;
    const baseY = overlay.position === 'top' ? 220 : overlay.position === 'center' ? 850 : 1470;
    let x = '60';
    let y = String(baseY);
    if (overlay.animation === 'slide-up') y = `${baseY}+70*max(0\\,1-(t-${overlay.start.toFixed(3)})/${fadeDuration.toFixed(3)})`;
    if (overlay.animation === 'slide-left') x = `60-100*max(0\\,1-(t-${overlay.start.toFixed(3)})/${fadeDuration.toFixed(3)})`;
    filters.push(
      `[${firstOverlayIndex + index}:v]format=rgba,fade=t=in:st=${overlay.start.toFixed(3)}:d=${fadeDuration.toFixed(3)}:alpha=1,fade=t=out:st=${fadeOutStart.toFixed(3)}:d=${fadeDuration.toFixed(3)}:alpha=1[${textLabel}]`
    );
    filters.push(
      `[${bodyLabel}][${textLabel}]overlay=x='${x}':y='${y}':enable='between(t,${overlay.start.toFixed(3)},${overlay.end.toFixed(3)})'[${nextBodyLabel}]`
    );
    bodyLabel = nextBodyLabel;
  });
  const videoSegments = [startLabel ? `[${startLabel}]` : '', `[${bodyLabel}]`, endLabel ? `[${endLabel}]` : ''].filter(Boolean);
  if (videoSegments.length === 1) filters.push(`${videoSegments[0]}null[vout]`);
  else filters.push(`${videoSegments.join('')}concat=n=${videoSegments.length}:v=1:a=0[vout]`);

  const firstAudioIndex = firstOverlayIndex + overlayPaths.length;
  audioLayers.forEach((layer) => {
    if ('sourceFilter' in layer) args.push('-f', 'lavfi', '-t', formatSeconds(layer.duration), '-i', layer.sourceFilter);
    else if (layer.kind === 'voiceover') args.push('-i', layer.filePath);
    else args.push('-stream_loop', '-1', '-i', layer.filePath);
  });
  const audioLabels: string[] = [];
  const musicLabels: string[] = [];
  const voiceLabels: string[] = [];
  audioLayers.forEach((layer, index) => {
    const label = `audio${index}`;
    const delay = Math.round(layer.start * 1000);
    filters.push(
      `[${firstAudioIndex + index}:a]atrim=start=0:end=${layer.duration.toFixed(3)},asetpts=PTS-STARTPTS,volume=${layer.volume.toFixed(3)},adelay=${delay}:all=1[${label}]`
    );
    audioLabels.push(`[${label}]`);
    if (layer.kind === 'voiceover') voiceLabels.push(`[${label}]`);
    else musicLabels.push(`[${label}]`);
  });
  if (musicLabels.length && voiceLabels.length) {
    filters.push(`${musicLabels.join('')}amix=inputs=${musicLabels.length}:duration=longest:normalize=0[backgroundmix]`);
    filters.push(`${voiceLabels.join('')}amix=inputs=${voiceLabels.length}:duration=longest:normalize=0[voicemix]`);
    filters.push('[voicemix]asplit=2[voicekey][voiceout]');
    filters.push('[backgroundmix][voicekey]sidechaincompress=threshold=0.015:ratio=10:attack=15:release=350[duckedbg]');
    filters.push(
      `[duckedbg][voiceout]amix=inputs=2:duration=longest:normalize=0,apad=whole_dur=${totalDuration.toFixed(3)},atrim=start=0:end=${totalDuration.toFixed(3)}[aout]`
    );
  } else if (audioLabels.length) {
    filters.push(
      `${audioLabels.join('')}amix=inputs=${audioLabels.length}:duration=longest:normalize=0,apad=whole_dur=${totalDuration.toFixed(3)},atrim=start=0:end=${totalDuration.toFixed(3)}[aout]`
    );
  }
  args.push('-filter_complex', filters.join(';'), '-map', '[vout]');
  if (audioLabels.length) args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '160k', '-shortest');
  args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-movflags', '+faststart', outputPath);
  return args;
}

async function processUpload(jobId: string, input: UploadReelInput, mediaPaths: Record<string, string>, customAudioPaths: Record<string, string>) {
  const bodyPath = path.join(TMP, `reel-body-${jobId}.mp4`);
  const startScreen = path.join(TMP, `start-screen-${jobId}.png`);
  const endScreen = path.join(TMP, `end-screen-${jobId}.png`);
  const startBackgroundFrame = path.join(TMP, `start-background-${jobId}.png`);
  const overlayPaths: string[] = [];
  const generatedSlidePaths: string[] = [];
  try {
    const sourceNames = input.clips.map((clip) => clip.kind === 'slide' ? clip.title || 'Slide' : path.basename(mediaPaths[clip.id] || clip.id));
    updateJob(jobId, { status: 'running', progress: 5, sourceFile: sourceNames.join(', ') });
    const visualInputs: VisualInput[] = [];
    const sourceDurations: number[] = [];
    for (let index = 0; index < input.clips.length; index += 1) {
      const clip = input.clips[index];
      const kind = clip.kind || 'video';
      if (kind === 'slide') {
        const slidePath = path.join(TMP, `timeline-slide-${jobId}-${index}.png`);
        await makeSlidePng(
          slidePath,
          clip.title || `Slide ${index + 1}`,
          clip.subtitle || '',
          clip.textPosition,
          mediaPaths[clip.id]
        );
        generatedSlidePaths.push(slidePath);
        const duration = Math.max(0.5, Number(clip.duration || 4));
        visualInputs.push({ path: slidePath, kind, duration });
        sourceDurations.push(duration);
      } else {
        const mediaPath = mediaPaths[clip.id];
        if (!mediaPath) throw new Error(`Timeline item ${index + 1} is missing its file`);
        const duration = kind === 'video' ? await getDuration(mediaPath) : Math.max(0.5, Number(clip.duration || 4));
        visualInputs.push({ path: mediaPath, kind, duration });
        sourceDurations.push(duration);
      }
    }
    const clips = normalizedClips(input.clips, sourceDurations);
    addLog(jobId, `Using Day ${input.day} sheet data: ${input.result}, P&L ${input.pnl}, discipline ${input.disciplineScore}/10`);
    addLog(jobId, `Timeline visuals: ${input.clips.length} | source duration ${sourceDurations.reduce((sum, value) => sum + value, 0).toFixed(2)}s`);

    const body = buildBodyArgs(
      visualInputs,
      bodyPath,
      clips,
      input.targetSeconds,
      input.cropMode,
      input.backgroundColor,
      input.transition,
      input.transitionDuration
    );
    updateJob(jobId, { progress: 35 });
    await runCommand(jobId, body.args, 'Rendering uploaded clip body');
    if (body.speed > 1) addLog(jobId, `Speeding clip body by ${body.speed.toFixed(3)}x to fit ${input.targetSeconds}s`);
    addLog(jobId, `Clip transition: ${input.transition} ${body.transitionDuration.toFixed(2)}s`);

    const bodyDuration = await getDuration(bodyPath);
    const overlays = normalizedTextOverlays(input.textOverlays, bodyDuration);
    const audioLayers = normalizedAudioLayers(
      input.audioLayers,
      bodyDuration + input.startScreenDuration + input.endScreenDuration,
      customAudioPaths
    );
    for (let index = 0; index < overlays.length; index += 1) {
      const overlayPath = path.join(TMP, `text-overlay-${jobId}-${index}.png`);
      overlayPaths.push(overlayPath);
      await makeTextPng(overlayPath, overlays[index].text, overlays[index].color);
    }
    if (input.startScreenDuration > 0) {
      const firstVisual = visualInputs[0];
      let backgroundPath = firstVisual?.path;
      if (firstVisual?.kind === 'video') {
        await makeStartBackgroundFrame(firstVisual.path, startBackgroundFrame, clips[0]?.start || 0);
        backgroundPath = startBackgroundFrame;
      }
      await makeScreenPng(startScreen, input.startTitle, input.startSubtitle, 'TradeWithNine', backgroundPath);
    }
    if (input.endScreenDuration > 0) await makeScreenPng(endScreen, input.endTitle, input.endSubtitle, 'Verify levels live');
    const outputPath = path.join(OUTPUTS, `tradewithnine-reel-${jobId}.mp4`);
    const finalArgs = buildFinalArgs(bodyPath, outputPath, startScreen, endScreen, input, bodyDuration, overlays, overlayPaths, audioLayers);
    updateJob(jobId, { progress: 68 });
    addLog(
      jobId,
      `Screens: start ${input.startScreenDuration.toFixed(1)}s | video ${body.totalDuration.toFixed(2)}s | end ${input.endScreenDuration.toFixed(1)}s`
    );
    addLog(jobId, `Audio layers: ${audioLayers.map((layer) => layer.label).join(', ') || 'none'}`);
    addLog(jobId, `Timed text overlays: ${overlays.length}`);
    await runCommand(jobId, finalArgs, 'Rendering Instagram reel');
    const finalDuration = await getDuration(outputPath);

    updateJob(jobId, {
      status: 'done',
      progress: 100,
      output: `/api/reels/outputs/${path.basename(outputPath)}`,
      sourceDuration: Number(body.totalDuration.toFixed(3)),
      finalDuration: Number(finalDuration.toFixed(3)),
      speed: Number(body.speed.toFixed(4))
    });
    addLog(jobId, `Done: ${path.basename(outputPath)} (${finalDuration.toFixed(2)}s)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not render reel';
    updateJob(jobId, { status: 'error', error: message, progress: 100 });
    addLog(jobId, `Error: ${message}`);
  } finally {
    for (const filePath of [...Object.values(mediaPaths), ...generatedSlidePaths, ...Object.values(customAudioPaths), bodyPath, startScreen, endScreen, startBackgroundFrame, ...overlayPaths]) {
      if (existsSync(filePath)) await unlink(filePath).catch(() => undefined);
    }
  }
}

export async function ensureReelDirs() {
  await Promise.all([
    mkdir(UPLOADS, { recursive: true }),
    mkdir(TMP, { recursive: true }),
    mkdir(OUTPUTS, { recursive: true }),
    mkdir(AUDIO_LIBRARY_DIR, { recursive: true })
  ]);
}

export function getOutputPath(fileName: string) {
  return path.join(OUTPUTS, path.basename(fileName));
}

export function getJob(jobId: string) {
  return jobs.get(jobId);
}

export async function createUploadReelJob(input: UploadReelInput) {
  await ensureReelDirs();
  if (!input.clips.length) throw new Error('Add at least one video, image, or slide');
  const jobId = randomUUID().replace(/-/g, '').slice(0, 12);
  const mediaPaths: Record<string, string> = {};
  for (let index = 0; index < input.clips.length; index += 1) {
    const clip = input.clips[index];
    const kind = clip.kind || 'video';
    if (kind === 'slide') {
      if (!clip.backgroundFile) continue;
      const suffix = path.extname(clip.backgroundFile.name).toLowerCase();
      if (!['.png', '.jpg', '.jpeg', '.webp'].includes(suffix)) throw new Error('Slide backgrounds must be PNG, JPG, or WEBP images');
      const mediaPath = path.join(UPLOADS, `${jobId}-slide-background-${index}-${safeFilename(clip.backgroundFile.name)}`);
      await writeFile(mediaPath, Buffer.from(await clip.backgroundFile.arrayBuffer()));
      mediaPaths[clip.id] = mediaPath;
      continue;
    }
    if (!clip.file) throw new Error(`Timeline item ${index + 1} is missing its file`);
    const suffix = path.extname(clip.file.name).toLowerCase();
    const allowed = kind === 'video'
      ? ['.mp4', '.mov', '.m4v', '.webm', '.mkv']
      : ['.png', '.jpg', '.jpeg', '.webp'];
    if (!allowed.includes(suffix)) throw new Error(kind === 'video' ? 'Upload MP4, MOV, WEBM, or MKV videos' : 'Upload PNG, JPG, or WEBP images');
    const mediaPath = path.join(UPLOADS, `${jobId}-${kind}-${index}-${safeFilename(clip.file.name)}`);
    await writeFile(mediaPath, Buffer.from(await clip.file.arrayBuffer()));
    mediaPaths[clip.id] = mediaPath;
  }
  const customAudioPaths: Record<string, string> = {};
  for (const layer of input.audioLayers) {
    if (layer.source !== 'custom' || !layer.file) continue;
    const suffix = path.extname(layer.file.name).toLowerCase();
    if (!['.mp3', '.m4a', '.aac', '.wav', '.aiff', '.flac', '.ogg', '.webm'].includes(suffix)) {
      throw new Error('Custom audio must be MP3, M4A, AAC, WAV, AIFF, FLAC, OGG, or WEBM');
    }
    const audioPath = path.join(UPLOADS, `${jobId}-audio-${safeFilename(layer.id)}-${safeFilename(layer.file.name)}`);
    await writeFile(audioPath, Buffer.from(await layer.file.arrayBuffer()));
    customAudioPaths[layer.id] = audioPath;
  }
  const timestamp = now();
  jobs.set(jobId, {
    id: jobId,
    status: 'queued',
    progress: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
    logs: []
  });
  void processUpload(jobId, input, mediaPaths, customAudioPaths);
  return jobId;
}
