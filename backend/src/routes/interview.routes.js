const express = require("express")
const { authUser } = require("../middleware/auth.middleware")
const {generateInterViewReportController, getInterviewReportByIdController, getAllInterviewReportsController, generateResumePdfController} = require("../controller/interview.controller")
const upload = require("../middleware/file.middleware")

const interviewRouter = express.Router()




interviewRouter.post("/",authUser, upload.single("resume"), generateInterViewReportController)


interviewRouter.get("/report/:interviewId", authUser, getInterviewReportByIdController)

interviewRouter.get("/", authUser, getAllInterviewReportsController)



interviewRouter.post("/resume/pdf/:interviewReportId", authUser, generateResumePdfController)



module.exports = interviewRouter