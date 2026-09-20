'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as bodySegmentation from '@tensorflow-models/body-segmentation';
import '@tensorflow/tfjs-backend-webgl';
import type { BodySegmenter } from '@tensorflow-models/body-segmentation';
import BrandMark from '@/components/BrandMark';
import SectionCard from '@/components/SectionCard';
import { CHALLENGE_DAYS } from '@/lib/constants';
import { formatCurrency, sortEntries } from '@/lib/stats';
import type { ChallengeEntry } from '@/types/challenge';

type Reel2MakerProps = {
  entries: ChallengeEntry[];
};

type RecordingState = 'idle' | 'ready' | 'recording' | 'done';
type CameraBackgroundMode = 'fill' | 'blur' | 'image';
type CameraCompositeMode = 'full-frame' | 'person-mask';

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const TOP_HEIGHT = 1020;
const BOTTOM_HEIGHT = CANVAS_HEIGHT - TOP_HEIGHT;

function supportedMimeType() {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4'
  ];
  return candidates.find((type) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) || '';
}

function drawCover(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawContain(
  context: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (!sourceWidth || !sourceHeight) return;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(source, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function buildReactionCaption(entry?: ChallengeEntry) {
  if (!entry) return 'TradeWithNine reaction reel';
  return `Day ${entry.day}/${CHALLENGE_DAYS} reaction reel

P&L: ${formatCurrency(entry.pnl)}
Result: ${entry.result}
Discipline: ${entry.disciplineScore}/10

Educational Content Only | Trading Involves Risk`;
}

export default function Reel2Maker({ entries }: Reel2MakerProps) {
  const sortedEntries = useMemo(() => sortEntries(entries), [entries]);
  const [selectedId, setSelectedId] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [status, setStatus] = useState('Upload a video, then start recording your reaction.');
  const [elapsed, setElapsed] = useState(0);
  const [outputUrl, setOutputUrl] = useState('');
  const [includeSourceAudio, setIncludeSourceAudio] = useState(false);
  const [sourceAudioVolume, setSourceAudioVolume] = useState(0.18);
  const [cameraLabel, setCameraLabel] = useState('Camera waiting');
  const [cameraBackgroundMode, setCameraBackgroundMode] = useState<CameraBackgroundMode>('fill');
  const [cameraCompositeMode, setCameraCompositeMode] = useState<CameraCompositeMode>('person-mask');
  const [cameraBackgroundUrl, setCameraBackgroundUrl] = useState('');
  const [segmentationStatus, setSegmentationStatus] = useState('Person background replacement is ready to load.');
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');
  const [deviceStatus, setDeviceStatus] = useState('Choose camera and mic before recording.');

  const sourceVideoRef = useRef<HTMLVideoElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const objectUrls = useRef<string[]>([]);
  const cameraStream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const drawFrame = useRef<number | null>(null);
  const timer = useRef<number | null>(null);
  const startedAt = useRef(0);
  const audioContext = useRef<AudioContext | null>(null);
  const cameraBackgroundImage = useRef<HTMLImageElement | null>(null);
  const segmenter = useRef<BodySegmenter | null>(null);
  const segmenterPromise = useRef<Promise<BodySegmenter> | null>(null);
  const segmentationMask = useRef<ImageData | null>(null);
  const lastSegmentationAt = useRef(0);
  const personCanvas = useRef<HTMLCanvasElement | null>(null);
  const maskCanvas = useRef<HTMLCanvasElement | null>(null);

  const selectedEntry = sortedEntries.find((entry) => entry.id === selectedId) || sortedEntries.at(-1);

  useEffect(() => {
    if (!selectedId && sortedEntries.length) setSelectedId(sortedEntries.at(-1)?.id || '');
  }, [selectedId, sortedEntries]);

  useEffect(
    () => () => {
      stopPreviewLoop();
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      cameraStream.current?.getTracks().forEach((track) => track.stop());
      void audioContext.current?.close();
      segmenter.current?.dispose();
    },
    []
  );

  useEffect(() => {
    void refreshDevices();
  }, []);

  function stopPreviewLoop() {
    if (drawFrame.current) cancelAnimationFrame(drawFrame.current);
    drawFrame.current = null;
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  }

  async function refreshDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setDeviceStatus('This browser does not expose media source selection.');
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((device) => device.kind === 'videoinput');
      const microphones = devices.filter((device) => device.kind === 'audioinput');
      setVideoDevices(cameras);
      setAudioDevices(microphones);
      setSelectedVideoDeviceId((current) => current || cameras[0]?.deviceId || '');
      setSelectedAudioDeviceId((current) => current || microphones[0]?.deviceId || '');
      setDeviceStatus(
        cameras.length || microphones.length
          ? 'Sources loaded. Labels appear after camera/mic permission is granted.'
          : 'No camera or microphone sources found.'
      );
    } catch (error) {
      setDeviceStatus(error instanceof Error ? `Could not load sources: ${error.message}` : 'Could not load media sources.');
    }
  }

  function stopCameraStream() {
    cameraStream.current?.getTracks().forEach((track) => track.stop());
    cameraStream.current = null;
    segmentationMask.current = null;
    if (cameraVideoRef.current) cameraVideoRef.current.srcObject = null;
  }

  function handleVideoSourceChange(deviceId: string) {
    setSelectedVideoDeviceId(deviceId);
    stopCameraStream();
    setCameraLabel('Camera waiting');
    setRecordingState(sourceUrl ? 'ready' : 'idle');
    setDeviceStatus('Camera source changed. Test camera or start recording to activate it.');
  }

  function handleAudioSourceChange(deviceId: string) {
    setSelectedAudioDeviceId(deviceId);
    stopCameraStream();
    setCameraLabel('Camera waiting');
    setRecordingState(sourceUrl ? 'ready' : 'idle');
    setDeviceStatus('Mic source changed. Test camera or start recording to activate it.');
  }

  async function ensureSegmenter() {
    if (segmenter.current) return segmenter.current;
    if (!segmenterPromise.current) {
      setSegmentationStatus('Loading local person segmentation model...');
      segmenterPromise.current = bodySegmentation
        .createSegmenter(bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation, {
          runtime: 'tfjs',
          modelType: 'landscape'
        })
        .then((loadedSegmenter) => {
          segmenter.current = loadedSegmenter;
          setSegmentationStatus('Person background replacement ready.');
          return loadedSegmenter;
        })
        .catch((error: unknown) => {
          segmenterPromise.current = null;
          setSegmentationStatus(error instanceof Error ? `Segmentation failed: ${error.message}` : 'Segmentation failed to load.');
          throw error;
        });
    }
    return segmenterPromise.current;
  }

  function getScratchCanvas(ref: React.MutableRefObject<HTMLCanvasElement | null>) {
    if (!ref.current) ref.current = document.createElement('canvas');
    const canvas = ref.current;
    if (canvas.width !== CANVAS_WIDTH || canvas.height !== BOTTOM_HEIGHT) {
      canvas.width = CANVAS_WIDTH;
      canvas.height = BOTTOM_HEIGHT;
    }
    return canvas;
  }

  function drawCameraBackground(context: CanvasRenderingContext2D, cameraVideo: HTMLVideoElement) {
    if (cameraBackgroundMode === 'blur') {
      context.save();
      context.filter = 'blur(28px) brightness(0.72)';
      drawCover(context, cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight, -36, TOP_HEIGHT - 36, CANVAS_WIDTH + 72, BOTTOM_HEIGHT + 72);
      context.restore();
      return;
    }

    if (cameraBackgroundMode === 'image' && cameraBackgroundImage.current) {
      drawCover(context, cameraBackgroundImage.current, cameraBackgroundImage.current.naturalWidth, cameraBackgroundImage.current.naturalHeight, 0, TOP_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);
      context.fillStyle = 'rgba(0, 0, 0, 0.18)';
      context.fillRect(0, TOP_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);
      return;
    }

    context.fillStyle = '#101722';
    context.fillRect(0, TOP_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);
  }

  function drawSegmentedCamera(context: CanvasRenderingContext2D, cameraVideo: HTMLVideoElement) {
    drawCameraBackground(context, cameraVideo);
    const mask = segmentationMask.current;
    if (!mask) {
      drawCover(context, cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight, 0, TOP_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);
      return;
    }

    const person = getScratchCanvas(personCanvas);
    const personContext = person.getContext('2d');
    const maskLayer = getScratchCanvas(maskCanvas);
    const maskContext = maskLayer.getContext('2d');
    if (!personContext || !maskContext) return;

    personContext.clearRect(0, 0, CANVAS_WIDTH, BOTTOM_HEIGHT);
    drawCover(personContext, cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight, 0, 0, CANVAS_WIDTH, BOTTOM_HEIGHT);
    maskContext.putImageData(mask, 0, 0);
    personContext.globalCompositeOperation = 'destination-in';
    personContext.drawImage(maskLayer, 0, 0, CANVAS_WIDTH, BOTTOM_HEIGHT);
    personContext.globalCompositeOperation = 'source-over';
    context.drawImage(person, 0, TOP_HEIGHT);
  }

  function updateSegmentation(cameraVideo: HTMLVideoElement) {
    if (cameraCompositeMode !== 'person-mask') return;
    const now = performance.now();
    if (now - lastSegmentationAt.current < 140) return;
    lastSegmentationAt.current = now;
    void ensureSegmenter()
      .then(async (loadedSegmenter) => {
        const person = getScratchCanvas(personCanvas);
        const personContext = person.getContext('2d');
        if (!personContext) return;
        personContext.clearRect(0, 0, CANVAS_WIDTH, BOTTOM_HEIGHT);
        drawCover(personContext, cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight, 0, 0, CANVAS_WIDTH, BOTTOM_HEIGHT);
        const people = await loadedSegmenter.segmentPeople(person, { flipHorizontal: false });
        const mask = await bodySegmentation.toBinaryMask(
          people,
          { r: 0, g: 0, b: 0, a: 255 },
          { r: 0, g: 0, b: 0, a: 0 },
          false,
          0.5
        );
        const maskLayer = getScratchCanvas(maskCanvas);
        const maskContext = maskLayer.getContext('2d');
        if (!maskContext) return;
        maskContext.clearRect(0, 0, CANVAS_WIDTH, BOTTOM_HEIGHT);
        maskContext.putImageData(mask, 0, 0);
        segmentationMask.current = maskContext.getImageData(0, 0, CANVAS_WIDTH, BOTTOM_HEIGHT);
      })
      .catch(() => {
        segmentationMask.current = null;
      });
  }

  function drawScene() {
    const canvas = canvasRef.current;
    const sourceVideo = sourceVideoRef.current;
    const cameraVideo = cameraVideoRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    context.fillStyle = '#050811';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (sourceVideo && sourceVideo.readyState >= 2) {
      context.fillStyle = '#000000';
      context.fillRect(0, 0, CANVAS_WIDTH, TOP_HEIGHT);
      drawContain(context, sourceVideo, sourceVideo.videoWidth, sourceVideo.videoHeight, 0, 0, CANVAS_WIDTH, TOP_HEIGHT);
    } else {
      context.fillStyle = '#000000';
      context.fillRect(0, 0, CANVAS_WIDTH, TOP_HEIGHT);
    }

    context.fillStyle = '#000000';
    context.fillRect(0, TOP_HEIGHT - 8, CANVAS_WIDTH, 16);

    if (cameraVideo && cameraVideo.readyState >= 2) {
      if (cameraCompositeMode === 'person-mask' && cameraBackgroundMode !== 'fill') {
        updateSegmentation(cameraVideo);
        drawSegmentedCamera(context, cameraVideo);
      } else {
        drawCover(context, cameraVideo, cameraVideo.videoWidth, cameraVideo.videoHeight, 0, TOP_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);
      }
    } else {
      context.fillStyle = '#101722';
      context.fillRect(0, TOP_HEIGHT, CANVAS_WIDTH, BOTTOM_HEIGHT);
      context.fillStyle = '#cbd5e1';
      context.font = '700 42px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.fillText(cameraLabel, CANVAS_WIDTH / 2, TOP_HEIGHT + BOTTOM_HEIGHT / 2);
    }

    drawFrame.current = requestAnimationFrame(drawScene);
  }

  function handleCameraBackgroundUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (cameraBackgroundUrl) URL.revokeObjectURL(cameraBackgroundUrl);
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    const image = new Image();
    image.onload = () => {
      cameraBackgroundImage.current = image;
      setCameraBackgroundMode('image');
      requestAnimationFrame(drawScene);
    };
    image.src = url;
    setCameraBackgroundUrl(url);
    event.target.value = '';
  }

  function clearCameraBackgroundImage() {
    if (cameraBackgroundUrl) URL.revokeObjectURL(cameraBackgroundUrl);
    cameraBackgroundImage.current = null;
    setCameraBackgroundUrl('');
    setCameraBackgroundMode('fill');
    requestAnimationFrame(drawScene);
  }

  async function ensureCameraStream() {
    if (cameraStream.current) return cameraStream.current;
    const videoConstraint: MediaTrackConstraints = selectedVideoDeviceId
      ? { deviceId: { exact: selectedVideoDeviceId }, width: { ideal: 1080 }, height: { ideal: 1080 } }
      : { width: { ideal: 1080 }, height: { ideal: 1080 }, facingMode: 'user' };
    const audioConstraint: MediaTrackConstraints = selectedAudioDeviceId
      ? {
          deviceId: { exact: selectedAudioDeviceId },
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      : {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        };
    const stream = await navigator.mediaDevices.getUserMedia({
      video: videoConstraint,
      audio: audioConstraint
    });
    cameraStream.current = stream;
    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = stream;
      await cameraVideoRef.current.play();
    }
    setCameraLabel('Camera ready');
    setDeviceStatus('Camera and microphone active.');
    void refreshDevices();
    if (cameraCompositeMode === 'person-mask') void ensureSegmenter();
    setRecordingState((current) => (current === 'idle' ? 'ready' : current));
    return stream;
  }

  async function handleVideoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setSourceUrl(url);
    setSourceName(file.name);
    setOutputUrl('');
    setElapsed(0);
    setRecordingState('ready');
    setStatus('Video loaded. Start recording when you are ready to comment.');
    event.target.value = '';
    requestAnimationFrame(drawScene);
  }

  async function startRecording() {
    if (!sourceVideoRef.current || !canvasRef.current || !sourceUrl) {
      setStatus('Upload a source video first.');
      return;
    }

    try {
      setOutputUrl('');
      setStatus('Requesting camera and microphone...');
      const stream = await ensureCameraStream();
      stopPreviewLoop();
      drawScene();

      const canvasStream = canvasRef.current.captureStream(30);
      const context = new AudioContext();
      audioContext.current = context;
      const destination = context.createMediaStreamDestination();
      const micSource = context.createMediaStreamSource(stream);
      const micGain = context.createGain();
      micGain.gain.value = 1;
      micSource.connect(micGain).connect(destination);

      sourceVideoRef.current.muted = true;
      if (includeSourceAudio) {
        try {
          const sourceNode = context.createMediaElementSource(sourceVideoRef.current);
          const sourceGain = context.createGain();
          sourceGain.gain.value = sourceAudioVolume;
          sourceNode.connect(sourceGain).connect(destination);
        } catch {
          setStatus('Recording mic and camera. Source audio could not be attached in this browser.');
        }
      }

      const mixedStream = new MediaStream([
        ...canvasStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);
      const mimeType = supportedMimeType();
      const mediaRecorder = new MediaRecorder(mixedStream, mimeType ? { mimeType } : undefined);
      recorder.current = mediaRecorder;
      chunks.current = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType || 'video/webm' });
        const url = URL.createObjectURL(blob);
        objectUrls.current.push(url);
        setOutputUrl(url);
        setRecordingState('done');
        setStatus('Reaction reel ready. Download it and upload to Instagram Reels.');
        canvasStream.getTracks().forEach((track) => track.stop());
        mixedStream.getTracks().forEach((track) => track.stop());
        void context.close();
      };

      await sourceVideoRef.current.play();
      mediaRecorder.start(1000);
      startedAt.current = Date.now();
      timer.current = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 250);
      setRecordingState('recording');
      setStatus('Recording reaction. Stop when your commentary is done.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start recording.';
      setStatus(message);
      setRecordingState(sourceUrl ? 'ready' : 'idle');
    }
  }

  function stopRecording() {
    sourceVideoRef.current?.pause();
    recorder.current?.stop();
    recorder.current = null;
    stopPreviewLoop();
    drawScene();
  }

  async function copyCaption() {
    await navigator.clipboard.writeText(buildReactionCaption(selectedEntry));
    setStatus('Caption copied.');
  }

  const canRecord = Boolean(sourceUrl) && recordingState !== 'recording';
  const outputFileName = selectedEntry ? `tradewithnine-reaction-day-${selectedEntry.day}.webm` : 'tradewithnine-reaction-reel.webm';

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <SectionCard title="Reel 2: Reaction Recorder" subtitle="Record a vertical reel with the trading video on top and your camera reaction below.">
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              Trading day
              <select className="field" value={selectedEntry?.id || ''} onChange={(event) => setSelectedId(event.target.value)}>
                {sortedEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>
                    Day {entry.day} | {entry.result} | {formatCurrency(entry.pnl)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              Source video
              <input className="field" type="file" accept="video/*" onChange={handleVideoUpload} />
            </label>
            <button className="btn-muted" type="button" onClick={() => void ensureCameraStream()}>
              Test camera
            </button>
          </div>

          <div className="grid gap-3 rounded-lg border border-grid bg-panelSoft p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              Video source
              <select
                className="field"
                value={selectedVideoDeviceId}
                onChange={(event) => handleVideoSourceChange(event.target.value)}
                disabled={recordingState === 'recording'}
              >
                {videoDevices.length ? (
                  videoDevices.map((device, index) => (
                    <option key={device.deviceId || `camera-${index}`} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default camera</option>
                )}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-slate-300">
              Audio source
              <select
                className="field"
                value={selectedAudioDeviceId}
                onChange={(event) => handleAudioSourceChange(event.target.value)}
                disabled={recordingState === 'recording'}
              >
                {audioDevices.length ? (
                  audioDevices.map((device, index) => (
                    <option key={device.deviceId || `mic-${index}`} value={device.deviceId}>
                      {device.label || `Microphone ${index + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Default microphone</option>
                )}
              </select>
            </label>
            <button className="btn-muted" type="button" onClick={() => void refreshDevices()} disabled={recordingState === 'recording'}>
              Refresh sources
            </button>
            <p className="text-sm leading-6 text-muted md:col-span-3">{deviceStatus}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(280px,430px)_1fr]">
            <div className="mx-auto w-full max-w-[430px]">
              <canvas
                ref={canvasRef}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                className="aspect-[9/16] w-full rounded-lg border border-grid bg-black shadow-soft"
              />
            </div>

            <div className="grid content-start gap-4">
              <div className="rounded-lg border border-grid bg-panelSoft p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">Recording status</p>
                    <p className="mt-1 text-xl font-black text-white">{recordingState === 'recording' ? 'Recording' : recordingState === 'done' ? 'Ready' : 'Standby'}</p>
                  </div>
                  <p className="rounded-md border border-grid bg-black/30 px-3 py-2 text-lg font-black tabular-nums text-profit">
                    {Math.floor(elapsed / 60)}:{String(Math.floor(elapsed % 60)).padStart(2, '0')}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">{status}</p>
                {sourceName ? <p className="mt-2 truncate text-sm font-medium text-slate-300">Loaded: {sourceName}</p> : null}
              </div>

              <div className="rounded-lg border border-grid bg-panelSoft p-4">
                <label className="flex items-center gap-3 text-sm font-bold text-slate-200">
                  <input
                    type="checkbox"
                    checked={includeSourceAudio}
                    onChange={(event) => setIncludeSourceAudio(event.target.checked)}
                  />
                  Include source video audio quietly
                </label>
                <label className="mt-3 grid gap-2 text-sm font-bold text-slate-300">
                  Source audio volume
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={sourceAudioVolume}
                    onChange={(event) => setSourceAudioVolume(Number(event.target.value))}
                    disabled={!includeSourceAudio}
                  />
                </label>
              </div>

              <div className="rounded-lg border border-grid bg-panelSoft p-4">
                <label className="grid gap-2 text-sm font-bold text-slate-300">
                  Camera background
                  <select
                    className="field"
                    value={cameraBackgroundMode}
                    onChange={(event) => {
                      setCameraBackgroundMode(event.target.value as CameraBackgroundMode);
                      segmentationMask.current = null;
                    }}
                  >
                    <option value="fill">Original camera</option>
                    <option value="blur">Blurred camera background</option>
                    <option value="image">Replace with uploaded image</option>
                  </select>
                </label>
                <label className="mt-3 grid gap-2 text-sm font-bold text-slate-300">
                  Background behavior
                  <select
                    className="field"
                    value={cameraCompositeMode}
                    onChange={(event) => {
                      setCameraCompositeMode(event.target.value as CameraCompositeMode);
                      segmentationMask.current = null;
                      if (event.target.value === 'person-mask') void ensureSegmenter();
                    }}
                  >
                    <option value="person-mask">Replace behind person</option>
                    <option value="full-frame">Apply to full camera frame</option>
                  </select>
                </label>
                <label className="mt-3 grid gap-2 text-sm font-bold text-slate-300">
                  Background image
                  <input className="field" type="file" accept="image/*" onChange={handleCameraBackgroundUpload} />
                </label>
                <p className="mt-3 text-sm leading-6 text-muted">{segmentationStatus}</p>
                {cameraBackgroundUrl ? (
                  <button className="btn-small mt-3" type="button" onClick={clearCameraBackgroundImage}>
                    Remove background image
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <button className="btn-primary" type="button" onClick={() => void startRecording()} disabled={!canRecord}>
                  Start recording
                </button>
                <button className="btn-small-danger" type="button" onClick={stopRecording} disabled={recordingState !== 'recording'}>
                  Stop
                </button>
                <button className="btn-muted" type="button" onClick={copyCaption} disabled={!selectedEntry}>
                  Copy caption
                </button>
              </div>

              {outputUrl ? (
                <div className="rounded-lg border border-profit/30 bg-profit/10 p-4">
                  <p className="text-sm font-bold text-profit">Rendered in browser</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <a className="btn-primary" href={outputUrl} download={outputFileName}>
                      Download reel
                    </a>
                    <a className="btn-muted" href={outputUrl} target="_blank" rel="noreferrer">
                      Open preview
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden">
            {sourceUrl ? <video ref={sourceVideoRef} src={sourceUrl} playsInline controls /> : null}
            <video ref={cameraVideoRef} playsInline muted />
          </div>
        </div>
      </SectionCard>

      <aside className="grid content-start gap-4">
        <SectionCard title="Layout">
          <div className="grid gap-4 text-sm text-muted">
            <div className="rounded-lg border border-grid bg-panelSoft p-4">
              <BrandMark />
              <p className="mt-4 leading-6">
                Output is built as a 9:16 reel. The uploaded trading video fills the top frame and your camera reaction fills the lower frame.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-grid bg-panelSoft p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Video</p>
                <p className="mt-1 text-lg font-black text-white">Top</p>
              </div>
              <div className="rounded-lg border border-grid bg-panelSoft p-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-muted">Reaction</p>
                <p className="mt-1 text-lg font-black text-white">Bottom</p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Caption">
          <textarea className="field min-h-56 text-sm" readOnly value={buildReactionCaption(selectedEntry)} />
        </SectionCard>
      </aside>
    </div>
  );
}
