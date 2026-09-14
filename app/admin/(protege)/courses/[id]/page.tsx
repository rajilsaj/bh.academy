'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Layout from '@/app/components/Layout'
import styles from './course-detail.module.css'

interface Module {
  id: string
  title: string
  duration: number
  order: number
  completed: boolean
}

interface Enrollment {
  id: string
  learnerName: string
  email: string
  enrolledDate: string
  status: 'Active' | 'Completed' | 'Dropped'
  progress: number
}

interface Course {
  id: string
  code: string
  title: string
  description: string
  instructor: string
  duration: number
  maxLearners: number
  status: 'Active' | 'Draft' | 'Completed' | 'Archived'
  progress: number
  learners: Enrollment[]
  modules: Module[]
  prerequisites: string[]
  requiredSkills: string[]
  createdAt: string
  updatedAt: string
}

const MOCK_COURSE: Course = {
  id: '1',
  code: 'PYTHON-101',
  title: 'Introduction to Python',
  description:
    'Learn the fundamentals of Python programming. This course covers basic syntax, data types, control flow, functions, and libraries.',
  instructor: 'Alice Johnson',
  duration: 40,
  maxLearners: 50,
  status: 'Active',
  progress: 65,
  prerequisites: [],
  requiredSkills: [],
  createdAt: '2024-01-15',
  updatedAt: '2024-08-20',
  modules: [
    { id: '1', title: 'Getting Started with Python', duration: 5, order: 1, completed: true },
    { id: '2', title: 'Variables and Data Types', duration: 8, order: 2, completed: true },
    { id: '3', title: 'Control Flow', duration: 10, order: 3, completed: true },
    { id: '4', title: 'Functions and Modules', duration: 12, order: 4, completed: false },
    { id: '5', title: 'File Handling', duration: 5, order: 5, completed: false },
  ],
  learners: [
    {
      id: '1',
      learnerName: 'John Doe',
      email: 'john.doe@example.com',
      enrolledDate: '2024-01-20',
      status: 'Active',
      progress: 75,
    },
    {
      id: '2',
      learnerName: 'Jane Smith',
      email: 'jane.smith@example.com',
      enrolledDate: '2024-01-22',
      status: 'Active',
      progress: 60,
    },
    {
      id: '3',
      learnerName: 'Bob Wilson',
      email: 'bob.wilson@example.com',
      enrolledDate: '2024-02-01',
      status: 'Completed',
      progress: 100,
    },
    {
      id: '4',
      learnerName: 'Alice Brown',
      email: 'alice.brown@example.com',
      enrolledDate: '2024-02-10',
      status: 'Dropped',
      progress: 30,
    },
  ],
}

