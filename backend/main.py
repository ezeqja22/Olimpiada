import warnings
warnings.filterwarnings("ignore")

import uvicorn

from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect, Depends # pyright: ignore[reportMissingImports]
from fastapi.middleware.cors import CORSMiddleware # pyright: ignore[reportMissingImports]
from fastapi.responses import JSONResponse
import models
from database import engine, get_db
from sqlalchemy import text
# Import routers with error handling for production
try:
    from auth.routes import router as auth_router
except ImportError as e:
    print(f"Warning: Could not import auth routes: {e}")
    auth_router = None

try:
    from admin_routes import router as admin_router
except ImportError as e:
    print(f"Warning: Could not import admin routes: {e}")
    admin_router = None
# Removed notification admin routes
# Removed StaticFiles import - will use Cloudinary in production
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from models import User
from dotenv import load_dotenv
import os
# Import settings service with error handling
try:
    from settings_service import get_settings_service
except ImportError:
    get_settings_service = None
# Removed push notification service
import jwt
from auth.dependencies import SECRET_KEY, get_current_user

# Load environment variables
load_dotenv()

app = FastAPI()
# Removed static files mount - will use Cloudinary in production

# Create database tables with error handling

try:
    # All schema changes must be applied explicitly with: alembic upgrade head
    print("Database schema is managed by Alembic")
except Exception as e:
    print(f"Warning: Could not create database tables: {e}")
    print("This is normal if the database is not available yet")

# CORS: allow only explicit frontend origins (no "*" when using credentials)
default_origins = [
    "https://www.olimpiada.al",  # Add your custom domain
    "https://olimpiada.al",      # Add both www and non-www
    "https://science-pioneers.vercel.app",
    "http://localhost:3000",
]
env_origins = os.getenv("FRONTEND_ORIGINS", "").strip()
allowed_origins = [o.strip() for o in env_origins.split(",") if o.strip()] or default_origins



# Health check endpoint (before middleware)
@app.get("/health")
async def health_check():
    """Simple health check endpoint"""
    return {"status": "healthy", "service": "sciencepioneers-backend"}

# Settings middleware
@app.middleware("http")
async def settings_middleware(request: Request, call_next):
    """Apply settings-based restrictions"""
    try:
        # Skip middleware for health check and site-info
        if request.url.path in ["/health", "/admin/settings/site-info"]:
            response = await call_next(request)
            return response
            
        db = next(get_db())
        settings_service = get_settings_service(db) if get_settings_service else None
        
        
        # Check feature toggles
        if settings_service and request.url.path.startswith("/forums") and not settings_service.is_feature_enabled("forums"):
            return JSONResponse(
                status_code=404,
                content={"message": "Forums are currently disabled"}
            )
        
        if settings_service and request.url.path.startswith("/problems") and not settings_service.is_feature_enabled("problems"):
            return JSONResponse(
                status_code=404,
                content={"message": "Problems are currently disabled"}
            )
        
        response = await call_next(request)
        return response
        
    except Exception as e:
        print(f"ERROR in settings_middleware: {e}")
        import traceback
        traceback.print_exc()
        response = await call_next(request)
        return response
    finally:
        try:
            # Ensure DB session is closed to avoid pool exhaustion
            db.close()
        except Exception:
            pass

# Keep authentication and assigned-teacher restrictions separate from resource handlers.
from phase1_gate import gate_request
from database import SessionLocal

@app.middleware("http")
async def account_access_middleware(request: Request, call_next):
    with SessionLocal() as session:
        denied = gate_request(request, session)
    if denied is not None:
        return denied
    return await call_next(request)

# CORS wraps access guards so denied requests remain readable by the frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
)

# Include routers only if they were imported successfully
if auth_router:
    app.include_router(auth_router, prefix="/auth", tags=["auth"])
if admin_router:
    app.include_router(admin_router, tags=["admin"])
from phase1_routes import router as phase1_router
app.include_router(phase1_router)
from phase2_routes import router as phase2_router
app.include_router(phase2_router)
from phase3_routes import router as phase3_router
app.include_router(phase3_router)
# Removed notification admin router

