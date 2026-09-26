export const TOPIC_PERFORMANCE_THRESHOLDS = {
  strong: 75,
  average: 50,
}

export const getTopicStatus = (accuracy) => {
  const numericAccuracy = Number.isFinite(Number(accuracy)) ? Number(accuracy) : 0

  if (numericAccuracy >= TOPIC_PERFORMANCE_THRESHOLDS.strong) {
    return { label: 'Strong', tone: 'green' }
  }

  if (numericAccuracy >= TOPIC_PERFORMANCE_THRESHOLDS.average) {
    return { label: 'Average', tone: 'amber' }
  }

  return { label: 'Needs Improvement', tone: 'red' }
}

export const normalizeTopicAnalysis = (entries = []) => {
  if (!Array.isArray(entries)) return []

  return entries
    .map((entry, index) => {
      const topic = typeof entry?.topic === 'string' && entry.topic.trim() ? entry.topic.trim() : 'General'
      const totalQuestions = Number(entry?.totalQuestions ?? 0)
      const correctAnswers = Number(entry?.correctAnswers ?? 0)
      const rawAccuracy = Number(entry?.accuracy)
      const accuracy = Number.isFinite(rawAccuracy)
        ? rawAccuracy
        : totalQuestions > 0
          ? (correctAnswers / totalQuestions) * 100
          : 0

      if (!Number.isFinite(accuracy)) {
        return null
      }

      return {
        key: `${topic}-${index}`,
        topic,
        correctAnswers,
        totalQuestions,
        accuracy: Math.min(100, Math.max(0, accuracy)),
        status: getTopicStatus(accuracy),
      }
    })
    .filter(Boolean)
    .sort((left, right) => right.accuracy - left.accuracy || left.topic.localeCompare(right.topic))
}

export const aggregateStudentTopicPerformance = (results = []) => {
  if (!Array.isArray(results)) return []

  const aggregatedMap = new Map()

  results.forEach((result) => {
    if (!result || !Array.isArray(result.topicAnalysis)) return

    result.topicAnalysis.forEach((entry) => {
      const topicName = typeof entry?.topic === 'string' && entry.topic.trim() ? entry.topic.trim() : 'General'
      const totalQuestions = Number(entry?.totalQuestions ?? 0)
      const correctAnswers = Number(entry?.correctAnswers ?? 0)
      const assessmentSource = result?.assessment
      const assessmentKey = typeof assessmentSource === 'string'
        ? assessmentSource
        : assessmentSource?._id
          ? assessmentSource._id.toString()
          : assessmentSource?.id
            ? assessmentSource.id.toString()
            : result?._id?.toString?.() || 'unknown'

      if (!aggregatedMap.has(topicName)) {
        aggregatedMap.set(topicName, {
          topic: topicName,
          correctAnswers: 0,
          totalQuestions: 0,
          assessments: new Set(),
        })
      }

      const current = aggregatedMap.get(topicName)
      if (assessmentKey) current.assessments.add(assessmentKey)
      current.correctAnswers += Number.isFinite(correctAnswers) ? correctAnswers : 0
      current.totalQuestions += Number.isFinite(totalQuestions) ? totalQuestions : 0
    })
  })

  return Array.from(aggregatedMap.values())
    .map((entry) => {
      const accuracy = entry.totalQuestions > 0 ? (entry.correctAnswers / entry.totalQuestions) * 100 : 0
      return {
        topic: entry.topic,
        correctAnswers: entry.correctAnswers,
        totalQuestions: entry.totalQuestions,
        accuracy: Math.min(100, Math.max(0, accuracy)),
        assessmentsAttempted: entry.assessments.size,
        status: getTopicStatus(accuracy),
      }
    })
    .filter((entry) => entry.totalQuestions > 0)
    .sort((left, right) => right.accuracy - left.accuracy || left.topic.localeCompare(right.topic))
}
