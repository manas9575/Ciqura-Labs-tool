import React from "react"
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
  const filteredBatches = batches.filter(
    (b) => b.course_id === enrollForm.course_id
  )

  return (
    <div className="p-6 w-full max-w-md">
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

            <SelectContent>
              {users.map((s) => (
                <SelectItem key={s.user_id} value={s.user_id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 📚 COURSE */}
        <div>
          <label className="text-sm font-medium mb-1 block">
            Select Course
          </label>

          <Select
            value={enrollForm.course_id}
            onValueChange={(value) =>
              setEnrollForm({ ...enrollForm, course_id: value, batch_id: "" })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>

            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.course_id} value={c.course_id}>
                  {c.name}
                </SelectItem>
              ))}
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

            <SelectContent>
              {filteredBatches.length === 0 ? (
                <div className="px-2 py-1 text-sm text-muted-foreground">
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
