"""Optional safety/cleanup fixture for explicitly isolated UX test runs."""
import os
from pathlib import Path
import pytest

@pytest.fixture(autouse=True)
def isolated_ux_cleanup():
    if os.getenv('UX_ISOLATED_TESTS')!='1':
        yield
        return
    from database import engine
    from sqlalchemy import inspect, text
    from models import Base
    assert engine.url.drivername=='sqlite' and Path(engine.url.database).name.startswith('ux-'), 'Refusing non-test database'
    try:
        yield
    finally:
        # This file was created exclusively for the test process. No remote DB.
        names=set(inspect(engine).get_table_names())
        with engine.begin() as connection:
            for table in reversed(Base.metadata.sorted_tables):
                if table.name in names:
                    connection.execute(table.delete())
            for table in Base.metadata.sorted_tables:
                if table.name in names:
                    assert connection.execute(text('SELECT COUNT(*) FROM "'+table.name+'"')).scalar()==0
