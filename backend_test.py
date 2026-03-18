#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class BackendTester:
    def __init__(self, base_url="https://menu-items-debug.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test merchant credentials
        self.test_store_id = "TASTE1"
        self.test_passcode = "demo123"

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if response_data.get('ok'):
                        print(f"   Response OK: {response_data.get('ok')}")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health(self):
        """Test the health endpoint"""
        return self.run_test("Health Check", "GET", "health", 200)

    def test_merchant_login(self):
        """Test merchant login"""
        success, response = self.run_test(
            "Merchant Login",
            "POST",
            "merchant/login",
            200,
            data={
                "identifier": self.test_store_id,
                "passcode": self.test_passcode
            }
        )
        if success and response.get('token'):
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_merchant_me(self):
        """Test getting merchant profile"""
        if not self.token:
            print("❌ No token available for authentication")
            return False
        return self.run_test("Get Merchant Profile", "GET", "merchant/me", 200)

    def test_merchant_menu(self):
        """Test getting merchant menu"""
        if not self.token:
            print("❌ No token available for authentication")
            return False
        return self.run_test("Get Merchant Menu", "GET", "merchant/menu", 200)

    def test_merchant_orders(self):
        """Test getting merchant orders"""
        if not self.token:
            print("❌ No token available for authentication")
            return False
        return self.run_test("Get Merchant Orders", "GET", "merchant/orders", 200)

    def test_save_menu_item(self):
        """Test saving a new menu item"""
        if not self.token:
            print("❌ No token available for authentication")
            return False
        
        test_item = {
            "item_id": "TEST-ITEM-001",
            "title": "Test Curry Chicken",
            "description": "Delicious curry chicken with rice and peas",
            "category": "Lunch",
            "price": 15.99,
            "status": "available",
            "featured": True,
            "labels": ["Spicy", "Top Pick"],
            "image_url": "",
            "video_url": ""
        }
        
        return self.run_test("Save Menu Item", "POST", "merchant/menu", 200, data=test_item)

    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("🧪 QuickMenuJA Backend API Testing")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Test Store ID: {self.test_store_id}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health),
            ("Merchant Login", self.test_merchant_login),
            ("Merchant Profile", self.test_merchant_me),
            ("Merchant Menu", self.test_merchant_menu),
            ("Merchant Orders", self.test_merchant_orders),
            ("Save Menu Item", self.test_save_menu_item),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
        
        # Print results
        print("\n" + "=" * 60)
        print("🎯 TEST RESULTS")
        print("=" * 60)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed")
            return 1

def main():
    tester = BackendTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())