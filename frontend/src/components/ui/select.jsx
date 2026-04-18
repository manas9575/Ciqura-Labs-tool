import React, { useState } from "react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"

export default function EnrollStudentModal({
  users = [],
  courses = [],
  batches = [],
  enrollForm,
  setEnrollForm,
  handleEnroll,
}) {
  const [courseSearch, setCourseSearch] = useState("")

  const filteredBatches = batches.filter(
    (b) => b.course_id === enrollForm.course_id
  )

  const filteredCourses = courses.filter((c) =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase())
  )

  return (
    <div className="p-6 w-full max-w-md bg-white rounded-lg shadow-xl">
      <h2 className="text-lg font-semibold mb-4">Enroll Student</h2>

      <div className="space-y-4">

        {/* 👤 STUDENT */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Select Student
          </label>

          <Select
            value={enrollForm.student_id}
            onValueChange={(value) =>
              setEnrollForm({ ...enrollForm, student_id: value })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select student" />
            </SelectTrigger>

            <SelectContent className="bg-white border shadow-lg z-50">
              {users.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 📚 COURSE (SEARCHABLE) */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Select Course
          </label>

          <Select
            value={enrollForm.course_id}
            onValueChange={(value) =>
              setEnrollForm({
                ...enrollForm,
                course_id: value,
                batch_id: "",
              })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>

            <SelectContent className="bg-white border shadow-lg z-50">

              {/* 🔍 SEARCH INPUT */}
              <div className="p-2">
                <input
                  placeholder="Search course..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full px-2 py-1 border rounded text-sm outline-none"
                />
              </div>

              {filteredCourses.length === 0 ? (
                <div className="px-2 py-2 text-sm text-gray-500">
                  No courses found
                </div>
              ) : (
                filteredCourses.map((c) => (
                  <SelectItem key={c.course_id} value={c.course_id}>
                    {c.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 🧑‍🏫 BATCH */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Select Batch
          </label>

          <Select
            value={enrollForm.batch_id}
            onValueChange={(value) =>
              setEnrollForm({ ...enrollForm, batch_id: value })
            }
            disabled={!enrollForm.course_id}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>

            <SelectContent className="bg-white border shadow-lg z-50">
              {filteredBatches.length === 0 ? (
                <div className="px-2 py-2 text-sm text-gray-500">
                  No batches available
                </div>
              ) : (
                filteredBatches.map((b) => (
                  <SelectItem key={b.batch_id} value={b.batch_id}>
                    {b.name}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* 🚀 BUTTON */}
        <button
          onClick={handleEnroll}
          className="w-full py-2 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition"
        >
          Enroll Student
        </button>
      </div>
    </div>
  )
}
