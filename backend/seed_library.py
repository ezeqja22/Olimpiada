"""Import the starter library once into an already migrated environment.

Run from the repository root:
    PYTHONPATH=backend python backend/seed_library.py --admin-id ADMIN_USER_ID
"""
from argparse import ArgumentParser
from hashlib import sha256
from io import BytesIO
from textwrap import wrap
from urllib.request import urlopen

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas

from database import SessionLocal
from library_documents import MAX_FILE_SIZE, page_count
from models import LibraryDocument, LibraryFile, User
from phase1_service import is_staff

GUTENBERG = "https://www.gutenberg.org/files/{0}/{0}-pdf.pdf"
CLASSICS = (
    ("13309", "A First Book in Algebra", "Wallace C. Boyden", "Matematikë", "Algjebër", "Fillestar",
     "Veprime me shprehje algjebrike, barazime dhe ushtrime për fillestarë.",
     "0529ea0b9c7c39d2d1de6f5ca972b0a58106842488280bd644ced26b6e631627"),
    ("13447", "Philosophy and Fun of Algebra", "Mary Everest Boole", "Matematikë", "Algjebër", "Fillestar",
     "Një hyrje e shkurtër në mënyrën e të menduarit algjebrik.",
     "8dac3399476bc79fa6e8b8a7cd0caeead87f7b44158d5934eb6c3618232d0936"),
    ("17384", "The Foundations of Geometry", "David Hilbert", "Matematikë", "Gjeometri", "Shumë i vështirë",
     "Trajton aksiomat dhe strukturën logjike të gjeometrisë euklidiane.",
     "c6f04965b5a8ca67a05c2e969357083b9ec0e7a0a2dd30dbf1ebb025cdcf1161"),
    ("21076", "The First Six Books of the Elements of Euclid", "Euklidi / John Casey", "Matematikë", "Gjeometri", "I avancuar",
     "Gjashtë librat e parë të Euklidit me shënime dhe ushtrime nga John Casey.",
     "fa77c91ea6b1e31fe09dea4d9a4310e7f8345dba5be0563603f62e7742ffce5c"),
    ("26839", "Mathematical Recreations and Essays", "W. W. Rouse Ball", "Matematikë", "Kombinatorikë", "I ndërmjetëm",
     "Enigma, katrorë magjikë, probleme me shah dhe ese mbi probleme klasike.",
     "03e9b23e032c4f16016a58bfd4ed067a267f41d11a94235dcad563f64ef07c04"),
    ("36884", "The Mathematical Analysis of Logic", "George Boole", "Informatikë", "Logjikë", "Shumë i vështirë",
     "Vepër historike mbi algjebrën e logjikës.",
     "8d60b4ba440a7bc9a2baf631b14e806e8640e34d37825209dc8d3502efc13f3a"),
    ("39041", "Elementary Illustrations of the Differential and Integral Calculus", "Augustus De Morgan",
     "Matematikë", "Analizë", "I avancuar", "Shembuj mbi derivimin dhe integrimin.",
     "bc838b02bf40de2dba30f73a2bf987b2251201c67f6c36d0d4358048c3e86917"),
    ("39088", "On the Study and Difficulties of Mathematics", "Augustus De Morgan", "Matematikë", "Arsyetim", "I ndërmjetëm",
     "Vështrim mbi arsyetimin matematikor dhe vështirësitë e fillestarit.",
     "fc57b5d101584ea80126d4a59e8d56c6d4d3c49e3d81bd68ec0695cdd56e02e9"),
)
GAZETTE = "https://zenodo.org/records/1687649/files/article.pdf"
ORIGINALS = (
    ("divisibility", "Pjesëtueshmëria dhe mbetjet", "booklet", "Teori numrash", "Fillestar",
     "Katër ushtrime me ide për pjesëtueshmërinë dhe katrorët modulo 4.", (
        ("Pse 6 pjesëton n(n+1)(n+2) për çdo numër të plotë n?", "Mes tre numrave radhazi ka një shumëfish të 3 dhe një numër çift."),
        ("Gjej mbetjet e mundshme të n² kur pjesëtohet me 4.", "Shiko rastet n çift dhe n tek. Mbetjet janë 0 dhe 1."),
        ("Trego se dy katrorë të plotë nuk mund të kenë shumë 4k+3.", "Mblidh dy mbetje nga bashkësia {0,1}."),
        ("Për cilat n pozitive, n+2 pjesëton 3n+1?", "Zbrit 3(n+2). Atëherë n+2 duhet të pjesëtojë 5, prandaj n=3."),
    )),
    ("counting", "Numërim me dy mënyra", "booklet", "Kombinatorikë", "I ndërmjetëm",
     "Katër probleme për çifte, nënbashkësi dhe marrëdhënie në graf.", (
        ("Në një grup me n veta, sa shtrëngime duarsh bëhen nëse çdo çift shtrëngon duart një herë?", "Numëro n(n−1) takime të orientuara, pastaj pjesëto me 2."),
        ("Sa nënbashkësi të një bashkësie me n elemente përmbajnë një element të caktuar?", "Zgjedhjet për n−1 elementet e tjera janë të pavarura."),
        ("Trego se numri i kulmeve me shkallë teke në një graf është çift.", "Shuma e shkallëve është dyfishi i numrit të brinjëve."),
        ("Numëro çiftet (A,x) ku A është një nënbashkësi e {1,...,n} dhe x i përket A.", "Së pari zgjidh x. Për çdo x ka 2^(n−1) mundësi për A."),
    )),
    ("amgm", "Fletë trajnimi · AM–GM", "training", "Algjebër", "I ndërmjetëm",
     "Tre probleme dhe ide zgjidhjeje mbi mesataren aritmetike dhe gjeometrike.", (
        ("Për x>0, gjej minimumin e x+9/x.", "AM–GM jep të paktën 6. Barazia arrihet për x=3."),
        ("Nëse a,b>0 dhe a+b=10, gjej maksimumin e ab.", "AM–GM jep ab nuk e kalon 25. Barazia arrihet për a=b=5."),
        ("Për a,b,c>0, provo (a+b)(b+c)(c+a) është të paktën 8abc.", "Zbato AM–GM te secili faktor dhe shumëzo tri mosbarazimet."),
    )),
)


