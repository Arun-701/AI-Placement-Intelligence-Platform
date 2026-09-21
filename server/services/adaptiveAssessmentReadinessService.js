const LEVELS = ["Very Low", "Low", "Medium", "High"];
const readinessLevel = (accuracy) => accuracy >= 80 ? "High" : accuracy >= 60 ? "Medium" : accuracy >= 40 ? "Low" : "Very Low";

function buildReadinessResult(questions) {
    const topics = {};
    const milestones = {};
    questions.forEach((question) => {
        const add = (bucket, key) => {
            if (!bucket[key]) bucket[key] = { questionsAttempted: 0, correct: 0 };
            bucket[key].questionsAttempted += 1;
            if (question.isCorrect) bucket[key].correct += 1;
        };
        add(topics, question.topic);
        add(milestones, question.milestone);
    });
    const format = (bucket, keyName) => Object.entries(bucket).map(([key, value]) => {
        const accuracy = value.questionsAttempted ? Number(((value.correct / value.questionsAttempted) * 100).toFixed(2)) : 0;
        return { [keyName]: key, ...value, accuracy, readinessLevel: readinessLevel(accuracy) };
    });
    const total = questions.length;
    const correct = questions.filter((question) => question.isCorrect).length;
    const accuracy = total ? Number(((correct / total) * 100).toFixed(2)) : 0;
    return { totalQuestions: total, correctAnswers: correct, accuracy, readinessLevel: readinessLevel(accuracy), topicReadiness: format(topics, "topic"), milestoneReadiness: format(milestones, "milestone") };
}

async function updateRoadmapReadiness(roadmap, readiness) {
    if (!roadmap) return;
    const byMilestone = new Map(readiness.milestoneReadiness.map((entry) => [entry.milestone, entry]));
    roadmap.roadmapItems.forEach((item) => {
        const result = byMilestone.get(item.title);
        if (result) item.adaptiveReadiness = { accuracy: result.accuracy, level: result.readinessLevel, assessedAt: new Date(), topics: readiness.topicReadiness.filter((topic) => topic.topic === item.title) };
    });
    await roadmap.save();
}

module.exports = { LEVELS, readinessLevel, buildReadinessResult, updateRoadmapReadiness };
