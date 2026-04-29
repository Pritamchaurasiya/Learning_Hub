import type { Phase } from '../types'

export const phases: Phase[] = [
  {
    id: 'phase-1',
    name: 'Phase 1: Beginner',
    description: 'Foundation and fundamentals',
    color: '#22c55e',
    courses: [
      {
        id: '00_Introduction',
        title: '00. Introduction',
        description: 'Welcome to the Software Engineering Mastery Course',
        phase: 'beginner',
        difficulty: 'easy',
        content: '# Introduction\n\nWelcome to the comprehensive Software Engineering Mastery Course...',
        tags: ['introduction', 'overview'],
        estimatedTime: 30,
        prerequisites: [],
        order: 1
      },
      {
        id: '01_Learning_Objectives_Goals',
        title: '01. Learning Objectives & Goals',
        description: 'Understanding what you will achieve',
        phase: 'beginner',
        difficulty: 'easy',
        content: '# Learning Objectives\n\nBy the end of this course, you will be able to...',
        tags: ['goals', 'objectives'],
        estimatedTime: 45,
        prerequisites: ['00_Introduction'],
        order: 2
      },
      {
        id: 'research-methodology',
        title: 'Research Methodology',
        description: 'Systematic approach to gathering and analyzing information',
        phase: 'beginner',
        difficulty: 'medium',
        content: '# Research Methodology\n\n## Overview\nSystematic approach to gathering and analyzing information...',
        tags: ['research', 'methodology', 'analysis'],
        estimatedTime: 60,
        prerequisites: ['01_Learning_Objectives_Goals'],
        order: 3
      },
      {
        id: 'ml-fundamentals',
        title: 'ML & AI Fundamentals',
        description: 'Core concepts in Machine Learning and Artificial Intelligence',
        phase: 'beginner',
        difficulty: 'medium',
        content: '# ML & AI Fundamentals\n\n## Core Concepts\nMachine Learning and AI are transforming software engineering...',
        tags: ['ml', 'ai', 'machine-learning', 'fundamentals'],
        estimatedTime: 90,
        prerequisites: ['research-methodology'],
        order: 4
      },
      {
        id: 'ml-data-prep',
        title: 'ML Data Preparation',
        description: 'Techniques for preparing data for machine learning models',
        phase: 'beginner',
        difficulty: 'medium',
        content: '# ML Data Preparation\n\n## Data Quality\nPreparing data is crucial for ML success...',
        tags: ['ml', 'data', 'preprocessing'],
        estimatedTime: 75,
        prerequisites: ['ml-fundamentals'],
        order: 5
      },
      {
        id: 'backend-architecture',
        title: 'Backend Architecture',
        description: 'Designing robust and scalable backend systems',
        phase: 'beginner',
        difficulty: 'medium',
        content: '# Backend Architecture\n\n## Principles\nBuilding robust backend systems requires careful planning...',
        tags: ['backend', 'architecture', 'design'],
        estimatedTime: 120,
        prerequisites: ['ml-data-prep'],
        order: 6
      },
      {
        id: 'security-foundations',
        title: 'Security Foundations',
        description: 'Essential security concepts for software engineers',
        phase: 'beginner',
        difficulty: 'medium',
        content: '# Security Foundations\n\n## Core Principles\nSecurity is paramount in modern software development...',
        tags: ['security', 'foundations', 'basics'],
        estimatedTime: 90,
        prerequisites: ['backend-architecture'],
        order: 7
      },
      {
        id: 'ci-cd-basics',
        title: 'CI/CD Basics',
        description: 'Introduction to Continuous Integration and Deployment',
        phase: 'beginner',
        difficulty: 'medium',
        content: '# CI/CD Basics\n\n## Overview\nAutomating the software delivery process...',
        tags: ['ci-cd', 'devops', 'automation'],
        estimatedTime: 60,
        prerequisites: ['security-foundations'],
        order: 8
      }
    ]
  },
  {
    id: 'phase-2',
    name: 'Phase 2: Intermediate',
    description: 'Building practical skills',
    color: '#3b82f6',
    courses: [
      {
        id: 'mobile-development',
        title: 'Mobile Development',
        description: 'Building applications for iOS and Android platforms',
        phase: 'intermediate',
        difficulty: 'medium',
        content: '# Mobile Development\n\n## Platforms\nDeveloping for mobile requires understanding platform specifics...',
        tags: ['mobile', 'ios', 'android', 'flutter'],
        estimatedTime: 120,
        prerequisites: ['ci-cd-basics'],
        order: 1
      },
      {
        id: 'full-stack-dev',
        title: 'Full Stack Development',
        description: 'End-to-end web application development',
        phase: 'intermediate',
        difficulty: 'hard',
        content: '# Full Stack Development\n\n## Architecture\nFull stack developers work across the entire application...',
        tags: ['full-stack', 'web', 'frontend', 'backend'],
        estimatedTime: 150,
        prerequisites: ['mobile-development'],
        order: 2
      },
      {
        id: 'cloud-services',
        title: 'Cloud Services',
        description: 'Leveraging cloud platforms for scalable solutions',
        phase: 'intermediate',
        difficulty: 'hard',
        content: '# Cloud Services\n\n## Overview\nCloud computing has revolutionized software deployment...',
        tags: ['cloud', 'aws', 'azure', 'gcp'],
        estimatedTime: 120,
        prerequisites: ['full-stack-dev'],
        order: 3
      },
      {
        id: 'database-systems',
        title: 'Database Systems',
        description: 'Designing and optimizing database solutions',
        phase: 'intermediate',
        difficulty: 'hard',
        content: '# Database Systems\n\n## Data Management\nEfficient data storage and retrieval strategies...',
        tags: ['database', 'sql', 'nosql', 'optimization'],
        estimatedTime: 135,
        prerequisites: ['cloud-services'],
        order: 4
      }
    ]
  },
  {
    id: 'phase-3',
    name: 'Phase 3: Advanced',
    description: 'Mastering complex systems',
    color: '#8b5cf6',
    courses: [
      {
        id: 'system-design',
        title: 'System Design',
        description: 'Designing large-scale distributed systems',
        phase: 'advanced',
        difficulty: 'expert',
        content: '# System Design\n\n## Principles\nBuilding systems that can handle millions of users...',
        tags: ['system-design', 'scalability', 'distributed'],
        estimatedTime: 180,
        prerequisites: ['database-systems'],
        order: 1
      },
      {
        id: 'microservices',
        title: 'Microservices Architecture',
        description: 'Building modular and maintainable services',
        phase: 'advanced',
        difficulty: 'expert',
        content: '# Microservices\n\n## Architecture\nBreaking monoliths into manageable services...',
        tags: ['microservices', 'architecture', 'containers'],
        estimatedTime: 150,
        prerequisites: ['system-design'],
        order: 2
      },
      {
        id: 'devops-mastery',
        title: 'DevOps Mastery',
        description: 'Advanced deployment and operations practices',
        phase: 'advanced',
        difficulty: 'expert',
        content: '# DevOps Mastery\n\n## Culture\nBridging development and operations...',
        tags: ['devops', 'automation', 'monitoring'],
        estimatedTime: 135,
        prerequisites: ['microservices'],
        order: 3
      }
    ]
  },
  {
    id: 'phase-4',
    name: 'Phase 4: Singularity',
    description: 'Cutting-edge innovation',
    color: '#f59e0b',
    courses: [
      {
        id: 'ai-engineering',
        title: 'AI Engineering',
        description: 'Production-grade AI system development',
        phase: 'singularity',
        difficulty: 'expert',
        content: '# AI Engineering\n\n## Production AI\nBuilding AI systems that work at scale...',
        tags: ['ai', 'ml-ops', 'production'],
        estimatedTime: 200,
        prerequisites: ['devops-mastery'],
        order: 1
      },
      {
        id: 'blockchain-dev',
        title: 'Blockchain Development',
        description: 'Decentralized application development',
        phase: 'singularity',
        difficulty: 'expert',
        content: '# Blockchain\n\n## Web3\nBuilding decentralized applications...',
        tags: ['blockchain', 'web3', 'smart-contracts'],
        estimatedTime: 180,
        prerequisites: ['ai-engineering'],
        order: 2
      },
      {
        id: 'quantum-computing',
        title: 'Quantum Computing',
        description: 'Introduction to quantum algorithms and computing',
        phase: 'singularity',
        difficulty: 'expert',
        content: '# Quantum Computing\n\n## The Future\nUnderstanding quantum principles for computing...',
        tags: ['quantum', 'computing', 'algorithms'],
        estimatedTime: 240,
        prerequisites: ['blockchain-dev'],
        order: 3
      }
    ]
  }
]

export const allCourses = phases.flatMap(phase => phase.courses)

export function getCourseById(id: string) {
  return allCourses.find(course => course.id === id)
}

export function getPhaseByCourseId(courseId: string) {
  return phases.find(phase => 
    phase.courses.some(course => course.id === courseId)
  )
}

export function getNextCourse(courseId: string) {
  const currentIndex = allCourses.findIndex(c => c.id === courseId)
  if (currentIndex === -1 || currentIndex >= allCourses.length - 1) return null
  return allCourses[currentIndex + 1]
}

export function getPrevCourse(courseId: string) {
  const currentIndex = allCourses.findIndex(c => c.id === courseId)
  if (currentIndex <= 0) return null
  return allCourses[currentIndex - 1]
}
