/**
 * Author: Tubix
 * Link:
 */


type ConstructorType = {new(...params:any[]):any}|Function;

//utils
function isTypeDeclaration(obj:any) : boolean
{
    return obj.constructor.name == "Function";
}
function assertSameCallLevel(target:any, staticDeclaration:boolean) : void
{
    let staticCall:boolean = isTypeDeclaration(target);
    if(staticCall != staticDeclaration)
    {
        throw new Error("Cannot call " + (staticDeclaration?"static":"local") + " function with " + (staticCall?"'type'":"'instance'") + " target");
    }
}

export class FunctionInfo
{
    private readonly _name:string;

    private readonly _jsFunction:Function;

    public constructor(func:Function,
                       private readonly _isStatic:boolean)
    {
        this._jsFunction = func;

        this._name = func.name;
    }

    public get name() : string
    {
        return this._name;
    }
    public get isStatic() : boolean
    {
        return this._isStatic;
    }

    public call(target:any, parameters:any[]) : void
    {
        assertSameCallLevel(target, this._isStatic);

        this._jsFunction.apply(target, parameters);
    }
}

export enum FunctionFilter
{
    FromParent = 1,
    Local = 2,
    Static = 4
}

function getJSFunctions(prototype:any) : Function[]
{
    return Object.getOwnPropertyNames(prototype)
        .filter((key) => typeof prototype[key] === 'function' && key != "constructor")
        .map((key) => prototype[key]);
}

export class Type
{
    private readonly _name:string;

    private readonly _constructor:Function;

    private readonly _localFunctions:FunctionInfo[];
    private readonly _staticFunctions:FunctionInfo[];

    private readonly _parent:Type = null;

    public constructor(constr:Function)
    {
        this._constructor = constr;
        this._name = constr.name;

        let prototype = constr.prototype;

        this._localFunctions = getJSFunctions(prototype).map(func => new FunctionInfo(func, false));
        this._staticFunctions = getJSFunctions(constr).map(func => new FunctionInfo(func, true));

        let parentPrototype:any = Object.getPrototypeOf(prototype);
        if(parentPrototype != null)
        {
            this._parent = typeOf(parentPrototype.constructor);
        }
    }

    public get name() : string
    {
        return this._name;
    }

    public getFunctions(filter:number) : FunctionInfo[]
    {
        let functions:FunctionInfo[] = [];

        if(this._parent != null && (filter & FunctionFilter.FromParent) != 0)
        {
            functions.push(...this._parent.getFunctions(filter));
        }
        if((filter & FunctionFilter.Local) != 0)
        {
            functions.push(...this._localFunctions);
        }
        if((filter & FunctionFilter.Static) != 0)
        {
            functions.push(...this._staticFunctions);
        }

        return functions;
    }

    public hasParent(type:Type) : boolean
    {
        let parent:Type = this._parent;
        while(parent != null)
        {
            if(parent == type)
                return true;
            parent = parent._parent;
        }
        return false;
    }

    public getParentType() : Type
    {
        return this._parent;
    }

    /**
     * Create new class instance based on this type
     */
    public newInstance<T>(...parameters:any[]) : T
    {
        return new (this._constructor as any)(...parameters);
    }
}

const constructor2type:Map<any, Type> = new Map();
export function typeOf(constructor:ConstructorType) : Type
{
    let type:Type = constructor2type.get(constructor);
    if(type == null)
    {
        type = new Type(constructor);
        constructor2type.set(constructor, type);
    }
    return type;
}

export function getType(value:{constructor:Function}) : Type
{
    if(value == null)
        return null;
    return value.getType();
}

export enum FieldFilter
{
    Local = 1,
    Static = 2
}

export function getFields(value:any, filter:number) : FieldInfo[]
{
    let addLocal:boolean = (filter & FieldFilter.Local) != 0;
    let addStatic:boolean = (filter & FieldFilter.Static) != 0;

    function getTargetFields(target:any, isStatic:boolean):FieldInfo[]
    {
        let allDecorators:DecoratorInfo[] = target.__decorators ?? [];

        let fieldNames:string[] = Object.getOwnPropertyNames(target);
        fieldNames = fieldNames.filter(name => typeof target[name] != "function");

        let fields:FieldInfo[] = [];

        for(let fieldName of fieldNames)
        {
            let decorators:DecoratorInfo[] = allDecorators.filter(dec => dec.fieldName == fieldName);

            let varTypeDecoratorIndex:number = decorators.findIndex(
                dec => dec.decoratorFunction == Var);

            if(decorators.length == 0 || varTypeDecoratorIndex == -1)
            {
                continue; //not reflectable field
            }

            let varData:VarData = decorators[varTypeDecoratorIndex].data;
            let type:Type = typeOf(varData.type);

            decorators.splice(varTypeDecoratorIndex, 1); //don't need to include Var() decorator

            fields.push(new FieldInfo(fieldName, decorators, isStatic, type));
        }

        return fields;
    }

    let fields:FieldInfo[] = [];

    if(addLocal)
        fields.push(...getTargetFields(value, false));
    if(addStatic)
        fields.push(...getTargetFields(value.constructor, true));

    return fields;
}

//Object expansion
Object.defineProperty(Object.prototype, "getType", {
    value: function():Type
    {
        return typeOf(this.constructor);
    }
});
Object.defineProperty(Object.prototype, "is", {
    value: function(objClass:ConstructorType) : boolean
    {
        let objType:Type = typeOf(objClass);
        let myType:Type = this.getType();
        return myType == objType || myType.hasParent(objType);
    }
});
Object.defineProperty(Object.prototype, "getFields", {
    value: function(filter:number) : FieldInfo[]
    {
        return getFields(this, filter);
    }
});
declare global {
    export interface Object {
        getType(): Type;
        is(objClass:ConstructorType) : boolean;
        getFields(filter:number) : FieldInfo[];
    }
}

export function HandleDecorator(decoratorFunc:Function, data:any):Function
{
    return function(target:any, propertyName:string):any
    {
        let decorators:DecoratorInfo[] = target.__decorators;
        if(decorators == null)
        {
            decorators = [];
            Object.defineProperty(target, "__decorators", {
                value:decorators
            });
        }
        decorators.push(new DecoratorInfo(target, propertyName, decoratorFunc, data));
    };
}

type VarData = {
    type:ConstructorType
};
export function Var(type:ConstructorType) : any
{
    return HandleDecorator(Var, {
        type:type
    } as VarData);
}


export class DecoratorInfo
{
    public constructor(private readonly _target:any,
                       private readonly _fieldName:string,
                       private readonly _decoratorFunction:Function,
                       private readonly _data:any)
    {
    }

    public get fieldName() : string
    {
        return this._fieldName;
    }
    public get decoratorFunction() : Function
    {
        return this._decoratorFunction;
    }
    public get data() : any
    {
        return this._data;
    }
}

export class FieldInfo
{
    public constructor(private readonly _name:string,
                       private readonly _decorators:DecoratorInfo[],
                       private readonly _isStatic:boolean,
                       private readonly _type:Type)
    {
    }

    public get name() : string
    {
        return this._name;
    }

    public get type() : Type
    {
        return this._type;
    }

    public get isStatic() : boolean
    {
        return this._isStatic;
    }

    public getValue(target:any) : any
    {
        assertSameCallLevel(target, this._isStatic);

        return target[this._name];
    }
    public setValue(target:any, value:any) : void
    {
        assertSameCallLevel(target, this._isStatic);

        target[this._name] = value;
    }

    public getDecorator(type:Function): DecoratorInfo
    {
        return this._decorators.find(dec => dec.decoratorFunction == type);
    }
}