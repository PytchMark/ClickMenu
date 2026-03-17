#!/usr/bin/env python3

import requests
import sys
from datetime import datetime
import json

class QuickMenuJAAPITester:
    def __init__(self, base_url="https://menu-items-debug.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.auth_token = None
        
    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None, use_auth=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        self.tests_run += 1
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        # Add auth token if requested and available
        if use_auth and self.auth_token:
            headers['Authorization'] = f'Bearer {self.auth_token}'
            
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        if use_auth:
            print(f"   Auth: {'Yes' if self.auth_token else 'No token available'}")
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method.upper() == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=10)
            else:
                print(f"❌ Unsupported method: {method}")
                return False, {}
                
            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                
                # Try to parse JSON response
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict):
                        print(f"   Response keys: {list(response_data.keys())}")
                        if 'ok' in response_data:
                            print(f"   OK status: {response_data.get('ok')}")
                        return success, response_data
                    else:
                        return success, response_data
                except:
                    print(f"   Response (first 100 chars): {response.text[:100]}")
                    return success, response.text
                    
                self.test_results.append({
                    'test': name,
                    'status': 'PASS',
                    'expected': expected_status,
                    'actual': response.status_code,
                    'url': url
                })
                return True, response.json() if response.content else {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                self.test_results.append({
                    'test': name,
                    'status': 'FAIL',
                    'expected': expected_status,
                    'actual': response.status_code,
                    'url': url,
                    'error': response.text[:200]
                })
                return False, {}
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            self.test_results.append({
                'test': name,
                'status': 'ERROR',
                'expected': expected_status,
                'actual': 'Network Error',
                'url': url,
                'error': str(e)
            })
            return False, {}
            
    def test_health_endpoint(self):
        """Test /api/health endpoint"""
        return self.run_test(
            "Health Check",
            "GET",
            "/api/health",
            200
        )
        
    def test_config_endpoint(self):
        """Test /api/config endpoint"""
        return self.run_test(
            "Brand Config",
            "GET", 
            "/api/config",
            200
        )
        
    def test_merchant_page_load(self):
        """Test merchant page loads"""
        return self.run_test(
            "Merchant Page Load",
            "GET",
            "/merchant",
            200
        )
        
    def test_public_css_load(self):
        """Test CSS file loads"""
        return self.run_test(
            "CSS File Load",
            "GET",
            "/public/assets/css/merchant.css",
            200
        )
        
    def test_config_js_load(self):
        """Test config.js loads"""
        return self.run_test(
            "Config JS Load", 
            "GET",
            "/public/assets/js/config.js",
            200
        )
        
    def test_merchant_login(self):
        """Test merchant login with TASTE1/demo123"""
        login_data = {
            "identifier": "TASTE1",
            "passcode": "demo123"
        }
        success, response = self.run_test(
            "Merchant Login (TASTE1/demo123)",
            "POST",
            "/api/merchant/login",
            200,
            login_data
        )
        
        if success and response.get('ok') and response.get('token'):
            self.merchant_token = response['token']
            print(f"   🔑 Login successful, token acquired")
            return True, response
        else:
            print(f"   ❌ Login failed or missing token")
            return False, {}
            
    def test_qr_code_endpoint(self):
        """Test QR Code generation endpoint"""
        if not hasattr(self, 'merchant_token'):
            print("   ❌ No merchant token available, skipping test")
            return False, {}
            
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.merchant_token}'
        }
        
        success, response = self.run_test(
            "QR Code Generation",
            "GET",
            "/api/merchant/qr-code",
            200,
            headers=headers
        )
        
        if success:
            if response.get('ok') and response.get('qrCode'):
                print(f"   ✅ QR Code data received")
                if response.get('storefrontUrl'):
                    print(f"   📱 Storefront URL: {response['storefrontUrl']}")
                return True, response
            else:
                print(f"   ❌ QR Code response missing required fields")
                return False, {}
        return False, {}
        
    def test_reviews_get_endpoint(self):
        """Test get reviews endpoint for a store"""
        store_id = "TASTE1"
        success, response = self.run_test(
            f"Get Store Reviews ({store_id})",
            "GET",
            f"/api/public/store/{store_id}/reviews",
            200
        )
        
        if success and response.get('ok'):
            print(f"   ✅ Reviews endpoint accessible")
            reviews = response.get('reviews', [])
            stats = response.get('stats', {})
            print(f"   📊 Found {len(reviews)} reviews")
            print(f"   ⭐ Average rating: {stats.get('averageRating', 0)}")
            return True, response
        return False, {}
        
    def test_reviews_post_endpoint(self):
        """Test creating a new review"""
        store_id = "TASTE1"
        review_data = {
            "rating": 5,
            "comment": "Amazing food! Test review from automated test.",
            "customerName": "Test Customer"
        }
        
        success, response = self.run_test(
            f"Submit Review ({store_id})",
            "POST",
            f"/api/public/store/{store_id}/reviews",
            200,
            review_data
        )
        
        if success and response.get('ok'):
            review = response.get('review', {})
            print(f"   ✅ Review created successfully")
            print(f"   ⭐ Rating: {review.get('rating')}")
            print(f"   👤 Customer: {review.get('customer_name')}")
            return True, response
        return False, {}
        
    def test_merchant_reviews_endpoint(self):
        """Test merchant reviews endpoint"""
        if not hasattr(self, 'merchant_token'):
            print("   ❌ No merchant token available, skipping test")
            return False, {}
            
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.merchant_token}'
        }
        
        success, response = self.run_test(
            "Merchant Reviews Dashboard",
            "GET",
            "/api/merchant/reviews",
            200,
            headers=headers
        )
        
        if success and response.get('ok'):
            reviews = response.get('reviews', [])
            stats = response.get('stats', {})
            print(f"   ✅ Merchant can access reviews")
            print(f"   📊 Reviews count: {len(reviews)}")
            print(f"   ⭐ Average rating: {stats.get('averageRating', 0)}")
            return True, response
        return False, {}
        
    def test_menu_management(self):
        """Test full menu management workflow"""
        # Test 1: Get existing menu items
        success, data = self.run_test(
            "Get Menu Items",
            "GET",
            "/api/merchant/items",
            use_auth=True
        )
        
        existing_items = []
        if success and data.get('items'):
            existing_items = data['items']
            print(f"   📋 Found {len(existing_items)} existing items")
            for item in existing_items[:3]:
                print(f"   - {item.get('title', 'Unknown')} (${item.get('price', 0)})")
        
        # Test 2: Create a new menu item
        current_time = datetime.now().strftime("%H%M%S")
        new_item = {
            "item_id": f"TEST-{current_time}",
            "title": "Test Jerk Chicken Special",
            "description": "Spicy jerk chicken with rice and peas - Test automation item",
            "category": "Lunch",
            "price": 18.99,
            "status": "available",
            "featured": True,
            "labels": ["Test", "Automation", "New"]
        }
        
        success, data = self.run_test(
            "Create New Menu Item",
            "POST",
            "/api/merchant/items",
            data=new_item,
            use_auth=True
        )
        
        created_item_id = None
        if success and data.get('item'):
            created_item = data['item']
            created_item_id = created_item.get('item_id')
            print(f"   ✅ Created item: {created_item.get('title')} (ID: {created_item_id})")
            print(f"   💰 Price: ${created_item.get('price')}")
            
            # Test 3: Update the created item
            update_data = {
                "price": 19.99,
                "status": "limited",
                "description": "Updated description - Spicy jerk chicken (LIMITED AVAILABILITY)"
            }
            
            success, update_response = self.run_test(
                "Update Menu Item",
                "PATCH", 
                f"/api/merchant/items/{created_item_id}",
                data=update_data,
                use_auth=True
            )
            
            if success and update_response.get('item'):
                updated_item = update_response['item']
                print(f"   ✅ Updated item price: ${updated_item.get('price')}")
                print(f"   📦 Updated status: {updated_item.get('status')}")
        
        # Test 4: Verify the item appears in the list
        success, final_data = self.run_test(
            "Verify Updated Menu List",
            "GET",
            "/api/merchant/items",
            use_auth=True
        )
        
        if success and final_data.get('items'):
            final_items = final_data['items']
            print(f"   📋 Final count: {len(final_items)} items")
            
            if created_item_id:
                test_item = next((item for item in final_items if item.get('item_id') == created_item_id), None)
                if test_item:
                    print(f"   ✅ Test item verified in list:")
                    print(f"      Title: {test_item.get('title')}")
                    print(f"      Price: ${test_item.get('price')}")
                    print(f"      Status: {test_item.get('status')}")
                else:
                    print(f"   ⚠️ Test item with ID {created_item_id} not found in final list")

