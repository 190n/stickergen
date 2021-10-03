export default class Tarball {
	private files: Map<string, Blob> = new Map();

	addFile(name: string, contents: Blob) {
		this.files.set(name, contents);
	}

	private createHeader(name: string): Blob {
		
	}

	generate(): Blob {
		if (this.files.size == 0) {
			throw new Error('Cannot create empty tar archive.');
		}

		
	}
}
