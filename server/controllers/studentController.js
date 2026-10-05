const Student = require("../models/Student");
const Assessment = require("../models/Assessment");
const AssessmentResult = require("../models/AssessmentResult");
const { calculateCodingSkillScore, getPlatformConnectionSummary, validatePlatformUrl, fetchPlatformStatistics } = require("../services/codingProfileService");
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
                platforms.push(await fetchPlatformStatistics(field, submittedUrls[field]));
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
                items.push(result.platform);
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
        const student = await Student.findById(req.user.id).select("resume resumeAnalysis");
        if (!student) return errorResponse(res, { message: "Student not found", status: 404 });

        const resumeFilePath = getResumeFilePath(student.resume);
        if (!student.resume || !resumeFilePath || !fs.existsSync(resumeFilePath)) {
            return errorResponse(res, { message: "Resume not found", status: 404 });
        }

        return successResponse(res, { message: "Resume fetched successfully", data: { resume: student.resume, resumeAnalysis: student.resumeAnalysis || {} } });
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
    refreshCodingProfile,
    getDashboard,
    uploadResume,
    getResume,
    replaceResume,
    deleteResume
};
