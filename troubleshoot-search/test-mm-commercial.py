"""
Quick command-line probe that exercises the reverse-engineered musixmatch-api
package (the Strvm library in this folder) so you can spot tracks that are
flagged "commercial use" and therefore return the placeholder lyrics body.

Usage examples (run from project root or this folder):

    python troubleshoot-search/test-mm-commercial.py "dos vicios" --limit 5

    python troubleshoot-search/test-mm-commercial.py "solo me dejaste"

The script prints each result with a badge showing whether the lyrics payload
contains the commercial-use warning or actual lyric text.
"""

import argparse
import json
import sys
from pathlib import Path


# Ensure the bundled musixmatch_api package (reverse engineered client) is on sys.path
ROOT = Path(__file__).resolve().parent
PACKAGE_ROOT = ROOT / "musicxmatch-api" / "src"
if PACKAGE_ROOT.exists() and str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))


try:
    from musicxmatch_api import MusixMatchAPI  # type: ignore
except ImportError as exc:  # pragma: no cover - setup guard
    raise SystemExit(
        "Could not import musixmatch_api. Install it with 'pip install -e "
        "troubleshoot-search/musicxmatch-api' or 'pip install musicxmatch_api'"
    ) from exc


COMMERCIAL_PLACEHOLDER = "******* This Lyrics is NOT for Commercial use *******"


def fetch_tracks(query: str, limit: int, include_instrumental: bool) -> list[dict]:
    """Run the Strvm search (up to ``limit`` results) and attach lyric payloads."""

    api = MusixMatchAPI()
    raw = api.search_tracks(query, page=1)
    track_list = raw.get("message", {}).get("body", {}).get("track_list", [])

    results = []
    for item in track_list:
        track = item.get("track", {})
        if not track:
            continue

        if not include_instrumental and track.get("has_lyrics") != 1:
            continue

        track_id = track.get("track_id")
        lyrics_body = None
        commercial_hold = False
        error_message = None

        if track_id:
            try:
                lyrics_payload = api.get_track_lyrics(track_id=track_id)
                lyrics = (
                    lyrics_payload.get("message", {})
                    .get("body", {})
                    .get("lyrics", {})
                    .get("lyrics_body")
                )
                if lyrics:
                    commercial_hold = COMMERCIAL_PLACEHOLDER in lyrics
                    lyrics_body = lyrics.strip()
            except Exception as err:  # pragma: no cover - diagnostic only
                error_message = str(err)

        results.append(
            {
                "track": track,
                "track_id": track_id,
                "lyrics_body": lyrics_body,
                "commercial_hold": commercial_hold,
                "error": error_message,
            }
        )

        if len(results) >= limit:
            break

    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Probe Musixmatch direct API via Strvm wrapper")
    parser.add_argument("query", help="search string to send to Musixmatch")
    parser.add_argument("--limit", type=int, default=10, help="max number of results to inspect (default: 10)")
    parser.add_argument(
        "--include-instrumental",
        action="store_true",
        help="keep tracks even when Musixmatch flags has_lyrics = 0",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="dump the raw data as JSON (includes lyrics bodies)",
    )

    args = parser.parse_args()

    print(f"🔍 Querying Musixmatch for: {args.query!r} (limit {args.limit})\n")

    tracks = fetch_tracks(args.query, args.limit, args.include_instrumental)

    if args.json:
        print(json.dumps(tracks, indent=2, ensure_ascii=False))
        return

    if not tracks:
        print("No tracks returned. Try relaxing the query or increasing the limit.")
        return

    for index, entry in enumerate(tracks, start=1):
        track = entry["track"]
        badge = "❌ COMMERCIAL HOLD" if entry["commercial_hold"] else "✅ Lyrics Returned"
        if entry["error"]:
            badge = f"⚠️ Error: {entry['error']}"

        artist = track.get("artist_name") or "Unknown artist"
        title = track.get("track_name") or "Untitled"
        track_id = entry.get("track_id") or "?"

        print(f"{index:>2}. {badge}")
        print(f"    {title} — {artist}")
        print(f"    Track ID: {track_id}")

        if entry["lyrics_body"]:
            snippet = entry["lyrics_body"].splitlines()[0:3]
            snippet_text = " / ".join(line.strip() for line in snippet if line.strip())
            if snippet_text:
                print(f"    Preview: {snippet_text}")
        print()


if __name__ == "__main__":  # pragma: no cover - CLI entry point
    main()