# Public site info endpoint (no auth required)
@app.get("/site-info")
async def get_site_info():
    """Get public site information (no auth required)"""
    try:
        db = next(get_db())
        settings_service = get_settings_service(db) if get_settings_service else None
        site_settings = settings_service.get_site_settings() if settings_service else {}
        
        # Site settings loaded
        
        # Get feature settings
        feature_settings = settings_service.get_feature_settings() if settings_service else {}
        
        result = {
            "ga4_measurement_id": (lambda row: row.value if row else "")(db.query(models.SystemSettings).filter(models.SystemSettings.key == "google_analytics_id").first()),
            "site_name": site_settings.get('name', 'Science Pioneers'),
            "site_description": site_settings.get('description', 'A platform for science enthusiasts'),
            "site_logo": site_settings.get('logo', ''),
            "site_favicon": site_settings.get('favicon', ''),
            "site_theme": site_settings.get('theme', 'light'),
            "maintenance_mode": site_settings.get('maintenance_mode', False),
            "maintenance_message": site_settings.get('maintenance_message', 'Site under maintenance'),
            # Add feature settings
            "forums_enabled": feature_settings.get('forums_enabled', True),
            "comments_enabled": feature_settings.get('comments_enabled', True),
            "voting_enabled": feature_settings.get('voting_enabled', True),
            "bookmarks_enabled": feature_settings.get('bookmarks_enabled', True),
            "following_enabled": feature_settings.get('following_enabled', True),
            "notifications_enabled": feature_settings.get('notifications_enabled', True),
            "reports_enabled": feature_settings.get('reports_enabled', True),
            # Add privacy settings
            "profile_visibility": site_settings.get('profile_visibility', 'public')
        }
        
        return result
    except Exception as e:
        # Return defaults if settings service fails
        return {
            "ga4_measurement_id": "",
            "site_name": "Science Pioneers",
            "site_description": "A platform for science enthusiasts",
            "site_logo": "",
            "site_favicon": "",
            "site_theme": "light",
            "maintenance_mode": False,
            "maintenance_message": "Site under maintenance",
            # Default feature settings
            "forums_enabled": True,
            "comments_enabled": True,
            "voting_enabled": True,
            "bookmarks_enabled": True,
            "following_enabled": True,
            "notifications_enabled": True,
            "reports_enabled": True,
            # Default privacy settings
            "profile_visibility": "public"
        }
    
