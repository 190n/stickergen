import type { Animator } from './harness';

export default function backflip(imageURL: string): Animator {
	let img: HTMLImageElement;

	return {
		width: 320,
		height: 320,
		fps: 60,
		duration: 2,
		async load() {
			return new Promise((resolve, reject) => {
				img = new Image();
				img.onload = () => resolve();
				img.onerror = e => reject(e);
				img.src = imageURL;
			});
		},
		render(t, ctx) {
			const jumpHeight = 135,
				y = (jumpHeight * 4 * t**2) - (jumpHeight * 4 * t) + 240,
				clampedY = Math.min(240, y),
				rot = t < 1 ? t * 2 * Math.PI : 0;
			ctx.translate(160, y);
			ctx.rotate(rot);
			ctx.translate(-160, -y);
			ctx.drawImage(img, 80, clampedY - 80, 160, 160);
		},
	};
}
