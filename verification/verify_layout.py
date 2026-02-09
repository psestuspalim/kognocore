from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Set viewport to desktop size
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        page.on("console", lambda msg: print(f"PAGE LOG: {msg.text}"))
        page.on("pageerror", lambda err: print(f"PAGE ERROR: {err}"))

        print("Navigating to login page...")
        page.goto("http://localhost:5173/login")

        # Wait for login form
        try:
            page.wait_for_selector('input[type="text"]', timeout=10000)
        except Exception as e:
            print(f"Login page load failed: {e}")
            page.screenshot(path="verification/error_login_load.png")
            browser.close()
            return

        print("Logging in as student...")
        # Fill credentials
        page.fill('input[type="text"]', 'student')
        page.fill('input[type="password"]', 'student')

        # Click login button
        page.click('button[type="submit"]')

        # Wait for navigation to home (Quizzes)
        print("Waiting for navigation to home...")
        try:
            page.wait_for_url("http://localhost:5173/", timeout=10000)
        except Exception as e:
            print(f"Navigation failed or timed out: {e}")
            page.screenshot(path="verification/error_login.png")
            browser.close()
            return

        print("Waiting for UserShell elements...")
        # Wait for UserShell elements to appear
        try:
            # Check for sidebar title "Axayak"
            page.wait_for_selector('text=Axayak', timeout=5000)

            # Check for sidebar items
            page.wait_for_selector('text=Inicio', timeout=5000)
            page.wait_for_selector('text=Progreso', timeout=5000)
            page.wait_for_selector('text=Ranking', timeout=5000)

            # Check for user profile
            page.wait_for_selector('text=student', timeout=5000)

            print("UserShell elements found.")
        except Exception as e:
            print(f"Failed to find UserShell elements: {e}")

        # Take screenshot of the desktop view
        time.sleep(2) # Wait for animations/loading
        page.screenshot(path="verification/user_shell_desktop.png")
        print("Screenshot taken: verification/user_shell_desktop.png")

        browser.close()

if __name__ == "__main__":
    run()
