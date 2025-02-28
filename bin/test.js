var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { FieldFilter, FunctionFilter, HandleDecorator, typeOf, Var } from "./lib.js";
function TestDecorator(message) {
    return HandleDecorator(TestDecorator, {
        message: message
    });
}
class TestClass {
    static testParam2;
    testParam;
    constructor(testParam) {
        this.testParam = testParam;
    }
    updateLocal(deltaMs) {
        console.log("local update", this);
    }
    static updateStatic(deltaMs) {
        console.log("static update", this);
    }
}
__decorate([
    Var(String)
], TestClass.prototype, "testParam", void 0);
__decorate([
    Var(Number),
    TestDecorator("It works!")
], TestClass, "testParam2", void 0);
let instance = new TestClass("hello");
console.assert(instance.is(TestClass));
console.assert(instance.getType() == typeOf(TestClass));
console.assert(instance.getType().newInstance("hello2").is(TestClass));
console.assert(typeOf(Number) == 0..getType());
let functions = instance.getType().getFunctions(FunctionFilter.Static | FunctionFilter.Local);
console.log("functions", functions);
let staticFunc = functions.find(func => func.name == "updateStatic");
staticFunc.call(TestClass, [0]);
let localFunc = functions.find(func => func.name == "updateLocal");
localFunc.call(instance, [0]);
let fields = instance.getFields(FieldFilter.Local | FieldFilter.Static);
console.log("fields", fields);
let localField = fields.find(field => field.name == "testParam");
console.log("local val =", localField.getValue(instance));
localField.setValue(instance, "goodbye");
let staticField = fields.find(field => field.name == "testParam2");
console.log("static val =", staticField.getValue(TestClass));
staticField.setValue(TestClass, 123);
console.assert(TestClass.testParam2.getType() == typeOf(Number));
let staticDecorator = staticField.getDecorator(TestDecorator);
console.log("staticDecorator", staticDecorator);
console.assert(staticDecorator.data.message == "It works!");
console.log("instance:", instance);
