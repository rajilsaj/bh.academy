import Layout from '@/app/components/Layout'
import styles from './learning.module.css'

export default function LearningDashboard() {
  const stats = [
    { label: 'Active Learners', value: '248', icon: '👨‍🎓', trend: '+12%' },
    { label: 'Total Courses', value: '24', icon: '📚', trend: '+3' },
    { label: 'Avg Completion', value: '78%', icon: '✅', trend: '+5%' },
    { label: 'Pending Reviews', value: '18', icon: '📝', trend: '−2' },
  ]

  const recentCourses = [
    {
      id: 1,
      title: 'Introduction to Python',
      instructor: 'Alice Johnson',
      learners: 32,
      status: 'Active',
      progress: 65,
    },
    {
      id: 2,
      title: 'React Fundamentals',
      instructor: 'Bob Smith',
      learners: 28,
      status: 'Active',
      progress: 48,
    },
    {
      id: 3,
      title: 'Database Design',
      instructor: 'Charlie Brown',
      learners: 21,
      status: 'Completed',
      progress: 100,
    },
    {
      id: 4,
      title: 'AWS Certified',
      instructor: 'Diana Williams',
      learners: 15,
      status: 'Draft',
      progress: 25,
    },
  ]

  return (
    <Layout title="Learning Management">
      <div className={styles.dashboard}>
        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          {stats.map((stat, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statHeader}>
                <span className={styles.statIcon}>{stat.icon}</span>
                <span className={styles.statTrend}>{stat.trend}</span>
              </div>
              <div className={styles.statValue}>{stat.value}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Courses Section */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Recent Courses</h2>
              <a href="/learning/courses" className={styles.viewAll}>
                View All →
              </a>
            </div>

            <div className={styles.coursesList}>
              {recentCourses.map((course) => (
                <div key={course.id} className={styles.courseCard}>
                  <div className={styles.courseHeader}>
                    <h3>{course.title}</h3>
                    <span
                      className={`badge ${course.status === 'Active' ? 'badge-success' : course.status === 'Completed' ? 'badge-success' : 'badge-warning'}`}
                    >
                      {course.status}
                    </span>
                  </div>
                  <p className={styles.courseInstructor}>{course.instructor}</p>
                  <div className={styles.courseStats}>
                    <span>👥 {course.learners} learners</span>
                    <span>📊 {course.progress}% complete</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className={styles.section}>
            <h2>Quick Actions</h2>
            <div className={styles.actionsList}>
              <a href="/learning/courses/new" className={styles.actionItem}>
                <span className={styles.actionIcon}>📖</span>
                <div>
                  <div className={styles.actionTitle}>Create Course</div>
                  <div className={styles.actionDesc}>Start a new course</div>
                </div>
              </a>
              <a href="/learning/assignments" className={styles.actionItem}>
                <span className={styles.actionIcon}>✏️</span>
                <div>
                  <div className={styles.actionTitle}>Create Assignment</div>
                  <div className={styles.actionDesc}>Add new assignment</div>
                </div>
              </a>
              <a href="/learning/grades" className={styles.actionItem}>
                <span className={styles.actionIcon}>📊</span>
                <div>
                  <div className={styles.actionTitle}>View Grades</div>
                  <div className={styles.actionDesc}>Review learner grades</div>
                </div>
              </a>
              <a href="/learning/learners" className={styles.actionItem}>
                <span className={styles.actionIcon}>👨‍🎓</span>
                <div>
                  <div className={styles.actionTitle}>Manage Learners</div>
                  <div className={styles.actionDesc}>View all learners</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