def fetch_pdf(url, expected):
    with urlopen(url, timeout=20) as response:
        data = response.read(MAX_FILE_SIZE + 1)
    if len(data) > MAX_FILE_SIZE or sha256(data).hexdigest() != expected:
        raise ValueError(f"PDF-ja nuk përputhet me versionin e kontrolluar: {url}")
    return data


def make_handout(title, exercises):
    output = BytesIO()
    canvas = Canvas(output, pagesize=A4)
    for heading, index in ((title, 0), ("Ide dhe zgjidhje", 1)):
        text = canvas.beginText(48, 790)
        text.setFont("Helvetica-Bold", 19)
        text.textLine(heading)
        text.moveCursor(0, 26)
        text.setFont("Helvetica", 12)
        for number, exercise in enumerate(exercises, 1):
            for line in wrap(f"{number}. {exercise[index]}", width=83):
                text.textLine(line)
            text.moveCursor(0, 21)
        canvas.drawText(text)
        canvas.showPage()
    canvas.save()
    return output.getvalue()


def entries():
    for ref, title, author, subject, discipline, level, description, digest in CLASSICS:
        yield ("gutenberg-" + ref, "book", title, author, subject, discipline, level,
               description + f" Në anglisht. Burimi: Project Gutenberg #{ref}.", (GUTENBERG.format(ref), digest))
    yield ("gazette-1894-mackay", "magazine", "The Mathematical Gazette · prill 1894", "J. S. Mackay",
           "Matematikë", "Histori e gjeometrisë", "I ndërmjetëm",
           "Artikulli The Greek Geometers before Euclid, nga numri i parë i revistës. Në anglisht.",
           (GAZETTE, "ff5939da6fa67ffd47bb6aa0e9764aa7182792f7136b983f9745c32e22ed1878"))
    for key, title, kind, discipline, level, description, exercises in ORIGINALS:
        yield (key, kind, title, "Olimpiada.al", "Matematikë", discipline, level, description, exercises)


def seed_library(admin_id, include_external=False):
    with SessionLocal() as db:
        if not is_staff(db.get(User, admin_id)):
            raise ValueError("Jep ID-në e një administratori të projektit.")
        existing = {row.storage_key for row in db.query(LibraryDocument.storage_key)
                    .filter(LibraryDocument.storage_key.like("starter/%"))}
        batch = []
        original_keys = {item[0] for item in ORIGINALS}
        for key, kind, title, author, subject, discipline, level, description, source in entries():
            # Hash pinning proves identity, not redistribution rights. External
            # editions require an operator's rights review; never fetch by default.
            if key not in original_keys and not include_external:
                continue
            storage_key = "starter/" + key
            if storage_key in existing:
                continue
            pdf = make_handout(title, source) if key in original_keys else fetch_pdf(*source)
            batch.append((LibraryDocument(title=title, kind=kind, category=kind, author=author,
                subject=subject, discipline=discipline, level=level, description=description,
                storage_key=storage_key, page_count=page_count(pdf), uploaded_by=admin_id, visible=False), pdf))
        for doc, pdf in batch:
            db.add(doc)
            db.flush()
            db.add(LibraryFile(document_id=doc.id, content=pdf))
        db.commit()
        return len(batch)


if __name__ == "__main__":
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("--admin-id", type=int, required=True)
    parser.add_argument("--include-external-after-rights-review", action="store_true",
                        help="Fetch external editions only after verifying redistribution rights in the deployment jurisdiction. Imports stay hidden for review.")
    args = parser.parse_args()
    print(f"Dokumente të importuara: {seed_library(args.admin_id, args.include_external_after_rights_review)}")
