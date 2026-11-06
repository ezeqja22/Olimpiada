"""Read-only Google Analytics Data API integration using a dedicated service account."""
import json
import os
from fastapi import HTTPException

def get_ga4_summary():
    property_id = os.getenv("GA4_PROPERTY_ID", "").strip()
    credential_json = os.getenv("GA4_SERVICE_ACCOUNT_JSON", "").strip()
    if not property_id or not credential_json:
        return {"configured": False, "message": "Set GA4_PROPERTY_ID and GA4_SERVICE_ACCOUNT_JSON on backend."}
    if not property_id.isdigit():
        raise HTTPException(503, "GA4_PROPERTY_ID must be numeric")
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import AuthorizedSession
        credentials = service_account.Credentials.from_service_account_info(
            json.loads(credential_json),
            scopes=["https://www.googleapis.com/auth/analytics.readonly"])
        session = AuthorizedSession(credentials)
        url = "https://analyticsdata.googleapis.com/v1beta/properties/" + property_id + ":runReport"
        response = session.post(url, timeout=15, json={
            "dateRanges": [{"startDate": "30daysAgo", "endDate": "today"}],
            "metrics": [{"name": "activeUsers"}, {"name": "sessions"},
                        {"name": "screenPageViews"}, {"name": "newUsers"}]
        })
        response.raise_for_status()
        values = (response.json().get("rows") or [{}])[0].get("metricValues", [])
        names = ["active_users", "sessions", "page_views", "new_users"]
        counts = {name: int(values[i]["value"]) if len(values) > i else 0
                  for i, name in enumerate(names)}
        return {"configured": True, "days": 30, **counts}
    except Exception:
        # Do not expose service-account, Google API error, or credential details to client.
        raise HTTPException(503, "GA4 metrics are temporarily unavailable; verify property permissions and credentials")
