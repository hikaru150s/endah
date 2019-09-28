import { IPersonScore } from "../interfaces";
import Decimal from "decimal.js";

export class Person {
    private _id: number;
    private _name: string;
    private _active_reflective: number;
    private _sensing_intuitive: number;
    private _visual_verbal: number;
    private _sequential_global: number;

    get id(): number {
        return this._id;
    }

    get name(): string {
        return this._name;
    }

    get active_reflective(): number {
        return this._active_reflective;
    }

    get sensing_intuitive(): number {
        return this._sensing_intuitive;
    }

    get visual_verbal(): number {
        return this._visual_verbal;
    }

    get sequential_global(): number {
        return this._sequential_global;
    }

    private tryParseToNumber(val: any): number {
        try {
            return (typeof val) === 'number' ? val : parseInt(val, 10);
        } catch (error) {
            throw new Error(`Unable to parse ${val} as number`);
        }
    }

    public constructor(id: number, name: string, score: IPersonScore) {
        this._id = this.tryParseToNumber(id);
        this._name = name;
        this._active_reflective = this.tryParseToNumber(score.active_reflective);
        this._sensing_intuitive = this.tryParseToNumber(score.sensing_intuitive);
        this._visual_verbal = this.tryParseToNumber(score.visual_verbal);
        this._sequential_global = this.tryParseToNumber(score.sequential_global);
    }

    public toVector(): Decimal[] {
        return [
            new Decimal(this._active_reflective),
            new Decimal(this._sensing_intuitive),
            new Decimal(this._visual_verbal),
            new Decimal(this._sequential_global),
        ];
    }
}
