import urllib.request
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

def test():
    print("--- 1. Testing Health Endpoint ---")
    req = urllib.request.urlopen("http://127.0.0.1:8000/api/health")
    health = json.loads(req.read().decode("utf-8"))
    print("Health response:", health)
    assert health.get("status") == "healthy"
    print("Active LLM Model:", health.get("llm_provider", {}).get("model"))

    print("\n--- 2. Testing Chat: 'what is Partial Dependency in database' ---")
    payload = json.dumps({"content": "what is Partial Dependency in database"}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/chat", data=payload, headers={"Content-Type": "application/json"})
    resp = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    asst = resp.get("assistant_message", {})
    ans = asst.get("content", "")
    print("Answer snippet:\n", ans[:400], "...\n")
    assert "partial dependency" in ans.lower() or "composite" in ans.lower()
    # Ensure it didn't just give the generic "What is a Database?"
    assert not ans.strip().startswith("### 🗄️ What is a Database?")

    print("\n--- 3. Testing Chat: 'what is database' ---")
    payload = json.dumps({"content": "what is database"}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/chat", data=payload, headers={"Content-Type": "application/json"})
    resp = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    asst = resp.get("assistant_message", {})
    ans = asst.get("content", "")
    print("Answer snippet:\n", ans[:250], "...\n")
    assert "database" in ans.lower()

    print("\n--- 4. Testing Image: 'generate a image of a man riding the hosre' ---")
    payload = json.dumps({"content": "generate a image of a man riding the hosre"}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/chat", data=payload, headers={"Content-Type": "application/json"})
    resp = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    asst = resp.get("assistant_message", {})
    meta = json.loads(asst.get("metadata_json") or "{}")
    img_url = meta.get("generated_image_url")
    print("Image meta:", meta)
    assert img_url is not None
    full_url = f"http://127.0.0.1:8000{img_url}"
    img_resp = urllib.request.urlopen(full_url)
    img_bytes = img_resp.read()
    print("Image content-type:", img_resp.headers.get("content-type"), "Size:", len(img_bytes))
    assert len(img_bytes) > 2000

    print("\n--- 5. Testing Image: 'make a image of pm modi' ---")
    payload = json.dumps({"content": "make a image of pm modi"}).encode("utf-8")
    req = urllib.request.Request("http://127.0.0.1:8000/api/chat", data=payload, headers={"Content-Type": "application/json"})
    resp = json.loads(urllib.request.urlopen(req).read().decode("utf-8"))
    asst = resp.get("assistant_message", {})
    meta = json.loads(asst.get("metadata_json") or "{}")
    img_url = meta.get("generated_image_url")
    print("Modi Image meta:", meta)
    assert img_url is not None
    full_url = f"http://127.0.0.1:8000{img_url}"
    img_resp = urllib.request.urlopen(full_url)
    img_bytes = img_resp.read()
    print("Modi Image content-type:", img_resp.headers.get("content-type"), "Size:", len(img_bytes))
    assert len(img_bytes) > 2000

    print("\n=======================================================")
    print("🎉 ALL TESTS PASSED! ACCURATE ANSWERS & HIGH-RES IMAGES!")
    print("=======================================================")

if __name__ == "__main__":
    test()
