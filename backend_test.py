import requests
import sys
import json
from datetime import datetime

class CrownFlowAPITester:
    def __init__(self, base_url="https://flow-foundation.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test_result(self, test_name, success, status_code, expected_status, response_data=None, error=None):
        """Log test result for reporting"""
        result = {
            "test_name": test_name,
            "success": success,
            "status_code": status_code,
            "expected_status": expected_status,
            "timestamp": datetime.now().isoformat(),
            "response_data": response_data,
            "error": str(error) if error else None
        }
        self.test_results.append(result)

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}
        
        if self.token and 'Authorization' not in headers:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        print(f"   Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                print(f"❌ Unsupported method: {method}")
                return False, {}

            print(f"   Status Code: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json() if response.content else {}
                print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
            except:
                response_data = {"raw_response": response.text[:200] if response.text else ""}
                print(f"   Raw Response: {response.text[:200]}...")

            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                if response_data.get('detail'):
                    print(f"   Error Detail: {response_data['detail']}")

            self.log_test_result(name, success, response.status_code, expected_status, response_data)
            return success, response_data

        except requests.exceptions.Timeout:
            error = "Request timeout"
            print(f"❌ FAILED - {error}")
            self.log_test_result(name, False, None, expected_status, error=error)
            return False, {}
        except requests.exceptions.ConnectionError as e:
            error = f"Connection error: {str(e)}"
            print(f"❌ FAILED - {error}")
            self.log_test_result(name, False, None, expected_status, error=error)
            return False, {}
        except Exception as e:
            error = f"Unexpected error: {str(e)}"
            print(f"❌ FAILED - {error}")
            self.log_test_result(name, False, None, expected_status, error=error)
            return False, {}

    def test_health_check(self):
        """Test the health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET",
            "api/health",
            200
        )
        return success and response.get('status') == 'healthy'

    def test_api_root(self):
        """Test the API root endpoint"""
        success, response = self.run_test(
            "API Root",
            "GET", 
            "api/",
            200
        )
        return success and 'CrownFlow API' in response.get('message', '')

    def test_auth_session_endpoint_exists(self):
        """Test that auth session endpoint exists (without valid session_id)"""
        success, response = self.run_test(
            "Auth Session Endpoint (Invalid Request)",
            "POST",
            "api/auth/session",
            422,  # Expecting validation error for missing session_id
            data={}
        )
        return success  # We expect this to fail with 422, which means endpoint exists

    def test_auth_session_with_invalid_session(self):
        """Test auth session with invalid session_id"""
        success, response = self.run_test(
            "Auth Session (Invalid Session ID)",
            "POST", 
            "api/auth/session",
            401,  # Expecting 401 for invalid session
            data={"session_id": "invalid_session_123"}
        )
        return success

    def test_auth_me_unauthorized(self):
        """Test /me endpoint without authentication"""
        success, response = self.run_test(
            "Get Current User (Unauthorized)",
            "GET",
            "api/auth/me", 
            401  # Should be unauthorized
        )
        return success

    def test_business_endpoints_unauthorized(self):
        """Test business endpoints without authentication"""
        # Test business creation without auth
        success1, _ = self.run_test(
            "Create Business (Unauthorized)",
            "POST",
            "api/business",
            401,
            data={"name": "Test Barbershop", "slug": "test-barbershop"}
        )
        
        # Test get my business without auth  
        success2, _ = self.run_test(
            "Get My Business (Unauthorized)",
            "GET",
            "api/business/me",
            401
        )
        
        return success1 and success2

    def test_business_by_slug_not_found(self):
        """Test getting business by non-existent slug"""
        success, response = self.run_test(
            "Get Business by Slug (Not Found)",
            "GET",
            "api/business/nonexistent-slug",
            404
        )
        return success and 'não encontrada' in response.get('detail', '').lower()

    def test_logout_without_session(self):
        """Test logout without valid session"""
        success, response = self.run_test(
            "Logout (No Session)",
            "POST",
            "api/auth/logout",
            200  # Should still return success message
        )
        return success

    def test_services_unauthorized(self):
        """Test services endpoints without authentication"""
        # Test list services without auth
        success1, _ = self.run_test(
            "List Services (Unauthorized)",
            "GET",
            "api/services",
            401
        )
        
        # Test create service without auth
        success2, _ = self.run_test(
            "Create Service (Unauthorized)",
            "POST",
            "api/services",
            401,
            data={"name": "Test Service", "price": 50.0, "duration_minutes": 30}
        )
        
        return success1 and success2

    def test_barbers_unauthorized(self):
        """Test barbers endpoints without authentication"""
        # Test list barbers without auth
        success1, _ = self.run_test(
            "List Barbers (Unauthorized)",
            "GET",
            "api/barbers",
            401
        )
        
        # Test create barber without auth
        success2, _ = self.run_test(
            "Create Barber (Unauthorized)",
            "POST",
            "api/barbers",
            401,
            data={"name": "Test Barber", "specialty": "Hair Cut"}
        )
        
        return success1 and success2

    def test_appointments_unauthorized(self):
        """Test appointments endpoints without authentication"""
        # Test list appointments without auth
        success1, _ = self.run_test(
            "List Appointments (Unauthorized)",
            "GET",
            "api/appointments",
            401
        )
        
        # Test get stats without auth
        success2, _ = self.run_test(
            "Get Appointment Stats (Unauthorized)",
            "GET",
            "api/appointments/stats",
            401
        )
        
        # Test today's appointments without auth
        success3, _ = self.run_test(
            "Get Today Appointments (Unauthorized)",
            "GET",
            "api/appointments/today",
            401
        )
        
        return success1 and success2 and success3

    def test_public_apis_no_business(self):
        """Test public APIs with non-existent business slug"""
        slug = "nonexistent-business"
        
        # Test public services
        success1, _ = self.run_test(
            "Public Services (Business Not Found)",
            "GET",
            f"api/public/{slug}/services",
            404
        )
        
        # Test public barbers
        success2, _ = self.run_test(
            "Public Barbers (Business Not Found)",
            "GET",
            f"api/public/{slug}/barbers",
            404
        )
        
        # Test public slots
        success3, _ = self.run_test(
            "Public Slots (Business Not Found)",
            "GET",
            f"api/public/{slug}/slots?barber_id=test&service_id=test&date=2024-01-01",
            404
        )
        
        # Test public booking
        success4, _ = self.run_test(
            "Public Book (Business Not Found)",
            "POST",
            f"api/public/{slug}/book",
            404,
            data={
                "service_id": "test",
                "barber_id": "test", 
                "appointment_date": "2024-01-01",
                "appointment_time": "10:00",
                "client_name": "Test Client",
                "client_phone": "123456789"
            }
        )
        
        return success1 and success2 and success3 and success4

    def test_existing_business_flow_foundation(self):
        """Test if flow-foundation business exists and check its public APIs"""
        slug = "flow-foundation"
        
        print(f"\n📊 Testing existing business: {slug}")
        
        # Test get business by slug
        success1, business_data = self.run_test(
            f"Get Business {slug}",
            "GET",
            f"api/business/{slug}",
            200
        )
        
        if not success1:
            print(f"⚠️  Business {slug} not found, skipping public API tests")
            return True  # Don't fail if business doesn't exist yet
        
        # If business exists, test its public APIs
        # Test public services
        success2, services_data = self.run_test(
            f"Public Services for {slug}",
            "GET",
            f"api/public/{slug}/services", 
            200
        )
        
        # Test public barbers
        success3, barbers_data = self.run_test(
            f"Public Barbers for {slug}",
            "GET",
            f"api/public/{slug}/barbers",
            200
        )
        
        # Only test slots if we have services and barbers
        if (success2 and success3 and 
            isinstance(services_data, list) and len(services_data) > 0 and
            isinstance(barbers_data, list) and len(barbers_data) > 0):
            
            service_id = services_data[0].get('id')
            barber_id = barbers_data[0].get('id')
            
            if service_id and barber_id:
                success4, _ = self.run_test(
                    f"Public Slots for {slug}",
                    "GET",
                    f"api/public/{slug}/slots?barber_id={barber_id}&service_id={service_id}&date=2024-12-25",
                    200
                )
            else:
                success4 = True
                print("⚠️  No valid service/barber IDs found, skipping slots test")
        else:
            success4 = True
            print("⚠️  No services/barbers found, skipping slots test")
        
        return success1 and success2 and success3 and success4

def main():
    print("🚀 Starting CrownFlow API Tests")
    print("=" * 50)
    
    tester = CrownFlowAPITester()
    
    # Core API Tests
    print("\n📊 CORE API TESTS")
    health_ok = tester.test_health_check()
    root_ok = tester.test_api_root()
    
    # Authentication Tests
    print("\n🔐 AUTHENTICATION TESTS")
    auth_endpoint_ok = tester.test_auth_session_endpoint_exists()
    auth_invalid_ok = tester.test_auth_session_with_invalid_session()
    me_unauth_ok = tester.test_auth_me_unauthorized()
    logout_ok = tester.test_logout_without_session()
    
    # Business Tests  
    print("\n🏪 BUSINESS TESTS")
    business_unauth_ok = tester.test_business_endpoints_unauthorized()
    business_not_found_ok = tester.test_business_by_slug_not_found()
    
    # Summary
    print("\n" + "=" * 50)
    print(f"📊 FINAL RESULTS")
    print(f"Tests Run: {tester.tests_run}")
    print(f"Tests Passed: {tester.tests_passed}")
    print(f"Success Rate: {(tester.tests_passed/tester.tests_run*100):.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 ALL TESTS PASSED!")
        return_code = 0
    else:
        print("❌ Some tests failed!")
        print("\n🔍 FAILED TESTS:")
        for result in tester.test_results:
            if not result['success']:
                print(f"  - {result['test_name']}: Expected {result['expected_status']}, got {result['status_code']}")
                if result['error']:
                    print(f"    Error: {result['error']}")
        return_code = 1
    
    # Save detailed results
    with open('/app/backend_test_results.json', 'w') as f:
        json.dump({
            'summary': {
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'success_rate': tester.tests_passed/tester.tests_run*100 if tester.tests_run > 0 else 0
            },
            'detailed_results': tester.test_results
        }, f, indent=2)
    
    print(f"\n💾 Detailed results saved to /app/backend_test_results.json")
    return return_code

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)