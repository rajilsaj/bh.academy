'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Layout from '@/app/components/Layout'
import styles from '../../../courses/new/course-form.module.css'

interface FormData {
  code: string
  title: string
  description: string
  instructor: string
  duration: number
  maxLearners: number
  status: 'Draft' | 'Active'
  prerequisites: string[]
  requiredSkills: string[]
}

export default function EditCoursePage() {
  const params = useParams()
  const courseId = params.id as string

  const [formData, setFormData] = useState<FormData>({
    code: 'PYTHON-101',
    title: 'Introduction to Python',
    description:
      'Learn the fundamentals of Python programming. This course covers basic syntax, data types, control flow, functions, and libraries.',
    instructor: 'Alice Johnson',
    duration: 40,
    maxLearners: 50,
    status: 'Active',
    prerequisites: [],
    requiredSkills: ['Basic Programming', 'Computer Basics'],
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [newSkill, setNewSkill] = useState('')
  const [newPrerequisite, setNewPrerequisite] = useState('')
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration' || name === 'maxLearners' ? parseInt(value) : value,
    }))
  }

  const addSkill = () => {
    if (newSkill.trim() && !formData.requiredSkills.includes(newSkill)) {
      setFormData((prev) => ({
        ...prev,
        requiredSkills: [...prev.requiredSkills, newSkill],
      }))
      setNewSkill('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      requiredSkills: prev.requiredSkills.filter((s) => s !== skill),
    }))
  }

  const addPrerequisite = () => {
    if (newPrerequisite.trim() && !formData.prerequisites.includes(newPrerequisite)) {
      setFormData((prev) => ({
        ...prev,
        prerequisites: [...prev.prerequisites, newPrerequisite],
      }))
      setNewPrerequisite('')
    }
  }

  const removePrerequisite = (prereq: string) => {
    setFormData((prev) => ({
      ...prev,
      prerequisites: prev.prerequisites.filter((p) => p !== prereq),
    }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.code.trim()) newErrors.code = 'Course code is required'
    if (!formData.title.trim()) newErrors.title = 'Title is required'
    if (!formData.description.trim()) newErrors.description = 'Description is required'
    if (!formData.instructor.trim()) newErrors.instructor = 'Instructor is required'
    if (formData.duration <= 0) newErrors.duration = 'Duration must be greater than 0'
    if (formData.maxLearners <= 0) newErrors.maxLearners = 'Max learners must be greater than 0'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validateForm()) {
      console.log('Form submitted:', formData)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      // API call would go here
    }
  }

  return (
    <Layout title="Edit Course">
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1>Edit Course</h1>
            <p className={styles.subtitle}>Update course details</p>
          </div>
          <Link href={`/learning/courses/${courseId}`} className={styles.backLink}>
            ← Back
          </Link>
        </div>

        {saveSuccess && (
          <div style={{ padding: 'var(--space-md)', background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: 'var(--border-radius-lg)', color: '#155724' }}>
            ✓ Course updated successfully
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Info */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Basic Information</h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="code">Course Code *</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className={errors.code ? styles.errorInput : ''}
                />
                {errors.code && <span className={styles.errorMessage}>{errors.code}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="title">Course Title *</label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className={errors.title ? styles.errorInput : ''}
                />
                {errors.title && <span className={styles.errorMessage}>{errors.title}</span>}
              </div>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="description">Description *</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={5}
                className={errors.description ? styles.errorInput : ''}
              />
              {errors.description && <span className={styles.errorMessage}>{errors.description}</span>}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="instructor">Instructor *</label>
                <input
                  type="text"
                  id="instructor"
                  name="instructor"
                  value={formData.instructor}
                  onChange={handleInputChange}
                  className={errors.instructor ? styles.errorInput : ''}
                />
                {errors.instructor && <span className={styles.errorMessage}>{errors.instructor}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="status">Status</label>
                <select name="status" value={formData.status} onChange={handleInputChange}>
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                </select>
              </div>
            </div>
          </div>

          {/* Course Details */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Course Details</h2>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label htmlFor="duration">Duration (hours) *</label>
                <input
                  type="number"
                  id="duration"
                  name="duration"
                  value={formData.duration}
                  onChange={handleInputChange}
                  min="1"
                  className={errors.duration ? styles.errorInput : ''}
                />
                {errors.duration && <span className={styles.errorMessage}>{errors.duration}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="maxLearners">Max Learners *</label>
                <input
                  type="number"
                  id="maxLearners"
                  name="maxLearners"
                  value={formData.maxLearners}
                  onChange={handleInputChange}
                  min="1"
                  className={errors.maxLearners ? styles.errorInput : ''}
                />
                {errors.maxLearners && <span className={styles.errorMessage}>{errors.maxLearners}</span>}
              </div>
            </div>
          </div>

          {/* Required Skills */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Required Skills</h2>

            <div className={styles.tagInput}>
              <div className={styles.tagInputField}>
                <input
                  type="text"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addSkill()
                    }
                  }}
                  placeholder="Add a required skill and press Enter..."
                />
                <button type="button" onClick={addSkill} className="btn btn-secondary">
                  Add Skill
                </button>
              </div>

              {formData.requiredSkills.length > 0 && (
                <div className={styles.tagsList}>
                  {formData.requiredSkills.map((skill) => (
                    <div key={skill} className={styles.tag}>
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        className={styles.tagRemove}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prerequisites */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Prerequisites</h2>

            <div className={styles.tagInput}>
              <div className={styles.tagInputField}>
                <input
                  type="text"
                  value={newPrerequisite}
                  onChange={(e) => setNewPrerequisite(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addPrerequisite()
                    }
                  }}
                  placeholder="Add a prerequisite and press Enter..."
                />
                <button type="button" onClick={addPrerequisite} className="btn btn-secondary">
                  Add Prerequisite
                </button>
              </div>

              {formData.prerequisites.length > 0 && (
                <div className={styles.tagsList}>
                  {formData.prerequisites.map((prereq) => (
                    <div key={prereq} className={styles.tag}>
                      {prereq}
                      <button
                        type="button"
                        onClick={() => removePrerequisite(prereq)}
                        className={styles.tagRemove}
                        title="Remove"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className={styles.formActions}>
            <Link href={`/learning/courses/${courseId}`} className="btn btn-secondary">
              Cancel
            </Link>
            <button type="submit" className="btn btn-primary">
              ✓ Save Changes
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}
