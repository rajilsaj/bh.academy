'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import styles from './Layout.module.css'

interface SidebarItem {
  name: string
  href: string
  icon: string
  submenu?: SidebarItem[]
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: '📊',
  },
  {
    name: 'Training Management',
    href: '/training',
    icon: '🎓',
    submenu: [
      { name: 'Trainers', href: '/training/trainers', icon: '👨‍🏫' },
      { name: 'Modules', href: '/training/modules', icon: '📚' },
      { name: 'Sessions', href: '/training/sessions', icon: '📅' },
      { name: 'Affectations', href: '/training/affectations', icon: '👥' },
    ],
  },
  {
    name: 'Learning Management',
    href: '/learning',
    icon: '📖',
    submenu: [
      { name: 'Courses', href: '/learning/courses', icon: '📖' },
      { name: 'Learners', href: '/learning/learners', icon: '👨‍🎓' },
      { name: 'Assignments', href: '/learning/assignments', icon: '✏️' },
      { name: 'Grades', href: '/learning/grades', icon: '📊' },
    ],
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: '📈',
  },
  {
    name: 'System',
    href: '/system',
    icon: '⚙️',
    submenu: [
      { name: 'Users', href: '/system/users', icon: '👤' },
      { name: 'Settings', href: '/system/settings', icon: '⚙️' },
      { name: 'Logs', href: '/system/logs', icon: '📋' },
    ],
  },
]

interface LayoutProps {
  children: React.ReactNode
  title?: string
}

export default function Layout({ children, title }: LayoutProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [expandedMenu, setExpandedMenu] = useState<string | null>(null)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const toggleSubmenu = (name: string) => {
    setExpandedMenu(expandedMenu === name ? null : name)
  }

  return (
    <div className={styles.layoutContainer}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.sidebarClosed : ''}`}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.logo}>
            <span>🏢</span>
            {sidebarOpen && <span>BH Academy</span>}
          </h1>
          <button
            className={styles.toggleBtn}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        <nav className={styles.sidebarNav}>
          {SIDEBAR_ITEMS.map((item) => (
            <div key={item.name}>
              <Link href={item.href}>
                <a
                  className={`${styles.navItem} ${isActive(item.href) ? styles.navItemActive : ''}`}
                  onClick={(e) => {
                    if (item.submenu) {
                      e.preventDefault()
                      toggleSubmenu(item.name)
                    }
                  }}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {sidebarOpen && <span className={styles.navLabel}>{item.name}</span>}
                  {item.submenu && sidebarOpen && (
                    <span className={`${styles.submenuArrow} ${expandedMenu === item.name ? styles.expanded : ''}`}>
                      ▼
                    </span>
                  )}
                </a>
              </Link>

              {item.submenu && expandedMenu === item.name && sidebarOpen && (
                <div className={styles.submenu}>
                  {item.submenu.map((subitem) => (
                    <Link key={subitem.name} href={subitem.href}>
                      <a
                        className={`${styles.submenuItem} ${isActive(subitem.href) ? styles.submenuItemActive : ''}`}
                      >
                        <span className={styles.submenuIcon}>{subitem.icon}</span>
                        <span>{subitem.name}</span>
                      </a>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            {title && <h1 className={styles.pageTitle}>{title}</h1>}
          </div>
          <div className={styles.headerRight}>
            <input
              type="text"
              placeholder="Search..."
              className={styles.searchInput}
              aria-label="Search"
            />
            <button className={styles.notificationBtn} aria-label="Notifications">
              🔔
            </button>
            <button className={styles.profileBtn} aria-label="Profile">
              👤
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className={styles.pageContent}>{children}</div>
      </main>
    </div>
  )
}
