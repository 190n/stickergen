import AdmZip from 'adm-zip';
import { Buffer } from 'buffer';

export interface Animator {
	width: number;
	height: number;
	fps: number;
	duration: number;
	load?: () => Promise<void>;
	render: (t: number, ctx: CanvasRenderingContext2D) => void;
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement,
	ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

function delay(ms: number): Promise<void> {
	return new Promise(resolve => {
		setTimeout(() => resolve(), ms);
	});
}

// overloads
export function render(
	a: Animator,
	ctx: CanvasRenderingContext2D,
	returnDataURLs: true,
): AsyncGenerator<string, void, void>;

export function render(
	a: Animator,
	ctx: CanvasRenderingContext2D,
	returnDataURLs: false,
): AsyncGenerator<undefined, void, void>;

export async function* render(
	a: Animator,
	ctx: CanvasRenderingContext2D,
	returnDataURLs: boolean,
): AsyncGenerator<string | undefined, void, void> {
	ctx.canvas.width = a.width;
	ctx.canvas.height = a.height;
	await a.load?.();

	for (let t = 0; t < a.duration; t += 1/a.fps) {
		ctx.save();
		ctx.clearRect(0, 0, a.width, a.height);
		a.render(t, ctx);
		ctx.restore();
		if (returnDataURLs) {
			yield ctx.canvas.toDataURL('image/png');
		} else {
			yield undefined;
		}
	}
}

export async function play(a: Animator, ctx: CanvasRenderingContext2D) {
	let lastFrame = Date.now();
	for await (const _ of render(a, ctx, false)) {
		const now = Date.now(), elapsed = now - lastFrame;
		lastFrame = now;
		if (elapsed < 1000 / a.fps) {
			await delay(1000 / a.fps - elapsed);
		}
	}
}

export async function renderToZip(a: Animator, ctx: CanvasRenderingContext2D) {
	const zip = new AdmZip(),
		frames = Math.floor(a.fps * a.duration),
		digits = Math.ceil(Math.log10(frames));
	let frame = 0;
	for await (const dataURL of render(a, ctx, true)) {
		const name = '0'.repeat(digits - frame.toString().length)
			+ frame.toString()
			+ '.png';
		zip.addFile(name, Buffer.from(dataURL, 'base64'));
		frame++;
	}
}

import backflip from './backflip';
import raf from './raf.webp';

play(backflip(raf), ctx);
