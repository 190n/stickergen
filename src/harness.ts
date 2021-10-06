import Tarball from './tarball';

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
	returnBlobs: true,
): AsyncGenerator<Blob, void, void>;

export function render(
	a: Animator,
	ctx: CanvasRenderingContext2D,
	returnBlobs: false,
): AsyncGenerator<undefined, void, void>;

export async function* render(
	a: Animator,
	ctx: CanvasRenderingContext2D,
	returnBlobs: boolean,
): AsyncGenerator<Blob | undefined, void, void> {
	ctx.canvas.width = a.width;
	ctx.canvas.height = a.height;
	await a.load?.();

	for (let t = 0; t < a.duration; t += 1/a.fps) {
		ctx.save();
		ctx.clearRect(0, 0, a.width, a.height);
		a.render(t, ctx);
		ctx.restore();
		if (returnBlobs) {
			const blob = await new Promise<Blob>((resolve, reject) => {
				canvas.toBlob(blob => {
					if (blob === null) {
						reject('Failed to create blob from canvas.');
					} else {
						resolve(blob);
					}
				}, 'image/png');
			});
			yield blob;
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

export async function renderToZip(a: Animator, ctx: CanvasRenderingContext2D): Promise<string> {
	const frames = Math.floor(a.fps * a.duration),
		digits = frames.toString().length,
		tarball = new Tarball();
	let frame = 0;
	for await (const blob of render(a, ctx, true)) {
		const name = '0'.repeat(digits - frame.toString().length)
			+ frame.toString()
			+ '.png';
		tarball.addFile(name, blob);
		frame++;
	}

	const blob = tarball.generate(),
		url = URL.createObjectURL(blob);
	return url;
}

import backflip from './backflip';
import raf from './raf.webp';

(async () => {
	const url = await renderToZip(backflip(raf), ctx),
		link = document.getElementById('download') as HTMLAnchorElement;
	link.href = url;
	link.style.display = 'inline';
})();
