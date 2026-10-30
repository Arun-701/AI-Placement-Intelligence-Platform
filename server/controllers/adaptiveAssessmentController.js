const crypto = require("crypto");
const AdaptiveAssessment = require("../models/AdaptiveAssessment");
const Roadmap = require("../models/Roadmap");
const { checkOllamaHealth, generateValidatedQuestion, generateBatchValidatedQuestions, LocalAiError } = require("../services/llamaQuestionGenerationService");
const { buildReadinessResult, updateRoadmapReadiness } = require("../services/adaptiveAssessmentReadinessService");

const OVERALL_PER_MILESTONE = Number(process.env.ADAPTIVE_OVERALL_QUESTIONS_PER_MILESTONE || 3);
const OVERALL_MAX_QUESTIONS = Number(process.env.ADAPTIVE_OVERALL_MAX_QUESTIONS || 25);
const MILESTONE_QUESTION_COUNT = Number(process.env.ADAPTIVE_MILESTONE_QUESTION_COUNT || 15);
console.log('[ADAPTIVE_CONFIG]', {
    overall: OVERALL_MAX_QUESTIONS,
    milestone: MILESTONE_QUESTION_COUNT,
    perMilestone: process.env.ADAPTIVE_OVERALL_QUESTIONS_PER_MILESTONE
});
const normalize = (value) => String(value || "").trim().toLowerCase();
const publicAssessment = (assessment) => ({ id: assessment._id, mode: assessment.assessmentMode, domain: assessment.domain, milestone: assessment.milestone, title: assessment.title, status: assessment.status, questionCount: assessment.questions.length, questions: assessment.questions.map(({ questionId, topic, difficulty, questionType, question, options }) => ({ questionId, topic, difficulty, questionType, question, options })) });

function buildOverallMilestonePlan(totalMilestones, targetTotal) {
    if (!totalMilestones) return [];
    const base = Math.floor(targetTotal / totalMilestones);
    const remainder = targetTotal % totalMilestones;
    return Array.from({ length: totalMilestones }, (_, index) => base + (index < remainder ? 1 : 0));
}

function difficultyPlan(readiness, count) {
    const ratios = readiness === "Very Low" ? [0.7, 0.3, 0] : readiness === "Low" ? [0.5, 0.5, 0] : readiness === "High" ? [0.1, 0.45, 0.45] : [0.25, 0.6, 0.15];
    // Start with rounded values to keep original behavior as much as possible
    let easy = Math.round(count * ratios[0]);
    let medium = Math.round(count * ratios[1]);
    // Adjust so total exactly equals requested count
    let total = easy + medium;
    if (total > count) {
        // reduce medium first, then easy if needed
        let excess = total - count;
        const reduceFromMedium = Math.min(excess, medium);
        medium -= reduceFromMedium;
        excess -= reduceFromMedium;
        if (excess > 0) {
            const reduceFromEasy = Math.min(excess, easy);
            easy -= reduceFromEasy;
            excess -= reduceFromEasy;
        }
    }
    // Now compute hard as the remainder (will be >= 0)
    const hard = Math.max(0, count - easy - medium);
    return [...Array(easy).fill("Easy"), ...Array(medium).fill("Medium"), ...Array(hard).fill("Hard")];
}

function currentMilestoneReadiness(roadmap, item) { return item.adaptiveReadiness?.level || roadmap.adaptiveReadiness?.[item.title]?.level || "Very Low"; }

