function isTypeDeclaration(obj) {
    return obj.constructor.name == "Function";
}
function assertSameCallLevel(target, staticDeclaration) {
    let staticCall = isTypeDeclaration(target);
    if (staticCall != staticDeclaration) {
        throw new Error("Cannot call " + (staticDeclaration ? "static" : "local") + " function with " + (staticCall ? "'type'" : "'instance'") + " target");
    }
}
export class FunctionInfo {
    _isStatic;
    _name;
    _jsFunction;
    constructor(func, _isStatic) {
        this._isStatic = _isStatic;
        this._jsFunction = func;
        this._name = func.name;
    }
    get name() {
        return this._name;
    }
    get isStatic() {
        return this._isStatic;
    }
    call(target, parameters) {
        assertSameCallLevel(target, this._isStatic);
        this._jsFunction.apply(target, parameters);
    }
}
export var FunctionFilter;
(function (FunctionFilter) {
    FunctionFilter[FunctionFilter["FromParent"] = 1] = "FromParent";
    FunctionFilter[FunctionFilter["Local"] = 2] = "Local";
    FunctionFilter[FunctionFilter["Static"] = 4] = "Static";
})(FunctionFilter || (FunctionFilter = {}));
function getJSFunctions(prototype) {
    return Object.getOwnPropertyNames(prototype)
        .filter((key) => typeof prototype[key] === 'function' && key != "constructor")
        .map((key) => prototype[key]);
}
export class Type {
    _name;
    _constructor;
    _localFunctions;
    _staticFunctions;
    _parent = null;
    constructor(constr) {
        this._constructor = constr;
        this._name = constr.name;
        let prototype = constr.prototype;
        this._localFunctions = getJSFunctions(prototype).map(func => new FunctionInfo(func, false));
        this._staticFunctions = getJSFunctions(constr).map(func => new FunctionInfo(func, true));
        let parentPrototype = Object.getPrototypeOf(prototype);
        if (parentPrototype != null) {
            this._parent = typeOf(parentPrototype.constructor);
        }
    }
    get name() {
        return this._name;
    }
    getFunctions(filter) {
        let functions = [];
        if (this._parent != null && (filter & FunctionFilter.FromParent) != 0) {
            functions.push(...this._parent.getFunctions(filter));
        }
        if ((filter & FunctionFilter.Local) != 0) {
            functions.push(...this._localFunctions);
        }
        if ((filter & FunctionFilter.Static) != 0) {
            functions.push(...this._staticFunctions);
        }
        return functions;
    }
    hasParent(type) {
        let parent = this._parent;
        while (parent != null) {
            if (parent == type)
                return true;
            parent = parent._parent;
        }
        return false;
    }
    getParentType() {
        return this._parent;
    }
    newInstance(...parameters) {
        return new this._constructor(...parameters);
    }
}
const constructor2type = new Map();
export function typeOf(constructor) {
    let type = constructor2type.get(constructor);
    if (type == null) {
        type = new Type(constructor);
        constructor2type.set(constructor, type);
    }
    return type;
}
export function getType(value) {
    if (value == null)
        return null;
    return value.getType();
}
export var FieldFilter;
(function (FieldFilter) {
    FieldFilter[FieldFilter["Local"] = 1] = "Local";
    FieldFilter[FieldFilter["Static"] = 2] = "Static";
})(FieldFilter || (FieldFilter = {}));
export function getFields(value, filter) {
    let addLocal = (filter & FieldFilter.Local) != 0;
    let addStatic = (filter & FieldFilter.Static) != 0;
    function getTargetFields(target, isStatic) {
        let allDecorators = target.__decorators ?? [];
        let fieldNames = Object.getOwnPropertyNames(target);
        fieldNames = fieldNames.filter(name => typeof target[name] != "function");
        let fields = [];
        for (let fieldName of fieldNames) {
            let decorators = allDecorators.filter(dec => dec.fieldName == fieldName);
            let varTypeDecoratorIndex = decorators.findIndex(dec => dec.decoratorFunction == Var);
            if (decorators.length == 0 || varTypeDecoratorIndex == -1) {
                continue;
            }
            let varData = decorators[varTypeDecoratorIndex].data;
            let type = typeOf(varData.type);
            decorators.splice(varTypeDecoratorIndex, 1);
            fields.push(new FieldInfo(fieldName, decorators, isStatic, type));
        }
        return fields;
    }
    let fields = [];
    if (addLocal)
        fields.push(...getTargetFields(value, false));
    if (addStatic)
        fields.push(...getTargetFields(value.constructor, true));
    return fields;
}
Object.defineProperty(Object.prototype, "getType", {
    value: function () {
        return typeOf(this.constructor);
    }
});
Object.defineProperty(Object.prototype, "is", {
    value: function (objClass) {
        let objType = typeOf(objClass);
        let myType = this.getType();
        return myType == objType || myType.hasParent(objType);
    }
});
Object.defineProperty(Object.prototype, "getFields", {
    value: function (filter) {
        return getFields(this, filter);
    }
});
export function HandleDecorator(decoratorFunc, data) {
    return function (target, propertyName) {
        let decorators = target.__decorators;
        if (decorators == null) {
            decorators = [];
            Object.defineProperty(target, "__decorators", {
                value: decorators
            });
        }
        decorators.push(new DecoratorInfo(target, propertyName, decoratorFunc, data));
    };
}
export function Var(type) {
    return HandleDecorator(Var, {
        type: type
    });
}
export class DecoratorInfo {
    _target;
    _fieldName;
    _decoratorFunction;
    _data;
    constructor(_target, _fieldName, _decoratorFunction, _data) {
        this._target = _target;
        this._fieldName = _fieldName;
        this._decoratorFunction = _decoratorFunction;
        this._data = _data;
    }
    get fieldName() {
        return this._fieldName;
    }
    get decoratorFunction() {
        return this._decoratorFunction;
    }
    get data() {
        return this._data;
    }
}
export class FieldInfo {
    _name;
    _decorators;
    _isStatic;
    _type;
    constructor(_name, _decorators, _isStatic, _type) {
        this._name = _name;
        this._decorators = _decorators;
        this._isStatic = _isStatic;
        this._type = _type;
    }
    get name() {
        return this._name;
    }
    get type() {
        return this._type;
    }
    get isStatic() {
        return this._isStatic;
    }
    getValue(target) {
        assertSameCallLevel(target, this._isStatic);
        return target[this._name];
    }
    setValue(target, value) {
        assertSameCallLevel(target, this._isStatic);
        target[this._name] = value;
    }
    getDecorator(type) {
        return this._decorators.find(dec => dec.decoratorFunction == type);
    }
}
