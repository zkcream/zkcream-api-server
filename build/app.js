"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
exports.__esModule = true;
var koa_1 = __importDefault(require("koa"));
var vote_1 = __importDefault(require("./controller/vote"));
var App = /** @class */ (function () {
    function App() {
        this.app = new koa_1["default"]();
        this.routes();
    }
    App.prototype.routes = function () {
        this.app.use(vote_1["default"].routes());
    };
    return App;
}());
exports["default"] = new App().app;
//# sourceMappingURL=app.js.map