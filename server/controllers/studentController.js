const Student = require("../models/Student");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const { calculateCodingSkillScore, getPlatformConnectionSummary, validatePlatformUrl, fetchPlatformStatistics } = require("../services/codingProfileService");
const { analyzeResume } = require("../services/resumeAnalysisService");
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

const codingPlatformFields = ["github", "leetcode", "hackerrank", "codechef", "codeforces"];

const buildCodingProfileResponse = (student) => {
    const profile = student.codingProfile?.toObject
        ? student.codingProfile.toObject()
        : (student.codingProfile || {});

    return {
        ...profile,
        ...getPlatformConnectionSummary(student),
        profileUrls: {
            leetcode: student.leetcode || "",
            hackerrank: student.hackerrank || "",
            codechef: student.codechef || "",
            github: student.github || "",
            codeforces: student.codeforces || ""
        }
    };
};

const retainDifficultyBreakdown = (latest, existing) => {
    const previous = existing?.toObject ? existing.toObject() : existing;
    if (latest.difficultyBreakdownAvailable || !previous?.profileVerified
        || previous.difficultyBreakdownAvailable !== true
        || previous.profileUrl !== latest.profileUrl) {
        return latest;
    }

    const classifiedSolved = ["easySolved", "mediumSolved", "hardSolved"]
        .reduce((sum, field) => sum + (Number.isFinite(previous[field]) ? previous[field] : 0), 0);
    const latestTotal = Number.isFinite(latest.totalSolved) ? latest.totalSolved : null;
    return {
        ...latest,
        easySolved: previous.easySolved,
        mediumSolved: previous.mediumSolved,
        hardSolved: previous.hardSolved,
        difficultyBreakdownAvailable: true,
        difficultyBreakdownStatus: "stale",
        difficultyBreakdownUpdatedAt: previous.difficultyBreakdownUpdatedAt,
        unclassifiedSolved: latestTotal === null ? previous.unclassifiedSolved : Math.max(0, latestTotal - classifiedSolved)
    };
};

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
        const student = await Student.findById(req.user.id).select("codingProfile github leetcode hackerrank codechef codeforces");
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

        const profile = student.codingProfile ? buildCodingProfileResponse(student) : defaultProfile;

        return successResponse(res, {
            message: "Coding profile fetched successfully",
            data: {
                ...profile,
                profileUrls: profile.profileUrls || buildCodingProfileResponse(student).profileUrls
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

        const platformFields = codingPlatformFields;
        const requestFields = Object.keys(req.body || {});
        const requestedPlatformFields = platformFields.filter((field) => Object.prototype.hasOwnProperty.call(req.body, field));
        const invalidFields = requestFields.filter((field) => !platformFields.includes(field));
        if (invalidFields.length > 0) return errorResponse(res, { message: "Invalid coding profile field(s) provided", status: 400 });

        if (platformFields.every((field) => !Object.prototype.hasOwnProperty.call(req.body, field))) {
            return errorResponse(res, { message: "No coding profile fields provided", status: 400 });
        }

        const submittedUrls = {};
        const fieldErrors = {};
        for (const field of platformFields) {
            const value = Object.prototype.hasOwnProperty.call(req.body, field)
                ? req.body[field]
                : (student[field] || "");
            if (value === "" || value === null || value === undefined) {
                submittedUrls[field] = "";
            } else if (typeof value !== "string" || !validatePlatformUrl(field, value.trim())) {
                fieldErrors[field] = `Enter a valid ${field} profile URL.`;
            } else {
                submittedUrls[field] = value.trim();
            }
        }
        if (Object.keys(fieldErrors).length > 0) {
            return errorResponse(res, { message: "Please correct the invalid profile URLs", data: { fieldErrors }, status: 400 });
        }

        const platforms = [];
        try {
            const existingPlatforms = student.codingProfile?.platforms || [];
            const existingPlatformsByName = new Map(existingPlatforms.map((platform) => [platform.platform.toLowerCase(), platform]));
            for (const field of platformFields) {
                if (!requestedPlatformFields.includes(field)) {
                    const existingPlatform = existingPlatformsByName.get(field);
                    if (existingPlatform) platforms.push(existingPlatform.toObject ? existingPlatform.toObject() : existingPlatform);
                    continue;
                }
                if (!submittedUrls[field]) continue;
                const latest = await fetchPlatformStatistics(field, submittedUrls[field]);
                platforms.push(retainDifficultyBreakdown(latest, existingPlatformsByName.get(field)));
            }
        } catch (error) {
            return errorResponse(res, {
                message: "Unable to verify this profile. Please check the URL and make sure the profile is publicly accessible.",
                data: { detail: error.message },
                status: 422
            });
        }

        const existingProfile = student.codingProfile || {};
        platformFields.forEach((field) => { student[field] = submittedUrls[field]; });
        const totals = platforms.reduce((summary, platform) => ({
            totalProblemsSolved: summary.totalProblemsSolved + (Number.isFinite(platform.totalSolved) ? platform.totalSolved : 0),
            easySolved: summary.easySolved + (Number.isFinite(platform.easySolved) ? platform.easySolved : 0),
            mediumSolved: summary.mediumSolved + (Number.isFinite(platform.mediumSolved) ? platform.mediumSolved : 0),
            hardSolved: summary.hardSolved + (Number.isFinite(platform.hardSolved) ? platform.hardSolved : 0),
            contestsParticipated: summary.contestsParticipated + (Number.isFinite(platform.contestsParticipated) ? platform.contestsParticipated : 0)
        }), { totalProblemsSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, contestsParticipated: 0 });

        const mergedProfile = {
            ...(existingProfile || {}),
            ...totals,
            platforms,
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

        return successResponse(res, {
            message: "Coding profile updated successfully",
            data: buildCodingProfileResponse(student)
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const refreshCodingProfile = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select("-password");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        const existingPlatforms = student.codingProfile?.platforms || [];
        const existingPlatformsByName = new Map(existingPlatforms.map((platform) => [platform.platform.toLowerCase(), platform]));
        const refreshResults = await Promise.all(codingPlatformFields.map(async (field) => {
            const profileUrl = student[field] || "";
            if (!profileUrl) return { field, platform: null };
            try {
                return { field, platform: await fetchPlatformStatistics(field, profileUrl) };
            } catch (error) {
                return { field, error: `Could not be refreshed: ${error.message}` };
            }
        }));

        const refreshErrors = [];
        const platforms = refreshResults.reduce((items, result) => {
            if (result.platform) {
                items.push(retainDifficultyBreakdown(result.platform, existingPlatformsByName.get(result.field)));
            } else if (result.error) {
                const existing = existingPlatformsByName.get(result.field);
                if (existing) items.push(existing.toObject ? existing.toObject() : existing);
                refreshErrors.push({ platform: result.field, message: result.error });
            }
            return items;
        }, []);

        const totals = platforms.reduce((summary, platform) => ({
            totalProblemsSolved: summary.totalProblemsSolved + (Number.isFinite(platform.totalSolved) ? platform.totalSolved : 0),
            easySolved: summary.easySolved + (Number.isFinite(platform.easySolved) ? platform.easySolved : 0),
            mediumSolved: summary.mediumSolved + (Number.isFinite(platform.mediumSolved) ? platform.mediumSolved : 0),
            hardSolved: summary.hardSolved + (Number.isFinite(platform.hardSolved) ? platform.hardSolved : 0),
            contestsParticipated: summary.contestsParticipated + (Number.isFinite(platform.contestsParticipated) ? platform.contestsParticipated : 0)
        }), { totalProblemsSolved: 0, easySolved: 0, mediumSolved: 0, hardSolved: 0, contestsParticipated: 0 });

        const scoredProfile = calculateCodingSkillScore(totals);
        student.codingProfile = {
            ...(student.codingProfile?.toObject ? student.codingProfile.toObject() : (student.codingProfile || {})),
            ...totals,
            platforms,
            score: scoredProfile.score,
            level: scoredProfile.level,
            explanation: scoredProfile.explanation,
            updatedAt: new Date()
        };
        await student.save();

        return successResponse(res, {
            message: refreshErrors.length > 0 ? "Coding profile refreshed with some errors" : "Coding profile refreshed successfully",
            data: { ...buildCodingProfileResponse(student), refreshErrors }
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

const removeUploadedFileSafely = async (file) => {
    try {
        await removeUploadedFile(file);
    } catch (error) {
        console.error("Uploaded resume cleanup failed:", error.message);
    }
};

const uploadStudentResume = async (req, res, replace) => {
    if (!req.file) return errorResponse(res, { message: "Resume file is required", status: 400 });

    const newResume = `uploads/resumes/${req.file.filename}`;
    let student;
    try {
        student = await Student.findById(req.user.id);
    } catch (error) {
        await removeUploadedFileSafely(req.file);
        return errorResponse(res, { message: "Unable to load the student record.", status: 500 });
    }

    if (!student) {
        await removeUploadedFileSafely(req.file);
        return errorResponse(res, { message: "Student not found", status: 404 });
    }

    const previousResume = student.resume;
    const previousFilePath = getResumeFilePath(previousResume);
    const previousFileExists = previousFilePath && fs.existsSync(previousFilePath);

    if (!replace && previousFileExists) {
        await removeUploadedFileSafely(req.file);
        return errorResponse(res, { message: "Resume already exists. Use PUT to replace it", status: 409 });
    }

    if (replace && !previousResume) {
        await removeUploadedFileSafely(req.file);
        return errorResponse(res, { message: "Resume not found", status: 404 });
    }

    let resumeAnalysis;
    try {
        resumeAnalysis = await analyzeResume(newResume);
    } catch (error) {
        await removeUploadedFileSafely(req.file);
        if (error.message === "No selectable text found in PDF") {
            return errorResponse(res, { message: "This PDF contains no selectable text. Please upload a text-based PDF.", status: 400 });
        }
        if (error.message === "Uploaded file is not a valid PDF") {
            return errorResponse(res, { message: "Uploaded file is not a valid PDF.", status: 400 });
        }
        if (error.message === "Uploaded file is not a valid DOCX") {
            return errorResponse(res, { message: "Uploaded file is not a valid DOCX.", status: 400 });
        }
        if (error.message === "No readable text found in resume file") {
            return errorResponse(res, { message: "Unable to find readable text in this resume.", status: 400 });
        }
        if (error.message === "Unable to extract resume text") {
            return errorResponse(res, { message: "Unable to extract text from this resume.", status: 400 });
        }
        console.error("Resume analysis failed:", error.message);
        return errorResponse(res, { message: "Resume analysis failed. Your existing resume was not changed.", status: 500 });
    }

    student.resume = newResume;
    student.resumeOriginalName = req.file.originalname || req.file.filename;
    student.resumeMimeType = req.file.mimetype || "application/octet-stream";
    student.resumeSize = Number(req.file.size) || 0;
    student.resumeAnalysis = resumeAnalysis;
    student.lastResumeAnalysisDate = new Date();
    const rawAnalyzedScore = resumeAnalysis?.resumeScore ?? resumeAnalysis?.overallScore;
    const analyzedScore = Number(rawAnalyzedScore);
    if (rawAnalyzedScore !== null && rawAnalyzedScore !== undefined && rawAnalyzedScore !== "" && Number.isFinite(analyzedScore)) {
        student.resumeScore = Math.max(0, Math.min(100, Math.round(analyzedScore)));
    }
    try {
        await student.save();
    } catch (error) {
        try {
            const savedStudent = await Student.findById(req.user.id).select("resume");
            if (savedStudent && savedStudent.resume !== newResume) {
                await removeUploadedFileSafely(req.file);
            }
        } catch (readError) {
            console.error("Unable to verify resume after database update failure:", readError.message);
        }
        console.error("Resume database update failed:", error.message);
        return errorResponse(res, { message: "Resume could not be saved. Your existing resume was not changed.", status: 500 });
    }

    if (previousResume && previousResume !== newResume) {
        try {
            await deleteResumeFile(previousResume);
        } catch (error) {
            console.error("Previous resume cleanup failed:", error.message);
        }
    }

    return successResponse(res, {
        status: replace ? 200 : 201,
        message: "Resume uploaded and analyzed successfully.",
        data: {
            resume: student.resume,
            resumeAnalysis: student.resumeAnalysis,
            resumeScore: student.resumeScore,
            lastResumeAnalysisDate: student.lastResumeAnalysisDate
        }
    });
};

const uploadResume = (req, res) => uploadStudentResume(req, res, false);

const getResume = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id).select(
            "resume resumeAnalysis resumeScore lastResumeAnalysisDate resumeOriginalName resumeMimeType resumeSize"
        );
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        const resumeFilePath = getResumeFilePath(student.resume);
        if (!student.resume || !resumeFilePath || !fs.existsSync(resumeFilePath)) {
            return errorResponse(res, { message: "Resume not found", status: 404 });
        }

        return successResponse(res, {
            message: "Resume fetched successfully",
            data: {
                resume: student.resume,
                resumeUrl: "/api/student/resume/file",
                fileName: student.resumeOriginalName || path.basename(student.resume),
                mimeType: student.resumeMimeType || "application/octet-stream",
                size: Number(student.resumeSize) || 0,
                resumeAnalysis: student.resumeAnalysis || {},
                resumeScore: student.resumeScore ?? null,
                lastResumeAnalysisDate: student.lastResumeAnalysisDate || null
            }
        });
    } catch (error) {
        return errorResponse(res, { message: error.message, status: 500 });
    }
};

const viewResume = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id)
            .select("resume resumeOriginalName resumeMimeType");
        if (!student) return res.status(404).json({ success: false, message: "Student not found" });

        const resumeFilePath = getResumeFilePath(student.resume);
        if (!resumeFilePath || !fs.existsSync(resumeFilePath)) {
            return res.status(404).json({ success: false, message: "Resume not found" });
        }

        if (student.resumeMimeType) res.type(student.resumeMimeType);
        const fileName = String(student.resumeOriginalName || path.basename(student.resume))
            .replace(/["\r\n]/g, "");
        return res.sendFile(resumeFilePath, {
            headers: { "Content-Disposition": `inline; filename="${fileName}"` }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || "Unable to view resume"
        });
    }
};

const replaceResume = (req, res) => uploadStudentResume(req, res, true);

const deleteResume = async (req, res) => {
    try {
        const student = await Student.findById(req.user.id);
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });
        if (!student.resume) return errorResponse(res, { message: "Resume not found", status: 404 });

        await deleteResumeFile(student.resume);
        student.resume = "";
        student.resumeOriginalName = "";
        student.resumeMimeType = "";
        student.resumeSize = 0;
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
    refreshCodingProfile,
    getDashboard,
    uploadResume,
    getResume,
    viewResume,
    replaceResume,
    deleteResume
};
