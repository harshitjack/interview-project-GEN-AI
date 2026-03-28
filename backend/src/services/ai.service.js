const { GoogleGenerativeAI } = require("@google/generative-ai")
const { z } = require("zod")
const { zodToJsonSchema } = require("zod-to-json-schema")
const puppeteer = require("puppeteer")

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY)


const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job describe"),
    technicalQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(z.object({
        question: z.string().describe("The technical question can be asked in the interview"),
        intention: z.string().describe("The intention of interviewer behind asking this question"),
        answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
    })).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated"),
})

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {

    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    })

    const prompt = `You are an expert interviewer. Your task is to analyze the following resume and/or self-description against the provided job description.
Generate a detailed interview report in JSON format following this structure:
{
  "matchScore": number (0-100),
  "technicalQuestions": [{"question": string, "intention": string, "answer": string}],
  "behavioralQuestions": [{"question": string, "intention": string, "answer": string}],
  "skillGaps": [{"skill": string, "severity": "low" | "medium" | "high"}],
  "preparationPlan": [{"day": number, "focus": string, "tasks": [string]}],
  "title": string (job title)
}

Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription}
`

    let result;
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            result = await model.generateContent(prompt)
            break;
        } catch (error) {
            if (error.status === 429 && attempt < maxRetries - 1) {
                // Try to get retryDelay from error if it exists
                let waitTime = Math.pow(2, attempt) * 5000; // Start with 5s
                
                try {
                    const errorJson = JSON.parse(error.message);
                    if (errorJson?.error?.details?.[0]?.retryDelay) {
                        const delayStr = errorJson.error.details[0].retryDelay;
                        waitTime = parseInt(delayStr) * 1000 + 1000; // Add 1s buffer
                    }
                } catch (e) {
                    // If parsing fails, just use exponential backoff
                }

                console.warn(`Rate limit hit. Retrying in ${waitTime}ms... (Attempt ${attempt + 1})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
            } else {
                console.error("AI GENERATION ERROR after retries:", error);
                throw error;
            }
        }
    }

    const response = await result.response
    let text = response.text()
    
    // Clean up potential markdown formatting from AI Response
    if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0].trim()
    } else if (text.includes("```JSON")) {
        text = text.split("```JSON")[1].split("```")[0].trim()
    } else if (text.includes("```js")) {
        text = text.split("```js")[1].split("```")[0].trim()
    } else if (text.includes("```JS")) {
        text = text.split("```JS")[1].split("```")[0].trim()
    } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0].trim()
    }

    try {
        return JSON.parse(text)
    } catch (parseError) {
        console.error("AI RESPONSE PARSE ERROR:", parseError, "Original text:", text)
        throw new Error("Failed to parse AI response as JSON")
    }
}



async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
        format: "A4", margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })

    await browser.close()

    return pdfBuffer
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {

    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })

    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    })

    const prompt = `Generate a professional, ATS-friendly resume in HTML format.
Return a JSON object: { "html": "string with well-formatted HTML/CSS content" }

Candidate Details:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription}

The resume should be tailored to the job description, 1-2 pages long, and look professional when converted to PDF.
`

    let result;
    const maxRetries = 5;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            result = await model.generateContent(prompt)
            break;
        } catch (error) {
            if (error.status === 429 && attempt < maxRetries - 1) {
                let waitTime = Math.pow(2, attempt) * 5000;
                
                try {
                    const errorJson = JSON.parse(error.message);
                    if (errorJson?.error?.details?.[0]?.retryDelay) {
                        const delayStr = errorJson.error.details[0].retryDelay;
                        waitTime = parseInt(delayStr) * 1000 + 1000;
                    }
                } catch (e) {}

                console.warn(`Resume rate limit hit. Retrying in ${waitTime}ms... (Attempt ${attempt + 1})`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
                attempt++;
            } else {
                console.error("AI RESUME GENERATION ERROR after retries:", error);
                throw error;
            }
        }
    }

    const response = await result.response
    let text = response.text()

    if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0].trim()
    } else if (text.includes("```JSON")) {
        text = text.split("```JSON")[1].split("```")[0].trim()
    } else if (text.includes("```js")) {
        text = text.split("```js")[1].split("```")[0].trim()
    } else if (text.includes("```JS")) {
        text = text.split("```JS")[1].split("```")[0].trim()
    } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0].trim()
    }

    let jsonContent;
    try {
        jsonContent = JSON.parse(text)
    } catch (parseError) {
        console.error("RESUME PDF AI PARSE ERROR:", parseError, "Original text:", text)
        throw new Error("Failed to parse Resume AI response as JSON")
    }

    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)

    return pdfBuffer
}

module.exports = { generateInterviewReport, generateResumePdf }