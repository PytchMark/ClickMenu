#!/usr/bin/env python3

import requests
import sys
from datetime import datetime
import json

class QuickMenuJAAPITester:
    def __init__(self, base_url="https://luxe-dashboard-test.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        self.tests_run += 1
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
            
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method.upper() == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method.upper() == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
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
                except:
                    print(f"   Response (first 100 chars): {response.text[:100]}")
                    
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
    tester.test_merchant_login()
    
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