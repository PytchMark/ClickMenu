#!/usr/bin/env python3

import requests
import sys
from datetime import datetime
import json

class QuickMenuJAComprehensiveTester:
    def __init__(self, base_url="https://menu-items-debug.preview.emergentagent.com"):
        self.base_url = base_url.rstrip('/')
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.token = None
        
    def run_test(self, name, method, endpoint, expected_status=200, data=None, headers=None, expect_json=True):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        self.tests_run += 1
        
        if headers is None:
            headers = {'Content-Type': 'application/json'}
            
        # Add token if we have one
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.token}'
            
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
                
                # Try to parse JSON response if expected
                response_data = {}
                if expect_json:
                    try:
                        response_data = response.json()
                        if isinstance(response_data, dict):
                            print(f"   Response keys: {list(response_data.keys())}")
                            if 'ok' in response_data:
                                print(f"   OK status: {response_data.get('ok')}")
                    except:
                        print(f"   Response (first 100 chars): {response.text[:100]}")
                else:
                    print(f"   Response (first 100 chars): {response.text[:100]}")
                    
                self.test_results.append({
                    'test': name,
                    'status': 'PASS',
                    'expected': expected_status,
                    'actual': response.status_code,
                    'url': url
                })
                return True, response_data
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
        
    def test_merchant_login(self, identifier="TASTE1", passcode="demo123"):
        """Test merchant login with provided credentials"""
        success, response = self.run_test(
            "Merchant Login",
            "POST",
            "/api/merchant/login",
            200,
            data={
                "identifier": identifier,
                "passcode": passcode
            }
        )
        
        if success and response.get('token'):
            self.token = response['token']
            print(f"   🔑 Token obtained successfully")
            print(f"   👤 Merchant: {response.get('merchant', {}).get('name', 'Unknown')}")
            print(f"   📋 Plan: {response.get('merchant', {}).get('plan', 'Unknown')}")
            return True, response
        return False, {}
        
    def test_merchant_profile(self):
        """Test getting merchant profile (requires login)"""
        if not self.token:
            print("❌ Cannot test profile - no token available")
            return False, {}
            
        return self.run_test(
            "Merchant Profile",
            "GET",
            "/api/merchant/me",
            200
        )
        
    def test_merchant_menu(self):
        """Test getting merchant menu items"""
        if not self.token:
            print("❌ Cannot test menu - no token available")
            return False, {}
            
        return self.run_test(
            "Merchant Menu Items",
            "GET",
            "/api/merchant/menu",
            200
        )
        
    def test_merchant_orders(self):
        """Test getting merchant orders"""
        if not self.token:
            print("❌ Cannot test orders - no token available")  
            return False, {}
            
        return self.run_test(
            "Merchant Orders",
            "GET", 
            "/api/merchant/orders",
            200
        )

def main():
    print("=" * 70)
    print("🧪 QuickMenuJA Comprehensive Backend Test Suite")
    print("=" * 70)
    
    tester = QuickMenuJAComprehensiveTester()
    
    # Test core API endpoints
    print("\n📡 Testing Core API Endpoints...")
    tester.test_health_endpoint()
    tester.test_config_endpoint()
    
    # Test merchant authentication and dashboard APIs
    print("\n🔐 Testing Merchant Authentication & Dashboard...")
    login_success, login_data = tester.test_merchant_login()
    
    if login_success:
        tester.test_merchant_profile()
        tester.test_merchant_menu()
        tester.test_merchant_orders()
    else:
        print("❌ Login failed - skipping authenticated endpoint tests")
    
    # Print summary
    print(f"\n{'='*70}")
    print(f"📊 Test Results Summary")
    print(f"{'='*70}")
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