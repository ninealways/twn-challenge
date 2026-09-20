import { NextResponse } from 'next/server';
import { createUploadReelJob } from '@/lib/reelJobs';

export const runtime = 'nodejs';

function text(form: FormData, key: string, fallback = '') {
  return String(form.get(key) || fallback).trim();
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const targetSeconds = Number(text(form, 'targetSeconds', '60'));
    if (!Number.isFinite(targetSeconds) || targetSeconds < 1 || targetSeconds > 900) {
      throw new Error('Reel length must be between 1 and 900 seconds');
    }

    const cropMode = text(form, 'cropMode', 'crop');
    if (!['crop', 'blur', 'color'].includes(cropMode)) throw new Error('Invalid frame mode');
    const transition = text(form, 'transition', 'fade');
    if (!['cut', 'fade', 'slideleft', 'wipeleft'].includes(transition)) throw new Error('Invalid clip transition');
    const transitionDuration = Number(text(form, 'transitionDuration', '0.4'));
    if (!Number.isFinite(transitionDuration) || transitionDuration < 0.1 || transitionDuration > 1.5) throw new Error('Transition duration must be between 0.1 and 1.5 seconds');
    const startScreenDuration = Number(text(form, 'startScreenDuration', '1'));
    const endScreenDuration = Number(text(form, 'endScreenDuration', '5'));
    if (!Number.isFinite(startScreenDuration) || startScreenDuration < 0 || startScreenDuration > 15) throw new Error('Start screen duration must be between 0 and 15 seconds');
    if (!Number.isFinite(endScreenDuration) || endScreenDuration < 0 || endScreenDuration > 15) throw new Error('End screen duration must be between 0 and 15 seconds');

    const clips = JSON.parse(text(form, 'clips', '[]')) as Array<{
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
    }>;
    clips.forEach((clip) => {
      if (clip.kind === 'slide' && !['top', 'center', 'bottom'].includes(clip.textPosition || 'center')) {
        throw new Error('Slide text position must be top, center, or bottom');
      }
      const file = form.get(`media-${clip.id}`);
      if (file instanceof File && file.size) clip.file = file;
      const backgroundFile = form.get(`slide-background-${clip.id}`);
      if (backgroundFile instanceof File && backgroundFile.size) clip.backgroundFile = backgroundFile;
    });
    if (!clips.length) throw new Error('Add at least one video, image, or slide');
    const textOverlays = JSON.parse(text(form, 'textOverlays', '[]')) as Array<{
      text?: string;
      start?: number;
      end?: number;
      position?: 'top' | 'center' | 'bottom';
      animation?: 'fade' | 'slide-up' | 'slide-left';
      color?: string;
    }>;
    const audioLayers = JSON.parse(text(form, 'audioLayers', '[]')) as Array<{
      id: string;
      source: string;
      start?: number;
      end?: number;
      volume?: number;
      kind?: 'music' | 'voiceover';
      file?: File;
    }>;
    audioLayers.forEach((layer) => {
      const file = form.get(`audio-${layer.id}`);
      if (file instanceof File && file.size) layer.file = file;
    });

    const jobId = await createUploadReelJob({
      day: text(form, 'day'),
      result: text(form, 'result'),
      pnl: text(form, 'pnl'),
      currentCapital: text(form, 'currentCapital'),
      disciplineScore: text(form, 'disciplineScore'),
      tradesTaken: text(form, 'tradesTaken'),
      date: text(form, 'date'),
      notes: text(form, 'notes'),
      startTitle: text(form, 'startTitle'),
      startSubtitle: text(form, 'startSubtitle'),
      endTitle: text(form, 'endTitle'),
      endSubtitle: text(form, 'endSubtitle'),
      startScreenDuration,
      endScreenDuration,
      targetSeconds,
      cropMode: cropMode as 'crop' | 'blur' | 'color',
      transition: transition as 'cut' | 'fade' | 'slideleft' | 'wipeleft',
      transitionDuration,
      backgroundColor: text(form, 'backgroundColor', '#070a0f'),
      clips,
      textOverlays,
      audioLayers
    });

    return NextResponse.json({ jobId }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not start reel job';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
