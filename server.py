#!/usr/bin/env python3
"""Statisk webbserver för B3 Vibe, med ett litet highscore-API.

Samma filservering som `python -m http.server`, plus:

    GET  /api/highscores?game=<mapp>   -> {"scores": [...]}
    POST /api/highscores               -> {"scores": [...]}

Highscorelistan sparas i highscores.json bredvid den här filen. Den filen är
git-ignorerad, så lokala rekord följer aldrig med i en commit.

Kör:  python server.py 8000 --bind 127.0.0.1
Bara stdlib, inga paket behövs.
"""
import base64
import binascii
import json
import os
import re
import secrets
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
SCORE_FILE = os.path.join(ROOT, 'highscores.json')
PHOTO_DIR = os.path.join(ROOT, 'highscore-photos')
PHOTO_URL = '/highscore-photos/'
API_PATH = '/api/highscores'
KEEP_PER_GAME = 10
MAX_BODY = 400_000          # en post med rekordbild ar storre an en utan
MAX_PHOTO = 160_000         # avkodad bild, bytes
GAME_RE = re.compile(r'^[a-z0-9_-]{1,32}$')
PHOTO_RE = re.compile(r'^[a-z0-9_-]{1,32}-[0-9a-f]{16}\.jpg$')
JPEG_MAGIC = b'\xff\xd8\xff'
lock = threading.Lock()


def save_photo(game, data_url):
    """Spara en JPEG-data-URL som fil och returnera dess url, eller None."""
    if not isinstance(data_url, str) or not data_url.startswith('data:image/jpeg;base64,'):
        return None
    raw = data_url.split(',', 1)[1]
    if len(raw) > MAX_PHOTO * 2:
        return None
    try:
        blob = base64.b64decode(raw, validate=True)
    except (ValueError, binascii.Error):
        return None
    # Lita inte pa mime-typen i url:en, kolla filens egna magiska bytes.
    if not blob.startswith(JPEG_MAGIC) or len(blob) > MAX_PHOTO:
        return None
    namn = f'{game}-{secrets.token_hex(8)}.jpg'
    try:
        os.makedirs(PHOTO_DIR, exist_ok=True)
        with open(os.path.join(PHOTO_DIR, namn), 'wb') as handle:
            handle.write(blob)
    except OSError as error:
        sys.stderr.write(f'kunde inte spara rekordbild ({error})\n')
        return None
    return PHOTO_URL + namn


def drop_photo(url):
    """Ta bort bildfilen for en post som trillat ur topplistan."""
    if not isinstance(url, str) or not url.startswith(PHOTO_URL):
        return
    namn = url[len(PHOTO_URL):]
    if not PHOTO_RE.match(namn):
        return
    try:
        os.remove(os.path.join(PHOTO_DIR, namn))
    except OSError:
        pass


def read_scores():
    try:
        with open(SCORE_FILE, encoding='utf-8') as handle:
            data = json.load(handle)
    except FileNotFoundError:
        return {}
    except (OSError, ValueError) as error:
        sys.stderr.write(f'highscores.json kunde inte läsas ({error}); börjar om från tomt\n')
        return {}
    return data if isinstance(data, dict) else {}


def write_scores(data):
    tmp = SCORE_FILE + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as handle:
        json.dump(data, handle, ensure_ascii=False, indent=2)
        handle.write('\n')
    os.replace(tmp, SCORE_FILE)


def clean_entry(payload):
    """Plocka ut en giltig post ur klientens JSON, eller returnera None."""
    if not isinstance(payload, dict):
        return None, None
    game = payload.get('game')
    if not isinstance(game, str) or not GAME_RE.match(game):
        return None, None
    try:
        score = int(payload.get('score'))
    except (TypeError, ValueError):
        return None, None
    if not 0 <= score <= 99_999_999:
        return None, None
    name = payload.get('name')
    name = name.strip()[:12] if isinstance(name, str) and name.strip() else 'ANONYM'
    entry = {'name': name, 'score': score}
    for extra in ('lines', 'level'):
        try:
            entry[extra] = max(0, min(99_999, int(payload.get(extra, 0))))
        except (TypeError, ValueError):
            entry[extra] = 0
    return game, entry


