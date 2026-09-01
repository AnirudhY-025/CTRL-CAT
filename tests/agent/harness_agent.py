import os
from dotenv import load_dotenv
from playwright.sync_api import sync_playwright
from openai import OpenAI

# Load environment variables from the .env file securely
load_dotenv()

def run_agent_test():
    print("[AGENT] Waking up Harness Agent...")
    
    # 1. Start the Browser
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # 2. Navigate to your Next.js Frontend
        target_url = "http://localhost:3000"
        print(f"[NETWORK] Navigating to {target_url}...")
        
        try:
            page.goto(target_url, timeout=10000)
            page.wait_for_load_state("networkidle")
            
            # 3. Extract what the Agent "Sees"
            visible_text = page.locator("body").inner_text()
            
            print("[SCAN] Agent has scanned the page. Analyzing with LLM...")
            
            # 4. Ask the LLM to evaluate the page state
            # The client automatically picks up os.environ.get("OPENAI_API_KEY")
            client = OpenAI()
            prompt = f"""
            You are an automated QA Agent testing a Heavy Equipment Rental Dashboard.
            Your goal is to verify that the site is running correctly and displaying data.
            
            Here is the visible text extracted from the homepage:
            ---
            {visible_text}
            ---
            
            Analyze the text and answer the following:
            1. Did the page load successfully (no 404, 500, or blank screen)?
            2. Does it look like the equipment or machine learning data is rendering properly?
            3. Are there any visible error messages?
            
            Respond with a clear PASS or FAIL, followed by your reasoning.
            """
            
            response = client.chat.completions.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0
            )
            
            # 5. Output the Result
            result = response.choices[0].message.content
            print("\n==================================")
            print("[RESULT] TEST RESULT:")
            print("==================================")
            print(result)
            
        except Exception as e:
            print(f"[ERROR] Agent encountered a critical error trying to load the site: {e}")
            
        finally:
            browser.close()

if __name__ == "__main__":
    run_agent_test()
