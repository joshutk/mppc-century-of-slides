"""
Build projector/index.html: template + CSS + fonts (base64) + JS, all inline,
so it runs from file:// with no server.  Slide images stay as files in
projector/slides/ next to index.html.

    C:\\Python314\\python.exe projector\\build.py
"""
import base64
import io
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "src")
FONTS = os.path.join(HERE, "fonts")          # with their OFL licence files

# audio.js is optional (written by pipeline step 8 from the recorded sample)
ORDER = ["data.js", "audio.js", "util.js", "sound.js", "ring.js", "lamp.js", "shelf.js", "projector.js", "main.js"]
FACES = [
    ("Open Sans", "normal", 400, "OpenSans-Regular.ttf"),
    ("Open Sans", "normal", 600, "OpenSans-Semibold.ttf"),
    ("Open Sans", "normal", 700, "OpenSans-Bold.ttf"),
    ("Libre Baskerville", "italic", 400, "LibreBaskerville-Italic.ttf"),
    ("Libre Baskerville", "italic", 700, "LibreBaskerville-Italic.ttf"),
]


def read(path):
    return io.open(path, encoding="utf-8").read()


def font_css():
    out = []
    for family, style, weight, fn in FACES:
        b64 = base64.b64encode(open(os.path.join(FONTS, fn), "rb").read()).decode("ascii")
        out.append('@font-face{font-family:"%s";font-style:%s;font-weight:%d;font-display:block;'
                   'src:url(data:font/ttf;base64,%s) format("truetype")}' % (family, style, weight, b64))
    return "\n".join(out)


def main():
    js = []
    for name in ORDER:
        p = os.path.join(SRC, name)
        if os.path.exists(p):
            js.append("// ===== %s =====\n%s" % (name, read(p)))
        elif name != "audio.js":
            raise SystemExit("missing src/%s" % name)
    html = read(os.path.join(SRC, "template.html"))
    html = html.replace("/*BUILD:FONTS*/", font_css())
    html = html.replace("/*BUILD:CSS*/", read(os.path.join(SRC, "styles.css")))
    html = html.replace("/*BUILD:JS*/", "\n".join(js))
    out = os.path.join(HERE, "index.html")
    io.open(out, "w", encoding="utf-8", newline="\n").write(html)
    print("built %s: %.0f KB%s" % (out, len(html.encode("utf-8")) / 1024,
                                    "" if os.path.exists(os.path.join(SRC, "audio.js")) else " (synthesised sound)"))


if __name__ == "__main__":
    main()
