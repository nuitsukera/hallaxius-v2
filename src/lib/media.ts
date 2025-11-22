interface MediaDimensions {
	width: number;
	height: number;
}

export async function getImageDimensions(
	buffer: Buffer,
	mimeType: string,
): Promise<MediaDimensions | null> {
	try {
		if (mimeType === "image/png" || mimeType === "image/apng") {
			if (buffer.length < 24) return null;
			const width = buffer.readUInt32BE(16);
			const height = buffer.readUInt32BE(20);
			return { width, height };
		}

		if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
			let offset = 2;

			while (offset < buffer.length) {
				if (buffer[offset] !== 0xff) break;

				const marker = buffer[offset + 1];
				offset += 2;

				if (
					marker >= 0xc0 &&
					marker <= 0xcf &&
					marker !== 0xc4 &&
					marker !== 0xc8 &&
					marker !== 0xcc
				) {
					if (offset + 7 > buffer.length) break;
					const height = buffer.readUInt16BE(offset + 3);
					const width = buffer.readUInt16BE(offset + 5);
					return { width, height };
				}

				if (offset + 2 > buffer.length) break;
				const segmentLength = buffer.readUInt16BE(offset);
				offset += segmentLength;
			}
			return null;
		}

		if (mimeType === "image/gif") {
			if (buffer.length < 10) return null;
			const width = buffer.readUInt16LE(6);
			const height = buffer.readUInt16LE(8);
			return { width, height };
		}

		if (mimeType === "image/webp") {
			if (buffer.length < 30) return null;

			if (
				buffer.toString("ascii", 0, 4) !== "RIFF" ||
				buffer.toString("ascii", 8, 12) !== "WEBP"
			) {
				return null;
			}

			const chunkHeader = buffer.toString("ascii", 12, 16);

			if (chunkHeader === "VP8 ") {
				if (buffer.length < 30) return null;
				const width = buffer.readUInt16LE(26) & 0x3fff;
				const height = buffer.readUInt16LE(28) & 0x3fff;
				return { width, height };
			}

			if (chunkHeader === "VP8L") {
				if (buffer.length < 25) return null;
				const bits = buffer.readUInt32LE(21);
				const width = (bits & 0x3fff) + 1;
				const height = ((bits >> 14) & 0x3fff) + 1;
				return { width, height };
			}

			if (chunkHeader === "VP8X") {
				if (buffer.length < 30) return null;
				const width = (buffer.readUIntLE(24, 3) + 1) & 0xffffff;
				const height = (buffer.readUIntLE(27, 3) + 1) & 0xffffff;
				return { width, height };
			}

			return null;
		}

		if (mimeType === "image/bmp") {
			if (buffer.length < 26) return null;
			const width = buffer.readInt32LE(18);
			const height = Math.abs(buffer.readInt32LE(22));
			return { width, height };
		}

		if (mimeType === "image/tiff") {
			return parseTiffDimensions(buffer);
		}

		if (
			mimeType === "image/ico" ||
			mimeType === "image/x-icon" ||
			mimeType === "image/vnd.microsoft.icon"
		) {
			return parseIcoDimensions(buffer);
		}

		if (mimeType === "image/avif") {
			return parseAvifDimensions(buffer);
		}

		if (mimeType === "image/heic" || mimeType === "image/heif") {
			return parseHeifDimensions(buffer);
		}

		if (
			mimeType === "image/x-portable-bitmap" ||
			mimeType === "image/x-portable-graymap" ||
			mimeType === "image/x-portable-pixmap"
		) {
			return parsePnmDimensions(buffer, mimeType);
		}

		if (
			mimeType === "image/x-xbitmap" ||
			mimeType === "image/x-xpixmap" ||
			mimeType === "image/x-cmu-raster"
		) {
			return parseXbmDimensions(buffer, mimeType);
		}

		if (mimeType === "image/svg+xml") {
			return parseSvgDimensions(buffer);
		}

		return null;
	} catch (error) {
		console.error("Error extracting image dimensions:", error);
		return null;
	}
}

