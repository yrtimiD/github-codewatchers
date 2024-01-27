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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCodewatchers = void 0;
const core = __importStar(require("@actions/core"));
const ignore_1 = __importDefault(require("ignore"));
function loadCodewatchers(context, options) {
    return __awaiter(this, void 0, void 0, function* () {
        let { octokit, owner, repo, ref } = context;
        let { codewatchers } = options;
        let CW = [];
        let file;
        core.info(`Loading "${codewatchers}" file from ${ref}...`);
        try {
            let { data } = yield octokit.rest.repos.getContent({ owner, repo, ref, path: codewatchers, mediaType: { format: 'raw' } });
            if (typeof data === 'string') {
                file = data;
                core.debug(file);
            }
            else {
                throw Error(`Unexpected result from getContent API. Expected string got ${typeof data}`);
            }
        }
        catch (e) {
            throw Error(`Can't download "${codewatchers}" file. ${e === null || e === void 0 ? void 0 : e.message}`);
        }
        let parsed = parseCodeWatchers(file);
        core.info(`Resolving users...`);
        for (let names in parsed) {
            let patterns = parsed[names];
            CW.push({
                user: yield resolveUser(octokit, names),
                patterns: patterns,
                ignore: (0, ignore_1.default)().add(patterns)
            });
        }
        core.info(`Loaded ${CW.length} watchers`);
        return CW;
    });
}
exports.loadCodewatchers = loadCodewatchers;
function parseCodeWatchers(content) {
    let items = {};
    let lines = content.split(/$/m).map(l => l.trim()).filter(l => !l.startsWith('#') && l.length > 0);
    lines.forEach(line => {
        let [pattern, ...owners] = line.split(/\s+/);
        owners.forEach(owner => {
            var _a;
            ((_a = items[owner]) !== null && _a !== void 0 ? _a : (items[owner] = [])).push(pattern);
        });
    });
    return items;
}
function resolveUser(octokit, emailOrLogin) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        core.debug(`Resolving ${emailOrLogin}...`);
        let user = {};
        try {
            if (emailOrLogin.startsWith('@')) {
                user.login = emailOrLogin.substring(1);
            }
            else if (emailOrLogin.includes('@')) {
                user.email = emailOrLogin;
                let { data } = yield octokit.search.users({ q: `${user.email} in:email type:user` }); // this returns only partial info, still full user need to be resolved by login
                user.login = (_a = data.items[0]) === null || _a === void 0 ? void 0 : _a.login;
            }
            let { data } = yield octokit.users.getByUsername({ username: user.login });
            user = data;
        }
        catch (e) {
            core.notice(`Unable to resolve ${emailOrLogin}: ${e === null || e === void 0 ? void 0 : e.message}`);
        }
        if (user.name) {
            core.debug(`Resolved to ${user.name}`);
        }
        return user;
    });
}
