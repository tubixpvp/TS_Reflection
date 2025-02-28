import {
    DecoratorInfo,
    FieldFilter,
    FieldInfo,
    FunctionFilter,
    FunctionInfo,
    HandleDecorator,
    typeOf,
    Var
} from "./lib.js";

function TestDecorator(message:string):any
{
    return HandleDecorator(TestDecorator, {
        message:message
    });
}
class TestClass
{
    @Var(Number)
    @TestDecorator("It works!")
    public static testParam2:number;

    @Var(String)
    private testParam:string;

    public constructor(testParam:string)
    {
        this.testParam = testParam;
    }

    public updateLocal(deltaMs:number) : void
    {
        console.log("local update", this);
    }
    public static updateStatic(deltaMs:number) : void
    {
        console.log("static update", this);
    }
}

let instance:TestClass = new TestClass("hello");

console.assert(instance.is(TestClass));
console.assert(instance.getType() == typeOf(TestClass));

console.assert(instance.getType().newInstance("hello2").is(TestClass));

console.assert(typeOf(Number) == 0..getType());



let functions:FunctionInfo[] = instance.getType().getFunctions(FunctionFilter.Static | FunctionFilter.Local);
console.log("functions", functions);

let staticFunc:FunctionInfo = functions.find(func => func.name == "updateStatic");
staticFunc.call(TestClass, [0]);

let localFunc:FunctionInfo = functions.find(func => func.name == "updateLocal");
localFunc.call(instance, [0]);


let fields:FieldInfo[] = instance.getFields(FieldFilter.Local | FieldFilter.Static);
console.log("fields", fields);

let localField:FieldInfo = fields.find(field => field.name == "testParam");
console.log("local val =", localField.getValue(instance));

localField.setValue(instance, "goodbye");

let staticField:FieldInfo = fields.find(field => field.name == "testParam2");
console.log("static val =", staticField.getValue(TestClass));

staticField.setValue(TestClass, 123);
console.assert(TestClass.testParam2.getType() == typeOf(Number));

let staticDecorator:DecoratorInfo = staticField.getDecorator(TestDecorator);
console.log("staticDecorator", staticDecorator);
console.assert(staticDecorator.data.message == "It works!");

console.log("instance:",instance);