function parseTiffDimensions(buffer: Buffer): MediaDimensions | null {
	try {
		if (buffer.length < 8) return null;

		const isLittleEndian = buffer.toString("ascii", 0, 2) === "II";
		const ifdOffset = isLittleEndian
			? buffer.readUInt32LE(4)
			: buffer.readUInt32BE(4);

		if (ifdOffset + 6 > buffer.length) return null;

		const entryCount = isLittleEndian
			? buffer.readUInt16LE(ifdOffset)
			: buffer.readUInt16BE(ifdOffset);

		let width: number | null = null;
		let height: number | null = null;

		for (let i = 0; i < entryCount; i++) {
			const entryOffset = ifdOffset + 2 + i * 12;
			if (entryOffset + 12 > buffer.length) break;

			const tag = isLittleEndian
				? buffer.readUInt16LE(entryOffset)
				: buffer.readUInt16BE(entryOffset);

			if (tag === 256) {
				width = isLittleEndian
					? buffer.readUInt32LE(entryOffset + 8)
					: buffer.readUInt32BE(entryOffset + 8);
			} else if (tag === 257) {
				height = isLittleEndian
					? buffer.readUInt32LE(entryOffset + 8)
					: buffer.readUInt32BE(entryOffset + 8);
			}

			if (width !== null && height !== null) break;
		}

		if (width !== null && height !== null && width > 0 && height > 0) {
			return { width, height };
		}

		return null;
	} catch (error) {
		console.error("Error parsing TIFF dimensions:", error);
		return null;
	}
}

function parseIcoDimensions(buffer: Buffer): MediaDimensions | null {
	try {
		if (buffer.length < 6) return null;

		const count = buffer.readUInt16LE(4);
		if (count === 0) return null;

		const width = buffer[6] === 0 ? 256 : buffer[6];
		const height = buffer[7] === 0 ? 256 : buffer[7];

		if (width > 0 && height > 0) {
			return { width, height };
		}

		return null;
	} catch (error) {
		console.error("Error parsing ICO dimensions:", error);
		return null;
	}
}

function parseAvifDimensions(buffer: Buffer): MediaDimensions | null {
	try {
		if (buffer.length < 12) return null;

		let offset = 0;
		while (offset < buffer.length - 8) {
			const boxSize = buffer.readUInt32BE(offset);
			const boxType = buffer.toString("ascii", offset + 4, offset + 8);

			if (boxSize === 0 || boxSize > buffer.length - offset) break;

			if (boxType === "ftyp") {
				offset += boxSize;
				continue;
			}

			if (boxType === "meta") {
				const metaOffset = offset + 8;
				return parseHeicMetaBox(buffer, metaOffset, boxSize - 8);
			}

			offset += boxSize;
		}

		return null;
	} catch (error) {
		console.error("Error parsing AVIF dimensions:", error);
		return null;
	}
}

function parseHeifDimensions(buffer: Buffer): MediaDimensions | null {
	try {
		if (buffer.length < 12) return null;

		let offset = 0;
		while (offset < buffer.length - 8) {
			const boxSize = buffer.readUInt32BE(offset);
			const boxType = buffer.toString("ascii", offset + 4, offset + 8);

			if (boxSize === 0 || boxSize > buffer.length - offset) break;

			if (boxType === "ftyp") {
				offset += boxSize;
				continue;
			}

			if (boxType === "meta") {
				const metaOffset = offset + 8;
				return parseHeicMetaBox(buffer, metaOffset, boxSize - 8);
			}

			offset += boxSize;
		}

		return null;
	} catch (error) {
		console.error("Error parsing HEIF dimensions:", error);
		return null;
	}
}

function parseHeicMetaBox(
	buffer: Buffer,
	offset: number,
	size: number,
): MediaDimensions | null {
	try {
		let metaOffset = offset;
		const endOffset = offset + size;

		while (metaOffset < endOffset - 8) {
			const boxSize = buffer.readUInt32BE(metaOffset);
			const boxType = buffer.toString("ascii", metaOffset + 4, metaOffset + 8);

			if (boxSize === 0 || boxSize > endOffset - metaOffset) break;

			if (boxType === "iprp" || boxType === "ipco") {
				const result = parseHeicMetaBox(buffer, metaOffset + 8, boxSize - 8);
				if (result) return result;
			}

			if (boxType === "ispe") {
				if (metaOffset + 16 <= endOffset) {
					const width = buffer.readUInt32BE(metaOffset + 8);
					const height = buffer.readUInt32BE(metaOffset + 12);
					return { width, height };
				}
			}

			metaOffset += boxSize;
		}

		return null;
	} catch (error) {
		console.error("Error parsing HEIC meta box:", error);
		return null;
	}
}

