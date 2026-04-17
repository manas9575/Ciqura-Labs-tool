"""
Backend API Tests for Institute Coaching Management System
Tests: Auth, Courses, Batches, Enrollments, Attendance, Assignments, Fees, Files, Settings, Analytics
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


class TestHealthAndAuth:
    """Authentication and basic health tests"""
    
    def test_api_reachable(self):
        """Test that API is reachable"""
        response = requests.get(f"{BASE_URL}/api/auth/me", timeout=10)
        # 401 is expected without auth
        assert response.status_code in [200, 401], f"API not reachable: {response.status_code}"
        print("API is reachable")
    
    def test_login_success(self):
        """Test login with valid super_admin credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=10
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "user_id" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "super_admin"
        print(f"Login successful: {data['email']} ({data['role']})")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "wrong@example.com", "password": "wrongpass"},
            timeout=10
        )
        assert response.status_code == 401
        print("Invalid credentials correctly rejected")
    
    def test_register_new_user(self):
        """Test user registration"""
        test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": test_email, "password": "TestPass123", "name": f"{TEST_PREFIX}User"},
            timeout=10
        )
        assert response.status_code == 200, f"Registration failed: {response.text}"
        data = response.json()
        assert data["email"] == test_email
        assert data["role"] == "student"  # Default role
        print(f"Registration successful: {data['email']}")
    
    def test_register_duplicate_email(self):
        """Test registration with existing email"""
        response = requests.post(
            f"{BASE_URL}/api/auth/register",
            json={"email": ADMIN_EMAIL, "password": "TestPass123", "name": "Duplicate"},
            timeout=10
        )
        assert response.status_code == 400
        print("Duplicate email correctly rejected")


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


class TestCoursesCRUD:
    """Course management tests"""
    
    def test_create_course(self, auth_session):
        """Test course creation"""
        course_data = {
            "name": f"{TEST_PREFIX}Python Programming",
            "description": "Learn Python from scratch",
            "duration": "3 months",
            "fee_structure": 5000.0,
            "cover_image": ""
        }
        response = auth_session.post(f"{BASE_URL}/api/courses", json=course_data)
        assert response.status_code == 200, f"Course creation failed: {response.text}"
        data = response.json()
        assert data["name"] == course_data["name"]
        assert "course_id" in data
        print(f"Course created: {data['course_id']}")
        # Store for later tests
        auth_session.test_course_id = data["course_id"]
    
    def test_list_courses(self, auth_session):
        """Test listing courses"""
        response = auth_session.get(f"{BASE_URL}/api/courses")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} courses")
    
    def test_get_course(self, auth_session):
        """Test getting single course"""
        if not hasattr(auth_session, 'test_course_id'):
            pytest.skip("No test course created")
        response = auth_session.get(f"{BASE_URL}/api/courses/{auth_session.test_course_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["course_id"] == auth_session.test_course_id
        print(f"Course retrieved: {data['name']}")
    
    def test_update_course(self, auth_session):
        """Test course update"""
        if not hasattr(auth_session, 'test_course_id'):
            pytest.skip("No test course created")
        response = auth_session.put(
            f"{BASE_URL}/api/courses/{auth_session.test_course_id}",
            json={"description": "Updated description"}
        )
        assert response.status_code == 200
        print("Course updated successfully")
    
    def test_delete_course(self, auth_session):
        """Test course deletion"""
        # Create a course to delete
        course_data = {
            "name": f"{TEST_PREFIX}ToDelete",
            "description": "Will be deleted",
            "duration": "1 month",
            "fee_structure": 1000.0
        }
        create_resp = auth_session.post(f"{BASE_URL}/api/courses", json=course_data)
        assert create_resp.status_code == 200
        course_id = create_resp.json()["course_id"]
        
        # Delete it
        delete_resp = auth_session.delete(f"{BASE_URL}/api/courses/{course_id}")
        assert delete_resp.status_code == 200
        
        # Verify deletion
        get_resp = auth_session.get(f"{BASE_URL}/api/courses/{course_id}")
        assert get_resp.status_code == 404
        print("Course deleted and verified")


class TestUserManagement:
    """User management tests"""
    
    def test_list_users(self, auth_session):
        """Test listing users"""
        response = auth_session.get(f"{BASE_URL}/api/users")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} users")
    
    def test_list_students(self, auth_session):
        """Test listing students only"""
        response = auth_session.get(f"{BASE_URL}/api/users?role=student")
        assert response.status_code == 200
        data = response.json()
        for user in data:
            assert user["role"] == "student"
        print(f"Found {len(data)} students")
    
    def test_list_faculty(self, auth_session):
        """Test listing faculty only"""
        response = auth_session.get(f"{BASE_URL}/api/users?role=faculty")
        assert response.status_code == 200
        data = response.json()
        for user in data:
            assert user["role"] == "faculty"
        print(f"Found {len(data)} faculty members")


