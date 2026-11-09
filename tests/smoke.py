#!/usr/bin/env python3
"""Browser smoke test: opens the built game, starts the Campaign and a Run,
visits every station tab, starts a Run fight, and fails on any script error.

    python3 build.py && python3 tests/smoke.py [path/to/index.html]

Needs Playwright for Python (pip install playwright && playwright install chromium).
Screenshots land in tests/shots/ so you can eyeball a change.
"""
import os
import sys

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "dist", "index.html"))
SHOTS = os.path.join(ROOT, "tests", "shots")
TABS = ["HOME", "HELM", "SCIENCE", "ENGINEERING", "TACTICAL", "COMMS", "LIBRARY", "MISSIONS", "CARGO"]
VIEWPORTS = {"desktop": {"width": 1366, "height": 768}, "phone": {"width": 390, "height": 844}}


def open_game(browser, vp, mode, errors):
    page = browser.new_page(viewport=vp)
    page.on("pageerror", lambda e: errors.append("%s: %s" % (mode, e)))
    page.add_init_script(
        "window.__NOLAUNCH__=1;window.__MODE__=%r;window.__FRESH__=1;window.__RUNOPT__={seed:'SMOKE'};" % mode
    )
    page.goto("file://" + GAME)
    page.wait_for_timeout(2000)
    close = page.get_by_text("CLOSE", exact=True)
    if close.count() and close.first.is_visible():
        close.first.click()
        page.wait_for_timeout(300)
    return page


def visit_tabs(page, tag):
    for tab in TABS:
        loc = page.get_by_text(tab, exact=True)
        if not loc.count():
            continue
        try:
            loc.first.click(timeout=2000)
        except Exception:
            continue  # tab scrolled out of view on phone
        page.wait_for_timeout(400)
        page.screenshot(path=os.path.join(SHOTS, "%s_%s.png" % (tag, tab.lower())))


def main():
    os.makedirs(SHOTS, exist_ok=True)
    errors = []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for name, vp in VIEWPORTS.items():
            page = open_game(browser, vp, "campaign", errors)
            visit_tabs(page, "campaign_" + name)
            page.close()

            page = open_game(browser, vp, "run", errors)
            phase = page.evaluate("()=>window.__R2&&__R2.R&&__R2.R.phase")
            if phase != "choose":
                errors.append("run: expected the route choice on start, got %r" % phase)
            visit_tabs(page, "run_" + name)
            page.evaluate(
                "()=>{const R=__R2.R;const i=R.cards.findIndex(c=>c.type==='contact');"
                "if(i>=0){RunMap.fold(R,i);__R2.encHide=false;__R2.render();}}"
            )
            page.wait_for_timeout(1200)
            page.screenshot(path=os.path.join(SHOTS, "run_%s_fight.png" % name))
            page.close()
        browser.close()
    if errors:
        print("FAILED")
        for e in errors:
            print("  " + e)
        sys.exit(1)
    print("smoke test passed: campaign and run, desktop and phone, no script errors")


if __name__ == "__main__":
    main()