def main():
    print("=" * 60)
    print("🧪 QuickMenuJA Backend API Test Suite")
    print("=" * 60)
    
    tester = QuickMenuJAAPITester()
    
    # Test core API endpoints
    print("\n📡 Testing Core API Endpoints...")
    tester.test_health_endpoint()
    tester.test_config_endpoint()
    
    # Test static assets
    print("\n📁 Testing Static Assets...")
    tester.test_merchant_page_load()
    tester.test_public_css_load()
    tester.test_config_js_load()
    
    # Test authentication and protected endpoints
    print("\n🔐 Testing Authentication & Protected Endpoints...")
    login_success, login_data = tester.test_merchant_login()
    
    if login_success and 'token' in login_data:
        tester.auth_token = login_data['token']
        print(f"   🔑 Auth token set: {tester.auth_token[:20]}...")
        
        # Test menu management functionality
        print("\n🍽️ Testing Menu Management...")
        tester.test_menu_management()
    
    # Test QR Code functionality
    print("\n📱 Testing QR Code Functionality...")
    tester.test_qr_code_endpoint()
    
    # Test Reviews functionality
    print("\n⭐ Testing Reviews Functionality...")
    tester.test_reviews_get_endpoint()
    tester.test_reviews_post_endpoint()
    tester.test_merchant_reviews_endpoint()
    
    # Print summary
    print(f"\n{'='*60}")
    print(f"📊 Test Results Summary")
    print(f"{'='*60}")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    # Print detailed results
    print(f"\n📋 Detailed Results:")
    for result in tester.test_results:
        status_emoji = "✅" if result['status'] == 'PASS' else "❌" 
        print(f"{status_emoji} {result['test']}: {result['status']}")
        if result['status'] != 'PASS':
            print(f"    Expected: {result['expected']}, Got: {result['actual']}")
            if 'error' in result:
                print(f"    Error: {result['error']}")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())