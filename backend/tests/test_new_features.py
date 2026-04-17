"""
Backend API Tests for New Features - Iteration 2
Tests: Course Detail, Batch Detail, User Profile, Holidays, Fee Categories/Installments, Enhanced Dashboard
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@nexusinstitute.com"
ADMIN_PASSWORD = "Admin@123"

# Test data prefix for cleanup
TEST_PREFIX = "TEST_"


@pytest.fixture(scope="class")
def auth_session():
    """Create authenticated session for tests"""
    session = requests.Session()
    response = session.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=10
    )
    if response.status_code != 200:
        pytest.skip(f"Authentication failed: {response.text}")
    return session


class TestCourseDetail:
    """Course detail endpoint tests"""
    
    def test_get_course_detail(self, auth_session):
        """Test getting course detail with batches, students, materials, resources"""
        # First get a course
        courses_resp = auth_session.get(f"{BASE_URL}/api/courses")
        assert courses_resp.status_code == 200
        courses = courses_resp.json()
        
        if not courses:
            pytest.skip("No courses available")
        
        course_id = courses[0]["course_id"]
        response = auth_session.get(f"{BASE_URL}/api/courses/{course_id}/detail")
        assert response.status_code == 200, f"Course detail failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "course_id" in data
        assert "name" in data
        assert "batches" in data
        assert "students" in data
        assert "materials" in data
        assert "resources" in data
        assert "assignments" in data
        assert "total_students" in data
        assert "total_batches" in data
        assert isinstance(data["batches"], list)
        assert isinstance(data["students"], list)
        print(f"Course detail: {data['name']} - {data['total_batches']} batches, {data['total_students']} students")
    
    def test_course_detail_not_found(self, auth_session):
        """Test 404 for non-existent course"""
        response = auth_session.get(f"{BASE_URL}/api/courses/nonexistent_course/detail")
        assert response.status_code == 404
        print("Non-existent course correctly returns 404")


class TestCourseResources:
    """Course resource CRUD tests"""
    
    def test_add_course_resource(self, auth_session):
        """Test adding a resource to a course"""
        # Get a course
        courses_resp = auth_session.get(f"{BASE_URL}/api/courses")
        courses = courses_resp.json()
        if not courses:
            pytest.skip("No courses available")
        
        course_id = courses[0]["course_id"]
        resource_data = {
            "course_id": course_id,
            "title": f"{TEST_PREFIX}Python Documentation",
            "url": "https://docs.python.org",
            "type": "link"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/courses/{course_id}/resources", json=resource_data)
        assert response.status_code == 200, f"Add resource failed: {response.text}"
        
        data = response.json()
        assert "resource_id" in data
        assert data["title"] == resource_data["title"]
        assert data["url"] == resource_data["url"]
        auth_session.test_resource_id = data["resource_id"]
        auth_session.test_course_id = course_id
        print(f"Resource added: {data['resource_id']}")
    
    def test_delete_course_resource(self, auth_session):
        """Test deleting a course resource"""
        if not hasattr(auth_session, 'test_resource_id'):
            pytest.skip("No test resource created")
        
        response = auth_session.delete(
            f"{BASE_URL}/api/courses/{auth_session.test_course_id}/resources/{auth_session.test_resource_id}"
        )
        assert response.status_code == 200
        print("Resource deleted successfully")


class TestBatchDetail:
    """Batch detail endpoint tests"""
    
    def test_get_batch_detail(self, auth_session):
        """Test getting batch detail with students, assignments, attendance"""
        # Get a batch
        batches_resp = auth_session.get(f"{BASE_URL}/api/batches")
        assert batches_resp.status_code == 200
        batches = batches_resp.json()
        
        if not batches:
            pytest.skip("No batches available")
        
        batch_id = batches[0]["batch_id"]
        response = auth_session.get(f"{BASE_URL}/api/batches/{batch_id}/detail")
        assert response.status_code == 200, f"Batch detail failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "batch_id" in data
        assert "name" in data
        assert "course_name" in data
        assert "faculty" in data
        assert "students" in data
        assert "assignments" in data
        assert "attendance_dates" in data
        assert "total_students" in data
        assert isinstance(data["students"], list)
        assert isinstance(data["assignments"], list)
        
        # Check student data includes attendance percentage
        if data["students"]:
            assert "attendance_pct" in data["students"][0]
            assert "submissions_count" in data["students"][0]
        
        print(f"Batch detail: {data['name']} - {data['total_students']} students, {len(data['assignments'])} assignments")
    
    def test_batch_detail_not_found(self, auth_session):
        """Test 404 for non-existent batch"""
        response = auth_session.get(f"{BASE_URL}/api/batches/nonexistent_batch/detail")
        assert response.status_code == 404
        print("Non-existent batch correctly returns 404")


class TestUserProfile:
    """User profile endpoint tests"""
    
    def test_get_student_profile(self, auth_session):
        """Test getting student profile with courses, fees, attendance"""
        # Get a student
        users_resp = auth_session.get(f"{BASE_URL}/api/users?role=student")
        assert users_resp.status_code == 200
        students = users_resp.json()
        
        if not students:
            pytest.skip("No students available")
        
        user_id = students[0]["user_id"]
        response = auth_session.get(f"{BASE_URL}/api/users/{user_id}/profile")
        assert response.status_code == 200, f"Profile failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "user_id" in data
        assert "name" in data
        assert "email" in data
        assert "role" in data
        assert "courses" in data
        assert "fees" in data
        assert "attendance_total" in data
        assert "attendance_present" in data
        assert "attendance_pct" in data
        assert isinstance(data["courses"], list)
        assert isinstance(data["fees"], list)
        
        print(f"Student profile: {data['name']} - {len(data['courses'])} courses, {data['attendance_pct']}% attendance")
    
    def test_get_faculty_profile(self, auth_session):
        """Test getting faculty profile with batches"""
        # Get a faculty member
        users_resp = auth_session.get(f"{BASE_URL}/api/users?role=faculty")
        assert users_resp.status_code == 200
        faculty = users_resp.json()
        
        if not faculty:
            pytest.skip("No faculty available")
        
        user_id = faculty[0]["user_id"]
        response = auth_session.get(f"{BASE_URL}/api/users/{user_id}/profile")
        assert response.status_code == 200, f"Faculty profile failed: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert "role" in data
        assert data["role"] == "faculty"
        # Faculty should have batches
        assert "batches" in data
        assert isinstance(data["batches"], list)
        
        print(f"Faculty profile: {data['name']} - {len(data.get('batches', []))} batches")
    
    def test_update_user_profile(self, auth_session):
        """Test updating user profile"""
        # Get admin's own profile
        me_resp = auth_session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200
        user_id = me_resp.json()["user_id"]
        
        update_data = {
            "phone": "1234567890",
            "bio": f"{TEST_PREFIX}Test bio",
            "skills": ["Python", "FastAPI"],
            "availability": "Mon-Fri 9AM-5PM"
        }
        
        response = auth_session.put(f"{BASE_URL}/api/users/{user_id}/profile", json=update_data)
        assert response.status_code == 200, f"Profile update failed: {response.text}"
        
        # Verify update
        profile_resp = auth_session.get(f"{BASE_URL}/api/users/{user_id}/profile")
        profile = profile_resp.json()
        assert profile["phone"] == update_data["phone"]
        assert profile["bio"] == update_data["bio"]
        
        print("Profile updated successfully")
    
    def test_profile_not_found(self, auth_session):
        """Test 404 for non-existent user"""
        response = auth_session.get(f"{BASE_URL}/api/users/nonexistent_user/profile")
        assert response.status_code == 404
        print("Non-existent user correctly returns 404")


class TestHolidays:
    """Holiday CRUD tests"""
    
    def test_create_holiday(self, auth_session):
        """Test creating a holiday"""
        holiday_data = {
            "date": "2026-12-25",
            "name": f"{TEST_PREFIX}Christmas",
            "description": "Christmas Day"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/holidays", json=holiday_data)
        assert response.status_code == 200, f"Holiday creation failed: {response.text}"
        
        data = response.json()
        assert "holiday_id" in data
        assert data["name"] == holiday_data["name"]
        assert data["date"] == holiday_data["date"]
        auth_session.test_holiday_id = data["holiday_id"]
        print(f"Holiday created: {data['holiday_id']}")
    
    def test_list_holidays(self, auth_session):
        """Test listing holidays"""
        response = auth_session.get(f"{BASE_URL}/api/holidays")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} holidays")
    
    def test_delete_holiday(self, auth_session):
        """Test deleting a holiday"""
        if not hasattr(auth_session, 'test_holiday_id'):
            pytest.skip("No test holiday created")
        
        response = auth_session.delete(f"{BASE_URL}/api/holidays/{auth_session.test_holiday_id}")
        assert response.status_code == 200
        print("Holiday deleted successfully")


class TestFeeCategories:
    """Fee categories and installments tests"""
    
    def test_create_fee_with_category(self, auth_session):
        """Test creating a fee with category"""
        # Get a student and course
        students_resp = auth_session.get(f"{BASE_URL}/api/users?role=student")
        students = students_resp.json()
        courses_resp = auth_session.get(f"{BASE_URL}/api/courses")
        courses = courses_resp.json()
        
        if not students or not courses:
            pytest.skip("No students or courses available")
        
        fee_data = {
            "student_id": students[0]["user_id"],
            "course_id": courses[0]["course_id"],
            "amount": 10000.0,
            "due_date": "2026-06-01",
            "category": "Registration",
            "installments": 1
        }
        
        response = auth_session.post(f"{BASE_URL}/api/fees", json=fee_data)
        assert response.status_code == 200, f"Fee creation failed: {response.text}"
        
        data = response.json()
        assert "fee_id" in data
        assert data["category"] == "Registration"
        print(f"Fee with category created: {data['fee_id']}")
    
    def test_create_fee_with_installments(self, auth_session):
        """Test creating a fee with multiple installments"""
        students_resp = auth_session.get(f"{BASE_URL}/api/users?role=student")
        students = students_resp.json()
        courses_resp = auth_session.get(f"{BASE_URL}/api/courses")
        courses = courses_resp.json()
        
        if not students or not courses:
            pytest.skip("No students or courses available")
        
        fee_data = {
            "student_id": students[0]["user_id"],
            "course_id": courses[0]["course_id"],
            "amount": 12000.0,
            "due_date": "2026-07-01",
            "category": "Tuition",
            "installments": 3
        }
        
        response = auth_session.post(f"{BASE_URL}/api/fees", json=fee_data)
        assert response.status_code == 200, f"Fee with installments failed: {response.text}"
        
        data = response.json()
        # Should return a list of 3 installments
        assert isinstance(data, list)
        assert len(data) == 3
        # Each installment should be 4000
        for fee in data:
            assert fee["amount"] == 4000.0
            assert fee["total_installments"] == 3
        print(f"Created {len(data)} installments")


class TestEnhancedDashboard:
    """Enhanced dashboard endpoint tests"""
    
    def test_enhanced_dashboard(self, auth_session):
        """Test enhanced dashboard with today's attendance and upcoming holidays"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/enhanced")
        assert response.status_code == 200, f"Enhanced dashboard failed: {response.text}"
        
        data = response.json()
        # Verify structure
        assert "today_attendance" in data
        assert "today_present" in data
        assert "new_enrollments" in data
        assert "upcoming_holidays" in data
        assert "active_batches" in data
        assert "active_courses" in data
        assert isinstance(data["new_enrollments"], list)
        assert isinstance(data["upcoming_holidays"], list)
        
        print(f"Enhanced dashboard: {data['today_present']}/{data['today_attendance']} present today, {len(data['upcoming_holidays'])} upcoming holidays")


class TestSettings:
    """Settings tests - verify Ciqura Labs branding"""
    
    def test_settings_branding(self, auth_session):
        """Test that settings return Ciqura Labs branding"""
        response = auth_session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        
        data = response.json()
        assert "institute_name" in data
        # Branding should be Ciqura Labs
        assert data["institute_name"] == "Ciqura Labs", f"Expected 'Ciqura Labs', got '{data['institute_name']}'"
        print(f"Branding verified: {data['institute_name']}")


class TestINRCurrency:
    """Test INR currency in fees"""
    
    def test_fees_have_inr_amounts(self, auth_session):
        """Test that fees are returned with proper amounts (INR)"""
        response = auth_session.get(f"{BASE_URL}/api/fees")
        assert response.status_code == 200
        
        data = response.json()
        if data:
            fee = data[0]
            assert "amount" in fee
            assert "total_paid" in fee
            assert "balance" in fee
            assert isinstance(fee["amount"], (int, float))
            print(f"Fee amounts verified: ₹{fee['amount']} (paid: ₹{fee['total_paid']}, balance: ₹{fee['balance']})")
        else:
            print("No fees to verify")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
