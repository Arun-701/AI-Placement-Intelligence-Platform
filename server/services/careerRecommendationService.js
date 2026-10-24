const Student = require("../models/Student");
const AssessmentResult = require("../models/AssessmentResult");
const { analyzeResume } = require("./resumeAnalysisService");
const { generateAIResponse } = require("./geminiService");
const { calculatePlacementReadiness } = require("./readinessScoringService");

const buildStudentProfile = async (studentId) => {
    const student = await Student.findById(studentId).select(
        "name department year section skills cgpa placementReadinessScore resume readinessProfile"
    );

    if (!student) {
        throw new Error("Student not found");
    }

    const assessmentResults = await AssessmentResult.find({ student: studentId, completed: true })
        .select("assessment percentage score recommendations strengths weaknesses")
        .lean();

    return {
        student,
        assessmentResults
    };
};

const normalizeRecommendation = (recommendation) => ({
    recommendedCareer: typeof recommendation?.recommendedCareer === "string" ? recommendation.recommendedCareer.trim() : "",
    careerMatchPercentage: Number.isFinite(Number(recommendation?.careerMatchPercentage))
        ? Math.min(100, Math.max(0, Math.round(Number(recommendation.careerMatchPercentage))))
        : 0,
    recommendedSkills: Array.isArray(recommendation?.recommendedSkills)
        ? recommendation.recommendedSkills.filter((skill) => typeof skill === "string" && skill.trim()).map((skill) => skill.trim())
        : [],
    learningRoadmap: Array.isArray(recommendation?.learningRoadmap)
        ? recommendation.learningRoadmap.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [],
    recommendedCourses: Array.isArray(recommendation?.recommendedCourses)
        ? recommendation.recommendedCourses.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [],
    recommendedCertifications: Array.isArray(recommendation?.recommendedCertifications)
        ? recommendation.recommendedCertifications.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [],
    recommendedProjects: Array.isArray(recommendation?.recommendedProjects)
        ? recommendation.recommendedProjects.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [],
    interviewPreparation: Array.isArray(recommendation?.interviewPreparation)
        ? recommendation.interviewPreparation.filter((item) => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [],
    placementReadiness: Number.isFinite(Number(recommendation?.placementReadiness))
        ? Math.min(100, Math.max(0, Math.round(Number(recommendation.placementReadiness))))
        : 0,
    summary: typeof recommendation?.summary === "string" ? recommendation.summary.trim() : ""
});

const parseRecommendationResponse = (responseText) => {
    const trimmedText = responseText.trim();
    const jsonStart = trimmedText.indexOf("{");
    const jsonEnd = trimmedText.lastIndexOf("}");

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
        throw new Error("Invalid AI response format");
    }

    const jsonText = trimmedText.slice(jsonStart, jsonEnd + 1);

    try {
        const parsed = JSON.parse(jsonText);
        return normalizeRecommendation(parsed);
    } catch (error) {
        throw new Error("Invalid AI response format");
    }
};

const generateCareerRecommendation = async (studentId) => {
    const { student, assessmentResults } = await buildStudentProfile(studentId);

    if (!student.resume) {
        throw new Error("Resume not found");
    }

    const resumeAnalysis = await analyzeResume(student.resume);
    const readiness = calculatePlacementReadiness(student, resumeAnalysis, assessmentResults);

    const assessmentSummary = assessmentResults.map((result) => ({
        percentage: result.percentage,
        score: result.score,
        recommendations: result.recommendations || [],
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || []
    }));

    const prompt = `You are an expert career guidance advisor.

Use the student's resume analysis, profile, skills, CGPA, assessment results, and placement readiness score to generate a personalized career recommendation.

Return ONLY valid JSON.
Do NOT use markdown.
Do NOT include explanations.
Do NOT wrap the JSON inside code fences.

Return exactly this structure:
{
  "recommendedCareer":"",
  "careerMatchPercentage":0,
  "recommendedSkills":[],
  "learningRoadmap":[],
  "recommendedCourses":[],
  "recommendedCertifications":[],
  "recommendedProjects":[],
  "interviewPreparation":[],
  "placementReadiness":0,
  "summary":"",
  "explanation":""
}

Student Profile:
Name: ${student.name || ""}
Department: ${student.department || ""}
Year: ${student.year || ""}
Section: ${student.section || ""}
Skills: ${Array.isArray(student.skills) ? student.skills.join(", ") : ""}
CGPA: ${student.cgpa || 0}
Placement Readiness Score: ${student.placementReadinessScore || readiness.score}

Resume Analysis:
${JSON.stringify(resumeAnalysis)}

Assessment Results:
${JSON.stringify(assessmentSummary)}
`;

    const responseText = await generateAIResponse(prompt);
    const recommendation = parseRecommendationResponse(responseText);

    const updatedReadinessProfile = {
        score: readiness.score,
        level: readiness.level,
        explanation: recommendation.explanation || readiness.explanation,
        recommendedActions: readiness.recommendedActions,
        lastCalculatedAt: new Date()
    };

    await Student.findByIdAndUpdate(studentId, {
        placementReadinessScore: readiness.score,
        readinessProfile: updatedReadinessProfile
    });

    return {
        ...recommendation,
        readinessProfile: updatedReadinessProfile
    };
};

module.exports = {
    generateCareerRecommendation
};
