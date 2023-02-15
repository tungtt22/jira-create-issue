const Jira = require("./common/net/Jira");

module.exports = class {
	constructor({ githubEvent, argv, config }) {
		this.Jira = new Jira({
			baseUrl: config.baseUrl,
			token: config.token,
			email: config.email,
		});

		this.config = config;
		this.argv = argv;
		this.githubEvent = githubEvent;
	}

	async execute() {
		const { argv } = this;
		const projectKey = argv.project;
		const issuetypeName = argv.issuetype;

		const issueKey = await this.checkIssueExist(argv.summary, projectKey);
		let attachments = [];
		if (argv.attachments) {
			attachments = argv.attachments.split(",");
		}

		if (issueKey === null) {
			// map custom fields
			const { projects } = await this.Jira.getCreateMeta({
				expand: "projects.issuetypes.fields",
				projectKeys: projectKey,
				issuetypeNames: issuetypeName,
			});

			if (projects.length === 0) {
				console.error(`project '${projectKey}' not found`);

				return;
			}

			const [project] = projects;

			if (project.issuetypes.length === 0) {
				console.error(`issuetype '${issuetypeName}' not found`);

				return;
			}

			let providedFields = [
				{
					key: "project",
					value: {
						key: projectKey,
					},
				},
				{
					key: "issuetype",
					value: {
						name: issuetypeName,
					},
				},
				{
					key: "summary",
					value: argv.summary,
				},
			];

			if (argv.description) {
				providedFields.push({
					key: "description",
					value: argv.description,
				});
			}

			if (argv.labels) {
				const labels = argv.labels.split(",");
				providedFields.push({
					key: "labels",
					value: labels,
				});
			}

			if (argv.fields) {
				providedFields = [
					...providedFields,
					...this.transformFields(argv.fields),
				];
			}

			const payload = providedFields.reduce(
				(acc, field) => {
					acc.fields[field.key] = field.value;

					return acc;
				},
				{
					fields: {},
				}
			);

			console.log(`Create new issue: \n${argv.summary}`);
			const issue = await this.Jira.createIssue(payload);

			console.log(`Adding comment to ${issue.key}: \n${argv.comment}`);
			await this.Jira.addComment(issue.key, { body: argv.comment });

			console.log(`attach files to issue ${issueKey}`);
			await this.attachmentFiles(issueKey, attachments);

			return { issue: issue.key };
		} else {
			console.log(`Adding comment to ${issueKey}: "${argv.comment}"`);
			await this.Jira.addComment(issueKey, { body: argv.comment });

			console.log(`attach files to issue ${issueKey}`);
			await this.attachmentFiles(issueKey, attachments);
		}
	}

	transformFields(fieldsString) {
		const fields = JSON.parse(fieldsString);

		return Object.keys(fields).map((fieldKey) => ({
			key: fieldKey,
			value: fields[fieldKey],
		}));
	}

	async checkIssueExist(summary, projectKey) {
		const listIssue = await this.Jira.searchIssue(summary, projectKey);

		for (const issue of listIssue.issues) {
			if (summary === issue.fields.summary) {
				return issue.key;
			}
		}
		return null;
	}

	async attachmentFiles(issueKey, attachments) {
		const files = await this.Jira.addIssueAttachments(issueKey, attachments);
		console.log(files);
		return files;
	}
};