class TestBatches:
    """Batch management tests"""
    
    def test_create_batch(self, auth_session):
        """Test batch creation"""
        # First ensure we have a course
        courses_resp = auth_session.get(f"{BASE_URL}/api/courses")
        courses = courses_resp.json()
        if not courses:
            # Create a course first
            course_resp = auth_session.post(f"{BASE_URL}/api/courses", json={
                "name": f"{TEST_PREFIX}BatchTestCourse",
                "description": "For batch testing",
                "duration": "2 months",
                "fee_structure": 3000.0
            })
            course_id = course_resp.json()["course_id"]
        else:
            course_id = courses[0]["course_id"]
        
        # Get a faculty user or use admin
        users_resp = auth_session.get(f"{BASE_URL}/api/users")
        users = users_resp.json()
        faculty_id = users[0]["user_id"]  # Use first user as faculty
        
        batch_data = {
            "course_id": course_id,
            "name": f"{TEST_PREFIX}Morning Batch",
            "start_date": "2026-02-01",
            "end_date": "2026-04-30",
            "faculty_id": faculty_id,
            "schedule": "Mon-Wed-Fri 9AM-11AM"
        }
        response = auth_session.post(f"{BASE_URL}/api/batches", json=batch_data)
        assert response.status_code == 200, f"Batch creation failed: {response.text}"
        data = response.json()
        assert "batch_id" in data
        auth_session.test_batch_id = data["batch_id"]
        auth_session.test_course_id_for_batch = course_id
        print(f"Batch created: {data['batch_id']}")
    
    def test_list_batches(self, auth_session):
        """Test listing batches"""
        response = auth_session.get(f"{BASE_URL}/api/batches")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check enriched data
        if data:
            assert "course_name" in data[0]
            assert "faculty_name" in data[0]
        print(f"Found {len(data)} batches")


class TestEnrollments:
    """Enrollment tests"""
    
    def test_create_enrollment(self, auth_session):
        """Test student enrollment"""
        # Get a student
        users_resp = auth_session.get(f"{BASE_URL}/api/users?role=student")
        students = users_resp.json()
        
        if not students:
            # Create a test student
            reg_resp = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": f"test_student_{uuid.uuid4().hex[:6]}@example.com",
                "password": "TestPass123",
                "name": f"{TEST_PREFIX}Student"
            })
            student_id = reg_resp.json()["user_id"]
        else:
            student_id = students[0]["user_id"]
        
        # Get batch and course
        batches_resp = auth_session.get(f"{BASE_URL}/api/batches")
        batches = batches_resp.json()
        
        if not batches:
            pytest.skip("No batches available for enrollment test")
        
        batch = batches[0]
        enrollment_data = {
            "student_id": student_id,
            "course_id": batch["course_id"],
            "batch_id": batch["batch_id"]
        }
        
        response = auth_session.post(f"{BASE_URL}/api/enrollments", json=enrollment_data)
        # May fail if already enrolled
        assert response.status_code in [200, 400], f"Enrollment failed: {response.text}"
        if response.status_code == 200:
            data = response.json()
            assert "enrollment_id" in data
            auth_session.test_enrollment_id = data["enrollment_id"]
            auth_session.test_student_id = student_id
            print(f"Enrollment created: {data['enrollment_id']}")
        else:
            print("Student already enrolled (expected)")
    
    def test_list_enrollments(self, auth_session):
        """Test listing enrollments"""
        response = auth_session.get(f"{BASE_URL}/api/enrollments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert "student_name" in data[0]
            assert "course_name" in data[0]
        print(f"Found {len(data)} enrollments")


class TestAttendance:
    """Attendance tests"""
    
    def test_mark_attendance(self, auth_session):
        """Test marking attendance"""
        # Get a batch with students
        batches_resp = auth_session.get(f"{BASE_URL}/api/batches")
        batches = batches_resp.json()
        
        if not batches:
            pytest.skip("No batches available")
        
        batch_id = batches[0]["batch_id"]
        
        # Get enrollments for this batch
        enrollments_resp = auth_session.get(f"{BASE_URL}/api/enrollments?batch_id={batch_id}")
        enrollments = enrollments_resp.json()
        
        if not enrollments:
            pytest.skip("No students enrolled in batch")
        
        attendance_data = {
            "batch_id": batch_id,
            "date": "2026-04-17",
            "records": [{"student_id": e["student_id"], "status": "present"} for e in enrollments[:3]]
        }
        
        response = auth_session.post(f"{BASE_URL}/api/attendance", json=attendance_data)
        assert response.status_code == 200, f"Attendance marking failed: {response.text}"
        data = response.json()
        assert "ids" in data
        print(f"Attendance marked for {len(data['ids'])} students")
    
    def test_list_attendance(self, auth_session):
        """Test listing attendance"""
        response = auth_session.get(f"{BASE_URL}/api/attendance")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} attendance records")


