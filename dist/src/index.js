"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const core = __importStar(require("@actions/core"));
const USER = core.getInput('user_name');
const TOKEN = core.getInput('api_token');
const JENKINS_URL = core.getInput('jenkins_url');
const JOB_NAME = core.getInput('job_name');
const PARAMETERRS = core.getInput('parameter');
const WAIT = core.getInput('wait');
const TIMEOUT = core.getInput('timeout');
const API_TOKEN = Buffer.from(`${USER}:${TOKEN}`).toString('base64');
let timer = setTimeout(() => {
    core.setFailed("Job Timeout");
    core.error("Exception Error: Timed out");
}, (Number(TIMEOUT) * 1000));
const sleep = (seconds) => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, (seconds * 1000));
    });
};
function requestJenkinsJob(jobName, params) {
    return __awaiter(this, void 0, void 0, function* () {
        let url;
        if (params) {
            url = `${JENKINS_URL}/job/${jobName}/buildWithParameters`;
        }
        else {
            url = `${JENKINS_URL}/job/${jobName}/build`;
        }
        yield axios_1.default({
            method: 'POST',
            url: url,
            // form: params,
            headers: {
                'Authorization': `Basic ${API_TOKEN}`
            }
        });
    });
}
function getJobStatus(jobName) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${JENKINS_URL}/job/${jobName}/lastBuild/api/json`;
        return axios_1.default.get(url, {
            auth: {
                username: USER,
                password: TOKEN
            }
        });
    });
}
function waitJenkinsJob(jobName, timestamp) {
    return __awaiter(this, void 0, void 0, function* () {
        core.info(`>>> Waiting for "${jobName}" ...`);
        while (true) {
            let response = yield getJobStatus(jobName);
            let data = response.data;
            if (data.timestamp < timestamp) {
                core.info(`>>> Job is not started yet... Wait 5 seconds more...`);
            }
            else if (data.result == "SUCCESS") {
                core.info(`>>> Job "${data.fullDisplayName}" successfully completed!`);
                break;
            }
            else if (data.result == "FAILURE" || data.result == "ABORTED") {
                throw new Error(`Failed job ${data.fullDisplayName}`);
            }
            else if (data) {
                core.info(`>>> Current Duration: ${data.duration}. Expected: ${data.estimatedDuration}`);
            }
            yield sleep(5); // API call interval
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let params;
            let startTs = +new Date();
            if (PARAMETERRS) {
                params = JSON.parse(core.getInput('parameter'));
                core.info(`>>> Parameter ${params.toString()}`);
            }
            // POST API call
            yield requestJenkinsJob(JOB_NAME, params);
            core.info(`>>> Job is started!`);
            // Waiting for job completion
            if (WAIT == 'true') {
                yield waitJenkinsJob(JOB_NAME, startTs);
            }
        }
        catch (err) {
            console.log(`${JSON.stringify(err)}`);
            core.setFailed(err.message);
            core.error(err.message);
        }
        finally {
            clearTimeout(timer);
        }
    });
}
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
main();
