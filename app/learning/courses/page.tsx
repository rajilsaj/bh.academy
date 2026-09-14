'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Layout from '@/app/components/Layout'
import styles from './courses.module.css'

interface Course {
  id: string
  code: string
  title: string
  instructor: string
  learners: number
  status: 'Active' | 'Draft' | 'Completed' | 'Archived'
  progress: number
  duration: number
  enrollments: number
  createdAt: string
}

const MOCK_COURSES: Course[] = [
  {
    id: '1',
    code: 'PYTHON-101',
    title: 'Introduction to Python',
    instructor: 'Alice Johnson',
    learners: 32,
    status: 'Active',
    progress: 65,
    duration: 40,
    enrollments: 32,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    code: 'REACT-101',
    title: 'React Fundamentals',
    instructor: 'Bob Smith',
    learners: 28,
    status: 'Active',
    progress: 48,
    duration: 30,
    enrollments: 28,
    createdAt: '2024-02-10',
  },
  {
    id: '3',
    code: 'DB-201',
    title: 'Database Design',
    instructor: 'Charlie Brown',
    learners: 21,
    status: 'Completed',
    progress: 100,
    duration: 35,
    enrollments: 21,
    createdAt: '2023-12-05',
  },
  {
    id: '4',
    code: 'AWS-101',
    title: 'AWS Certified',
    instructor: 'Diana Williams',
    learners: 15,
    status: 'Draft',
    progress: 25,
    duration: 45,
    enrollments: 0,
    createdAt: '2024-03-01',
  },
  {
    id: '5',
    code: 'DOCKER-101',
    title: 'Docker & Containers',
    instructor: 'Eve Davis',
    learners: 19,
    status: 'Active',
    progress: 72,
    duration: 25,
    enrollments: 19,
    createdAt: '2024-01-20',
  },
]

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>(MOCK_COURSES)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 10
  const filteredCourses = courses.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.instructor.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'All' || course.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage)
  const startIdx = (currentPage - 1) * itemsPerPage
  const paginatedCourses = filteredCourses.slice(startIdx, startIdx + itemsPerPage)

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'badge-success'
      case 'Completed':
        return 'badge-success'
      case 'Draft':
        return 'badge-warning'
      case 'Archived':
        return 'badge-danger'
      default:
        return 'badge-info'
    }
  }

  return (
    <Layout title="Courses Management">
      <div className={styles.coursesContainer}>
        {/* Header with Stats */}
        <div className={styles.headerSection}>
          <div className={styles.titleArea}>
            <h1>Courses</h1>
            <p className={styles.subtitle}>{filteredCourses.length} courses</p>
          </div>
          <Link href="/learning/courses/new" className={`btn btn-primary`}>
            <span>➕</span>
            Create Course
          </Link>
        </div>

        {/* Quick Stats */}
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Courses</span>
            <span className={styles.statValue}>{courses.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Active</span>
            <span className={styles.statValue}>{courses.filter((c) => c.status === 'Active').length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Learners</span>
            <span className={styles.statValue}>{courses.reduce((acc, c) => acc + c.learners, 0)}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Average Progress</span>
            <span className={styles.statValue}>
              {Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length)}%
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.filtersSection}>
          <div className={styles.searchBox}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              placeholder="Search by title, code, or instructor..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className={styles.searchInput}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value)
              setCurrentPage(1)
            }}
            className={styles.filterSelect}
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Completed">Completed</option>
            <option value="Archived">Archived</option>
          </select>

          <button className={`btn btn-secondary`}>📊 Export</button>
        </div>

        {/* Courses Table */}
        <div className={styles.tableWrapper}>
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Instructor</th>
                <th>Learners</th>
                <th>Duration</th>
                <th>Progress</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCourses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <span className={styles.courseCode}>{course.code}</span>
                  </td>
                  <td>
                    <Link href={`/learning/courses/${course.id}`} className={styles.courseLink}>
                      {course.title}
                    </Link>
                  </td>
                  <td>{course.instructor}</td>
                  <td>{course.learners}</td>
                  <td>{course.duration}h</td>
                  <td>
                    <div className={styles.progressContainer}>
                      <div className={styles.progressBar}>
                        <div className={styles.progressFill} style={{ width: `${course.progress}%` }}></div>
                      </div>
                      <span className={styles.progressText}>{course.progress}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(course.status)}`}>{course.status}</span>
                  </td>
                  <td>
                    <div className={styles.actionButtons}>
                      <Link href={`/learning/courses/${course.id}`} title="View">
                        👁️
                      </Link>
                      <Link href={`/learning/courses/${course.id}/edit`} title="Edit">
                        ✏️
                      </Link>
                      <button title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {paginatedCourses.length === 0 && (
          <div className={styles.emptyState}>
            <p className={styles.emptyIcon}>📚</p>
            <p className={styles.emptyText}>No courses found</p>
            <p className={styles.emptySubtext}>Try adjusting your filters or create a new course</p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className={styles.paginationBtn}
            >
              ← Previous
            </button>

            <div className={styles.pageNumbers}>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`${styles.pageNumber} ${currentPage === page ? styles.active : ''}`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className={styles.paginationBtn}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
