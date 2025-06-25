const fs = require('fs');
const path = require('path');

/**
 * Generate test execution report for SonarCloud
 * Converts Jest JSON output to SonarCloud's expected XML format
 */
function generateTestExecutionReport() {
    try {
        // Read Jest JSON report
        const jsonReportPath = path.join(process.cwd(), 'coverage', 'test-reporter.json');
        if (!fs.existsSync(jsonReportPath)) {
            console.log('No test reporter JSON file found. Skipping test execution report generation.');
            return;
        }

        const jsonData = JSON.parse(fs.readFileSync(jsonReportPath, 'utf8'));

        // Convert to SonarCloud format
        const testExecutions = jsonData.testResults.map(testFile => {
            const testResults = testFile.testResults.map(test => ({
                name: test.fullName,
                status: test.status === 'passed' ? 'OK' : 'FAIL',
                duration: test.duration || 0,
                startedAt: new Date(test.startTime || Date.now()).toISOString(),
                endedAt: new Date((test.startTime || Date.now()) + (test.duration || 0)).toISOString(),
            }));

            return {
                path: testFile.testFilePath,
                testResults,
            };
        });

        const report = {
            version: '1.0',
            testExecutions,
        };

        // Write XML report
        const xmlReportPath = path.join(process.cwd(), 'coverage', 'test-reporter.xml');
        fs.writeFileSync(xmlReportPath, JSON.stringify(report, null, 2));

        console.log(`Test execution report generated: ${xmlReportPath}`);
        console.log(`Total test files: ${testExecutions.length}`);
        console.log(`Total tests: ${testExecutions.reduce((sum, file) => sum + file.testResults.length, 0)}`);
    } catch (error) {
        console.error('Error generating test execution report:', error.message);
        // Don't fail the build, just log the error
    }
}

// Run if called directly
if (require.main === module) {
    generateTestExecutionReport();
}

module.exports = { generateTestExecutionReport };
