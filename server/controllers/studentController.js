const Student = require("../models/Student");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const { calculateCodingSkillScore, buildPlatformAdapter, getPlatformConnectionSummary, validatePlatformUrl } = require("../services/codingProfileService");
const fs = require("fs");
const path = require("path");
const { successResponse, errorResponse } = require("../utils/response");

const resumeDirectory = path.resolve(process.cwd(), "uploads", "resumes");

const getResumeFilePath = (resumePath) => {
    if (!resumePath) return null;
    const filePath = path.resolve(process.cwd(), resumePath);
    if (!filePath.startsWith(`${resumeDirectory}${path.sep}`)) return null;
    return filePath;
};

const deleteResumeFile = (resumePath) => {
    const filePath = getResumeFilePath(resumePath);
    if (!filePath) return Promise.resolve();
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err && err.code !== "ENOENT") return reject(err);
            resolve();
        });
    });
};

const removeUploadedFile = async (file) => {
    if (file) await deleteResumeFile(`uploads/resumes/${file.filename}`);
};

const profileFields = [
    "github",
    "linkedin",
    "leetcode",
    "codechef",
    "hackerrank",
    "skills",
    "cgpa",
    "year",
    "section"
];

const codingProfileFields = [
    "score",
    "level",
    "explanation",
    "updatedAt",
    "totalProblemsSolved",
    "easySolved",
    "mediumSolved",
    "hardSolved",
    "contestsParticipated",
    "topicAnalysis",
    "platforms"
];

const getProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("-password");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });
        return successResponse(res, { message: "Student profile fetched successfully", data: student });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const updateProfile = async (req, res) => {
    try {
        const requestFields = Object.keys(req.body || {});
        const invalidFields = requestFields.filter((f) => !profileFields.includes(f));
        if (invalidFields.length > 0) return errorResponse(res, { message: "Invalid field(s) provided.", status: 400 });

        const updates = {};
        profileFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
        });

        if (Object.keys(updates).length === 0) return errorResponse(res, { message: "No valid profile fields provided", status: 400 });

        const profileLinks = ["github", "linkedin", "leetcode", "codechef", "hackerrank"];
        for (const field of profileLinks) {
            if (updates[field] !== undefined && typeof updates[field] !== "string") {
                return errorResponse(res, { message: `${field} must be a string`, status: 400 });
            }
        }

        if (updates.skills !== undefined) {
            const validSkills = Array.isArray(updates.skills) && updates.skills.every((s) => typeof s === "string" && s.trim().length > 0);
            if (!validSkills) return errorResponse(res, { message: "Skills must be an array of non-empty strings", status: 400 });
        }

        if (updates.cgpa !== undefined) {
            if (!Number.isFinite(updates.cgpa) || updates.cgpa < 0 || updates.cgpa > 10) {
                return errorResponse(res, { message: "CGPA must be a number between 0 and 10", status: 400 });
            }
        }

        if (updates.year !== undefined) {
            if (!Number.isInteger(updates.year) || updates.year < 1 || updates.year > 8) {
                return errorResponse(res, { message: "Year must be a whole number between 1 and 8", status: 400 });
            }
        }

        const student = await Student.findById(req.user.id).select("-password");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        Object.assign(student, updates);
        await student.save();

        return successResponse(res, { message: "Student profile updated successfully", data: student });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const getCodingProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("codingProfile github leetcode hackerrank codechef linkedin");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        const defaultProfile = {
            score: 0,
            level: "Low",
            explanation: "No coding analytics available yet.",
            updatedAt: null,
            totalProblemsSolved: 0,
            easySolved: 0,
            mediumSolved: 0,
            hardSolved: 0,
            contestsParticipated: 0,
            topicAnalysis: [],
            platforms: []
        };

        const profile = student.codingProfile || defaultProfile;
        const platformSummary = getPlatformConnectionSummary(student);

        return successResponse(res, {
            message: "Coding profile fetched successfully",
            data: {
                ...profile,
                ...platformSummary
            }
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const updateCodingProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("-password");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        const requestFields = Object.keys(req.body || {});
        const invalidFields = requestFields.filter((f) => !codingProfileFields.includes(f) && !["github", "leetcode", "hackerrank", "codechef", "linkedin"].includes(f));
        if (invalidFields.length > 0) return errorResponse(res, { message: "Invalid coding profile field(s) provided", status: 400 });

        const updates = {};
        codingProfileFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
        });

        const platformFields = ["github", "leetcode", "hackerrank", "codechef", "linkedin"];
        platformFields.forEach((field) => {
            if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                const value = req.body[field];
                if (value === "" || value === null || value === undefined) {
                    student[field] = "";
                } else if (typeof value !== "string") {
                    return errorResponse(res, { message: `${field} must be a string`, status: 400 });
                } else if (!validatePlatformUrl(field, value.trim())) {
                    return errorResponse(res, { message: `${field} must be a valid URL`, status: 400 });
                } else {
                    student[field] = value.trim();
                }
            }
        });

        if (Object.keys(updates).length === 0 && platformFields.every((field) => !Object.prototype.hasOwnProperty.call(req.body, field))) {
            return errorResponse(res, { message: "No coding profile fields provided", status: 400 });
        }

        if (updates.score !== undefined && (!Number.isFinite(updates.score) || updates.score < 0 || updates.score > 100)) {
            return errorResponse(res, { message: "Coding score must be between 0 and 100", status: 400 });
        }

        if (updates.totalProblemsSolved !== undefined && (!Number.isInteger(updates.totalProblemsSolved) || updates.totalProblemsSolved < 0)) {
            return errorResponse(res, { message: "Total problems solved must be a non-negative integer", status: 400 });
        }

        if (updates.platforms !== undefined && (!Array.isArray(updates.platforms))) {
            return errorResponse(res, { message: "Platforms must be an array", status: 400 });
        }

        const existingProfile = student.codingProfile || {};
        const normalizedPlatforms = Array.isArray(updates.platforms)
            ? updates.platforms.map((p) => buildPlatformAdapter(p.platform || "Unknown", p))
            : (existingProfile.platforms || []);

        const mergedProfile = {
            ...(existingProfile || {}),
            ...updates,
            platforms: normalizedPlatforms,
            updatedAt: new Date()
        };

        const scoredProfile = calculateCodingSkillScore(mergedProfile);
        mergedProfile.score = scoredProfile.score;
        mergedProfile.level = scoredProfile.level;
        mergedProfile.explanation = scoredProfile.explanation;
        mergedProfile.totalProblemsSolved = scoredProfile.totalProblemsSolved;
        mergedProfile.easySolved = scoredProfile.easySolved;
        mergedProfile.mediumSolved = scoredProfile.mediumSolved;
        mergedProfile.hardSolved = scoredProfile.hardSolved;
        mergedProfile.contestsParticipated = scoredProfile.contestsParticipated;

        student.codingProfile = mergedProfile;
        await student.save();

        const platformSummary = getPlatformConnectionSummary(student);

        return successResponse(res, {
            message: "Coding profile updated successfully",
            data: {
                ...student.codingProfile.toObject ? student.codingProfile.toObject() : student.codingProfile,
                ...platformSummary
            }
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const getDashboard = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("name department year section resume placementReadinessScore");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        const [totalAssessments, completedAssessments, averageResult, recentResults] = await Promise.all([
            Assessment.countDocuments({ assignedStudents: student._id, isActive: true }),
            AssessmentResult.countDocuments({ student: student._id, completed: true }),
            AssessmentResult.aggregate([
                { $match: { student: student._id, completed: true } },
                { $group: { _id: null, averageScore: { $avg: "$percentage" } } }
            ]),
            AssessmentResult.find({ student: student._id, completed: true })
                .select("assessment score percentage submittedAt")
                .populate("assessment", "title")
                .sort({ submittedAt: -1 })
                .limit(5)
                .lean()
        ]);

        return successResponse(res, {
            message: "Student dashboard fetched successfully",
            data: {
                student: {
                    name: student.name,
                    department: student.department,
                    year: student.year,
                    section: student.section
                },
                statistics: {
                    totalAssessments,
                    completedAssessments,
                    pendingAssessments: totalAssessments - completedAssessments,
                    averageScore: averageResult.length > 0 ? Number(averageResult[0].averageScore.toFixed(2)) : 0,
                    placementReadinessScore: student.placementReadinessScore,
                    resumeUploaded: Boolean(student.resume)
                },
                recentResults: recentResults.map((result) => ({
                    assessment: result.assessment ? { title: result.assessment.title } : null,
                    score: result.score,
                    percentage: result.percentage,
                    submittedAt: result.submittedAt
                }))
            }
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const uploadResume = async (req, res) => {
    try {
        if (!req.file) return errorResponse(res, { message: "Resume PDF file is required", status: 400 });

        const student = await Student.findById(req.user.id);
        if (!student) {
            await removeUploadedFile(req.file);
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        if (student.resume) {
            await removeUploadedFile(req.file);
            return errorResponse(res, { message: "Resume already exists. Use PUT to replace it", status: 409 });
        }

        student.resume = `uploads/resumes/${req.file.filename}`;
        await student.save();

        return successResponse(res, { status: 201, message: "Resume uploaded successfully", data: { resume: student.resume } });
    } catch (error) {
        await removeUploadedFile(req.file);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const getResume = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("resume");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        const resumeFilePath = getResumeFilePath(student.resume);
        if (!student.resume || !resumeFilePath || !fs.existsSync(resumeFilePath)) {
            return errorResponse(res, { message: "Resume not found", status: 404 });
        }

        return successResponse(res, { message: "Resume fetched successfully", data: { resume: student.resume } });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const replaceResume = async (req, res) => {
    let resumeSaved = false;
    try {
        if (!req.file) return errorResponse(res, { message: "Resume PDF file is required", status: 400 });

        const student = await Student.findById(req.user.id);
        if (!student) {
            await removeUploadedFile(req.file);
            return errorResponse(res, { message: "Student not found", status: 404 });
        }

        if (!student.resume) {
            await removeUploadedFile(req.file);
            return errorResponse(res, { message: "Resume not found", status: 404 });
        }

        const previousResume = student.resume;
        student.resume = `uploads/resumes/${req.file.filename}`;
        await student.save();
        resumeSaved = true;
        await deleteResumeFile(previousResume);

        return successResponse(res, { message: "Resume replaced successfully", data: { resume: student.resume } });
    } catch (error) {
        if (!resumeSaved) await removeUploadedFile(req.file);
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const deleteResume = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });
        if (!student.resume) return errorResponse(res, { message: "Resume not found", status: 404 });

        await deleteResumeFile(student.resume);
        student.resume = "";
        await student.save();

        return successResponse(res, { message: "Resume deleted successfully", data: {} });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    getCodingProfile,
    updateCodingProfile,
    getDashboard,
    uploadResume,
    getResume,
    replaceResume,
    deleteResume
};
