const { get } = require("lodash");
const FormData = require("form-data");
const fs = require("fs");
const axios = require("axios");
const path = require("path");
const { format } = require("url");

const serviceName = "jira";
const client = require("./client")(serviceName);

class Jira {
	constructor({ baseUrl, token, email }) {
		this.baseUrl = baseUrl;
		this.token = token;
		this.email = email;
	}

	async getCreateMeta(query) {
		return this.fetch("getCreateMeta", {
			pathname: "/rest/api/2/issue/createmeta",
			query,
		});
	}

	async searchIssue(issueTitle, projectKey) {
		const jql = `project IN ("${projectKey}") AND status IN ("To Do","In Progress") AND summary ~ "${issueTitle}" ORDER BY created DESC`;
		return this.fetch("searchIssue", {
			pathname: `/rest/api/2/search`,
			query: {
				jql,
				fields: ["key", "summary"],
			},
			headers: {
				Accept: "application/json",
			},
		});
	}

	async addComment(issueId, body) {
		return await this.fetch(
			"addComment",
			{
				pathname: `/rest/api/2/issue/${issueId}/comment`,
			},
			{
				method: "POST",
				body,
			}
		);
	}

	async addIssueAttachments(issueId, attachments) {
		const formData = new FormData();
		for (const attachment of attachments) {
			const filePath = path.resolve(attachment);
			const stats = fs.statSync(filePath);
			const fileSizeInBytes = stats.size;
			const fileStream = fs.createReadStream(attachment);

			formData.append("file", fileStream, { knownLength: fileSizeInBytes });
		}
		return await axios.post(
			`${this.baseUrl}/rest/api/2/issue/${issueId}/attachments`,
			formData,
			{
				// You need to use `getHeaders()` in Node.js because Axios doesn't
				// automatically set the multipart form boundary in Node.
				headers: {
					"Content-Type": "multipart/form-data",
					...formData.getHeaders?.(),
					"X-Atlassian-Token": "no-check",
					Accept: "application/json",
					Authorization: `Basic ${Buffer.from(
						`${this.email}:${this.token}`
					).toString("base64")}`,
				},
			}
		);
	}

	async createIssue(body) {
		return this.fetch(
			"createIssue",
			{ pathname: "/rest/api/2/issue" },
			{ method: "POST", body }
		);
	}

	async getIssue(issueId, query = {}) {
		const { fields = [], expand = [] } = query;

		try {
			return this.fetch("getIssue", {
				pathname: `/rest/api/2/issue/${issueId}`,
				query: {
					fields: fields.join(","),
					expand: expand.join(","),
				},
			});
		} catch (error) {
			if (get(error, "res.status") === 404) {
				return;
			}

			throw error;
		}
	}

	async getIssueTransitions(issueId) {
		return this.fetch(
			"getIssueTransitions",
			{
				pathname: `/rest/api/2/issue/${issueId}/transitions`,
			},
			{
				method: "GET",
			}
		);
	}

	async transitionIssue(issueId, data) {
		return this.fetch(
			"transitionIssue",
			{
				pathname: `/rest/api/3/issue/${issueId}/transitions`,
			},
			{
				method: "POST",
				body: data,
			}
		);
	}

	async fetch(
		apiMethodName,
		{ host, pathname, query },
		{ method, body, headers = {} } = {}
	) {
		const url = format({
			host: host || this.baseUrl,
			pathname,
			query,
		});

		if (!method) {
			method = "GET";
		}

		if (headers["Content-Type"] === undefined) {
			headers["Content-Type"] = "application/json";
		}

		if (headers.Authorization === undefined) {
			headers.Authorization = `Basic ${Buffer.from(
				`${this.email}:${this.token}`
			).toString("base64")}`;
		}

		// strong check for undefined
		// cause body variable can be 'false' boolean value
		if (body && headers["Content-Type"] === "application/json") {
			body = JSON.stringify(body);
		}

		const state = {
			req: {
				method,
				headers,
				body,
				url,
			},
		};

		try {
			await client(state, `${serviceName}:${apiMethodName}`);
		} catch (error) {
			const fields = {
				originError: error,
				source: "jira",
			};

			delete state.req.headers;

			throw Object.assign(new Error("Jira API error"), state, fields);
		}

		return state.res.body;
	}
}

module.exports = Jira;