async function generateAssessment(req, res) {
    try {
        const { mode, roadmapId, milestoneId } = req.body || {};
        console.log('[ADAPTIVE_RUNTIME_CONFIG]', {
            mode,
            overallMaxQuestions: OVERALL_MAX_QUESTIONS,
            milestoneQuestionCount: MILESTONE_QUESTION_COUNT
        });
        console.log(`[ADAPTIVE_MILESTONE_REQUEST] mode: ${mode}, roadmapId: ${roadmapId}, milestoneId: ${milestoneId}`);
        if (!["overall", "milestone"].includes(mode) || !roadmapId) return res.status(400).json({ success: false, message: "mode and roadmapId are required." });
        const roadmap = await Roadmap.findOne({ _id: roadmapId, student: req.user.id });
        if (!roadmap) return res.status(404).json({ success: false, message: "Roadmap not found." });
        const items = roadmap.roadmapItems || [];
        const selected = mode === "milestone" ? items.filter((item) => item._id.toString() === String(milestoneId)) : items;
        console.log(`[ADAPTIVE_MILESTONE_LOOKUP] milestoneId: ${milestoneId}, found: ${selected.length > 0}, selected: ${selected.map(s => s.title).join(", ")}`);
        if (!selected.length) return res.status(400).json({ success: false, message: mode === "milestone" ? "Milestone not found in this roadmap." : "Roadmap has no milestones to assess." });
        await checkOllamaHealth();
        console.log('[TRACE-0] Olla health check passed');
        const seen = new Set();
        const questions = [];
        const assessmentStart = Date.now();
        console.log('[OVERALL_LOOP_START]', { totalMilestones: selected.length, milestones: selected.map(m => m.title) });
        const overallPlan = mode === 'overall' ? buildOverallMilestonePlan(selected.length, OVERALL_MAX_QUESTIONS) : null;
        for (let milestoneIndex = 0; milestoneIndex < selected.length; milestoneIndex++) {
            const item = selected[milestoneIndex];
            const plannedCount = mode === 'overall' ? overallPlan[milestoneIndex] || 0 : MILESTONE_QUESTION_COUNT;
            console.log('[OVERALL_LOOP_MILESTONE_START]', {
                index: milestoneIndex,
                total: selected.length,
                milestone: item.title,
                plannedCount,
                targetTotal: OVERALL_MAX_QUESTIONS
            });
            const count = plannedCount;
            console.log(`[ADAPTIVE_MILESTONE_GENERATION] milestone: ${item.title}, mode: ${mode}, questionCount: ${count}, readiness: ${currentMilestoneReadiness(roadmap, item)}`);
            
            // Build contexts for all difficulties for this milestone (batch generation)
            const diffPlan = difficultyPlan(currentMilestoneReadiness(roadmap, item), count);
            console.log('[TRACE-2] Difficulty plan created', { difficulties: diffPlan });
            console.log(`[DIFFICULTY_PLAN_CHECK] expected=${count} actual=${diffPlan.length}`);
            const contexts = diffPlan.map((difficulty) => ({
                domain: roadmap.careerGoal,
                milestone: item.title,
                topic: item.title,
                difficulty
            }));
            
            console.log('[TRACE-4] Calling generateBatchValidatedQuestions');
            const batchGenerated = await generateBatchValidatedQuestions(contexts, seen);
            console.log('[TRACE-5] Batch questions generated successfully', { count: batchGenerated.length, expected: contexts.length });
            
            for (const generated of batchGenerated) {
                questions.push({ ...generated, questionId: crypto.randomUUID() });
            }
            console.log('[TRACE-6] Questions added to array', { totalQuestions: questions.length, maxQuestions: OVERALL_MAX_QUESTIONS });
            
            if (mode === "overall" && questions.length >= OVERALL_MAX_QUESTIONS) {
                console.log('[TRACE-7] BREAKING from milestone loop - max questions reached', { current: questions.length, max: OVERALL_MAX_QUESTIONS });
                break;
            }
            console.log('[OVERALL_LOOP_MILESTONE_END]', {
                index: milestoneIndex,
                milestone: item.title,
                questionsAfterThisMilestone: questions.length
            });
            console.log('[TRACE-10] Continuing to next milestone');
        }
        console.log('[TRACE-11] Exited milestone loop', { totalQuestions: questions.length });
        const assessmentTime = Date.now() - assessmentStart;
        console.log(`[PERF] assessment totalMs=${assessmentTime}`);
        console.log(`[ADAPTIVE_MILESTONE_SAVED] mode: ${mode}, milestone: ${selected[0].title}, questionCount: ${questions.length}, assessmentMode: ${mode}`);
        console.log('[ADAPTIVE_DB_CREATE_START]', { mode, domain: roadmap.careerGoal, questionCount: questions.length });
        const assessment = await AdaptiveAssessment.create({ studentId: req.user.id, roadmapId: roadmap._id, domain: roadmap.careerGoal, assessmentMode: mode, milestoneId: mode === "milestone" ? selected[0]._id : null, milestone: mode === "milestone" ? selected[0].title : "", title: mode === "overall" ? `${roadmap.careerGoal} Overall Roadmap Assessment` : `${selected[0].title} Adaptive Assessment`, questions, readinessSnapshot: Object.fromEntries(selected.map((item) => [item.title, currentMilestoneReadiness(roadmap, item)])) });
        console.log('[ADAPTIVE_DB_CREATE_END]', { assessmentId: assessment._id, questionCount: assessment.questions.length });
        console.log('[TRACE-12] Assessment created and returning response');
        return res.status(201).json({ success: true, assessment: publicAssessment(assessment) });
    } catch (error) {
        const status = error.status || 500;
        console.error(`[ADAPTIVE_FATAL_ERROR] status: ${status}, code: ${error.code}, message: ${error.message}`);
        console.error(`[ADAPTIVE_FATAL_STACK]`, error?.stack);
        console.log(`[ADAPTIVE_ERROR] status: ${status}, code: ${error.code}, message: ${error.message}`);
        return res.status(status).json({ success: false, error: error.code || "ADAPTIVE_ASSESSMENT_ERROR", message: error.message || "Unable to generate adaptive assessment." });
    }
}

