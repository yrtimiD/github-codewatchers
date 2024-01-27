"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = void 0;
const core = __importStar(require("@actions/core"));
const codewatchers_1 = require("./codewatchers");
const PAGE_SIZE = 100;
function check(context, options) {
    var _a, e_1, _b, _c;
    var _d;
    return __awaiter(this, void 0, void 0, function* () {
        let { octokit, owner, repo } = context;
        let { shaFrom, shaTo, ignoreOwn } = options;
        let watchers = yield (0, codewatchers_1.loadCodewatchers)(context, options);
        core.debug(JSON.stringify(watchers, ['user', 'patterns', 'login']));
        core.info(`Comparing ${shaFrom}...${shaTo}`);
        let commits = [];
        let commitsIter = octokit.paginate.iterator(octokit.rest.repos.compareCommits, { owner, repo, base: shaFrom, head: shaTo, per_page: PAGE_SIZE });
        try {
            for (var _e = true, commitsIter_1 = __asyncValues(commitsIter), commitsIter_1_1; commitsIter_1_1 = yield commitsIter_1.next(), _a = commitsIter_1_1.done, !_a; _e = true) {
                _c = commitsIter_1_1.value;
                _e = false;
                let { data } = _c;
                commits.push(...(_d = data.commits.map(c => c.sha)) !== null && _d !== void 0 ? _d : []);
                if (commits.at(-1) === shaTo) {
                    break;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_e && !_a && (_b = commitsIter_1.return)) yield _b.call(commitsIter_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        let notifications = [];
        for (let sha of commits) {
            core.debug(`Checking ${sha}`);
            let commit = yield fetchFullCommit(octokit, owner, repo, sha);
            let fileNames = commit.files.map(f => f.filename);
            core.info(`${fileNames === null || fileNames === void 0 ? void 0 : fileNames.length} file(s) were changed in ${sha}.`);
            let N = { commit, watchers: [] };
            watchers.forEach(cw => {
                if (ignoreOwn && (cw.user.login === commit.author.login || cw.user.login === commit.committer.login))
                    return;
                let hasMatch = fileNames === null || fileNames === void 0 ? void 0 : fileNames.some(f => cw.ignore.ignores(f));
                if (hasMatch) {
                    N.watchers.push(cw.user);
                }
            });
            if (N.watchers.length > 0) {
                core.info(`Matched for ${N.watchers.length} watcher(s)`);
                notifications.push(N);
            }
        }
        core.info(`Created ${notifications.length} notification(s)`);
        return notifications;
    });
}
exports.check = check;
function fetchFullCommit(octokit, owner, repo, sha) {
    var _a, e_2, _b, _c;
    var _d;
    return __awaiter(this, void 0, void 0, function* () {
        let filesIter = octokit.paginate.iterator(octokit.rest.repos.getCommit, { owner, repo, ref: sha });
        let commit = null;
        try {
            for (var _e = true, filesIter_1 = __asyncValues(filesIter), filesIter_1_1; filesIter_1_1 = yield filesIter_1.next(), _a = filesIter_1_1.done, !_a; _e = true) {
                _c = filesIter_1_1.value;
                _e = false;
                let { data } = _c;
                if (commit) {
                    commit.files.push(...(_d = data.files) !== null && _d !== void 0 ? _d : []);
                    core.debug(`+${data.files.length} file(s)`);
                }
                else {
                    commit = data;
                    core.debug(`${data.files.length} file(s)`);
                }
            }
        }
        catch (e_2_1) { e_2 = { error: e_2_1 }; }
        finally {
            try {
                if (!_e && !_a && (_b = filesIter_1.return)) yield _b.call(filesIter_1);
            }
            finally { if (e_2) throw e_2.error; }
        }
        return commit;
    });
}
