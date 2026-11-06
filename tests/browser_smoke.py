"""Run in isolated CI only: browser UI smoke tests, no production accounts or data."""
import os
import sys
import traceback
from pathlib import Path

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:5173"
OUT = Path("browser-evidence")
OUT.mkdir(parents=True, exist_ok=True)

def check(condition, message):
    if not condition:
        raise AssertionError(message)

def wait_for_heading(page, text):
    page.get_by_role("heading", name=text, exact=False).first.wait_for(timeout=18000)

def record(page, name):
    page.screenshot(path=str(OUT / f"{name}.png"), full_page=True, animations="disabled")

def run():
    issues = []
    console_errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        desktop = browser.new_context(viewport={"width": 1440, "height": 900}, locale="sq-AL")
        page = desktop.new_page()
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        page.goto(BASE + "/homepage", wait_until="domcontentloaded")
        wait_for_heading(page, "Problemet e mëdha")
        check(page.get_by_text("Spark Education", exact=False).count() > 0,
              "Official Spark partner is missing from the homepage")
        wait_for_heading(page, "Gjej sfidën tënde të radhës")
        discovery = page.locator(".p3-section-head--intro")
        check(discovery.evaluate("(el) => getComputedStyle(el).backgroundColor") == "rgba(0, 0, 0, 0)",
              "The old green header overlay still covers the discovery heading")
        record(page, "01-homepage-desktop-sq")

        # The mentors panel should use the same typography and never inherit the
        # global green navigation background, even when teacher data exists.
        demo_mentor = ('[{"user_id":9001,"first_name":"Demo","last_name":"Mentor",'
                       '"subject":"Mathematics","bio":"Olympiad problem-solving guidance"}]')
        page.route("**/experience/teachers", lambda route: route.fulfill(
            status=200, content_type="application/json", body=demo_mentor))
        page.reload(wait_until="domcontentloaded")
        wait_for_heading(page, "Përparimi yt nis me mentorin e duhur")
        mentors = page.locator(".p3-section-head--mentors")
        check(mentors.evaluate("(el) => getComputedStyle(el).backgroundColor") == "rgba(0, 0, 0, 0)",
              "The mentor section inherited a green background")
        check(page.get_by_role("link", name="Shiko seancat individuale").get_attribute("href") == "/tutoring",
              "Mentor call to action has an incorrect route")
        record(page, "01a-mentors-editorial-sq")
        page.unroute("**/experience/teachers")

        # CMS strings containing a Markdown-style link must render as a real link.
        page.route("**/experience/content", lambda route: route.fulfill(
            status=200, content_type="application/json",
            body='{"hero":{"subtitle_sq":"Our mentors [Seancat 1-to-1](http://127.0.0.1:5174/tutoring)"}}'))
        page.reload(wait_until="domcontentloaded")
        inline_link = page.locator(".hero-description a").filter(has_text="Seancat 1-to-1")
        inline_link.wait_for(timeout=12000)
        check(inline_link.get_attribute("href") == "/tutoring", "Raw CMS markdown link was not normalized")
        check("[Seancat 1-to-1](" not in page.locator(".hero-description").inner_text(),
              "Raw Markdown is visible in homepage copy")
        page.unroute("**/experience/content")
        record(page, "01b-homepage-inline-link")


        buttons = page.locator(".p3-languages button")
        check(buttons.count() > 0, "Language switch is absent")
        buttons.filter(has_text="EN").first.click()
        wait_for_heading(page, "Big ideas start")
        wait_for_heading(page, "Find your next challenge")
        check(page.locator(".p3-section-head--intro").evaluate("(el) => getComputedStyle(el).backgroundColor") == "rgba(0, 0, 0, 0)",
              "English discovery header has a colored overlay")
        record(page, "02-homepage-desktop-en")

        page.goto(BASE + "/faq", wait_until="domcontentloaded")
        wait_for_heading(page, "Frequently asked questions")
        first = page.locator(".p3-faq-entry button").first
        first.wait_for(timeout=16000)
        first.click()
        check(first.get_attribute("aria-expanded") == "true", "FAQ accordion did not expand")
        record(page, "03-faq-expanded-en")

        page.goto(BASE + "/support", wait_until="domcontentloaded")
        wait_for_heading(page, "How can we help?")
        form = page.locator("form").first
        form.locator("input").nth(0).fill("Browser Tester")
        form.locator('input[type="email"]').fill("synthetic-browser-test@example.com")
        form.locator("input").nth(2).fill("Testing support form")
        form.locator("textarea").fill("This is a synthetic support ticket submitted from an isolated browser check.")
        form.locator('button[type="submit"],button:not([type])').last.click()
        page.get_by_text("Ticket #", exact=False).wait_for(timeout=18000)
        record(page, "04-support-success-en")

        # Responsiveness test: a genuine browser with mobile viewport/touch.
        mobile = browser.new_context(viewport={"width": 390, "height": 844},
                                     device_scale_factor=2, is_mobile=True, has_touch=True)
        phone = mobile.new_page()
        phone.on("pageerror", lambda exc: console_errors.append(str(exc)))
        phone.goto(BASE + "/homepage", wait_until="domcontentloaded")
        wait_for_heading(phone, "Problemet e mëdha")
        wait_for_heading(phone, "Gjej sfidën tënde të radhës")
        check(phone.locator(".p3-section-head--intro").evaluate("(el) => getComputedStyle(el).backgroundColor") == "rgba(0, 0, 0, 0)",
              "Mobile discovery header has a colored overlay")
        phone.wait_for_timeout(400)
        check(phone.evaluate("document.documentElement.scrollWidth <= innerWidth + 4"),
              "Homepage overflows mobile viewport horizontally")
        record(phone, "05-homepage-mobile-sq")
        phone.goto(BASE + "/faq", wait_until="domcontentloaded")
        wait_for_heading(phone, "Pyetje të shpeshta")
        check(phone.evaluate("document.documentElement.scrollWidth <= innerWidth + 4"),
              "FAQ horizontally overflows on mobile")
        record(phone, "06-faq-mobile")

        # Real editor-to-website smoke using a synthetic Admin in this isolated SQLite DB.
        # The one-time session token stays in process memory and is never logged.
        from uuid import uuid4
        from database import SessionLocal
        from models import User
        from auth.utils import create_jwt
        with SessionLocal() as db:
            suffix=uuid4().hex[:12]
            admin=User(username="browser_editor_"+suffix,
                       email="browser_editor_"+suffix+"@example.com",
                       password_hash="synthetic-test-only",role="admin",
                       is_verified=True,is_active=True,is_banned=False)
            db.add(admin);db.commit()
            token=create_jwt(admin.id,db)
        editor_context=browser.new_context(viewport={"width":1366,"height":900})
        editor_context.add_init_script("localStorage.setItem('token', " + __import__("json").dumps(token) + ");")
        editor=editor_context.new_page()
        editor.on("pageerror",lambda exc:console_errors.append(str(exc)))
        editor.goto(BASE+"/admin/site-content",wait_until="domcontentloaded")
        wait_for_heading(editor,"Përmbajtja e Website-it")
        editor.get_by_role("button",name="Hyrja · Eksploro platformën").click()
        editor.locator('.site-editor__fields input[maxlength="250"]').fill("Titull testues për editorin")
        editor.get_by_role("button",name="Ruaj ndryshimet").click()
        editor.get_by_text("U ruajt me sukses.",exact=False).wait_for(timeout=18000)
        editor.goto(BASE+"/homepage",wait_until="domcontentloaded")
        wait_for_heading(editor,"Titull testues për editorin")
        check(editor.locator(".p3-section-head--intro").count()==1,
              "Edited content did not appear in the correct homepage section")

        check(not console_errors, "Uncaught browser JavaScript errors: " + "; ".join(console_errors[:5]))
        browser.close()
    print("PASS: SQ and EN homepage, official partner, FAQ accordion, support ticket and mobile layout")
    print("Screenshots saved to", OUT)

if __name__ == "__main__":
    try:
        run()
    except Exception:
        (OUT / "browser_failure.txt").write_text(traceback.format_exc())
        traceback.print_exc()
        sys.exit(1)
