#!/usr/bin/node
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const Jira = require("../common/net/Jira");

async function exec() {
	this.Jira = new Jira({
		baseUrl: process.env.JIRA_BASE_URL,
		token: process.env.JIRA_TOKEN,
		email: process.env.JIRA_EMAIL,
	});

	const argv = {
		projectKey: "SECURITY",
		issuetype: "Bug",
		summary:
			"Security issue in container for",
		description:
			"Security issue in container for",
		comment: "this is comment to issue SECURITY-10",
		labels: "trivy,security",
		attachments: "./__tests__/trivy_report.json",
		fields: "",
	};
	console.log("Check issue exist in system or not");
	const issueKey = await checkIssueExist(argv.summary, argv.projectKey);
	if (issueKey !== null) {
		console.log(`attach files to issue ${issueKey}`);
		let attachments = argv.attachments.split(",");
		console.log(attachments);
		await attachmentFiles(issueKey, attachments);
	}
}

async function checkIssueExist(summary, projectKey) {
	const listIssue = await this.Jira.searchIssue(summary, projectKey);
	// console.log(`List Issues: \n${JSON.stringify(listIssue)}`);

	for (const issue of listIssue.issues) {
		if (summary === issue.fields.summary) {
			return issue.key;
		}
	}
	return null;
}

async function attachmentFiles(issueKey, attachments) {
	const files = await this.Jira.addIssueAttachments(issueKey, attachments);
	console.log(files);
	return files;
}

exec();
