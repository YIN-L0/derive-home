import os
import time
import uuid
from pathlib import Path

import httpx

STYLE = """
Overall: photorealistic, physically plausible, highly detailed hero prop for a modern,
design-forward apartment. Bauhaus / modernist / functionalist influence, clean geometry,
restrained elegance, realistic materials with light traces of everyday use.
Not antique, not retro, not baroque, not fantasy, not cartoonish, not cyberpunk,
not luxury-brand heavy. No logos, no readable text.
One single complete isolated object. No background, no room, no table, no extra
scattered items, no floating pieces.
"""

ASSETS = {
    "book": (
        "derive_bauhaus_book",
        """
A highly detailed realistic contemporary hardcover book designed to fit inside a modern
design-oriented apartment. It feels minimal, refined, and quietly intellectual.
Style: Bauhaus-inspired, modernist, functional, clean geometry.
Details: clean rectangular proportions; linen or cloth cover in a muted neutral tone such
as deep charcoal, warm gray, or off-white; subtle tactile fabric texture; crisp but
slightly softened edges from normal use; restrained page variation visible at the side;
a thin geometric bookmark partially visible; one small inserted paper card or transit
ticket subtly peeking out. No decorative ornament, no vintage antique feeling, no readable
title, no logo, no excessive aging.
A well-used but carefully kept design or literature book in a contemporary home.
Approximate proportions: 22 cm tall, 15 cm wide, 3.5-4 cm thick.
""",
    ),
    "lamp": (
        "derive_bauhaus_lamp",
        """
A highly detailed realistic contemporary table lamp inspired by Bauhaus and modernist
design. Geometric, functional, elegant, and believable as a real object used in a modern
apartment. Clean geometric forms, balanced proportions, minimal ornament, functional beauty.
Form: cylindrical or slightly conical fabric shade; simple circular or tubular stem;
sculptural but restrained base in ceramic, metal, or glass; matte black, brushed steel,
off-white, or warm neutral tones; subtle contrast between materials; realistic cord
integrated into the object.
Materials: visible woven texture in the lampshade; realistic matte or satin finish on
metal or ceramic; small believable traces of everyday use; slight micro-scratches or
subtle patina, but not old-fashioned.
A timeless modern design piece: not retro, not antique, not futuristic.
Approximate dimensions: 50-55 cm tall, 28-32 cm shade diameter. Suitable for a bedside
table or living-room side table.
""",
    ),
    "camera": (
        "derive_modernist_camera",
        """
A highly detailed realistic compact film or digital-style camera with a refined modernist
design language. Functional, minimal, and tactile, with subtle Bauhaus-influenced
industrial design qualities.
Details: compact rectangular body; clean layout of controls; matte black or graphite
finish; subtle brushed metal details; precision mechanical feeling; realistic glass lens
with subtle reflections; small tactile buttons or dials; a simple dark strap integrated
naturally with the object.
It belongs to someone interested in art, architecture, and photography, living in a
contemporary apartment.
Include realistic seams, joints, screws, and material transitions; slight everyday wear
on edges and grip areas; high material realism; believable scale.
Avoid obvious retro nostalgia, steampunk, exaggerated vintage styling, flashy branding,
decorative over-design. No readable branding.
Approximate dimensions: 14 cm wide, 8 cm tall, 7 cm deep.
""",
    ),
    "memory_box": (
        "derive_modern_memory_box",
        """
A highly detailed realistic storage box designed for a contemporary apartment, with a
clean modernist design and subtle emotional significance. A carefully designed household
archive container for photographs, letters, small travel objects, documents, or
meaningful items. The box is closed.
Style: modern, minimal, Bauhaus-inspired, functional, geometric.
Details: clean rectangular silhouette; structured form; high-quality materials such as
textured leather, coated canvas, or matte fiberboard; neutral sophisticated tones such as
black, warm gray, sand, or dark olive; minimal hardware; subtle brass, blackened metal,
or brushed steel closure details; refined stitching or edge finishing; discreet signs of
use; beautifully made but understated.
It communicates "personal archive" without looking antique or theatrical: a
design-conscious storage object that has moved from home to home.
Avoid old trunk styling, heavy vintage travel references, oversized luggage proportions,
too much distressing, decorative clutter. No loose papers.
Approximate size: 40 cm wide, 28 cm deep, 18 cm tall. Suitable for a shelf, floor corner,
or beside a desk.
""",
    ),
}

client = httpx.Client(
    base_url="https://api.projectsim.ai",
    headers={"Authorization": f"Bearer {os.environ['PROJECTSIM_TOKEN']}"},
    timeout=60.0,
)

# 1. Create all 4 assets
jobs = {}
for folder, (name, prompt) in ASSETS.items():
    r = client.post(
        "/v1/assets/standard",
        headers={"Idempotency-Key": str(uuid.uuid4())},
        json={
            "name": name,
            "inputs": {"text": (prompt + STYLE).strip()},
            "params": {
                "texture": {"resolution": 2048},
                # "agnostic" is the only simulator that outputs GLB (+ FBX)
                "physics": {"simulator": "agnostic"},
            },
        },
    )
    if r.is_error:
        raise SystemExit(f"create {name} failed: {r.status_code} {r.text}")
    body = r.json()
    jobs[folder] = (body["id"], body["job_id"])
    print(f"[{folder}] created asset={body['id']} job={body['job_id']}")

# 2. Poll each job, 3. download when complete
pending = dict(jobs)
while pending:
    time.sleep(10)
    for folder, (asset_id, job_id) in list(pending.items()):
        job = client.get(f"/v1/jobs/{job_id}").json()
        status = job["status"]
        print(f"[{folder}] {status}")
        if status in {"queued", "running"}:
            continue
        del pending[folder]
        if status != "complete":
            print(f"[{folder}] ended with {status}: {job.get('error')}")
            continue

        asset = client.get(f"/v1/assets/{asset_id}").json()
        out = (Path("downloads") / folder).resolve()
        for f in asset["files"]:
            dest = (out / f["path"]).resolve()
            if not dest.is_relative_to(out):
                raise ValueError(f"unexpected download path: {f['path']}")
            dest.parent.mkdir(parents=True, exist_ok=True)
            # Presigned URL: no API token
            with httpx.stream("GET", f["url"], follow_redirects=True, timeout=300) as d:
                d.raise_for_status()
                with dest.open("wb") as fh:
                    for chunk in d.iter_bytes(1024 * 1024):
                        fh.write(chunk)
            print(f"[{folder}] saved {dest}")

print("done")
