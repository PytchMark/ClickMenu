#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class StorefrontBackendTester:
    def __init__(self, base_url="https://profile-builder-264.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        
        # Test with TASTE1 store as mentioned in review request
        self.test_store_id = "TASTE1"

    def run_test(self, name, method, endpoint, expected_status, params=None, data=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        if params:
            param_str = "&".join([f"{k}={v}" for k, v in params.items()])
            url += f"?{param_str}"
            
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_combined_menu(self):
        """Test the main API endpoint used by storefront"""
        success, response = self.run_test(
            "Combined Menu API (storeIds=TASTE1)",
            "GET", 
            "public/menu",
            200,
            params={"storeIds": self.test_store_id}
        )
        
        if success and response:
            print(f"   Response structure: {list(response.keys())}")
            if 'stores' in response:
                stores = response.get('stores', [])
                print(f"   Found {len(stores)} stores")
                if stores:
                    store = stores[0]
                    print(f"   Store name: {store.get('name', 'N/A')}")
                    print(f"   Store ID: {store.get('store_id', 'N/A')}")
                    print(f"   Store status: {store.get('status', 'N/A')}")
            
            if 'items' in response:
                items = response.get('items', [])
                print(f"   Found {len(items)} menu items")
                if items:
                    print(f"   Sample item: {items[0].get('title', 'N/A')} - {items[0].get('price', 'N/A')}")
        
        return success

    def test_individual_store(self):
        """Test getting individual store info"""
        return self.run_test(
            f"Individual Store API ({self.test_store_id})",
            "GET",
            f"public/store/{self.test_store_id}",
            200
        )

    def test_store_menu(self):
        """Test getting store menu"""
        success, response = self.run_test(
            f"Store Menu API ({self.test_store_id})",
            "GET",
            f"public/store/{self.test_store_id}/menu",
            200
        )
        
        if success and response:
            items = response.get('items', [])
            print(f"   Menu items found: {len(items)}")
            for item in items[:3]:  # Show first 3 items
                print(f"   - {item.get('title', 'N/A')} ({item.get('category', 'N/A')}) - ${item.get('price', 'N/A')}")
        
        return success

    def test_create_order(self):
        """Test creating an order"""
        test_order = {
            "customerName": "Test Customer",
            "customerPhone": "+18765551234",
            "customerEmail": "test@example.com",
            "notes": "Test order from automated testing",
            "fulfillmentMethod": "pickup",
            "parish": "Kingston",
            "locationDetails": "Test location",
            "preferredTime": "ASAP",
            "items": [
                {
                    "itemId": "ITEM-001",
                    "title": "Test Item",
                    "qty": 1,
                    "price": 18.99
                }
            ]
        }
        
        success, response = self.run_test(
            "Create Order API",
            "POST",
            f"public/store/{self.test_store_id}/orders",
            200,
            data=test_order
        )
        
        if success and response:
            request_data = response.get('request', {})
            print(f"   Order ID: {request_data.get('request_id', 'N/A')}")
            print(f"   Status: {request_data.get('status', 'N/A')}")
        
        return success

    def run_all_tests(self):
        """Run all storefront backend tests"""
        print("=" * 70)
        print("🏪 QuickMenuJA Storefront Backend API Testing")
        print("=" * 70)
        print(f"Base URL: {self.base_url}")
        print(f"Test Store ID: {self.test_store_id}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Test sequence - focusing on storefront functionality
        tests = [
            ("Combined Menu (Main Storefront API)", self.test_combined_menu),
            ("Individual Store Info", self.test_individual_store), 
            ("Store Menu Items", self.test_store_menu),
            ("Create Order", self.test_create_order),
        ]
        
        for test_name, test_func in tests:
            try:
                test_func()
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
        
        # Print results
        print("\n" + "=" * 70)
        print("🎯 STOREFRONT API TEST RESULTS")
        print("=" * 70)
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Tests Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed / self.tests_run * 100):.1f}%" if self.tests_run > 0 else "0%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All storefront API tests passed!")
            return 0
        else:
            print("⚠️  Some storefront API tests failed")
            return 1

def main():
    tester = StorefrontBackendTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())