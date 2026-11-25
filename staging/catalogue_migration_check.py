"""Rehearse catalogue migration on a disposable loopback PostgreSQL cluster."""
import json, os, secrets, shutil, socket, subprocess, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
BIN=Path('C:/Program Files/PostgreSQL/17/bin')
STATE=ROOT/'staging/.local-state'
def run():
    import psycopg2
    STATE.mkdir(parents=True,exist_ok=True)
    folder=STATE/('pg-catalogue-'+secrets.token_hex(6));folder.mkdir()
    data=folder/'data';pw=secrets.token_urlsafe(24);pwfile=folder/'password';pwfile.write_text(pw)
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    result={'passed':False};started=False;conn=None;engine=None
    def command(*args):
        with (folder/'command.log').open('w') as log:
            r=subprocess.run([str(BIN/args[0]),*map(str,args[1:])],stdout=log,stderr=log,text=True,timeout=90,creationflags=subprocess.CREATE_NO_WINDOW)
        if r.returncode:raise RuntimeError((folder/'command.log').read_text()[-1500:])
    try:
        command('initdb.exe','-D',data,'-U','catalogue_owner','--pwfile',pwfile,'--auth=scram-sha-256','--encoding=UTF8','--locale=C')
        pwfile.unlink();started=True
        command('pg_ctl.exe','-D',data,'-l',folder/'postgres.log','-o',f'-h 127.0.0.1 -p {port}','-w','start')
        conn=psycopg2.connect(host='127.0.0.1',port=port,user='catalogue_owner',password=pw,dbname='postgres');conn.autocommit=True
        with conn.cursor() as c:c.execute('CREATE DATABASE catalogue_test')
        os.environ.update(DATABASE_URL=f'postgresql+psycopg2://catalogue_owner:{pw}@127.0.0.1:{port}/catalogue_test',PYTHON_DOTENV_DISABLED='1')
        sys.path.insert(0,str(ROOT/'backend'))
        from sqlalchemy import create_engine,text
        # Reconstruct predecessor schema from master models, never from a live DB.
        previous=subprocess.check_output(['git','show','origin/master:backend/models.py'],cwd=ROOT).decode('utf-8-sig')
        previous=previous.replace('from database import Base', 'from sqlalchemy.orm import declarative_base\nBase = declarative_base()')
        scope={'__name__':'migration_baseline'};exec(compile(previous,'master/models.py','exec'),scope)
        engine=create_engine(os.environ['DATABASE_URL']);scope['Base'].metadata.create_all(engine)
        from alembic.config import Config
        from alembic import command as alembic
        cfg=Config(str(ROOT/'alembic.ini'));alembic.stamp(cfg,'77f26f3')
        with engine.begin() as c:
            c.execute(scope["User"].__table__.insert().values(id=90001,username="[UX-TEST] migration",email="migration@example.invalid",password_hash="unused"))
            c.execute(scope["LibraryDocument"].__table__.insert().values(id=90001,title="[UX-TEST] private legacy",category="book",subject="Math",level="School",storage_key="legacy-private",page_count=1,uploaded_by=90001))
        alembic.upgrade(cfg,'head')
        with engine.connect() as c:
            row=c.execute(text('SELECT title,visible FROM library_documents WHERE id=90001')).one();assert row[0]=='[UX-TEST] private legacy' and row[1] is False
            assert c.execute(text('SELECT count(*) FROM olympiad_guides')).scalar()==18
            assert c.execute(text("SELECT count(*) FROM pg_class WHERE relname IN ('library_files','olympiad_guides') AND relrowsecurity")).scalar()==2
        # Model the Data API's ordinary role, even if someone grants table SELECT.
        with engine.begin() as c:
            c.execute(text('CREATE ROLE catalogue_reader NOLOGIN NOSUPERUSER NOBYPASSRLS'))
            c.execute(text('GRANT USAGE ON SCHEMA public TO catalogue_reader'))
            c.execute(text('GRANT SELECT ON library_files, olympiad_guides TO catalogue_reader'))
            c.execute(text("INSERT INTO library_files(document_id,content) VALUES (90001,decode('25504446','hex'))"))
            c.execute(text('SET LOCAL ROLE catalogue_reader'))
            assert c.execute(text('SELECT count(*) FROM olympiad_guides')).scalar()==0
            assert c.execute(text('SELECT count(*) FROM library_files')).scalar()==0
        result['ordinary_role_select_denied_by_rls']=True
        alembic.downgrade(cfg,'77f26f3')
        with engine.connect() as c:assert c.execute(text('SELECT count(*) FROM library_documents WHERE id=90001')).scalar()==1
        alembic.upgrade(cfg,'head')
        result.update(passed=True,upgrade=True,rollback_preserved_legacy=True,reupgrade=True,rls_enabled=True)
    finally:
        if engine:engine.dispose()
        if conn:
            with conn.cursor() as c:
                c.execute("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='catalogue_test'")
                c.execute('DROP DATABASE IF EXISTS catalogue_test')
                c.execute("SELECT count(*) FROM pg_database WHERE datname='catalogue_test'");result['database_removed']=c.fetchone()[0]==0
            conn.close()
        if started:command('pg_ctl.exe','-D',data,'-w','-m','immediate','stop')
        assert folder.resolve().parent==STATE.resolve() and folder.name.startswith('pg-catalogue-')
        shutil.rmtree(folder);result['cluster_removed']=not folder.exists()
        (STATE/'catalogue-migration-results.json').write_text(json.dumps(result,indent=2))
        print(json.dumps(result))
if __name__=='__main__':run()