export default function CourseDetailPage() {
  const params = useParams()
  const courseId = params.id as string
  const [course, setCourse] = useState<Course>(MOCK_COURSE)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'modules' | 'learners'>('overview')

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Completed':
        return 'badge-success'
      case 'Dropped':
        return 'badge-danger'
      case 'Draft':
        return 'badge-warning'
      default:
        return 'badge-info'
    }
  }

  return (
    <Layout title={course.title}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.headerTop}>
              <Link href="/learning/courses" className={styles.backLink}>
                ← Back to Courses
              </Link>
              <div className={styles.actions}>
                <Link href={`/learning/courses/${courseId}/edit`} className="btn btn-secondary">
                  ✏️ Edit
                </Link>
                <button className="btn btn-danger">🗑️ Delete</button>
              </div>
            </div>

            <h1 className={styles.title}>{course.title}</h1>
            <p className={styles.code}>{course.code}</p>

            <div className={styles.meta}>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Instructor</span>
                <span className={styles.metaValue}>{course.instructor}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Duration</span>
                <span className={styles.metaValue}>{course.duration}h</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Learners</span>
                <span className={styles.metaValue}>{course.learners.length}/{course.maxLearners}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Status</span>
                <span className={`badge ${getStatusColor(course.status)}`}>{course.status}</span>
              </div>
            </div>
          </div>

          <div className={styles.statsCard}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Overall Progress</span>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${course.progress}%` }}></div>
              </div>
              <span className={styles.statValue}>{course.progress}%</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className={styles.tabsContainer}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${selectedTab === 'overview' ? styles.tabActive : ''}`}
              onClick={() => setSelectedTab('overview')}
            >
              📋 Overview
            </button>
            <button
              className={`${styles.tab} ${selectedTab === 'modules' ? styles.tabActive : ''}`}
              onClick={() => setSelectedTab('modules')}
            >
              📚 Modules ({course.modules.length})
            </button>
            <button
              className={`${styles.tab} ${selectedTab === 'learners' ? styles.tabActive : ''}`}
              onClick={() => setSelectedTab('learners')}
            >
              👥 Learners ({course.learners.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className={styles.tabContent}>
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Course Overview</h2>
              </div>

              <div className={styles.overviewGrid}>
                <div className={styles.overviewCard}>
                  <h3>Description</h3>
                  <p>{course.description}</p>
                </div>

                {course.requiredSkills.length > 0 && (
                  <div className={styles.overviewCard}>
                    <h3>Required Skills</h3>
                    <div className={styles.tagsList}>
                      {course.requiredSkills.map((skill, i) => (
                        <span key={i} className={styles.tag}>
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {course.prerequisites.length > 0 && (
                  <div className={styles.overviewCard}>
                    <h3>Prerequisites</h3>
                    <ul className={styles.list}>
                      {course.prerequisites.map((prereq, i) => (
                        <li key={i}>{prereq}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className={styles.overviewCard}>
                  <h3>Course Information</h3>
                  <div className={styles.infoTable}>
                    <div className={styles.infoRow}>
                      <span>Created:</span>
                      <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span>Last Updated:</span>
                      <span>{new Date(course.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.infoRow}>
                      <span>Max Learners:</span>
                      <span>{course.maxLearners}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modules Tab */}
          {selectedTab === 'modules' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Course Modules</h2>
                <button className="btn btn-primary">➕ Add Module</button>
              </div>

              <div className={styles.modulesList}>
                {course.modules.map((module) => (
                  <div key={module.id} className={styles.moduleCard}>
                    <div className={styles.moduleHeader}>
                      <div className={styles.moduleTitleArea}>
                        <span className={styles.moduleNumber}>Module {module.order}</span>
                        <h3>{module.title}</h3>
                      </div>
                      <div className={styles.moduleActions}>
                        <span className={styles.moduleDuration}>{module.duration}h</span>
                        {module.completed && <span className={styles.completedBadge}>✓ Complete</span>}
                        <button className={styles.actionButton} title="Edit">
                          ✏️
                        </button>
                        <button className={styles.actionButton} title="Delete">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learners Tab */}
          {selectedTab === 'learners' && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2>Enrolled Learners</h2>
                <button className="btn btn-primary">➕ Enroll Learner</button>
              </div>

              <div className={styles.tableWrapper}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Enrolled</th>
                      <th>Progress</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {course.learners.map((learner) => (
                      <tr key={learner.id}>
                        <td>{learner.learnerName}</td>
                        <td className={styles.emailCell}>{learner.email}</td>
                        <td>{new Date(learner.enrolledDate).toLocaleDateString()}</td>
                        <td>
                          <div className={styles.progressContainer}>
                            <div className={styles.progressBar}>
                              <div
                                className={styles.progressFill}
                                style={{ width: `${learner.progress}%` }}
                              ></div>
                            </div>
                            <span className={styles.progressText}>{learner.progress}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${getStatusColor(learner.status)}`}>{learner.status}</span>
                        </td>
                        <td>
                          <div className={styles.actionButtons}>
                            <button title="View">👁️</button>
                            <button title="Message">💬</button>
                            <button title="Remove">✕</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
