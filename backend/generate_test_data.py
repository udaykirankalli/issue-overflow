import requests
import time

API_URL = "http://localhost:8000"

TEST_ISSUES = [
    "Motor overheating after 3 hours",
    "PCB board version 2 failed QA",
    "Delay in shipment from vendor Acme",
    "Voltage drop at node A causing errors",
    "Critical pump failure in line A",
    "Solder defects in batch 450",
    "Material shortage in production",
    "Network issues in Zone 3",
    "Conveyor belt vibration detected",
    "Assembly tolerance out of spec",
]

print("🚀 Generating test data...")
print("=" * 50)

for i, issue in enumerate(TEST_ISSUES, 1):
    try:
        response = requests.post(
            f"{API_URL}/issues",
            json={"text": issue},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"✅ [{i:2d}/10] {data['category']:15s} → {issue[:40]}")
        time.sleep(0.3)
    except Exception as e:
        print(f"❌ [{i:2d}/10] Failed: {issue[:40]}")

print("=" * 50)
print("✅ Done! View at http://localhost:3000")