class Handler(SimpleHTTPRequestHandler):
    server_version = 'B3Vibe/1.0'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Utan det här serverar webbläsaren gärna en cachad app.js eller
        # style.css efter en ändring, vilket ser ut som att fixen inte tog.
        if not self.path.split('?')[0].startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache, must-revalidate')
        super().end_headers()

    def send_json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(body)

    def query_game(self):
        _, _, query = self.path.partition('?')
        for part in query.split('&'):
            key, _, value = part.partition('=')
            if key == 'game' and GAME_RE.match(value):
                return value
        return None

    def do_GET(self):
        if self.path.split('?')[0] != API_PATH:
            return super().do_GET()
        game = self.query_game()
        if not game:
            return self.send_json(400, {'error': 'game saknas eller är ogiltigt'})
        with lock:
            scores = read_scores().get(game, [])
        self.send_json(200, {'game': game, 'scores': scores})

    def do_HEAD(self):
        # Utan det har faller HEAD mot API:et igenom till filservningen och
        # svarar 404 for en sokvag som GET svarar 200 pa.
        if self.path.split('?')[0] == API_PATH:
            return self.send_json(405, {'error': 'anvand GET eller POST'})
        return super().do_HEAD()

    def do_POST(self):
        if self.path.split('?')[0] != API_PATH:
            return self.send_error(404, 'Not Found')
        try:
            length = int(self.headers.get('Content-Length', 0))
        except ValueError:
            return self.send_json(400, {'error': 'ogiltig Content-Length'})
        if length <= 0 or length > MAX_BODY:
            return self.send_json(413, {'error': 'tom eller för stor body'})
        try:
            payload = json.loads(self.rfile.read(length).decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            return self.send_json(400, {'error': 'ogiltig JSON'})
        game, entry = clean_entry(payload)
        if not game:
            return self.send_json(400, {'error': 'ogiltig post'})
        bild = save_photo(game, payload.get('photo'))
        if bild:
            entry['photo'] = bild
        with lock:
            data = read_scores()
            board = [row for row in data.get(game, []) if isinstance(row, dict)]
            board.append(entry)
            board.sort(key=lambda row: row.get('score', 0), reverse=True)
            behall, ut = board[:KEEP_PER_GAME], board[KEEP_PER_GAME:]
            data[game] = behall
            try:
                write_scores(data)
            except OSError as error:
                if bild:
                    drop_photo(bild)
                return self.send_json(500, {'error': f'kunde inte skriva filen: {error}'})
            # Stada bilder for poster som trillat ur listan, annars vaxer mappen for evigt.
            for rad in ut:
                drop_photo(rad.get('photo'))
            scores = behall
        self.send_json(200, {'game': game, 'scores': scores, 'saved': entry in scores})


def main(argv):
    port = 8000
    bind = '0.0.0.0'
    rest = []
    index = 0
    while index < len(argv):
        if argv[index] == '--bind' and index + 1 < len(argv):
            bind = argv[index + 1]
            index += 2
            continue
        rest.append(argv[index])
        index += 1
    if rest:
        try:
            port = int(rest[0])
        except ValueError:
            sys.exit(f'Ogiltig port: {rest[0]}')
    server = ThreadingHTTPServer((bind, port), Handler)
    shown = '127.0.0.1' if bind in ('0.0.0.0', '') else bind
    print(f'B3 Vibe serveras från {ROOT}')
    print(f'Öppna http://{shown}:{port} — highscore sparas i highscores.json')
    print('Avsluta med Ctrl+C')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nServern stoppad.')
    finally:
        server.server_close()


if __name__ == '__main__':
    main(sys.argv[1:])
