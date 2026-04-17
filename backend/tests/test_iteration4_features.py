"""
Test cases for Iteration 4 features:
- Auto-generated readable IDs (CL-xxx format)
- Extended student profile fields
- RBAC filtering (students only see enrolled courses/batches)
- Fee structure hidden from students
- Profile update functionality
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDisplayIDs:
    """Test auto-generated display IDs for various entities"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nexusinstitute.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.admin_user = response.json()
    
    def test_courses_have_display_id(self):
        """Verify courses have display_id in CL-xxx-xx format"""
        response = self.session.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        courses = response.json()
        
        for course in courses:
            assert "display_id" in course, f"Course {course.get('name')} missing display_id"
            assert course["display_id"].startswith("CL-"), f"Invalid display_id format: {course['display_id']}"
            print(f"✓ Course {course['name']}: {course['display_id']}")
    
    def test_students_have_display_id(self):
        """Verify students have display_id in CL-STD-xxx format"""
        response = self.session.get(f"{BASE_URL}/api/users?role=student")
        assert response.status_code == 200
        students = response.json()
        
        for student in students:
            assert "display_id" in student, f"Student {student.get('name')} missing display_id"
            assert student["display_id"].startswith("CL-STD-"), f"Invalid student display_id: {student['display_id']}"
            print(f"✓ Student {student['name']}: {student['display_id']}")
    
    def test_faculty_have_display_id(self):
        """Verify faculty have display_id in CL-FAC-xxx format"""
        response = self.session.get(f"{BASE_URL}/api/users?role=faculty")
        assert response.status_code == 200
        faculty = response.json()
        
        for f in faculty:
            assert "display_id" in f, f"Faculty {f.get('name')} missing display_id"
            assert f["display_id"].startswith("CL-FAC-"), f"Invalid faculty display_id: {f['display_id']}"
            print(f"✓ Faculty {f['name']}: {f['display_id']}")
    
    def test_batches_have_display_id(self):
        """Verify batches have display_id in CL-xxx-Bxx format"""
        response = self.session.get(f"{BASE_URL}/api/batches")
        assert response.status_code == 200
        batches = response.json()
        
        for batch in batches:
            assert "display_id" in batch, f"Batch {batch.get('name')} missing display_id"
            assert "CL-" in batch["display_id"] and "-B" in batch["display_id"], f"Invalid batch display_id: {batch['display_id']}"
            print(f"✓ Batch {batch['name']}: {batch['display_id']}")
    
    def test_new_course_gets_auto_display_id(self):
        """Verify new course creation generates auto display_id"""
        # Create a test course
        response = self.session.post(f"{BASE_URL}/api/courses", json={
            "name": "TEST_Python Programming",
            "description": "Test course for display_id",
            "duration": "3 months",
            "fee_structure": 5000
        })
        assert response.status_code == 200
        course = response.json()
        
        assert "display_id" in course, "New course missing display_id"
        assert course["display_id"].startswith("CL-"), f"Invalid display_id: {course['display_id']}"
        print(f"✓ New course display_id: {course['display_id']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/courses/{course['course_id']}")


class TestExtendedStudentProfile:
    """Test extended student profile fields"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login as admin before each test"""
        self.session = requests.Session()
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nexusinstitute.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
        self.admin_user = response.json()
    
    def test_student_profile_has_extended_fields(self):
        """Verify student profile includes extended fields"""
        # Get a student
        response = self.session.get(f"{BASE_URL}/api/users?role=student")
        assert response.status_code == 200
        students = response.json()
        
        if not students:
            pytest.skip("No students found")
        
        student_id = students[0]["user_id"]
        
        # Get student profile
        response = self.session.get(f"{BASE_URL}/api/users/{student_id}/profile")
        assert response.status_code == 200
        profile = response.json()
        
        # Check for extended fields
        extended_fields = ["dob", "address", "guardian_name", "guardian_phone", "blood_group", "qualification"]
        for field in extended_fields:
            assert field in profile, f"Profile missing field: {field}"
        
        print(f"✓ Student profile has all extended fields")
    
    def test_admin_can_update_student_profile(self):
        """Verify admin can update student profile with extended fields"""
        # Get a student
        response = self.session.get(f"{BASE_URL}/api/users?role=student")
        assert response.status_code == 200
        students = response.json()
        
        if not students:
            pytest.skip("No students found")
        
        student_id = students[0]["user_id"]
        
        # Update profile
        update_data = {
            "phone": "9876543210",
            "address": "TEST_123 Test Street",
            "dob": "2000-01-15",
            "blood_group": "O+",
            "guardian_name": "TEST_Guardian Name",
            "qualification": "TEST_Bachelor's Degree"
        }
        
        response = self.session.put(f"{BASE_URL}/api/users/{student_id}/profile", json=update_data)
        assert response.status_code == 200
        
        # Verify update
        response = self.session.get(f"{BASE_URL}/api/users/{student_id}/profile")
        assert response.status_code == 200
        profile = response.json()
        
        assert profile.get("phone") == "9876543210"
        assert profile.get("blood_group") == "O+"
        print(f"✓ Admin successfully updated student profile")


