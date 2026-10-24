function successResponse(res, { message = "OK", data = null, status = 200 } = {}) {
    return res.status(status).json({
        success: true,
        message,
        data
    });
}

function errorResponse(res, { message = "Error", status = 500, data = null, stage = undefined } = {}) {
    return res.status(status).json({
        success: false,
        message,
        data,
        ...(stage ? { stage } : {})
    });
}

module.exports = {
    successResponse,
    errorResponse
};
