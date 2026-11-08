import asyncio
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock, patch
import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
import main
from settings_service import get_settings_service

@pytest.fixture
def sessions(tmp_path):
    engine=create_engine('sqlite:///'+str(tmp_path/'pool.db'), poolclass=QueuePool,pool_size=2,max_overflow=0,pool_timeout=1,connect_args={'check_same_thread':False})
    try: yield sessionmaker(bind=engine),engine
    finally:
        assert engine.pool.checkedout()==0
        engine.dispose()

def test_no_generator_sessions():
    for path in Path(main.__file__).parent.rglob('*.py'):
        if 'tests' in path.parts: continue
        assert 'next(get_db())' not in path.read_text(encoding='utf-8'),str(path)

def test_request_local_settings(sessions):
    factory,_=sessions
    with factory() as first,factory() as second,patch('settings_service.SettingsService._load_settings'):
        assert get_settings_service(first).db is first
        assert get_settings_service(second).db is second
        assert get_settings_service(first) is not get_settings_service(second)

def test_concurrent_checks_release_connections(sessions):
    factory,engine=sessions
    def settings(db):
        db.execute(text('select 1'))
        return Mock(is_feature_enabled=Mock(return_value=False))
    with patch.object(main,'SessionLocal',factory),patch.object(main,'get_settings_service',settings):
        with ThreadPoolExecutor(max_workers=8) as workers:
            assert all(x=='forums' for x in workers.map(main.disabled_feature,['/forums']*100))
        assert engine.pool.checkedout()==0
        with patch.object(main,'get_settings_service',side_effect=RuntimeError('failed')):
            with pytest.raises(RuntimeError): main.disabled_feature('/forums')

def test_middleware_never_replays(sessions):
    factory,engine=sessions
    calls=[]
    def settings(db):
        db.execute(text('select 1'))
        return Mock(is_feature_enabled=Mock(return_value=True))
    async def downstream(request):
        calls.append(request)
        assert engine.pool.checkedout()==0
        raise RuntimeError('route failed')
    with patch.object(main,'SessionLocal',factory),patch.object(main,'get_settings_service',settings):
        with pytest.raises(RuntimeError,match='route failed'):
            asyncio.run(main.settings_middleware(Mock(url=Mock(path='/forums')),downstream))
    assert len(calls)==1

def test_cleanup_does_not_activate_dormant_jobs():
    with patch.object(main,'cleanup_expired_users') as cleanup,patch('phase1_jobs.anonymize_inactive_accounts') as anonymize,patch('phase1_jobs.send_annual_finance_report') as send:
        main.run_cleanup_cycle()
        cleanup.assert_called_once()
        anonymize.assert_not_called()
        send.assert_not_called()

def test_cleanup_exception_closes(sessions):
    factory,engine=sessions
    with patch.object(main,'SessionLocal',factory): main.cleanup_expired_users()
    assert engine.pool.checkedout()==0


def test_periodic_cleanup_dispatches_cycle_without_blocking_event_loop():
    from unittest.mock import AsyncMock
    with patch.object(main.asyncio, 'sleep', new=AsyncMock(side_effect=[None, asyncio.CancelledError()])), patch.object(main.asyncio, 'to_thread', new=AsyncMock()) as worker:
        with pytest.raises(asyncio.CancelledError):
            asyncio.run(main.periodic_cleanup())
        worker.assert_awaited_once_with(main.run_cleanup_cycle)


@pytest.mark.parametrize('failing_job', ['run_weekly_transitions', 'send_due_learning_notices'])
def test_scheduler_exception_rolls_back_and_releases_session(sessions, failing_job):
    import inline_scheduler
    factory, engine = sessions
    with engine.begin() as connection:
        connection.execute(text('CREATE TABLE scheduler_probe (id INTEGER PRIMARY KEY)'))

    def fail_after_write(db):
        db.execute(text('INSERT INTO scheduler_probe VALUES (1)'))
        raise RuntimeError('synthetic scheduler failure')

    with patch.object(inline_scheduler, 'SessionLocal', factory), \
         patch.object(inline_scheduler, 'run_weekly_transitions', return_value={'opened': 0, 'published': 0}), \
         patch.object(inline_scheduler, 'send_due_learning_notices', return_value=0):
        with patch.object(inline_scheduler, failing_job, side_effect=fail_after_write):
            with pytest.raises(RuntimeError, match='synthetic scheduler failure'):
                inline_scheduler.run_scheduled_cycle()
        assert engine.pool.checkedout() == 0
        with engine.connect() as connection:
            assert connection.execute(text('SELECT count(*) FROM scheduler_probe')).scalar() == 0
        assert inline_scheduler.run_scheduled_cycle() == {
            'weekly': {'opened': 0, 'published': 0}, 'learning_notices': 0,
        }
        assert engine.pool.checkedout() == 0