class TestRBACFiltering:
    """Test RBAC filtering for courses and batches"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.admin_session = requests.Session()
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nexusinstitute.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
    
    def test_admin_sees_all_courses(self):
        """Verify admin can see all courses"""
        response = self.admin_session.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        courses = response.json()
        
        # Admin should see fee_structure
        for course in courses:
            assert "fee_structure" in course, "Admin should see fee_structure"
        
        print(f"✓ Admin sees {len(courses)} courses with fee_structure")
    
    def test_admin_sees_all_batches(self):
        """Verify admin can see all batches"""
        response = self.admin_session.get(f"{BASE_URL}/api/batches")
        assert response.status_code == 200
        batches = response.json()
        
        print(f"✓ Admin sees {len(batches)} batches")


class TestCourseDetailFeeVisibility:
    """Test fee visibility in course detail based on role"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.admin_session = requests.Session()
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nexusinstitute.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
    
    def test_admin_sees_fee_in_course_detail(self):
        """Verify admin can see fee_structure in course detail"""
        # Get courses
        response = self.admin_session.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        courses = response.json()
        
        if not courses:
            pytest.skip("No courses found")
        
        course_id = courses[0]["course_id"]
        
        # Get course detail
        response = self.admin_session.get(f"{BASE_URL}/api/courses/{course_id}/detail")
        assert response.status_code == 200
        detail = response.json()
        
        assert "fee_structure" in detail, "Admin should see fee_structure in course detail"
        print(f"✓ Admin sees fee_structure in course detail: {detail.get('fee_structure')}")


class TestReceiptIDs:
    """Test receipt ID format"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.admin_session = requests.Session()
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nexusinstitute.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
    
    def test_payments_have_receipt_number(self):
        """Verify payments have receipt_number in CL-RCP-xxx format"""
        response = self.admin_session.get(f"{BASE_URL}/api/payments")
        assert response.status_code == 200
        payments = response.json()
        
        for payment in payments:
            assert "receipt_number" in payment, "Payment missing receipt_number"
            assert payment["receipt_number"].startswith("CL-RCP-"), f"Invalid receipt format: {payment['receipt_number']}"
            print(f"✓ Payment receipt: {payment['receipt_number']}")


class TestSettings:
    """Test settings functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.admin_session = requests.Session()
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nexusinstitute.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
    
    def test_get_settings(self):
        """Verify settings endpoint returns data"""
        response = self.admin_session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        settings = response.json()
        
        assert "institute_name" in settings
        assert settings["institute_name"] == "Ciqura Labs", f"Expected 'Ciqura Labs', got '{settings['institute_name']}'"
        print(f"✓ Settings: institute_name = {settings['institute_name']}")
    
    def test_update_settings(self):
        """Verify super_admin can update settings"""
        # Get current settings
        response = self.admin_session.get(f"{BASE_URL}/api/settings")
        original_settings = response.json()
        
        # Update settings
        response = self.admin_session.put(f"{BASE_URL}/api/settings", json={
            "institute_name": "Ciqura Labs",
            "primary_color": "#002FA7"
        })
        assert response.status_code == 200
        
        # Verify update
        response = self.admin_session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        settings = response.json()
        
        assert settings["institute_name"] == "Ciqura Labs"
        print(f"✓ Settings updated successfully")


class TestFeesCategory:
    """Test fees category field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup admin session"""
        self.admin_session = requests.Session()
        response = self.admin_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@nexusinstitute.com",
            "password": "Admin@123"
        })
        assert response.status_code == 200
    
    def test_fees_have_category(self):
        """Verify fees have category field"""
        response = self.admin_session.get(f"{BASE_URL}/api/fees")
        assert response.status_code == 200
        fees = response.json()
        
        for fee in fees:
            assert "category" in fee, "Fee missing category field"
            print(f"✓ Fee category: {fee.get('category', 'N/A')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
