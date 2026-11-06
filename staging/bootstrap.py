"""Initialize a *brand-new isolated staging DB* without assuming legacy Alembic creates users.
Never run this bootstrap against existing production data.
"""
from pathlib import Path
from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from database import engine
from models import Base

config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))

tables = set(inspect(engine).get_table_names())
if "alembic_version" in tables:
    command.upgrade(config, "head")
    print("Existing staging schema upgraded to head")
elif tables:
    raise RuntimeError(
        "Refusing to stamp a non-empty unversioned database. "
        "Inspect it and make a backup first."
    )
else:
    Base.metadata.create_all(bind=engine)
    command.stamp(config, "head")
    print("New isolated staging schema created from metadata and stamped at head")
