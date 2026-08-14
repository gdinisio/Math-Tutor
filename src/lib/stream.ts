/**
 * Sentinel used to report a mid-stream failure over a plain text stream.
 *
 * Once headers are sent we can no longer return a JSON error, and a model that
 * dies halfway through previously just looked like feedback that stopped —
 * indistinguishable from a short answer. The server appends this marker
 * followed by a human-readable message; the client splits on it.
 *
 * The delimiter is a NUL, built at runtime so no control character ends up
 * literally in this file. NUL can't appear in model output, so the sentinel
 * can't collide with real feedback.
 */
const NUL = String.fromCharCode(0);

export const STREAM_ERROR_MARKER = `${NUL}__MATH_TUTOR_ERROR__${NUL}`;

export interface SplitStream {
  text: string;
  error: string | null;
}

/** Separates streamed feedback from a trailing error report, if any. */
export function splitStreamError(raw: string): SplitStream {
  const index = raw.indexOf(STREAM_ERROR_MARKER);
  if (index === -1) return { text: raw, error: null };

  return {
    text: raw.slice(0, index).trimEnd(),
    error: raw.slice(index + STREAM_ERROR_MARKER.length).trim() || null,
  };
}
