"""Minimal Tkinter GUI to exercise the Strvm musixmatch_api client.

Install dependencies first:

    pip install -e troubleshoot-search/musicxmatch-api

Then run:

    python troubleshoot-search/test_mm_commercial_gui.py

Type a search and click "Search". Select any result to fetch lyrics and see
whether Musixmatch returned the commercial-use placeholder.
"""

from __future__ import annotations

import queue
import threading
import tkinter as tk
from tkinter import ttk


from pathlib import Path
import sys


ROOT = Path(__file__).resolve().parent
PACKAGE_ROOT = ROOT / "musicxmatch-api" / "src"
if PACKAGE_ROOT.exists() and str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))


try:
    from musicxmatch_api import MusixMatchAPI  # type: ignore
except ImportError as exc:  # pragma: no cover - setup guard
    raise SystemExit(
        "Missing dependency. Install musixmatch_api with 'pip install -e "
        "troubleshoot-search/musicxmatch-api'."
    ) from exc


COMMERCIAL_PLACEHOLDER = "******* This Lyrics is NOT for Commercial use *******"


class CommercialCheckApp(tk.Tk):
    def __init__(self) -> None:
        super().__init__()
        self.title("Musixmatch Commercial Check")
        self.geometry("860x620")
        self.minsize(720, 520)

        self.api = MusixMatchAPI()
        self.results: list[dict] = []
        self.lyrics_cache: dict[int, dict] = {}

        self._build_widgets()

    def _build_widgets(self) -> None:
        top_frame = ttk.Frame(self, padding=12)
        top_frame.pack(fill=tk.X)

        ttk.Label(top_frame, text="Search:").pack(side=tk.LEFT)
        self.query_var = tk.StringVar()
        entry = ttk.Entry(top_frame, textvariable=self.query_var, width=50)
        entry.pack(side=tk.LEFT, padx=8)
        entry.bind("<Return>", lambda *_: self.start_search())

        ttk.Label(top_frame, text="Page size:").pack(side=tk.LEFT)
        self.page_size_var = tk.IntVar(value=20)
        page_size_box = ttk.Combobox(
            top_frame,
            textvariable=self.page_size_var,
            values=[10, 20, 30, 50, 100],
            state="readonly",
            width=6,
        )
        page_size_box.pack(side=tk.LEFT, padx=6)

        self.include_instrumental_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(
            top_frame,
            text="Include tracks flagged without lyrics",
            variable=self.include_instrumental_var,
        ).pack(side=tk.LEFT, padx=6)

        self.search_button = ttk.Button(top_frame, text="Search", command=self.start_search)
        self.search_button.pack(side=tk.LEFT, padx=6)

        self.status_var = tk.StringVar(value="Idle")
        ttk.Label(self, textvariable=self.status_var, padding=(12, 4)).pack(fill=tk.X)

        body = ttk.Frame(self, padding=12)
        body.pack(fill=tk.BOTH, expand=True)

        self.results_tree = ttk.Treeview(
            body,
            columns=("artist", "track_id", "has_lyrics"),
            show="headings",
            selectmode="browse",
            height=12,
        )
        self.results_tree.heading("artist", text="Artist")
        self.results_tree.heading("track_id", text="Track ID")
        self.results_tree.heading("has_lyrics", text="Has Lyrics Flag")
        self.results_tree.column("artist", width=220)
        self.results_tree.column("track_id", width=100, anchor=tk.CENTER)
        self.results_tree.column("has_lyrics", width=120, anchor=tk.CENTER)
        self.results_tree.pack(fill=tk.BOTH, expand=True)
        self.results_tree.bind("<<TreeviewSelect>>", self.on_select_track)

        lyrics_frame = ttk.LabelFrame(self, text="Lyrics", padding=12)
        lyrics_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 12))

        self.lyrics_text = tk.Text(lyrics_frame, wrap=tk.WORD, height=12)
        self.lyrics_text.pack(fill=tk.BOTH, expand=True)
        self.lyrics_text.insert("1.0", "Search for a song, then select a track to load lyrics.")
        self.lyrics_text.configure(state=tk.DISABLED)

    # ---- Search logic -------------------------------------------------

    def start_search(self) -> None:
        query = self.query_var.get().strip()
        if not query:
            self.status_var.set("Enter a search term.")
            return

        self.status_var.set("Searching Musixmatch…")
        self.search_button.configure(state=tk.DISABLED)
        self.results_tree.delete(*self.results_tree.get_children())
        self.lyrics_text.configure(state=tk.NORMAL)
        self.lyrics_text.delete("1.0", tk.END)
        self.lyrics_text.insert("1.0", "Searching…")
        self.lyrics_text.configure(state=tk.DISABLED)
        self.results = []
        self.lyrics_cache.clear()

        work_queue: queue.Queue[tuple[str, dict]] = queue.Queue()

        def worker() -> None:
            try:
                params = {
                    "track_query": query,
                    "page": 1,
                }
                raw = self.api.search_tracks(track_query=query, page=1)
                track_list = raw.get("message", {}).get("body", {}).get("track_list", [])
                results = []
                for item in track_list:
                    track = item.get("track", {})
                    if not track:
                        continue
                    if not self.include_instrumental_var.get() and track.get("has_lyrics") != 1:
                        continue
                    results.append(track)
                    if len(results) >= self.page_size_var.get():
                        break
                work_queue.put(("done", {"results": results}))
            except Exception as err:  # pragma: no cover - UI flow
                work_queue.put(("error", {"message": str(err)}))

        threading.Thread(target=worker, daemon=True).start()
        self.after(100, self._poll_queue, work_queue)

    def _poll_queue(self, work_queue: queue.Queue) -> None:
        try:
            msg, payload = work_queue.get_nowait()
        except queue.Empty:
            self.after(100, self._poll_queue, work_queue)
            return

        if msg == "done":
            self._populate_results(payload.get("results", []))
            self.status_var.set(f"Loaded {len(self.results)} track(s). Select one to view lyrics.")
        else:
            self.status_var.set(f"Error: {payload.get('message', 'Unknown error')}")
        self.search_button.configure(state=tk.NORMAL)

    def _populate_results(self, tracks: list[dict]) -> None:
        self.results = tracks
        self.results_tree.delete(*self.results_tree.get_children())

        for idx, track in enumerate(tracks):
            self.results_tree.insert(
                "",
                tk.END,
                iid=str(idx),
                values=(
                    track.get("artist_name", "Unknown"),
                    track.get("track_id", "?"),
                    "Yes" if track.get("has_lyrics") == 1 else "No",
                ),
                text=track.get("track_name", "Untitled"),
            )

        if tracks:
            self.results_tree.focus("0")
            self.results_tree.selection_set("0")

    # ---- Lyrics inspection -------------------------------------------

    def on_select_track(self, event: object) -> None:
        selection = self.results_tree.selection()
        if not selection:
            return
        index = int(selection[0])
        track = self.results[index]
        track_id = track.get("track_id")
        if not track_id:
            return

        self.status_var.set("Fetching lyrics…")
        self.lyrics_text.configure(state=tk.NORMAL)
        self.lyrics_text.delete("1.0", tk.END)
        self.lyrics_text.insert("1.0", "Loading lyrics…")
        self.lyrics_text.configure(state=tk.DISABLED)

        def worker() -> None:
            try:
                lyrics_payload = self.api.get_track_lyrics(track_id=track_id)
                lyrics_body = (
                    lyrics_payload.get("message", {})
                    .get("body", {})
                    .get("lyrics", {})
                    .get("lyrics_body", "")
                )
                commercial_hold = COMMERCIAL_PLACEHOLDER in lyrics_body
                text = "Lyrics not available (commercial hold)." if commercial_hold else (lyrics_body or "No lyrics provided.")
                self.lyrics_cache[track_id] = {"text": text, "hold": commercial_hold}
                self.after(0, self._display_lyrics, track, text, commercial_hold)
            except Exception as err:  # pragma: no cover - UI flow
                self.after(0, self._display_error, str(err))

        threading.Thread(target=worker, daemon=True).start()

    def _display_lyrics(self, track: dict, lyrics: str, hold: bool) -> None:
        self.status_var.set("Commercial hold" if hold else "Lyrics returned")
        header = f"{track.get('track_name', 'Untitled')} — {track.get('artist_name', 'Unknown')}"
        badge = "[COMMERCIAL HOLD]\n\n" if hold else "[LYRICS]\n\n"
        self.lyrics_text.configure(state=tk.NORMAL)
        self.lyrics_text.delete("1.0", tk.END)
        self.lyrics_text.insert("1.0", f"{header}\n{badge}{lyrics.strip()}\n")
        self.lyrics_text.configure(state=tk.DISABLED)

    def _display_error(self, message: str) -> None:
        self.status_var.set(f"Lyrics error: {message}")
        self.lyrics_text.configure(state=tk.NORMAL)
        self.lyrics_text.delete("1.0", tk.END)
        self.lyrics_text.insert("1.0", f"Error fetching lyrics: {message}")
        self.lyrics_text.configure(state=tk.DISABLED)


def main() -> None:
    app = CommercialCheckApp()
    app.mainloop()


if __name__ == "__main__":  # pragma: no cover - GUI entry point
    main()