async function getAssessment(req, res) {
    const assessment = await AdaptiveAssessment.findOne({ _id: req.params.id, studentId: req.user.id });
    if (!assessment) return res.status(404).json({ success: false, message: "Adaptive assessment not found." });
    if (assessment.status === "completed") return res.status(409).json({ success: false, message: "This assessment is already completed. Open its result instead." });
    if (!assessment.startedAt) { assessment.startedAt = new Date(); assessment.status = "in-progress"; await assessment.save(); }
    return res.json({ success: true, assessment: publicAssessment(assessment) });
}

async function submitAssessment(req, res) {
    const assessment = await AdaptiveAssessment.findOne({ _id: req.params.id, studentId: req.user.id }).select("+questions.correctAnswer +questions.explanation");
    if (!assessment) return res.status(404).json({ success: false, message: "Adaptive assessment not found." });
    if (assessment.status === "completed") return res.status(409).json({ success: false, message: "This assessment has already been submitted." });
    const answers = req.body?.answers;
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) return res.status(400).json({ success: false, message: "answers must be an object keyed by questionId." });
    assessment.questions.forEach((question) => { const answer = typeof answers[question.questionId] === "string" ? answers[question.questionId] : ""; question.selectedAnswer = answer; question.isCorrect = answer === question.correctAnswer; });
    const readiness = buildReadinessResult(assessment.questions);
    assessment.result = readiness; assessment.status = "completed"; assessment.completedAt = new Date(); await assessment.save();
    const roadmap = await Roadmap.findOne({ _id: assessment.roadmapId, student: req.user.id });
    await updateRoadmapReadiness(roadmap, readiness);
    return res.json({ success: true, result: { id: assessment._id, mode: assessment.assessmentMode, domain: assessment.domain, milestone: assessment.milestone, ...readiness } });
}

async function getResult(req, res) {
    const assessment = await AdaptiveAssessment.findOne({ _id: req.params.id, studentId: req.user.id });
    if (!assessment) return res.status(404).json({ success: false, message: "Adaptive assessment not found." });
    if (assessment.status !== "completed") return res.status(409).json({ success: false, message: "Assessment has not been submitted yet." });
    return res.json({ success: true, result: { id: assessment._id, mode: assessment.assessmentMode, domain: assessment.domain, milestone: assessment.milestone, title: assessment.title, ...assessment.result } });
}

module.exports = { generateAssessment, getAssessment, submitAssessment, getResult };
