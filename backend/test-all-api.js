const fs = require('fs');

async function testAll() {
    const baseURL = 'http://localhost:3000';
    const email = `test-${Date.now()}@example.com`;
    const username = `user-${Date.now()}`;
    const password = 'password123';
    let token = '';

    console.log('--- Phase 1: Register ---');
    try {
        const regRes = await fetch(`${baseURL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        const data = await regRes.json();
        if (!regRes.ok) throw new Error(data.message || 'Register failed');
        console.log('Register success:', data.message);
        const cookie = regRes.headers.get('set-cookie');
        if (cookie) token = cookie.split(';')[0].split('=')[1];
    } catch (err) {
        console.error('Phase 1 Error:', err.message);
        return;
    }

    console.log('\n--- Phase 2: Login ---');
    try {
        const loginRes = await fetch(`${baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await loginRes.json();
        if (!loginRes.ok) throw new Error(data.message || 'Login failed');
        console.log('Login success:', data.message);
        const cookie = loginRes.headers.get('set-cookie');
        if (cookie) token = cookie.split(';')[0].split('=')[1];
    } catch (err) {
        console.error('Phase 2 Error:', err.message);
        return;
    }

    console.log('\n--- Phase 3: Get Me ---');
    try {
        const meRes = await fetch(`${baseURL}/api/auth/get-me`, {
            headers: { Cookie: `token=${token}` }
        });
        const data = await meRes.json();
        if (!meRes.ok) throw new Error(data.message || 'Get Me failed');
        console.log('Get Me success: Logged in as', data.user.username);
    } catch (err) {
        console.error('Phase 3 Error:', err.message);
    }

    console.log('\n--- Phase 4: Generate Report ---');
    try {
        console.log('Sending request to generate report...');
        const reportRes = await fetch(`${baseURL}/api/interview/`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Cookie': `token=${token}`
            },
            body: JSON.stringify({
                jobDescription: "Senior Node.js Developer with React experience",
                selfDescription: "I have 5 years of experience in full-stack development using Node.js and React."
            })
        });
        const data = await reportRes.json();
        if (!reportRes.ok) throw new Error(data.message || 'Generate Report failed');
        console.log('Generate Report success:', data.message);
        
        const reportId = data.interviewReport._id;

        console.log('\n--- Phase 5: Get Report By ID ---');
        const getReportRes = await fetch(`${baseURL}/api/interview/report/${reportId}`, {
            headers: { Cookie: `token=${token}` }
        });
        const getReportData = await getReportRes.json();
        if (!getReportRes.ok) throw new Error(getReportData.message || 'Get Report failed');
        console.log('Get Report success: Title is', getReportData.interviewReport.title);
        console.log('Score:', getReportData.interviewReport.matchScore);

        console.log('\n--- Phase 6: Get All Reports ---');
        const getAllRes = await fetch(`${baseURL}/api/interview/`, {
            headers: { Cookie: `token=${token}` }
        });
        const getAllData = await getAllRes.json();
        if (!getAllRes.ok) throw new Error(getAllData.message || 'Get All Reports failed');
        console.log('Get All Reports success (count):', getAllData.interviewReports.length);

        console.log('\n--- Phase 7: Generate Resume PDF ---');
        const pdfRes = await fetch(`${baseURL}/api/interview/resume/pdf/${reportId}`, {
            method: 'POST',
            headers: { Cookie: `token=${token}` }
        });
        if (!pdfRes.ok) throw new Error('Generate PDF failed');
        console.log('Generate PDF success: Status', pdfRes.status, 'Content-Type:', pdfRes.headers.get('content-type'));
        
    } catch (err) {
        console.error('Interview API failed:', err.message);
    }
}

testAll();
