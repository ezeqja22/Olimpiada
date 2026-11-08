"""Disposable loopback PostgreSQL reliability test; never accepts a database URL.
Run from the checkout with its venv. Requires PostgreSQL 17 Windows binaries.
No application startup jobs run; scheduler/cleanup cycles are invoked explicitly.
"""
import asyncio
import collections
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import threading
import time
from datetime import datetime, timedelta
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / 'staging' / '.local-state'
BIN = Path(r'C:\Program Files\PostgreSQL\17\bin')
FAIL_CLEANUP = '--verify-failure-cleanup' in sys.argv
REPORT = ROOT / 'docs' / 'ux-phase-1-2' / ('postgres-failure-cleanup.json' if FAIL_CLEANUP else 'postgres-reliability.json')


def port():
    with socket.socket() as s:
        s.bind(('127.0.0.1', 0))
        return s.getsockname()[1]


def run():
    import psycopg2
    STATE.mkdir(exist_ok=True)
    folder = STATE / ('pg-reliability-' + secrets.token_hex(6))
    folder.mkdir()
    data = folder / 'data'
    password = secrets.token_urlsafe(32)
    pwfile = folder / 'password'
    pwfile.write_text(password, encoding='utf-8')
    pgport, httpport = port(), port()
    dbname = 'ux_reliability_' + secrets.token_hex(6)
    result = {'passed': False, 'waves': [], 'cleanup': {}, 'limitations': [
        'Local single-process PostgreSQL and Uvicorn; not a Railway/Supavisor latency or multi-replica benchmark.',
        'Schema created from SQLAlchemy metadata, not a production migration rehearsal.',
        'Email adapters disabled; external delivery and destructive account jobs are not exercised.'
    ]}
    engine = server = admin = thread = None
    started = created = False
    began = time.perf_counter()
    def command(*args):
        with (folder / 'command.log').open('w', encoding='utf-8') as output:
            proc = subprocess.run([str(BIN / args[0]), *map(str, args[1:])], stdout=output, stderr=output, timeout=60,
                                  creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
        message = (folder / 'command.log').read_text(encoding='utf-8', errors='replace')
        if proc.returncode:
            raise RuntimeError('PostgreSQL command failed: ' + args[0] + ': ' + message[-2000:])
        return message.strip()
    try:
        print('Initializing isolated cluster', flush=True)
        result['postgres_version'] = command('postgres.exe', '--version')
        command('initdb.exe', '-D', data, '-U', 'ux_owner', '--pwfile', pwfile, '--auth=scram-sha-256', '--encoding=UTF8', '--locale=C')
        pwfile.unlink()
        started = True  # Attempt shutdown even if startup times out.
        command('pg_ctl.exe', '-D', data, '-l', folder / 'postgres.log', '-o', f'-h 127.0.0.1 -p {pgport}', '-w', 'start')
        started = True
        admin = psycopg2.connect(host='127.0.0.1', port=pgport, user='ux_owner', password=password, dbname='postgres', connect_timeout=5)
        admin.autocommit = True
        with admin.cursor() as c:
            c.execute('CREATE DATABASE ' + dbname)
        created = True
        print('Created disposable database; loading application', flush=True)
        os.environ.update(DATABASE_URL=f'postgresql+psycopg2://ux_owner:{password}@127.0.0.1:{pgport}/{dbname}',
                          SECRET_KEY=secrets.token_urlsafe(48), STAGING_MODE='1', PYTHON_DOTENV_DISABLED='1',
                          ENABLE_INLINE_SCHEDULER='0', ENABLE_INACTIVE_ACCOUNT_CLEANUP='0')
        os.environ.pop('UX_ISOLATED_TESTS', None)
        for key in ('RESEND_API_KEY', 'SMTP_PASSWORD', 'SMTP_USERNAME', 'SENDGRID_API_KEY'):
            os.environ.pop(key, None)
        os.environ.update(SMTP_HOST='127.0.0.1', SMTP_SERVER='127.0.0.1')
        sys.path.insert(0, str(ROOT / 'backend'))
        # Prevent any dotenv file from introducing external-service credentials.
        import dotenv
        dotenv.load_dotenv = lambda *a, **k: False
        from database import engine, SessionLocal, get_db
        import models
        import main
        import inline_scheduler
        from help_models import HelpBase
        from email_service import email_service
        from auth.utils import hash_password
        from sqlalchemy import event, text, inspect
        from fastapi import Depends, HTTPException
        import httpx
        import uvicorn
        mail_calls = []
        def no_mail(*a, **k):
            mail_calls.append(True)
            return False
        for name in dir(email_service):
            if name.startswith(('send_', '_send_')):
                setattr(email_service, name, no_mail)
        main.app.router.on_startup.clear()
        assert not inline_scheduler.inline_scheduler_enabled()
        models.Base.metadata.create_all(engine)
        HelpBase.metadata.create_all(engine)
        with engine.begin() as c:
            c.execute(text('CREATE TABLE ux_rollback_probe (id integer primary key)'))
        stats = {'checkouts': 0, 'checkins': 0, 'active': 0, 'peak': 0}
        lock = threading.Lock()
        @event.listens_for(engine, 'checkout')
        def checkout(*args):
            with lock:
                stats['checkouts'] += 1
                stats['active'] += 1
                stats['peak'] = max(stats['peak'], stats['active'])
        @event.listens_for(engine, 'checkin')
        def checkin(*args):
            with lock:
                stats['checkins'] += 1
                stats['active'] -= 1
        result['pool_configuration'] = {'size': engine.pool.size(), 'max_overflow': engine.pool._max_overflow, 'timeout_seconds': engine.pool.timeout()}
        assert result['pool_configuration'] == {'size': 5, 'max_overflow': 10, 'timeout_seconds': 30.0}
        login_password = secrets.token_urlsafe(24)
        now = datetime.utcnow()
        with SessionLocal() as db:
            user = models.User(username='[UX-TEST] reliability', email='ux-reliability@example.org', password_hash=hash_password(login_password), role='admin', is_verified=True, is_active=True, is_banned=False)
            db.add(user); db.flush()
            db.add(models.User(username='[UX-TEST] student', email='ux-student@example.org', password_hash=user.password_hash, role='student', is_verified=True, is_active=True, is_banned=False))
            problem = models.Problem(title='[UX-TEST] problem', description='Synthetic mathematical exercise', subject='Mathematics', author_id=user.id)
            db.add(problem); db.flush()
            db.add(models.Forum(title='[UX-TEST] forum', description='Synthetic forum', creator_id=user.id, is_private=False, is_approved=True, subject='Mathematics'))
            db.add(models.CourseItem(title='[UX-TEST] material', kind='material', subject='Mathematics', body='Synthetic material', published_at=now, created_by=user.id))
            for index, status in enumerate(('scheduled', 'open')):
                db.add(models.WeeklyChallenge(week_date=f'2026-01-{5 + index * 7:02}', problem_id=problem.id, starts_at=now-timedelta(days=2), closes_at=now+timedelta(days=1) if index == 0 else now-timedelta(days=1), status=status, created_by=user.id))
            db.commit()
        if FAIL_CLEANUP:
            result['intentional_failure'] = True
            raise RuntimeError('Intentional failure after fixture creation: verify final cleanup')
        executions = collections.Counter()
        @main.app.get('/forums/__ux_pressure')
        def pressure(db=Depends(get_db)):
            db.execute(text('SELECT pg_sleep(0.1)'))
            return {'ok': True}
        @main.app.get('/forums/__ux_failure/{identifier}')
        def failure(identifier: int, db=Depends(get_db)):
            with lock:
                executions[identifier] += 1
            db.execute(text('INSERT INTO ux_rollback_probe VALUES (:id)'), {'id': identifier})
            if identifier % 2:
                raise HTTPException(409, 'Synthetic rollback test')
            # Database statement failure leaves transaction aborted until close rolls it back.
            db.execute(text('SELECT 1 / 0'))
        config = uvicorn.Config(main.app, host='127.0.0.1', port=httpport, log_level='critical', access_log=False)
        server = uvicorn.Server(config)
        thread = threading.Thread(target=server.run, daemon=True)
        thread.start()
        for _ in range(200):
            if server.started: break
            time.sleep(.05)
        assert server.started, 'Local HTTP server did not start'
        result['scheduler_cycles'] = []
        async def exercise():
            async with httpx.AsyncClient(base_url=f'http://127.0.0.1:{httpport}', timeout=90, limits=httpx.Limits(max_connections=60)) as client:
                response = await client.post('/auth/login', json={'email': 'ux-reliability@example.org', 'password': login_password})
                assert response.status_code == 200, f'Login returned {response.status_code}'
                headers = {'Authorization': 'Bearer ' + response.json()['token']}
                student_login = await client.post('/auth/login', json={'email': 'ux-student@example.org', 'password': login_password})
                assert student_login.status_code == 200
                student_headers = {'Authorization': 'Bearer ' + student_login.json()['token']}
                async def request(index):
                    path = ('/auth/login', '/auth/problems/', '/auth/forums', '/site-info', '/core/courses/items', '/get-settings', '/core/courses/items', '/auth/login', '/does-not-exist', f'/forums/__ux_failure/{index}')[index % 10]
                    expected = (200, 200, 200, 200, 200, 200, 401, 401, 404, 409 if index % 2 else 500)[index % 10]
                    begin = time.perf_counter()
                    if index % 10 in (0, 7):
                        response = await client.post(path, json={'email': 'ux-reliability@example.org' if index % 10 == 0 else 'missing@example.org', 'password': login_password})
                    else:
                        response = await client.get(path, headers={} if index % 10 == 6 else student_headers if index % 10 in (2, 4) else headers)
                    return {'route': path if '__ux_failure' not in path else '/forums/__ux_failure/{id}', 'status': response.status_code, 'expected': expected, 'seconds': round(time.perf_counter()-begin, 4)}
                pressure_start = time.perf_counter()
                pressure_responses = await asyncio.gather(*(client.get('/forums/__ux_pressure') for _ in range(50)))
                assert all(r.status_code == 200 for r in pressure_responses)
                assert engine.pool.checkedout() == 0
                result['pool_pressure'] = {'concurrency': 50, 'requests': 50, 'connection_hold_seconds': .1, 'duration_seconds': round(time.perf_counter()-pressure_start, 3), 'all_200': True}
                index = 0
                for concurrency in (20, 35, 50):
                    wave_start = time.perf_counter()
                    rows = []
                    for repeat in range(10):
                        tasks = [request(i) for i in range(index, index + concurrency)]
                        index += concurrency
                        responses, cycle = await asyncio.gather(asyncio.gather(*tasks), asyncio.to_thread(inline_scheduler.run_scheduled_cycle))
                        rows.extend(responses)
                        result['scheduler_cycles'].append(cycle)
                    # Exercise raw database exceptions as well as HTTP exceptions (odd IDs above).
                    extra = await client.get(f'/forums/__ux_failure/{10000 + concurrency * 2}')
                    assert extra.status_code == 500
                    assert engine.pool.checkedout() == 0
                    summary = collections.Counter(f"{r['route']} {r['status']}" for r in rows)
                    summary['/forums/__ux_failure/{id} 500'] += 1
                    timings = sorted(r['seconds'] for r in rows)
                    result['waves'].append({'concurrency': concurrency, 'requests': len(rows)+1, 'duration_seconds': round(time.perf_counter()-wave_start, 3), 'p95_seconds': timings[int(len(timings)*.95)], 'max_seconds': max(timings), 'status_counts': dict(summary), 'mismatches': [r for r in rows if r['status'] != r['expected']], 'pool_checked_out_after': engine.pool.checkedout()})
                    print(f'Completed concurrency {concurrency}: {len(rows)+1} requests', flush=True)
                    assert not result['waves'][-1]['mismatches'], 'Unexpected HTTP status (see report)'
        with patch('phase1_jobs.anonymize_inactive_accounts') as anonymize, patch('phase1_jobs.send_annual_finance_report') as annual:
            asyncio.run(exercise())
            from unittest.mock import AsyncMock
            with patch.object(main.asyncio, 'sleep', new=AsyncMock(side_effect=[None, asyncio.CancelledError()])):
                try:
                    asyncio.run(main.periodic_cleanup())
                except asyncio.CancelledError:
                    pass
            anonymize.assert_not_called(); annual.assert_not_called()
        assert all(count == 1 for count in executions.values()), 'Middleware replayed a failed endpoint'
        with SessionLocal() as db:
            assert db.execute(text('SELECT count(*) FROM ux_rollback_probe')).scalar() == 0
            assert sorted(w.status for w in db.query(models.WeeklyChallenge).all()) == ['open', 'published']
        assert result['scheduler_cycles'][0]['weekly'] == {'opened': 1, 'published': 1}
        assert all(c['weekly'] == {'opened': 0, 'published': 0} for c in result['scheduler_cycles'][1:])
        assert not mail_calls
        def broken_scheduler(db):
            db.execute(text('INSERT INTO ux_rollback_probe VALUES (999999)'))
            db.execute(text('SELECT 1 / 0'))
        with patch.object(inline_scheduler, 'run_weekly_transitions', broken_scheduler):
            try:
                inline_scheduler.run_scheduled_cycle()
                raise AssertionError('Expected scheduler database exception')
            except __import__('sqlalchemy').exc.DataError:
                pass
        assert engine.pool.checkedout() == 0
        assert inline_scheduler.run_scheduled_cycle()['weekly'] == {'opened': 0, 'published': 0}
        with SessionLocal() as db:
            assert db.execute(text('SELECT count(*) FROM ux_rollback_probe')).scalar() == 0
        result['scheduler_exception_rolled_back_and_recovered'] = True
        result['periodic_cleanup_entry_point_passed'] = True
        with admin.cursor() as c:
            c.execute('SELECT deadlocks FROM pg_stat_database WHERE datname=%s', (dbname,))
            result['deadlocks'] = c.fetchone()[0]
            c.execute("SELECT state, count(*) FROM pg_stat_activity WHERE datname=%s GROUP BY state", (dbname,))
            result['database_connection_states_after'] = dict(c.fetchall())
        assert result['deadlocks'] == 0
        assert not any('transaction' in str(state) for state in result['database_connection_states_after'])
        assert engine.pool.checkedout() == 0 and stats['checkouts'] == stats['checkins']
        result['total_http_requests'] = 2 + 50 + sum(w['requests'] for w in result['waves'])
        result['successful_scheduler_cycles'] = len(result['scheduler_cycles']) + 1
        result.update(pool_counters=dict(stats), failed_endpoint_executions=len(executions), middleware_replays=0, rollback_probe_rows=0, email_calls=len(mail_calls), passed=True)
    except BaseException as error:
        result['error'] = type(error).__name__ + ': ' + str(error).replace(password, '[REDACTED]')[:2000]
        raise
    finally:
        try:
            if server:
                server.should_exit = True
                thread.join(100)
                assert not thread.is_alive(), 'HTTP server did not stop'
            if engine:
                # Dropping the owned database removes every synthetic record, including dependent rows.
                result['cleanup']['pool_checked_out'] = engine.pool.checkedout()
                if result['cleanup']['pool_checked_out'] == 0:
                    with engine.connect() as connection:
                        result['cleanup']['removed_record_counts'] = {name: connection.execute(text('SELECT count(*) FROM \"' + name + '\"')).scalar() for name in inspect(engine).get_table_names()}
                engine.dispose()
            if created and admin:
                with admin.cursor() as c:
                    c.execute('SELECT count(*) FROM pg_stat_activity WHERE datname=%s', (dbname,))
                    result['cleanup']['connections_before_drop'] = c.fetchone()[0]
                    if result['cleanup']['connections_before_drop']:
                        result['passed'] = False
                        result['cleanup']['leak_detected'] = True
                        c.execute('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname=%s', (dbname,))
                    c.execute('DROP DATABASE ' + dbname)
                    c.execute('SELECT count(*) FROM pg_database WHERE datname=%s', (dbname,))
                    result['cleanup']['database_absent'] = c.fetchone()[0] == 0
                assert result['cleanup']['database_absent']
        finally:
            if admin: admin.close()
            if started:
                command('pg_ctl.exe', '-D', data, '-w', '-m', 'immediate', 'stop')
                result['cleanup']['cluster_stopped'] = True
                with socket.socket() as probe:
                    probe.settimeout(2)
                    result['cleanup']['port_closed'] = probe.connect_ex(('127.0.0.1', pgport)) != 0
                    assert result['cleanup']['port_closed']
            log = folder / 'postgres.log'
            if log.exists():
                lines = log.read_text(encoding='utf-8', errors='replace').splitlines()
                result['postgres_log_errors'] = [line for line in lines if any(term in line for term in ('ERROR:', 'FATAL:', 'deadlock', 'too many clients'))]
            assert folder.resolve().parent == STATE.resolve() and folder.name.startswith('pg-reliability-')
            shutil.rmtree(folder)
            result['cleanup']['cluster_files_removed'] = not folder.exists()
            result['duration_seconds'] = round(time.perf_counter()-began, 3)
            REPORT.write_text(json.dumps(result, indent=2)+'\n', encoding='utf-8')
            print(json.dumps({'passed': result['passed'], 'cleanup': result['cleanup'], 'report': str(REPORT)}), flush=True)

    assert result['passed'], 'Reliability checks or cleanup failed; see report'

if __name__ == '__main__':
    run()