function parsePnmDimensions(
	buffer: Buffer,
	mimeType: string,
): MediaDimensions | null {
	try {
		const header = buffer.toString("ascii", 0, Math.min(100, buffer.length));
		const lines = header
			.split("\n")
			.filter((line) => line.trim() && !line.startsWith("#"));

		if (lines.length < 2) return null;

		const magicNumber = lines[0].trim();
		const dimensions = lines[1].trim().split(/\s+/);

		if (dimensions.length < 2) return null;

		const width = parseInt(dimensions[0]);
		const height = parseInt(dimensions[1]);

		if (isNaN(width) || isNaN(height) || width <= 0 || height <= 0) {
			return null;
		}

		return { width, height };
	} catch (error) {
		console.error("Error parsing PNM dimensions:", error);
		return null;
	}
}

function parseXbmDimensions(
	buffer: Buffer,
	mimeType: string,
): MediaDimensions | null {
	try {
		const content = buffer.toString("ascii", 0, Math.min(1000, buffer.length));

		const widthMatch =
			content.match(/#define\s+\S*width\S*\s+(\d+)/i) ||
			content.match(/\S*width\S*\s*=\s*(\d+)/i);
		const heightMatch =
			content.match(/#define\s+\S*height\S*\s+(\d+)/i) ||
			content.match(/\S*height\S*\s*=\s*(\d+)/i);

		if (widthMatch && heightMatch) {
			const width = parseInt(widthMatch[1]);
			const height = parseInt(heightMatch[1]);

			if (width > 0 && height > 0) {
				return { width, height };
			}
		}

		return null;
	} catch (error) {
		console.error("Error parsing XBM dimensions:", error);
		return null;
	}
}

function parseSvgDimensions(buffer: Buffer): MediaDimensions | null {
	try {
		const content = buffer.toString("utf8", 0, Math.min(2000, buffer.length));

		const widthMatch = content.match(/width\s*=\s*["']?([^"'\s>]+)/i);
		const heightMatch = content.match(/height\s*=\s*["']?([^"'\s>]+)/i);

		const viewBoxMatch = content.match(/viewBox\s*=\s*["']?\s*([\d.\s-]+)/i);

		let width: number | null = null;
		let height: number | null = null;

		if (widthMatch && heightMatch) {
			const widthStr = widthMatch[1];
			const heightStr = heightMatch[1];

			width = parseFloat(widthStr.replace(/[^\d.-]/g, ""));
			height = parseFloat(heightStr.replace(/[^\d.-]/g, ""));

			if (width > 0 && height > 0) {
				return { width: Math.round(width), height: Math.round(height) };
			}
		}

		if (viewBoxMatch) {
			const viewBoxParts = viewBoxMatch[1].trim().split(/\s+/);
			if (viewBoxParts.length >= 4) {
				width = parseFloat(viewBoxParts[2]);
				height = parseFloat(viewBoxParts[3]);

				if (width > 0 && height > 0) {
					return { width: Math.round(width), height: Math.round(height) };
				}
			}
		}

		return null;
	} catch (error) {
		console.error("Error parsing SVG dimensions:", error);
		return null;
	}
}

export async function getMediaDimensions(
	buffer: Buffer,
	mimeType: string,
): Promise<MediaDimensions | null> {
	if (mimeType.startsWith("image/")) {
		return getImageDimensions(buffer, mimeType);
	}

	return null;
}

export function isMediaType(mimeType: string): boolean {
	const imageTypes = [
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/gif",
		"image/webp",
		"image/svg+xml",
		"image/bmp",
		"image/tiff",
		"image/ico",
		"image/x-icon",
		"image/vnd.microsoft.icon",
		"image/apng",
		"image/avif",
		"image/heic",
		"image/heif",
		"image/x-portable-bitmap",
		"image/x-portable-graymap",
		"image/x-portable-pixmap",
		"image/x-xbitmap",
		"image/x-xpixmap",
		"image/x-cmu-raster",
	];

	return imageTypes.includes(mimeType) || mimeType.startsWith("image/");
}
