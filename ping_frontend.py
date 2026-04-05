# pip install playwright
# playwright install
from playwright.sync_api import sync_playwright

def trigger_via_react(lat, lng):
    url = f"http://localhost:5173/sos-minimal?lat={lat}&lng={lng}"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        print(f"Opening React URL: {url}")
        page.goto(url)
        # Wait for React to finish the SpacetimeDB connection and show success
        page.wait_for_selector("text=SOS Sent Successfully") 
        print("✅ React executed the database trigger!")
        browser.close()


trigger_via_react(23.289309, 80.151443)