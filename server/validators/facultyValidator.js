const validateEmail = (email) => {
    return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isStrongPassword = (password) => {
    return typeof password === "string"
        && password.length >= 8
        && /[A-Z]/.test(password)
        && /[a-z]/.test(password)
        && /\d/.test(password)
        && /[^A-Za-z0-9]/.test(password);
};

const validateFacultyRegistration = (payload) => {
    const errors = [];
    const data = {};

    // Validate name
    if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length < 2) {
        errors.push("Valid name is required");
    } else {
        data.name = payload.name.trim();
    }

    // Validate email
    if (!validateEmail(payload.email)) {
        errors.push("Valid email is required");
    } else {
        data.email = payload.email.trim().toLowerCase();
    }

    // Validate password
    if (!isStrongPassword(payload.password)) {
        errors.push("Password must be at least 8 characters and include uppercase, lowercase, number, and special character");
    } else {
        data.password = payload.password;
    }

    // Validate department
    if (!payload.department || typeof payload.department !== "string" || payload.department.trim().length < 2) {
        errors.push("Valid department is required");
    } else {
        data.department = payload.department.trim();
    }

    // Validate designation
    if (!payload.designation || typeof payload.designation !== "string" || payload.designation.trim().length < 2) {
        errors.push("Valid designation is required");
    } else {
        data.designation = payload.designation.trim();
    }

    return { errors, data };
};

const validateFacultyLogin = (payload) => {
    const errors = [];
    const data = {};

    // Validate email
    if (!validateEmail(payload.email)) {
        errors.push("Valid email is required");
    } else {
        data.email = payload.email.trim().toLowerCase();
    }

    // Validate password
    if (typeof payload.password !== "string" || payload.password.trim() === "") {
        errors.push("Password is required");
    } else {
        data.password = payload.password;
    }

    return { errors, data };
};

module.exports = {
    validateEmail,
    isStrongPassword,
    validateFacultyRegistration,
    validateFacultyLogin
};