def require_staff_user(current_user: User):
    if current_user.role not in ["admin", "moderator"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Auto-cleanup function
async def cleanup_expired_users():
    """Clean up unverified users older than 1 hour"""
    from database import get_db
    db = next(get_db())
    try:
        cutoff_time = datetime.utcnow() - timedelta(minutes=15)  # 15 minutes expiry
        expired_users = db.query(User).filter(
            User.is_verified == False,
            User.created_at < cutoff_time
        ).all()
        
        count = len(expired_users)
        for user in expired_users:
            db.delete(user)
        
        db.commit()
        
    except Exception as e:
        pass
    finally:
        db.close()

# Background task for cleanup
@app.on_event("startup")
async def startup_event():
    """Start background cleanup task"""
    try:
        print("Starting background cleanup task...")
        asyncio.create_task(periodic_cleanup())
        print("Background cleanup task started successfully")
        # Single-replica alternative to a paid/extra cron service.
        # Leave disabled when a separate phase2_cron.py worker already runs.
        from inline_scheduler import inline_scheduler_enabled, inline_scheduler_loop
        if inline_scheduler_enabled():
            asyncio.create_task(inline_scheduler_loop())
            print("Optional inline weekly scheduler enabled")
    except Exception as e:
        print(f"ERROR starting background task: {e}")
        import traceback
        traceback.print_exc()

async def periodic_cleanup():
    """Run cleanup every 5 minutes"""
    while True:
        try:
            await asyncio.sleep(300)  # 5 minutes
            await cleanup_expired_users()
            from phase1_jobs import anonymize_inactive_accounts, send_annual_finance_report
            with SessionLocal() as db:
                anonymize_inactive_accounts(db)
                send_annual_finance_report(db)
        except Exception as e:
            print(f"ERROR in periodic_cleanup: {e}")
            import traceback
            traceback.print_exc()

@app.get("/")
def read_root():
    return {"message": "Hello, Science Pioneers with PostgreSQL!"}

@app.get("/test-settings")
async def test_settings_simple(current_user: User = Depends(get_current_user)):
    require_staff_user(current_user)
    """Simple test endpoint without authentication"""
    try:
        from database import get_db
        from models import SystemSettings
        
        db = next(get_db())
        settings = db.query(SystemSettings).filter(
            SystemSettings.key.in_([
                'site_name', 'site_description', 'maintenance_mode', 
                'forums_enabled', 'registration_enabled',
                'smtp_server', 'smtp_port', 'smtp_username', 'smtp_password', 'smtp_use_tls',
                'email_from_name', 'email_from_address'
            ])
        ).all()
        
        settings_dict = {setting.key: setting.value for setting in settings}
        
        return {
            "message": "Settings test completed",
            "results": {
                "settings_loaded": len(settings_dict) > 0,
                "site_name": settings_dict.get('site_name', 'Not Set'),
                "maintenance_mode": settings_dict.get('maintenance_mode') == 'true',
                "forums_enabled": settings_dict.get('forums_enabled') == 'true',
                "registration_enabled": settings_dict.get('registration_enabled') == 'true',
                "smtp_server": settings_dict.get('smtp_server', 'Not Set'),
                "smtp_port": settings_dict.get('smtp_port', 'Not Set'),
                "smtp_username": settings_dict.get('smtp_username', 'Not Set'),
                "smtp_password": 'Set' if settings_dict.get('smtp_password') else 'Not Set',
                "smtp_use_tls": settings_dict.get('smtp_use_tls') == 'true',
                "email_from_name": settings_dict.get('email_from_name', 'Not Set'),
                "email_from_address": settings_dict.get('email_from_address', 'Not Set'),
                "total_settings": len(settings_dict)
            },
            "all_settings": settings_dict
        }
    except Exception as e:
        return {
            "message": f"Settings test failed: {str(e)}",
            "error": str(e)
        }

@app.get("/get-settings")
async def get_all_settings(current_user: User = Depends(get_current_user)):
    require_staff_user(current_user)
    """Get all settings without authentication"""
    try:
        from database import get_db
        from models import SystemSettings
        
        db = next(get_db())
        all_settings = db.query(SystemSettings).all()
        
        # Organize settings by category
        settings_by_category = {
            'site': {},
            'email': {},
            'security': {},
            'content': {},
            'forum': {},
            'notification': {},
            'analytics': {},
            'maintenance': {},
            'feature': {},
            'privacy': {},
            'integration': {},
            'advanced': {}
        }
        
        for setting in all_settings:
            key = setting.key
            value = setting.value
            
            # Categorize settings
            if key.startswith('site_'):
                settings_by_category['site'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('smtp_') or (key.startswith('email_') and not key.startswith('email_notifications_')):
                # Don't return password in API response
                if key == 'smtp_password':
                    settings_by_category['email'][key] = {
                        'value': 'ENCRYPTED',
                        'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                        'updated_by': setting.updater.username if setting.updater else None
                    }
                else:
                    settings_by_category['email'][key] = {
                        'value': value,
                        'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                        'updated_by': setting.updater.username if setting.updater else None
                    }
            elif key.startswith('password_') or key.startswith('session_') or key.startswith('max_login_') or key.startswith('lockout_'):
                settings_by_category['security'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('forum_') or key.startswith('max_forum_') or key.startswith('max_members_'):
                settings_by_category['forum'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('max_') and ('problem' in key or 'comment' in key):
                settings_by_category['content'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('notification_') or key.startswith('email_notifications_') or key.startswith('in_app_notifications_') or key.startswith('push_notifications_'):
                settings_by_category['notification'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('analytics_') or key.startswith('track_') or key.startswith('data_retention_') or key.startswith('export_'):
                settings_by_category['analytics'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('maintenance_') or key.startswith('backup_') or key.startswith('auto_'):
                settings_by_category['maintenance'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.endswith('_enabled') or key.startswith('registration_') or key.startswith('auto_'):
                settings_by_category['feature'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('gdpr_') or key.startswith('profile_') or key.startswith('show_') or key.startswith('allow_'):
                settings_by_category['privacy'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            elif key.startswith('google_') or key.startswith('facebook_') or key.startswith('twitter_') or key.startswith('discord_'):
                settings_by_category['integration'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
            else:
                settings_by_category['advanced'][key] = {
                    'value': value,
                    'updated_at': setting.updated_at.isoformat() if setting.updated_at else None,
                    'updated_by': setting.updater.username if setting.updater else None
                }
        
        return settings_by_category
        
    except Exception as e:
        return {
            "error": str(e)
        }

@app.post("/save-settings")
async def save_settings_simple(
    settings_data: dict,
    current_user: User = Depends(get_current_user)
):
    require_staff_user(current_user)
    """Simple save endpoint without authentication"""
    try:
        from database import get_db
        from models import SystemSettings
        
        db = next(get_db())
        # Handle both direct settings and nested settings
        if 'settings' in settings_data:
            settings = settings_data.get('settings', {})
        else:
            settings = settings_data
        
        # Saving settings
        
        updated_count = 0
        for key, value in settings.items():
            # Encrypt password fields (only if not already encrypted and not empty)
            if key == 'smtp_password' and value and value != 'ENCRYPTED' and value.strip() != '':
                import base64
                value = base64.b64encode(str(value).encode('utf-8')).decode('utf-8')
            
            # Find existing setting or create new one
            setting = db.query(SystemSettings).filter(SystemSettings.key == key).first()
            if setting:
                setting.value = str(value)
                setting.updated_at = datetime.utcnow()
            else:
                new_setting = SystemSettings(
                    key=key,
                    value=str(value),
                    updated_at=datetime.utcnow()
                )
                db.add(new_setting)
            updated_count += 1
        
        db.commit()
        
        # Refresh the settings cache
        from settings_service import refresh_settings_cache
        refresh_settings_cache(db)
        
        return {
            "message": f"Settings saved successfully! Updated {updated_count} settings.",
            "updated_count": updated_count
        }
    except Exception as e:
        return {
            "message": f"Failed to save settings: {str(e)}",
            "error": str(e)
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
