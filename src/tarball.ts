/**
 * Creates the header for a file in a tar archive
 * @param name - name of the file
 * @param contents - contents of the file
 * @returns the 512-byte header
 */
function createHeader(name: string, contents: Blob): Blob {
	// based on https://manpages.ubuntu.com/manpages//xenial/man5/tar.5.html and inspection of files
	// created by GNU tar
	const buf = new ArrayBuffer(512), view = new Uint8Array(buf);
	// name
	writeString(view, name, 0x000);
	// permissions
	writeString(view, '0000644', 0x064);
	// uid
	writeString(view, '0000000', 0x06C);
	// gid
	writeString(view, '0000000', 0x074);
	// size
	writeString(view, tarNumber(contents.size, 12), 0x07C);
	// mtime
	writeString(view, tarNumber(Math.floor(Date.now() / 1000), 12), 0x088);
	// for checksum, we compute the checksum using all spaces for the checksum field,
	// then replace this field with the actual checksum
	writeString(view, ' '.repeat(8), 0x094);
	// typeflag
	writeString(view, '0', 0x09C);
	// leave linkname set to nulls
	// magic (using the early draft POSIX format)
	writeString(view, 'ustar ', 0x101);
	// version
	view[0x107] = 0x20;
	view[0x108] = 0x00;
	// uname
	writeString(view, 'root', 0x109);
	// gname
	writeString(view, 'root', 0x129);
	
	// leave devmajor, devminor, prefix, pad unaltered

	// calculate checksum
	let sum = 0;
	for (let i = 0; i < 512; i++) {
		sum += view[i];
	}
	// store it
	writeString(view, tarNumber(sum, 6), 0x094);
	view[0x09A] = 0x00;
	view[0x09B] = 0x20;

	return new Blob([buf]);
}

/**
 * Creates a Blob representing everything that will be stored for a file in a tar archive (the
 * header and padded contents)
 * @param name - name of the file
 * @param contents - contents of the file
 * @returns the header, contents, and padding up to the next 512-byte record
 */
function createEntry(name: string, contents: Blob): Blob {
	const paddedLength = Math.ceil(contents.size / 512) * 512;

	return new Blob([
		createHeader(name, contents),
		contents,
		new ArrayBuffer(paddedLength - contents.size)
	]);
}

/**
 * Encodes a number in ASCII octal with leading zeros, for use in tar headers
 * @param n - number to encode
 * @param length - length of the resulting string, including null terminator
 * @returns encoded string, not including null terminator
 */
function tarNumber(n: number, length: number): string {
	const octal = n.toString(8);
	if (octal.length > length - 1) {
		throw new Error('Tried to encode too large a number');
	}
	return '0'.repeat(length - octal.length - 1) + octal;
}

/**
 * Yields the bytes of an ASCII-only string
 * @param s - string to get bytes from
 * @yields tuple containing the index and byte
 */
function* bytesOfString(s: string): Iterable<[number, number]> {
	// adapted from https://stackoverflow.com/a/1242596
	for (let i = 0; i < s.length; i++) {
		let c = s.charCodeAt(i);
		if (c > 255) {
			throw new Error('Non-ASCII character in filename');
		} else {
			yield [i, c];
		}
	}
}

/**
 * Writes a string into a typed array at a given offset
 * @param arr - array to write to
 * @param s - string to write
 * @param offset - offset of the first byte of the string
*/
function writeString(arr: Uint8Array, s: string, offset: number): void {
	for (const [i, c] of bytesOfString(s)) {
		arr[offset + i] = c;
	}
}

export default class Tarball {
	private files: Blob[] = [];

	addFile(name: string, contents: Blob) {
		this.files.push(createEntry(name, contents));
	}

	generate(): Blob {
		if (this.files.length == 0) {
			throw new Error('Cannot create empty tar archive.');
		}

		return new Blob([
			...this.files,
			// end with 2 empty records
			new ArrayBuffer(1024),
		], { type: 'application/x-tar' });
	}
}
