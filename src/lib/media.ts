interface MediaDimensions {
	width: number;
	height: number;
}

export async function getImageDimensions(
	buffer: Buffer,
	mimeType: string,
): Promise<MediaDimensions | null> {
	try {
		if (mimeType === "image/png") {
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

		return null;
	} catch (error) {
		console.error("Error extracting image dimensions:", error);
		return null;
	}
}

export async function getVideoDimensions(
	buffer: Buffer,
	mimeType: string,
): Promise<MediaDimensions | null> {
	try {
		if (
			mimeType === "video/mp4" ||
			mimeType === "video/quicktime" ||
			mimeType === "video/x-m4v"
		) {
			return parseMp4Dimensions(buffer);
		}

		if (mimeType === "video/webm") {
			return parseWebmDimensions(buffer);
		}

		if (mimeType === "video/x-msvideo" || mimeType === "video/avi") {
			return parseAviDimensions(buffer);
		}

		return null;
	} catch (error) {
		console.error("Error extracting video dimensions:", error);
		return null;
	}
}

function parseMp4Dimensions(buffer: Buffer): MediaDimensions | null {
	try {
		let offset = 0;

		while (offset < buffer.length - 8) {
			const boxSize = buffer.readUInt32BE(offset);
			const boxType = buffer.toString("ascii", offset + 4, offset + 8);

			if (boxSize === 0 || boxSize > buffer.length - offset) break;

			if (boxType === "tkhd") {
				const version = buffer[offset + 8];
				let dimensionOffset: number;

				if (version === 1) {
					dimensionOffset = offset + 88;
				} else {
					dimensionOffset = offset + 76;
				}

				if (dimensionOffset + 8 <= buffer.length) {
					const width = buffer.readUInt32BE(dimensionOffset) >> 16;
					const height = buffer.readUInt32BE(dimensionOffset + 4) >> 16;

					if (width > 0 && height > 0) {
						return { width, height };
					}
				}
			}

			if (
				boxType === "moov" ||
				boxType === "trak" ||
				boxType === "mdia" ||
				boxType === "minf" ||
				boxType === "stbl"
			) {
				const innerResult = parseMp4Dimensions(
					buffer.subarray(offset + 8, offset + boxSize),
				);
				if (innerResult) return innerResult;
			}

			offset += boxSize;
		}

		return null;
	} catch (error) {
		console.error("Error parsing MP4 dimensions:", error);
		return null;
	}
}

function parseWebmDimensions(buffer: Buffer): MediaDimensions | null {
	try {
		let offset = 0;
		let width: number | null = null;
		let height: number | null = null;

		while (offset < buffer.length - 4 && (width === null || height === null)) {
			const elementId = buffer[offset];

			if (elementId === 0xb0) {
				const size = buffer[offset + 1];
				if (size <= 8 && offset + 2 + size <= buffer.length) {
					width = 0;
					for (let i = 0; i < size; i++) {
						width = (width << 8) | buffer[offset + 2 + i];
					}
				}
			}

			if (elementId === 0xba) {
				const size = buffer[offset + 1];
				if (size <= 8 && offset + 2 + size <= buffer.length) {
					height = 0;
					for (let i = 0; i < size; i++) {
						height = (height << 8) | buffer[offset + 2 + i];
					}
				}
			}

			offset++;
		}

		if (width !== null && height !== null && width > 0 && height > 0) {
			return { width, height };
		}

		return null;
	} catch (error) {
		console.error("Error parsing WebM dimensions:", error);
		return null;
	}
}

function parseAviDimensions(buffer: Buffer): MediaDimensions | null {
	try {
		if (buffer.length < 64) return null;

		if (
			buffer.toString("ascii", 0, 4) !== "RIFF" ||
			buffer.toString("ascii", 8, 12) !== "AVI "
		) {
			return null;
		}

		let offset = 12;
		while (offset < buffer.length - 8) {
			const chunkId = buffer.toString("ascii", offset, offset + 4);
			const chunkSize = buffer.readUInt32LE(offset + 4);

			if (chunkId === "avih") {
				if (offset + 40 <= buffer.length) {
					const width = buffer.readUInt32LE(offset + 32);
					const height = buffer.readUInt32LE(offset + 36);

					if (width > 0 && height > 0) {
						return { width, height };
					}
				}
				break;
			}

			offset += 8 + chunkSize + (chunkSize % 2);
			if (chunkSize === 0) break;
		}

		return null;
	} catch (error) {
		console.error("Error parsing AVI dimensions:", error);
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

	if (mimeType.startsWith("video/")) {
		return getVideoDimensions(buffer, mimeType);
	}

	return null;
}

export function isMediaType(mimeType: string): boolean {
	return mimeType.startsWith("image/") || mimeType.startsWith("video/");
}
