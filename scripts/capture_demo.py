"""Capture genuine InterviewLens UI screenshots using its local demo backend.
No personal interview files or private accounts are used.
"""
from pathlib import Path
from tempfile import TemporaryDirectory
import shutil
from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8765"
OUT = Path("docs/screenshots")
OUT.mkdir(parents=True, exist_ok=True)
DEMO = Path("docs/demo")
DEMO.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p, TemporaryDirectory() as video_dir:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": 1440, "height": 1000},
        device_scale_factor=1,
        record_video_dir=video_dir,
        record_video_size={"width": 1280, "height": 820},
    )
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    response = page.goto(BASE, wait_until="domcontentloaded", timeout=30000)
    assert response and response.status == 200
    print("Browser page title:", page.title())
    print("Landing heading count:", page.locator("#app-viewport h1").count())
    print("Browser JS errors:", errors[:5])
    page.locator("#app-viewport h1").first.wait_for(timeout=15000)
    assert "Turn Every Interview" in page.locator("#app-viewport h1").first.inner_text()
    page.wait_for_timeout(1300)
    print("Landing background:", page.evaluate("getComputedStyle(document.body).backgroundColor"))

    # Tailwind CDN is a runtime dependency in this version. Do not claim a
    # styled screenshot if the stylesheet was unreachable in the runner.
    background = page.evaluate("getComputedStyle(document.body).backgroundColor")
    assert background != "rgba(0, 0, 0, 0)", f"Styles failed to load (body background={background})"
    page.screenshot(path=str(OUT / "interviewlens-landing.png"), full_page=True, animations="disabled")

    page.get_by_role("button", name="Try Interactive Demo Report").click()
    page.get_by_text("Coaching Score:").first.wait_for(timeout=65000)
    report = page.locator("#app-viewport").inner_text()
    assert "relevant follow-up questions to practice" in report.lower(), report[-500:]
    assert "Coaching Score:" in report
    if errors:
        raise AssertionError("Browser JavaScript errors: " + "; ".join(errors[:3]))
    page.screenshot(path=str(OUT / "interviewlens-demo-report.png"), full_page=True, animations="disabled")
    page.wait_for_timeout(800)
    video = page.video
    assert video is not None
    context.close()
    shutil.copyfile(video.path(), DEMO / "interviewlens-demo-walkthrough.webm")

    mobile = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    mobile.goto(BASE, wait_until="domcontentloaded", timeout=30000)
    mobile.locator("#app-viewport h1").first.wait_for(timeout=15000)
    mobile.screenshot(path=str(OUT / "interviewlens-mobile.png"), full_page=True, animations="disabled")
    print("VERIFIED: landing page, seeded demo report, real video and three browser screenshots")
    browser.close()