class TestAssignments:
    """Assignment tests"""
    
    def test_create_assignment(self, auth_session):
        """Test assignment creation"""
        batches_resp = auth_session.get(f"{BASE_URL}/api/batches")
        batches = batches_resp.json()
        
        if not batches:
            pytest.skip("No batches available")
        
        assignment_data = {
            "batch_id": batches[0]["batch_id"],
            "title": f"{TEST_PREFIX}Python Basics Quiz",
            "description": "Complete the quiz on Python basics",
            "due_date": "2026-04-30"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/assignments", json=assignment_data)
        assert response.status_code == 200, f"Assignment creation failed: {response.text}"
        data = response.json()
        assert "assignment_id" in data
        auth_session.test_assignment_id = data["assignment_id"]
        print(f"Assignment created: {data['assignment_id']}")
    
    def test_list_assignments(self, auth_session):
        """Test listing assignments"""
        response = auth_session.get(f"{BASE_URL}/api/assignments")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert "batch_name" in data[0]
        print(f"Found {len(data)} assignments")


class TestFees:
    """Fee management tests"""
    
    def test_create_fee(self, auth_session):
        """Test fee creation"""
        # Get a student and course
        users_resp = auth_session.get(f"{BASE_URL}/api/users?role=student")
        students = users_resp.json()
        
        courses_resp = auth_session.get(f"{BASE_URL}/api/courses")
        courses = courses_resp.json()
        
        if not students or not courses:
            pytest.skip("No students or courses available")
        
        fee_data = {
            "student_id": students[0]["user_id"],
            "course_id": courses[0]["course_id"],
            "amount": 5000.0,
            "due_date": "2026-05-01"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/fees", json=fee_data)
        assert response.status_code == 200, f"Fee creation failed: {response.text}"
        data = response.json()
        assert "fee_id" in data
        auth_session.test_fee_id = data["fee_id"]
        print(f"Fee created: {data['fee_id']}")
    
    def test_list_fees(self, auth_session):
        """Test listing fees"""
        response = auth_session.get(f"{BASE_URL}/api/fees")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if data:
            assert "student_name" in data[0]
            assert "balance" in data[0]
        print(f"Found {len(data)} fee records")
    
    def test_create_payment(self, auth_session):
        """Test payment recording"""
        if not hasattr(auth_session, 'test_fee_id'):
            # Get an existing fee
            fees_resp = auth_session.get(f"{BASE_URL}/api/fees")
            fees = fees_resp.json()
            if not fees:
                pytest.skip("No fees available")
            fee_id = fees[0]["fee_id"]
        else:
            fee_id = auth_session.test_fee_id
        
        payment_data = {
            "fee_id": fee_id,
            "amount": 1000.0,
            "payment_mode": "cash"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/payments", json=payment_data)
        assert response.status_code == 200, f"Payment creation failed: {response.text}"
        data = response.json()
        assert "payment_id" in data
        assert "receipt_number" in data
        auth_session.test_payment_id = data["payment_id"]
        print(f"Payment recorded: {data['payment_id']}, Receipt: {data['receipt_number']}")
    
    def test_generate_receipt(self, auth_session):
        """Test PDF receipt generation"""
        if not hasattr(auth_session, 'test_payment_id'):
            # Get an existing payment
            payments_resp = auth_session.get(f"{BASE_URL}/api/payments")
            payments = payments_resp.json()
            if not payments:
                pytest.skip("No payments available")
            payment_id = payments[0]["payment_id"]
        else:
            payment_id = auth_session.test_payment_id
        
        response = auth_session.get(f"{BASE_URL}/api/payments/{payment_id}/receipt")
        assert response.status_code == 200, f"Receipt generation failed: {response.text}"
        assert response.headers.get("content-type") == "application/pdf"
        print("PDF receipt generated successfully")


class TestDashboardAndAnalytics:
    """Dashboard and analytics tests"""
    
    def test_dashboard_stats(self, auth_session):
        """Test dashboard stats endpoint"""
        response = auth_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        # Super admin should see these stats
        assert "total_students" in data
        assert "total_courses" in data
        print(f"Dashboard stats: {data}")
    
    def test_revenue_analytics(self, auth_session):
        """Test revenue analytics"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/revenue")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Revenue analytics: {len(data)} months of data")
    
    def test_enrollment_analytics(self, auth_session):
        """Test enrollment analytics"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/enrollment")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Enrollment analytics: {len(data)} courses")
    
    def test_attendance_analytics(self, auth_session):
        """Test attendance analytics"""
        response = auth_session.get(f"{BASE_URL}/api/analytics/attendance-summary")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Attendance analytics: {len(data)} batches")


class TestSettings:
    """Settings tests"""
    
    def test_get_settings(self, auth_session):
        """Test getting settings"""
        response = auth_session.get(f"{BASE_URL}/api/settings")
        assert response.status_code == 200
        data = response.json()
        assert "institute_name" in data
        print(f"Settings: {data['institute_name']}")
    
    def test_update_settings(self, auth_session):
        """Test updating settings (super_admin only)"""
        response = auth_session.put(f"{BASE_URL}/api/settings", json={
            "institute_name": "Nexus Institute Updated"
        })
        assert response.status_code == 200
        
        # Verify update
        get_resp = auth_session.get(f"{BASE_URL}/api/settings")
        assert get_resp.json()["institute_name"] == "Nexus Institute Updated"
        
        # Restore original
        auth_session.put(f"{BASE_URL}/api/settings", json={
            "institute_name": "Nexus Institute"
        })
        print("Settings updated and restored")


class TestNotifications:
    """Notification tests"""
    
    def test_create_notification(self, auth_session):
        """Test creating notification"""
        notif_data = {
            "title": f"{TEST_PREFIX}Test Notification",
            "message": "This is a test notification",
            "type": "announcement"
        }
        response = auth_session.post(f"{BASE_URL}/api/notifications", json=notif_data)
        assert response.status_code == 200
        print("Notification created")
    
    def test_list_notifications(self, auth_session):
        """Test listing notifications"""
        response = auth_session.get(f"{BASE_URL}/api/notifications")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"Found {len(data)} notifications")


class TestCSVExport:
    """CSV export tests"""
    
    def test_export_students(self, auth_session):
        """Test student CSV export"""
        response = auth_session.get(f"{BASE_URL}/api/export/students")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("Students CSV exported")
    
    def test_export_fees(self, auth_session):
        """Test fees CSV export"""
        response = auth_session.get(f"{BASE_URL}/api/export/fees")
        assert response.status_code == 200
        assert "text/csv" in response.headers.get("content-type", "")
        print("Fees CSV exported")


class TestMicrosoftAuth:
    """Microsoft OAuth placeholder test"""
    
    def test_microsoft_returns_501(self):
        """Test Microsoft auth returns 501 (not implemented)"""
        response = requests.post(f"{BASE_URL}/api/auth/microsoft-callback", json={})
        assert response.status_code == 501
        print("Microsoft auth correctly returns 501")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
